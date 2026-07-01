import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: "游ゴシック", "Yu Gothic", "ヒラギノ角ゴ Pro", sans-serif;
  font-size: 8.5pt;
  color: #1a1a2e;
  background: #f4f6fa;
  line-height: 1.5;
}

@page { size: A4 landscape; margin: 0; }
@media print {
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
  html,body{margin:0;padding:0;background:white;}
  .page{margin:0;padding:8mm 12mm;width:297mm;height:210mm;min-height:unset;max-height:210mm;box-shadow:none;overflow:hidden;page-break-after:always;break-after:page;}
  .page:last-child{page-break-after:avoid;break-after:avoid;}
  body{font-size:8pt;}
}

.page {
  width: 297mm;
  min-height: 210mm;
  max-height: 210mm;
  overflow: hidden;
  margin: 0 auto 12px;
  padding: 8mm 12mm;
  position: relative;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
}

:root {
  --navy: #0d2145;
  --navy-mid: #1a3a6e;
  --gold: #b8952a;
  --light-blue: #e8eef7;
  --border: #c8d4e8;
  --text-dark: #1a1a2e;
  --text-mid: #3a3a5c;
  --text-light: #666;
  --positive: #1a6b3a;
  --negative: #8b1a1a;
}

/* 表紙 */
.cover {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 194mm;
  border-top: 5px solid var(--navy);
  border-bottom: 2px solid var(--gold);
  padding: 8mm 0 6mm;
}
.cover-label {
  font-size: 7.5pt;
  color: var(--text-light);
  letter-spacing: 0.15em;
  margin-bottom: 3mm;
}
.cover-addressee {
  font-size: 10pt;
  color: var(--navy-mid);
  font-weight: bold;
  margin-bottom: 4mm;
  padding-bottom: 2mm;
  border-bottom: 1px solid var(--border);
}
.cover-title {
  font-size: 28pt;
  font-weight: bold;
  color: var(--navy);
  line-height: 1.3;
  margin-bottom: 4mm;
  letter-spacing: 0.05em;
  font-family: "游明朝", "Yu Mincho", "ヒラギノ明朝 Pro", serif;
}
.cover-subtitle {
  font-size: 12pt;
  color: var(--navy-mid);
  margin-bottom: 0;
  letter-spacing: 0.06em;
}
.cover-meta {
  font-size: 9.5pt;
  color: var(--text-mid);
  line-height: 2;
  background: var(--light-blue);
  border-left: 4px solid var(--navy);
  padding: 6mm 8mm;
}
.cover-meta strong {
  display: inline-block;
  width: 66px;
  color: var(--text-light);
  font-weight: normal;
}
.cover-accent-bar {
  width: 60px;
  height: 4px;
  background: var(--gold);
  margin: 5mm 0;
}

/* セクション見出し */
.section-header {
  background: var(--navy);
  color: #fff;
  padding: 4px 10px;
  font-size: 10pt;
  font-weight: bold;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 0;
  border-left: 4px solid var(--gold);
}
.sub-header {
  font-size: 8.5pt;
  font-weight: bold;
  color: var(--navy-mid);
  border-bottom: 1.5px solid var(--navy-mid);
  padding-bottom: 2px;
  margin: 8px 0 4px;
  letter-spacing: 0.04em;
}

/* ボックス類 */
.box-light {
  background: var(--light-blue);
  border: 1px solid var(--border);
  padding: 5px 10px;
  margin: 4px 0;
  border-radius: 2px;
}
.box-gold {
  background: #fdf8ee;
  border: 1px solid var(--gold);
  border-left: 3px solid var(--gold);
  padding: 5px 10px;
  margin: 4px 0;
  border-radius: 2px;
}
.box-navy {
  background: var(--navy);
  color: #fff;
  padding: 5px 10px;
  margin: 4px 0;
  border-radius: 2px;
}

/* テーブル */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin: 4px 0;
}
th {
  background: var(--navy);
  color: #fff;
  padding: 3px 6px;
  text-align: center;
  font-weight: bold;
  font-size: 7.5pt;
  border: 1px solid #2a4a8e;
}
td {
  padding: 3px 6px;
  border: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}
td.label {
  text-align: left;
  background: var(--light-blue);
  font-weight: bold;
  color: var(--text-mid);
  white-space: nowrap;
}
td.section-label {
  text-align: left;
  background: #d4ddf0;
  font-weight: bold;
  color: var(--navy);
  font-size: 7.5pt;
  padding: 3px 6px;
}
td.done { color: var(--positive); font-weight: bold; text-align: center; }
td.pending { color: var(--negative); text-align: center; }
tr.total-row td { background: #d4ddf0; font-weight: bold; }

/* リスト */
ul.check-list {
  list-style: none;
  font-size: 8pt;
}
ul.check-list li {
  padding: 4px 0 4px 16px;
  position: relative;
  border-bottom: 1px dotted var(--border);
  line-height: 1.5;
}
ul.check-list li::before {
  content: "▶";
  position: absolute;
  left: 0;
  color: var(--gold);
  font-size: 7pt;
  top: 4px;
}

/* 2カラム */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 4px 0;
}

