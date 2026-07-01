import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("customer_meetings")
    .select("*")
    .eq("customer_id", id)
    .order("meeting_date", { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = supabaseAdmin()

  // Plaudドキュメントが指定されている場合、AIで自動生成
  if (body.source_document_id && body.generate) {
    // ドキュメントのチャンクを取得してテキスト復元
    const { data: chunks } = await db
      .from("documents")
      .select("content, title")
      .eq("source_id", body.source_document_id)
      .order("id", { ascending: true })

    const fullText = chunks?.map((c: any) => c.content).join("\n") ?? ""
    const docTitle = chunks?.[0]?.title ?? "打ち合わせ記録"

    // 顧客情報取得
    const { data: customer } = await db.from("customers").select("name, company").eq("id", id).single()
    const customerName = customer ? `${customer.company ? customer.company + " / " : ""}${customer.name}` : "顧客"

    const prompt = `あなたは建築設計事務所のアシスタントです。
以下の打ち合わせ音声記録（テキスト化）をもとに、打ち合わせ記録と顧客向け振り返り資料（A4スライドHTML）を作成してください。

## 顧客名
${customerName}

## 打ち合わせ記録テキスト
${fullText.slice(0, 6000)}

## 出力形式（JSONのみ・コードブロック不要）
{
  "title": "打ち合わせタイトル（案件名など）",
  "meeting_date": "YYYY-MM-DD（記録から推測、不明なら今日の日付）",
  "summary": "打ち合わせ全体の要約（200字以内）",
  "agenda_items": [
    { "topic": "議題・確認事項", "content": "詳細", "status": "確認済み|要確認|継続" }
  ],
  "action_items": [
    { "task": "アクション内容", "owner": "担当（弊社|お客様）", "due": "期限（YYYY-MM-DDまたは未定）" }
  ],
  "slide_html": "A4印刷対応のHTMLコード（後述の仕様に従う）"
}

## slide_html の仕様
- DOCTYPE宣言含む完全なHTML
- インラインCSSのみ使用（外部CSS参照なし）
- @page { size: A4; margin: 20mm; } を style タグに含める
- フォント: system-ui, -apple-system, sans-serif
- ヘッダー: 会社名「株式会社 大岡成光建築事務所」・顧客名・打ち合わせ日・タイトル
- セクション: 打ち合わせ概要 / 確認事項一覧（テーブル） / 次回アクション（テーブル）
- フッター: ページ番号、「株式会社 大岡成光建築事務所」
- 印刷時は背景・ボタン等を非表示
- 日本語で記述、ビジネス文書として丁寧な表現`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : "{}"
    const generated = JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""))

    const { data, error } = await db
      .from("customer_meetings")
      .insert({
        customer_id: Number(id),
        title: generated.title ?? docTitle,
        meeting_date: generated.meeting_date ?? new Date().toISOString().split("T")[0],
        source_document_id: body.source_document_id,
        summary: generated.summary ?? null,
        agenda_items: generated.agenda_items ?? [],
        action_items: generated.action_items ?? [],
        slide_html: generated.slide_html ?? null,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  // 手動作成
  const { data, error } = await db
    .from("customer_meetings")
    .insert({
      customer_id: Number(id),
      title: body.title ?? "打ち合わせ記録",
      meeting_date: body.meeting_date ?? new Date().toISOString().split("T")[0],
      source_document_id: body.source_document_id ?? null,
      summary: body.summary ?? null,
      agenda_items: body.agenda_items ?? [],
      action_items: body.action_items ?? [],
      slide_html: body.slide_html ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
