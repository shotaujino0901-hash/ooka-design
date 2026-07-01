import * as XLSX from "xlsx"
import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── 入札結果表（浜松市公共工事）専用パーサー ────────────────────────────────

const OOKA_NAMES = ["大岡成光", "大岡"]

function isNyusatsuKekkaHyo(wb: XLSX.WorkBook): boolean {
  // シート名が H31年度 / R2年度 … のパターンなら専用フォーマットと判定
  return wb.SheetNames.some((name) => /^[HR]\d+年度$/.test(name))
}

function detectCols(header: unknown[]): Record<string, number> {
  const m: Record<string, number> = {}
  header.forEach((h, i) => {
    const s = String(h ?? "").trim()
    if (s === "開札執行日時") m.date = i
    else if (s === "物件名") m.project = i
    else if (s === "予定価格") m.estimated = i
    else if (s === "落札価格") m.winning = i
    else if (s.includes("落札者") || s.includes("参加者")) m.participants = i
    // 入札価格 を優先（入札金額より後方に定義されていれば上書き）
    else if (s === "入札価格" || s === "入札金額") m.bid_amounts = i
  })
  return m
}

function parseExcelDate(raw: unknown): string | null {
  if (typeof raw === "number") {
    const d = new Date((raw - 25569) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const s = String(raw ?? "").trim()
  // 令和N-MM-DD 形式
  const m = s.match(/令和(\d+)-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const y = 2018 + parseInt(m[1])
    return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
  }
  return null
}

function parseBidAmountList(raw: unknown): (number | null)[] {
  return String(raw ?? "")
    .split("\n")
    .map((s) => {
      const cleaned = s.replace(/\r/g, "").trim()
      if (!cleaned || cleaned === "辞退") return null
      // "失格2490000" などから数値を抽出
      const num = parseInt(cleaned.replace(/[^\d]/g, ""))
      return isNaN(num) ? null : num
    })
}

function parseNyusatsuKekkaHyo(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const records: Record<string, unknown>[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]
    if (rows.length < 3) continue

    const header = rows[1] as unknown[]
    const cols = detectCols(header)
    if (cols.participants === undefined) continue

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const participantsRaw = String(row[cols.participants] ?? "")
      if (!OOKA_NAMES.some((n) => participantsRaw.includes(n))) continue

      // 参加者リスト
      const pList = participantsRaw
        .split("\n")
        .map((s) => s.replace(/\r/g, "").trim())
        .filter(Boolean)

      const ookaIdx = pList.findIndex((p) => OOKA_NAMES.some((n) => p.includes(n)))
      if (ookaIdx < 0) continue

      // 大岡の入札金額（参加者と同順の入札価格リストから取得）
      const bidAmounts =
        cols.bid_amounts !== undefined ? parseBidAmountList(row[cols.bid_amounts]) : []
      const ookaBid = bidAmounts[ookaIdx] ?? null

      // 落札者判定：[落札]マーカーあり → そちら優先、なし → リスト先頭
      const hasMarker = pList.some((p) => p.includes("[落札]"))
      let winner: string | null
      if (hasMarker) {
        const w = pList.find((p) => p.includes("[落札]"))
        winner = w ? w.replace("[落札]", "").trim() : null
      } else {
        winner = pList[0]?.replace("[落札]", "").trim() ?? null
      }
      const ookaWon = !!winner && OOKA_NAMES.some((n) => winner!.includes(n))

      // 落札金額
      let winningAmount: number | null = null
      if (cols.winning !== undefined) {
        const wv = row[cols.winning]
        winningAmount =
          typeof wv === "number"
            ? wv
            : parseInt(String(wv ?? "").replace(/[^\d]/g, "")) || null
      }

      // 日付
      const bidDate =
        cols.date !== undefined ? parseExcelDate(row[cols.date]) : null

      // 案件名（改行をスペースに）
      const projectName = String(row[cols.project] ?? "")
        .replace(/[\r\n]+/g, " ")
        .trim()
      if (!projectName) continue

      // 施主名を案件名から抽出（浜松市〜 パターン）
      const clientMatch = projectName.match(/浜松市[^\s　\u3000]*/)
      const clientName = clientMatch ? clientMatch[0] : "浜松市"

      // 失注時の落札者情報
      const notesText =
        !ookaWon && winner
          ? `落札: ${winner}${winningAmount ? `（${Math.round(winningAmount / 10000)}万円）` : ""}`
          : null

      records.push({
        bid_date: bidDate ?? new Date().toISOString().slice(0, 10),
        project_name: projectName,
        property_type: "官公庁",
        client_name: clientName,
        referral_source: null,
        bid_amount: ookaBid,
        competitor_amount: ookaWon ? null : winningAmount,
        result: ookaWon ? "won" : ookaBid !== null || winningAmount !== null ? "lost" : "pending",
        loss_reason: null,
        notes: notesText,
      })
    }
  }

  return records
}

