import * as XLSX from "xlsx"
import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── 浜松市指名競争入札結果 PDF 専用パーサー ──────────────────────────────────

type BidderEntry = {
  no: number
  name: string
  amount: number | null
  result: string // 落札 / 参加 / 失格 / 辞退 / 未受領
}

function isHamamatsuBidPDF(text: string): boolean {
  return (
    /開札執行日時[\s]*令和/.test(text) &&
    text.includes("落札決定金額")
  )
}

function parseReiwaDate(s: string): string | null {
  const m = s.match(/令和(\d+)-(\d{1,2})-(\d{1,2})/)
  if (!m) return null
  return `${2018 + parseInt(m[1])}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
}

function parseAmount(s: string): number | null {
  const n = parseInt(s.replace(/[^\d]/g, ""))
  return isNaN(n) ? null : n
}

function parseBidderList(text: string): BidderEntry[] {
  // ヘッダー行を除去
  const cleaned = text
    .replace(/No商号又は名称[\s\S]*?第[１-３]回結果\s*/, "")
    .replace(/入札情報システム[\s\S]*$/, "")

  const lines = cleaned
    .split("\n")
    .map((s) => s.replace(/\r/g, "").trim())
    .filter(Boolean)

  const bidders: BidderEntry[] = []
  let state: "num" | "name" | "amount" | "result" = "num"
  let current: Partial<BidderEntry> = {}

  for (const line of lines) {
    // No 行（どの状態でも優先）
    if (/^\d+$/.test(line) && parseInt(line) > 0 && parseInt(line) < 30) {
      if (current.name) bidders.push(current as BidderEntry)
      current = { no: parseInt(line), name: "", amount: null, result: "参加" }
      state = "name"
      continue
    }

    if (state === "name") {
      if (line.startsWith("法人番号")) {
        state = "amount"
      } else {
        current.name = (current.name || "") + line
      }
      continue
    }

    if (state === "amount") {
      if (line === "辞退" || line === "未受領") {
        current.result = line
        state = "num"
      } else if (line.startsWith("法人番号")) {
        // スキップ
      } else {
        // 金額（結果が同行 or 次行に来るケース両対応）
        const m = line.match(/([\d,]+)[\s]*(落札|参加|失格)?/)
        if (m) {
          current.amount = parseAmount(m[1])
          if (m[2]) {
            current.result = m[2]
            state = "num"
          } else {
            state = "result" // 次行で結果を待つ
          }
        }
      }
      continue
    }

    if (state === "result") {
      if (/^(落札|参加|失格|辞退|未受領)$/.test(line)) {
        current.result = line
      }
      state = "num"
    }
  }
  if (current.name) bidders.push(current as BidderEntry)

  return bidders
}

function parseHamamatsuBidPDF(
  text: string,
  sourceFile: string
): Record<string, unknown>[] {
  // 「開札執行日時」ごとにケースを分割
  const blocks = text.split(/(?=開札執行日時[\s]*令和)/)
  const records: Record<string, unknown>[] = []

  for (const block of blocks) {
    if (!/開札執行日時[\s]*令和/.test(block)) continue

    // 開札日
    const dateM = block.match(/開札執行日時[\s]*(令和\d+-\d+-\d+)/)
    const bidDate = dateM ? parseReiwaDate(dateM[1]) : null

    // 案件名（改行またはインライン）
    const projectM = block.match(/案件名\s*([\s\S]+?)(?:工事箇所|路線河川|$)/)
    const projectName = projectM
      ? projectM[1].replace(/[\r\n]/g, "").trim()
      : null
    if (!projectName) continue

    // 工事箇所（地域抽出）
    const locationM = block.match(/工事箇所\s*([\s\S]+?)(?:予定価格|路線河川)/)
    const locationRaw = locationM
      ? locationM[1].replace(/[\r\n\s]+/g, " ").trim()
      : ""
    const regionM = locationRaw.match(/(浜松市[^\s　\u3000]*)/)
    const region = regionM ? regionM[1] : locationRaw.slice(0, 30) || null

    // 予定価格（税抜き） — 全角・半角括弧両対応
    const estimatedM = block.match(/予定価格[（(]税抜き[）)][\s]*([\d,]+)/)
    const estimatedPrice = estimatedM ? parseAmount(estimatedM[1]) : null

    // 最低制限価格（税抜き）
    const minPriceM = block.match(/最低制限価格[（(]税抜き[）)][\s]*([\d,]+)/)
    const minimumPrice = minPriceM ? parseAmount(minPriceM[1]) : null

    // 落札者名
    const winnerM = block.match(/落札者名\s*([\s\S]+?)落札決定金額/)
    const winningBidder = winnerM
      ? winnerM[1].replace(/[\r\n\s]+/g, "").trim()
      : null

    // 落札決定金額（税抜き）
    const winAmtM = block.match(/落札決定金額[\s]*([\d,]+)/)
    const winningAmount = winAmtM ? parseAmount(winAmtM[1]) : null
    if (!winningAmount) continue // 落札金額なしはスキップ

    // 業者一覧
    const bidListM = block.match(/業者一覧([\s\S]+)/)
    const allBidders: BidderEntry[] = bidListM
      ? parseBidderList(bidListM[1])
      : []

    records.push({
      bid_date: bidDate ?? new Date().toISOString().slice(0, 10),
      project_name: projectName,
      property_type: "官公庁",
      client_name: "浜松市",
      region: region,
      winning_bidder: winningBidder,
      winning_amount: winningAmount,
      estimated_price: estimatedPrice,
      minimum_price: minimumPrice,
      all_bidders: allBidders.length > 0 ? allBidders : null,
      source: sourceFile,
      notes: null,
    })
  }

  return records
}

// ── 汎用テキスト抽出 ──────────────────────────────────────────────────────────

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
  const prompt = `以下は入札結果の公開データです。
各落札案件を読み取り、JSON配列として返してください。

## 抽出するフィールド
- bid_date: 入札日・開札日（YYYY-MM-DD形式、不明なら null）
- project_name: 案件名・工事名（必須）
- property_type: 物件種類（事業系木造/事業系非木造/住宅木造/住宅非木造/官公庁/太陽光/アパート賃貸/駐車場 から最も近いもの、わからなければ null）
- client_name: 発注者名（不明なら null）
- region: 地域（都道府県・市区町村、不明なら null）
- winning_bidder: 落札者名（会社名、不明なら null）
- winning_amount: 落札金額（円単位の整数、不明なら null）
- estimated_price: 予定価格（円単位の整数、不明なら null）
- minimum_price: 最低制限価格（円単位の整数、不明なら null）
- all_bidders: 全参加者リスト（[{no, name, amount, result}] 形式、不明なら null）
- source: データソース（不明なら null）
- notes: その他備考（null可）

## 注意
- 金額が万円単位なら×10000して円に変換
- ヘッダー行・合計行はスキップ
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

    if (name.endsWith(".pdf")) {
      const rawText = await extractTextFromPDF(buffer)
      if (isHamamatsuBidPDF(rawText)) {
        // 浜松市指名競争入札結果フォーマット → 専用パーサー
        extracted = parseHamamatsuBidPDF(rawText, file.name)
      } else {
        extracted = await claudeExtract(rawText)
      }
    } else {
      extracted = await claudeExtract(await extractTextFromExcel(buffer))
    }

    if (!Array.isArray(extracted)) {
      return Response.json({ error: "データの解析に失敗しました" }, { status: 500 })
    }

    if (save && extracted.length > 0) {
      const db = supabaseAdmin()
      const rows = extracted
        .filter((r) => r.project_name && r.winning_amount)
        .map((r) => ({
          bid_date: r.bid_date ?? new Date().toISOString().slice(0, 10),
          project_name: r.project_name,
          property_type: r.property_type ?? null,
          client_name: r.client_name ?? null,
          region: r.region ?? null,
          winning_bidder: r.winning_bidder ?? null,
          winning_amount: Number(r.winning_amount) || 0,
          estimated_price: r.estimated_price ? Number(r.estimated_price) : null,
          minimum_price: r.minimum_price ? Number(r.minimum_price) : null,
          all_bidders: r.all_bidders ?? null,
          source: r.source ?? null,
          notes: r.notes ?? null,
        }))
      await db.from("market_bids").insert(rows)
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
