import { supabaseAdmin } from "@/lib/supabase"

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 2) return null
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, predict: (x: number) => Math.max(0, slope * x + intercept) }
}

export async function GET() {
  const db = supabaseAdmin()

  const { data: raw, error } = await db
    .from("financial_projects")
    .select(
      "term,term_label,fiscal_year_end,revenue_plan,gross_profit,gross_profit_rate,labor_cost,net_profit,property_type,referral_source,outsourcing_total,outsourcing_rate"
    )
    .order("term")

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!raw?.length) return Response.json({ empty: true })

  // Aggregate by term
  const byTermMap: Record<number, any> = {}
  for (const r of raw) {
    if (!byTermMap[r.term]) {
      byTermMap[r.term] = {
        term: r.term,
        termLabel: r.term_label,
        fiscalYearEnd: r.fiscal_year_end,
        count: 0,
        revenue: 0,
        grossProfit: 0,
        laborCost: 0,
        netProfit: 0,
        outsourcingTotal: 0,
      }
    }
    const t = byTermMap[r.term]
    t.count++
    t.revenue += r.revenue_plan ?? 0
    t.grossProfit += r.gross_profit ?? 0
    t.laborCost += r.labor_cost ?? 0
    t.netProfit += r.net_profit ?? 0
    t.outsourcingTotal += r.outsourcing_total ?? 0
  }
  const termStats = Object.values(byTermMap).map((t: any) => ({
    ...t,
    grossProfitRate: t.revenue > 0 ? (t.grossProfit / t.revenue) * 100 : 0,
    laborCostRate: t.revenue > 0 ? (t.laborCost / t.revenue) * 100 : 0,
    netProfitRate: t.revenue > 0 ? (t.netProfit / t.revenue) * 100 : 0,
    outsourcingRate: t.revenue > 0 ? (t.outsourcingTotal / t.revenue) * 100 : 0,
  }))

  // Aggregate by property type
  const byPropMap: Record<string, any> = {}
  for (const r of raw) {
    const k = r.property_type ?? "その他"
    if (!byPropMap[k]) byPropMap[k] = { propertyType: k, count: 0, revenue: 0, grossProfit: 0 }
    byPropMap[k].count++
    byPropMap[k].revenue += r.revenue_plan ?? 0
    byPropMap[k].grossProfit += r.gross_profit ?? 0
  }
  const propertyTypeStats = Object.values(byPropMap)
    .map((t: any) => ({
      ...t,
      grossProfitRate: t.revenue > 0 ? (t.grossProfit / t.revenue) * 100 : 0,
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue)

  // Aggregate by referral source
  const byRefMap: Record<string, any> = {}
  for (const r of raw) {
    const k = r.referral_source ?? "直接・不明"
    if (!byRefMap[k]) byRefMap[k] = { referralSource: k, count: 0, revenue: 0, grossProfit: 0 }
    byRefMap[k].count++
    byRefMap[k].revenue += r.revenue_plan ?? 0
    byRefMap[k].grossProfit += r.gross_profit ?? 0
  }
  const referralStats = Object.values(byRefMap)
    .map((t: any) => ({
      ...t,
      grossProfitRate: t.revenue > 0 ? (t.grossProfit / t.revenue) * 100 : 0,
    }))
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 15)

  // Linear regression prediction using terms 8-12
  const meaningfulTerms = termStats.filter((t: any) => t.term >= 8)
  const revenueRegression = linearRegression(
    meaningfulTerms.map((t: any) => ({ x: t.term, y: t.revenue }))
  )
  const grossRegression = linearRegression(
    meaningfulTerms.map((t: any) => ({ x: t.term, y: t.grossProfit }))
  )

  const predictions = [13, 14].map((term) => ({
    term,
    termLabel: term === 13 ? "第十三期（予測）" : "第十四期（予測）",
    revenue: revenueRegression ? revenueRegression.predict(term) : null,
    grossProfit: grossRegression ? grossRegression.predict(term) : null,
    isPrediction: true,
  }))

  const totals = {
    revenue: termStats.reduce((s: number, t: any) => s + t.revenue, 0),
    grossProfit: termStats.reduce((s: number, t: any) => s + t.grossProfit, 0),
    netProfit: termStats.reduce((s: number, t: any) => s + t.netProfit, 0),
    count: raw.length,
    avgGrossProfitRate:
      termStats.reduce((s: number, t: any) => s + t.grossProfitRate, 0) / termStats.length,
  }

  return Response.json({ termStats, propertyTypeStats, referralStats, predictions, totals })
}