/* フロー */
.flow {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 5px 0;
}
.flow-item {
  background: var(--navy-mid);
  color: #fff;
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 7.5pt;
  text-align: center;
  min-width: 55px;
  line-height: 1.4;
}
.flow-arrow {
  color: var(--gold);
  font-size: 11pt;
  font-weight: bold;
}

/* 注釈・ページ番号 */
.footnote {
  font-size: 7pt;
  color: var(--text-light);
  margin-top: 3px;
  border-top: 1px solid var(--border);
  padding-top: 2px;
  line-height: 1.4;
}
.page-num {
  position: absolute;
  bottom: 5mm;
  right: 12mm;
  font-size: 7.5pt;
  color: var(--text-light);
}

p {
  margin: 3px 0;
  font-size: 8pt;
  color: var(--text-mid);
  line-height: 1.5;
}
.emphasis { color: var(--navy); font-weight: bold; }

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 10px 0;
}
`

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()

  const { data: minute } = await db.from("meeting_minutes").select("*").eq("id", id).single()
  if (!minute) return Response.json({ error: "not found" }, { status: 404 })

  const todos: Array<{ text: string; assignee: string; due_date: string; done: boolean }> =
    minute.todos ?? []

  const todosText =
    todos.length > 0
      ? todos
          .map(
            (t, i) =>
              `${i + 1}. ${t.text}　担当:${t.assignee || "未定"}　期限:${t.due_date || "未定"}　完了:${t.done ? "✓" : "未"}`
          )
          .join("\n")
      : "（なし）"

  const dateStr = minute.meeting_date
    ? new Date(minute.meeting_date).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—"

  const prompt = `あなたは建築設計事務所のアシスタントです。
以下の議事録データをもとに、打ち合わせ振り返り資料のHTMLページ（.page ディブのみ）を生成してください。

## 議事録データ
タイトル: ${minute.title}
日時: ${dateStr}
場所: ${minute.location || "—"}
参加者: ${minute.attendees || "—"}

議事内容:
${minute.content || "（記録なし）"}

決定事項:
${minute.decisions || "（記録なし）"}

アクションアイテム:
${todosText}

## 使用するCSSクラス（すでにstyleタグに定義済み）
- .page : A4横ページ（必ずこのdivでページを区切る）
- .cover / .cover-label / .cover-addressee / .cover-title / .cover-subtitle / .cover-meta / .cover-accent-bar : 表紙用
- .section-header : ネイビー背景・ゴールド左ボーダーの見出し
- .sub-header : サブ見出し
- .box-light / .box-gold / .box-navy : ボックス
- table / th / td / td.label / td.done / td.pending : テーブル
- ul.check-list : ▶マーカーリスト
- .two-col : 2カラムグリッド
- .footnote : 注釈
- .page-num : ページ番号（右下配置）
- p / .emphasis : 段落・強調

## ページ構成（3ページ）
### 1ページ目: 表紙
- .cover-label: "打ち合わせ振り返り資料"
- .cover-addressee: 参加者名（クライアント・外注先）
- .cover-title: タイトル（議事録タイトル）
- .cover-accent-bar
- .cover-subtitle: 日時・場所
- .cover-meta: 日時・場所・参加者・作成者「株式会社 大岡成光建築事務所」

### 2ページ目: 議事内容
- section-header で「議事内容」
- 議事内容テキストを整理して check-list や sub-header で見やすく構造化
- 内容がない場合は「議事録未記録」と表示

### 3ページ目: 決定事項 ＆ アクションアイテム
- section-header「決定事項」 → box-gold で決定内容を箇条書き
- section-header「アクションアイテム」 → テーブル（タスク内容 / 担当 / 期限 / 状態）
- アクションアイテムがない場合はその旨を記載

## 出力ルール
- <body>内の .page ディブのみを出力（DOCTYPE/html/head/style タグ不要）
- インラインstyle属性は極力使わずCSSクラスのみを使用
- コードブロックマーカー（\`\`\`）不要
- 日本語・ビジネス文書として丁寧な表現`

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const body =
    message.content[0].type === "text"
      ? message.content[0].text.replace(/^```html?\n?/, "").replace(/\n?```$/, "")
      : ""

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${minute.title} | 打ち合わせ振り返り資料</title>
<style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
