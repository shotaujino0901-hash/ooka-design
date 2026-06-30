import Anthropic from "@anthropic-ai/sdk"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const body = await req.json()
  const { property_type, referral_source, completion_month, bid_amount, benchmarks } = body

  // 入札記録から勝率・失注傾向を取得
  const db = supabaseAdmin()
  const { data: bidsData } = await db.from("bids").select("*").order("bid_date", { ascending: false })
  const bids = bidsData ?? []
  const ptBids = property_type ? bids.filter((b: any) => b.property_type === property_type) : []
  const won = ptBids.filter((b: any) => b.result === "won")
  const lost = ptBids.filter((b: any) => b.result === "lost")
  const allWon = bids.filter((b: any) => b.result === "won")
  const allLost = bids.filter((b: any) => b.result === "lost")
  const totalDecided = allWon.length + allLost.length
  const overallWinRate = totalDecided > 0 ? Math.round((allWon.length / totalDecided) * 100) : null
  const ptDecided = won.length + lost.length
  const ptWinRate = ptDecided > 0 ? Math.round((won.length / ptDecided) * 100) : null
  const avgWonAmount = won.length > 0 ? won.reduce((s: number, b: any) => s + b.bid_amount, 0) / won.length : null
  const avgLostAmount = lost.length > 0 ? lost.reduce((s: number, b: any) => s + b.bid_amount, 0) / lost.length : null
  const lossReasons = lost.map((b: any) => b.loss_reason).filter(Boolean)
  const competitorAmounts = lost.filter((b: any) => b.competitor_amount).map((b: any) => b.competitor_amount)
  const avgCompetitorAmount = competitorAmounts.length > 0
    ? competitorAmounts.reduce((s: number, v: number) => s + v, 0) / competitorAmounts.length : null

  const ptStats = property_type && benchmarks?.byPropertyType?.[property_type]
    ? benchmarks.byPropertyType[property_type]
    : null
  const rsStats = referral_source && benchmarks?.byReferralSource?.[referral_source]
    ? benchmarks.byReferralSource[referral_source]
    : null
  const overall = benchmarks?.overall ?? {}

  // 売上規模別の最も近いレンジを特定
  const rangeLabels = Object.keys(benchmarks?.byRevenueRange ?? {})
  const rangeStats = rangeLabels.length > 0 && bid_amount
    ? (() => {
        const ranges = [
          { label: "〜500万", max: 5_000_000 },
          { label: "500〜1000万", max: 10_000_000 },
          { label: "1000〜3000万", max: 30_000_000 },
          { label: "3000〜5000万", max: 50_000_000 },
          { label: "5000万〜", max: Infinity },
        ]
        const match = ranges.find(r => bid_amount < r.max)
        return match ? benchmarks.byRevenueRange[match.label] : null
      })()
    : null

  const fmt = (n: number | null | undefined, unit = "万円") =>
    n == null ? "データなし" : `${Math.round(n / 10000).toLocaleString()}${unit}`
  const fmtPct = (n: number | null | undefined) =>
    n == null ? "データなし" : `${Number(n).toFixed(1)}%`
  const fmtBid = (n: number | null) => n == null ? "データなし" : `${Math.round(n / 10000)}万円`

  const prompt = `あなたは建築設計事務所の経営分析AIアシスタントです。
大岡建築設計事務所（静岡県浜松市）の過去案件データと入札記録をもとに、入札価格分析と収益予測を行ってください。

## 全案件実績（${overall.count ?? 0}件）
- 平均粗利益率: ${fmtPct(overall.avgGrossProfitRate)}
- 平均差引利益率: ${fmtPct(overall.avgNetProfitRate)}
- 平均外注比率: ${fmtPct(overall.avgOutsourcingRate)}

## 物件種類別実績：${property_type ?? "未指定"}
${ptStats ? `
- 案件数: ${ptStats.count}件
- 平均売上: ${fmt(ptStats.avgRevenue)}
- 平均粗利益率: ${fmtPct(ptStats.avgGrossProfitRate)}（範囲: ${fmtPct(ptStats.minGrossProfitRate)}〜${fmtPct(ptStats.maxGrossProfitRate)}）
- 粗利益率 25〜75%ile: ${fmtPct(ptStats.p25GrossProfitRate)}〜${fmtPct(ptStats.p75GrossProfitRate)}
- 平均差引利益率: ${fmtPct(ptStats.avgNetProfitRate)}
- 平均外注比率: ${fmtPct(ptStats.avgOutsourcingRate)}` : "該当データなし（全体平均を参考にしてください）"}

## 紹介先別実績：${referral_source ?? "未指定"}
${rsStats ? `
- 案件数: ${rsStats.count}件
- 平均粗利益率: ${fmtPct(rsStats.avgGrossProfitRate)}
- 平均差引利益率: ${fmtPct(rsStats.avgNetProfitRate)}` : "該当データなし"}

## 同規模案件実績
${rangeStats ? `
- 案件数: ${rangeStats.count}件
- 平均粗利益率: ${fmtPct(rangeStats.avgGrossProfitRate)}
- 粗利益率 25〜75%ile: ${fmtPct(rangeStats.p25GrossProfitRate)}〜${fmtPct(rangeStats.p75GrossProfitRate)}` : "データなし"}

## 入札記録データ
- 全入札数: ${bids.length}件（受注${allWon.length}件・失注${allLost.length}件）
- 全体受注率: ${overallWinRate != null ? `${overallWinRate}%` : "データなし"}
${property_type ? `- ${property_type}の入札数: ${ptBids.length}件（受注${won.length}件・失注${lost.length}件）
- ${property_type}の受注率: ${ptWinRate != null ? `${ptWinRate}%` : "データなし"}
- ${property_type}の受注平均金額: ${fmtBid(avgWonAmount)}
- ${property_type}の失注平均金額: ${fmtBid(avgLostAmount)}
- 競合平均金額（失注時）: ${fmtBid(avgCompetitorAmount)}
- 主な失注理由: ${lossReasons.length > 0 ? [...new Set(lossReasons)].join("、") : "記録なし"}` : ""}

## 今回の入力
- 物件種類: ${property_type ?? "未入力"}
- 紹介先: ${referral_source ?? "未入力"}
- 完成予定: ${completion_month ?? "未入力"}
- 入札金額（税込）: ${bid_amount ? fmt(bid_amount) : "未入力"}

## 回答形式
以下のJSONのみ返してください（コードブロック不要、説明文不要）：
{
  "predicted_gross_profit_rate": 数値（%）,
  "predicted_net_profit_rate": 数値（%）,
  "estimated_gross_profit": 数値（円）,
  "estimated_net_profit": 数値（円）,
  "recommended_bid_min": 数値（円）,
  "recommended_bid_max": 数値（円）,
  "win_probability": "高" | "中" | "低",
  "win_probability_reason": "50字以内の理由",
  "risk_level": "low" | "medium" | "high",
  "risk_reasons": ["リスク要因を配列で、最大3件"],
  "analysis": "150字以内の総合分析",
  "price_sensitivity": "入札金額を10%下げた場合の影響を40字以内で",
  "key_metrics": {
    "外注費見込": 数値（円）,
    "外注比率見込": 数値（%）,
    "損益分岐粗利率": 数値（%）
  }
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
