import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function percentile(arr: number[], p: number): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { property_type, referral_source, completion_month, bid_amount, region } = body

  const db = supabaseAdmin()

  // 市場落札データ（メイン参照）
  let marketQuery = db.from("market_bids").select("*")
  if (property_type) marketQuery = marketQuery.eq("property_type", property_type)
  if (region) marketQuery = marketQuery.ilike("region", `%${region}%`)
  const { data: marketData } = await marketQuery
  const marketBids = marketData ?? []

  const marketAmounts = marketBids.map((b: any) => b.winning_amount).filter(Boolean) as number[]
  const marketWithEstimated = marketBids.filter((b: any) => b.estimated_price && b.winning_amount)
  const marketAvgWinning = marketAmounts.length > 0
    ? marketAmounts.reduce((s, v) => s + v, 0) / marketAmounts.length : null
  const marketP25 = percentile(marketAmounts, 25)
  const marketP75 = percentile(marketAmounts, 75)
  const marketAvgWinRate = marketWithEstimated.length > 0
    ? marketWithEstimated.reduce((s: number, b: any) => s + b.winning_amount / b.estimated_price, 0) / marketWithEstimated.length * 100
    : null

  const bidderCounts: Record<string, number> = {}
  for (const b of marketBids) {
    if ((b as any).winning_bidder) {
      const name = (b as any).winning_bidder as string
      bidderCounts[name] = (bidderCounts[name] ?? 0) + 1
    }
  }
  const topBidders = Object.entries(bidderCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => `${name}(${count}件)`)

  // 最近の市場落札事例（参考）
  const recentMarket = marketBids.slice(0, 8).map((b: any) => ({
    date: b.bid_date,
    project: b.project_name?.slice(0, 20),
    bidder: b.winning_bidder,
    amount: Math.round(b.winning_amount / 10000),
    winRate: b.estimated_price ? `${Math.round(b.winning_amount / b.estimated_price * 100)}%` : null,
  }))

  // 自社入札記録（補足参照）
  const { data: bidsData } = await db.from("bids").select("*").order("bid_date", { ascending: false })
  const bids = bidsData ?? []
  const allWon = bids.filter((b: any) => b.result === "won")
  const allLost = bids.filter((b: any) => b.result === "lost")
  const totalDecided = allWon.length + allLost.length
  const overallWinRate = totalDecided > 0 ? Math.round((allWon.length / totalDecided) * 100) : null

  const ptBids = property_type ? bids.filter((b: any) => b.property_type === property_type) : []
  const ptWon = ptBids.filter((b: any) => b.result === "won")
  const ptLost = ptBids.filter((b: any) => b.result === "lost")
  const ptDecided = ptWon.length + ptLost.length
  const ptWinRate = ptDecided > 0 ? Math.round((ptWon.length / ptDecided) * 100) : null
  const avgWonAmount = ptWon.length > 0 ? ptWon.reduce((s: number, b: any) => s + b.bid_amount, 0) / ptWon.length : null
  const lossReasons = [...new Set(ptLost.map((b: any) => b.loss_reason).filter(Boolean))]

  const fmtBid = (n: number | null | undefined) => n == null ? "データなし" : `${Math.round(n / 10000)}万円`
  const fmtPct = (n: number | null | undefined) => n == null ? "データなし" : `${n.toFixed(1)}%`

  const prompt = `あなたは建築設計事務所の入札戦略アドバイザーです。
株式会社 大岡成光建築事務所（静岡県浜松市）の入札を支援するため、公開落札データ（市場実態）と自社実績をもとに分析してください。

## 市場落札データ（メイン参照）${region ? `・地域: ${region}` : ""}
対象: ${property_type ?? "全物件種類"} / 参照件数: ${marketBids.length}件
${marketBids.length > 0 ? `- 平均落札金額: ${fmtBid(marketAvgWinning)}
- 落札金額レンジ（25〜75%ile）: ${fmtBid(marketP25)} 〜 ${fmtBid(marketP75)}
- 平均落札率（落札/予定価格）: ${fmtPct(marketAvgWinRate)}
- 主要落札者: ${topBidders.length > 0 ? topBidders.join("、") : "データなし"}
- 最近の落札事例: ${recentMarket.map((b: any) => `${b.amount}万円(${b.winRate ?? "—"})`).join("、")}` : "市場データなし（自社実績のみで分析）"}

## 自社入札実績（補足）
- 全体受注率: ${overallWinRate != null ? `${overallWinRate}%` : "データなし"}（受注${allWon.length}件・失注${allLost.length}件）
${property_type && ptBids.length > 0 ? `- ${property_type}の受注率: ${ptWinRate != null ? `${ptWinRate}%` : "データなし"}（${ptDecided}件）
- ${property_type}の受注平均金額: ${fmtBid(avgWonAmount)}
- 主な失注理由: ${lossReasons.length > 0 ? lossReasons.join("、") : "記録なし"}` : ""}

## 今回の入力
- 物件種類: ${property_type ?? "未入力"}
- 地域: ${region ?? "未指定"}
- 紹介先: ${referral_source ?? "未入力"}
- 完成予定: ${completion_month ?? "未入力"}
- 入札金額（税込）: ${bid_amount ? fmtBid(bid_amount) : "未入力"}

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
