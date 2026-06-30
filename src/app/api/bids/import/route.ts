import * as XLSX from "xlsx"
import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
    lines.push(`[シート: ${sheetName}]`)
    for (const row of rows) {
      const cells = row.map(c => String(c ?? "").trim()).filter(Boolean)
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const saveStr = formData.get("save") as string
    const save = saveStr === "true"

    if (!file) return Response.json({ error: "ファイルが必要です" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const name = file.name.toLowerCase()

    let rawText = ""
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      rawText = await extractTextFromExcel(buffer)
    } else if (name.endsWith(".pdf")) {
      rawText = await extractTextFromPDF(buffer)
    } else {
      return Response.json({ error: "Excel(.xlsx/.xls)またはPDF(.pdf)のみ対応しています" }, { status: 400 })
    }

    // Claudeで構造化
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
    const extracted = JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""))

    if (!Array.isArray(extracted)) {
      return Response.json({ error: "データの解析に失敗しました" }, { status: 500 })
    }

    // saveフラグが立っていればDBに保存
    if (save && extracted.length > 0) {
      const db = supabaseAdmin()
      const rows = extracted
        .filter((r: any) => r.project_name)
        .map((r: any) => ({
          bid_date: r.bid_date ?? new Date().toISOString().split("T")[0],
          project_name: r.project_name,
          property_type: r.property_type ?? null,
          client_name: r.client_name ?? null,
          referral_source: r.referral_source ?? null,
          bid_amount: r.bid_amount ?? 0,
          competitor_amount: r.competitor_amount ?? null,
          result: ["won", "lost", "pending"].includes(r.result) ? r.result : "pending",
          loss_reason: r.loss_reason ?? null,
          notes: r.notes ?? null,
        }))
      await db.from("bids").insert(rows)
      return Response.json({ saved: rows.length, records: rows })
    }

    return Response.json({ saved: 0, records: extracted })
  } catch (e: any) {
    return Response.json({ error: e.message ?? "インポートに失敗しました" }, { status: 500 })
  }
}
