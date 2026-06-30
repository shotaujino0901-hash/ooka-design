import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const body = await req.json()
  const { property_type, referral_source, completion_month, bid_amount } = body

  const db = supabaseAdmin()
  const { data: bidsData } = await db.from("bids").select("*").order("bid_date", { ascending: false })
  const bids = bidsData ?? []

  // 全体集計
  const allWon = bids.filter((b: any) => b.result === "won")
  const allLost = bids.filter((b: any) => b.result === "lost")
  const totalDecided = allWon.length + allLost.length
  const overallWinRate = totalDecided > 0 ? Math.round((allWon.length / totalDecided) * 100) : null

  // 物件種類別集計
  const ptBids = property_type ? bids.filter((b: any) => b.property_type === property_type) : []
  const ptWon = ptBids.filter((b: any) => b.result === "won")
  const ptLost = ptBids.filter((b: any) => b.result === "lost")
  const ptDecided = ptWon.length + ptLost.length
  const ptWinRate = ptDecided > 0 ? Math.round((ptWon.length / ptDecided) * 100) : null
  const avgWonAmount = ptWon.length > 0 ? ptWon.reduce((s: number, b: any) => s + b.bid_amount, 0) / ptWon.length : null
  const avgLostAmount = ptLost.length > 0 ? ptLost.reduce((s: number, b: any) => s + b.bid_amount, 0) / ptLost.length : null
  const competitorAmounts = ptLost.filter((b: any) => b.competitor_amount).map((b: any) => b.competitor_amount as number)
  const avgCompetitorAmount = competitorAmounts.length > 0
    ? competitorAmounts.reduce((s: number, v: number) => s + v, 0) / competitorAmounts.length : null
  const lossReasons = [...new Set(ptLost.map((b: any) => b.loss_reason).filter(Boolean))]

  // 同一物件種類の最近10件（参考）
  const recentPtBids = ptBids.slice(0, 10).map((b: any) => ({
    date: b.bid_date,
    amount: Math.round(b.bid_amount / 10000),
    competitor: b.competitor_amount ? Math.round(b.competitor_amount / 10000) : null,
    result: b.result === "won" ? "受注" : b.result === "lost" ? "失注" : "検討中",
    loss_reason: b.loss_reason,
  }))

  const fmtBid = (n: number | null) => n == null ? "データなし" : `${Math.round(n / 10000)}万円`

  const prompt = `あなたは建築設計事務所の入札戦略アドバイザーです。
大岡建築設計事務所（静岡県浜松市）の過去の入札記録をもとに、入札価格の戦略分析を行ってください。

## 入札記録サマリー（全${bids.length}件）
- 全体受注率: ${overallWinRate != null ? `${overallWinRate}%` : "データなし"}（受注${allWon.length}件・失注${allLost.length}件）

## 物件種類別実績：${property_type ?? "未指定"}
${property_type ? `- 入札数: ${ptBids.length}件（受注${ptWon.length}件・失注${ptLost.length}件）
- 受注率: ${ptWinRate != null ? `${ptWinRate}%` : "データなし"}
- 受注平均金額: ${fmtBid(avgWonAmount)}
- 失注平均金額: ${fmtBid(avgLostAmount)}
- 競合平均金額（失注時）: ${fmtBid(avgCompetitorAmount)}
- 主な失注理由: ${lossReasons.length > 0 ? lossReasons.join("、") : "記録なし"}` : "物件種類未指定のため全体データを参照"}

## 最近の入札実績（${property_type ?? "全体"}・最大10件）
${recentPtBids.length > 0
  ? recentPtBids.map((b: any) => `- ${b.date}: ${b.amount}万円 → ${b.result}${b.competitor ? ` (競合:${b.competitor}万円)` : ""}${b.loss_reason ? ` [${b.loss_reason}]` : ""}`).join("\n")
  : "該当する入札記録なし"}

## 今回の入力
- 物件種類: ${property_type ?? "未入力"}
- 紹介先: ${referral_source ?? "未入力"}
- 完成予定: ${completion_month ?? "未入力"}
- 入札金額（税込）: ${bid_amount ? `${Math.round(bid_amount / 10000)}万円` : "未入力"}

## 回答形式
以下のJSONのみ返してください（コードブロック不要、説明文不要）：
{
  "win_probability": "高" | "中" | "低",
  "win_probability_reason": "50字以内の理由",
  "recommended_bid_min": 数値（円）,
  "recommended_bid_max": 数値（円）,
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": ["リスク要因を配列で、最大3件"],
  "analysis": "150字以内の総合分析",
  "price_sensitivity": "入札金額を10%下げた場合の影響を40字以内で",
  "competitor_insight": "競合分析・差別化ポイントを50字以内で"
}`

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })
    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const json = JSON.parse(text.trim())
    return Response.json(json)
  } catch (e) {
    return Response.json({ error: "AI予測に失敗しました" }, { status: 500 })
  }
}