// ── 汎用抽出（Claude） ────────────────────────────────────────────────────────

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]
    lines.push(`[シート: ${sheetName}]`)
    for (const row of rows) {
      const cells = row.map((c) => String(c ?? "").trim()).filter(Boolean)
      if (cells.length > 0) lines.push(cells.join("\t"))
    }
  }
  return lines.join("\n")
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = await import("pdf-parse/lib/pdf-parse.js")
  const result = await pdfParse.default(buffer)
  return result.text
}

async function claudeExtract(rawText: string): Promise<Record<string, unknown>[]> {
  const prompt = `以下は建築設計事務所の入札記録データです。
各入札案件を読み取り、JSON配列として返してください。

## 抽出するフィールド
- bid_date: 入札日（YYYY-MM-DD形式、不明なら null）
- project_name: 案件名・物件名（必須）
- property_type: 物件種類（事業系木造/事業系非木造/住宅木造/住宅非木造/官公庁/太陽光/アパート賃貸/駐車場 から最も近いもの、わからなければ null）
- client_name: 施主名（不明なら null）
- referral_source: 紹介先・ルート（不明なら null）
- bid_amount: 入札金額・税込（円単位の整数、不明なら null）
- competitor_amount: 競合金額・税込（円単位の整数、不明なら null）
- result: 結果（"won"=受注・"lost"=失注・"pending"=不明）
- loss_reason: 失注理由（失注の場合、不明なら null）
- notes: その他備考（null可）

## 注意
- 金額が万円単位なら×10000して円に変換
- 案件と判断できない行（合計行・ヘッダー等）はスキップ
- JSONのみ返す（説明文・コードブロック不要）

## データ
${rawText.slice(0, 8000)}`

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const text = message.content[0].type === "text" ? message.content[0].text : "[]"
  return JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""))
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const save = formData.get("save") === "true"

    if (!file) return Response.json({ error: "ファイルが必要です" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const name = file.name.toLowerCase()

    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".pdf")) {
      return Response.json(
        { error: "Excel(.xlsx/.xls)またはPDF(.pdf)のみ対応しています" },
        { status: 400 }
      )
    }

    let extracted: Record<string, unknown>[]

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const wb = XLSX.read(buffer, { type: "buffer" })
      if (isNyusatsuKekkaHyo(wb)) {
        // 浜松市入札結果表フォーマット → 専用パーサー（Claude不要）
        extracted = parseNyusatsuKekkaHyo(buffer)
      } else {
        // 汎用フォーマット → Claude で解析
        extracted = await claudeExtract(await extractTextFromExcel(buffer))
      }
    } else {
      extracted = await claudeExtract(await extractTextFromPDF(buffer))
    }

    if (!Array.isArray(extracted)) {
      return Response.json({ error: "データの解析に失敗しました" }, { status: 500 })
    }

    if (save && extracted.length > 0) {
      const db = supabaseAdmin()
      const rows = extracted
        .filter((r) => r.project_name)
        .map((r) => ({
          bid_date: r.bid_date ?? new Date().toISOString().slice(0, 10),
          project_name: r.project_name,
          property_type: r.property_type ?? null,
          client_name: r.client_name ?? null,
          referral_source: r.referral_source ?? null,
          bid_amount: r.bid_amount ?? 0,
          competitor_amount: r.competitor_amount ?? null,
          result: ["won", "lost", "pending"].includes(String(r.result))
            ? r.result
            : "pending",
          loss_reason: r.loss_reason ?? null,
          notes: r.notes ?? null,
        }))
      await db.from("bids").insert(rows)
      return Response.json({ saved: rows.length, records: rows })
    }

    return Response.json({ saved: 0, records: extracted })
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "インポートに失敗しました" },
      { status: 500 }
    )
  }
}
