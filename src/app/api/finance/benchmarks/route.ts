import { supabaseAdmin } from "@/lib/supabase"

type Project = {
  property_type: string | null
  referral_source: string | null
  completion_month: string | null
  revenue_plan: number | null
  gross_profit: number | null
  gross_profit_rate: number | null
  labor_cost: number | null
  net_profit: number | null
  net_profit_rate: number | null
  outsourcing_rate: number | null
}

type Stats = {
  count: number
  avgRevenue: number
  medianRevenue: number
  avgGrossProfitRate: number
  p25GrossProfitRate: number
  p75GrossProfitRate: number
  minGrossProfitRate: number
  maxGrossProfitRate: number
  avgNetProfitRate: number
  avgOutsourcingRate: number
}

function pct(arr: number[], p: number) {
  if (arr.length === 0) return 0
  const idx = Math.min(Math.floor(arr.length * p), arr.length - 1)
  return arr[idx]
}

function calcStats(projects: Project[]): Stats {
  const n = projects.length
  if (n === 0) return {
    count: 0, avgRevenue: 0, medianRevenue: 0,
    avgGrossProfitRate: 0, p25GrossProfitRate: 0, p75GrossProfitRate: 0,
    minGrossProfitRate: 0, maxGrossProfitRate: 0,
    avgNetProfitRate: 0, avgOutsourcingRate: 0,
  }
  const revenues = projects.map(p => p.revenue_plan ?? 0).sort((a, b) => a - b)
  const gps = projects.filter(p => p.gross_profit_rate != null).map(p => p.gross_profit_rate as number).sort((a, b) => a - b)
  const nps = projects.filter(p => p.net_profit_rate != null).map(p => p.net_profit_rate as number)
  const ors = projects.filter(p => p.outsourcing_rate != null).map(p => p.outsourcing_rate as number)
  return {
    count: n,
    avgRevenue: revenues.reduce((s, v) => s + v, 0) / n,
    medianRevenue: pct(revenues, 0.5),
    avgGrossProfitRate: gps.length ? gps.reduce((s, v) => s + v, 0) / gps.length : 0,
    p25GrossProfitRate: pct(gps, 0.25),
    p75GrossProfitRate: pct(gps, 0.75),
    minGrossProfitRate: gps[0] ?? 0,
    maxGrossProfitRate: gps[gps.length - 1] ?? 0,
    avgNetProfitRate: nps.length ? nps.reduce((s, v) => s + v, 0) / nps.length : 0,
    avgOutsourcingRate: ors.length ? ors.reduce((s, v) => s + v, 0) / ors.length : 0,
  }
}

function matchMonth(completionMonth: string | null, m: number): boolean {
  if (!completionMonth) return false
  return new RegExp(`[/.]0?${m}(?:[/.]|$|[^0-9])`).test(completionMonth) ||
    completionMonth.endsWith(`/${m}`) || completionMonth.endsWith(`.${m}`)
}

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from("financial_projects").select("*")
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const projects: Project[] = data ?? []

  // 物件種類別
  const propertyTypes = [...new Set(projects.map(p => p.property_type).filter(Boolean))] as string[]
  const byPropertyType: Record<string, Stats> = {}
  for (const pt of propertyTypes) {
    byPropertyType[pt] = calcStats(projects.filter(p => p.property_type === pt))
  }

  // 紹介先別
  const referralSources = [...new Set(projects.map(p => p.referral_source).filter(Boolean))] as string[]
  const byReferralSource: Record<string, Stats> = {}
  for (const rs of referralSources) {
    byReferralSource[rs] = calcStats(projects.filter(p => p.referral_source === rs))
  }

  // 売上規模別
  const ranges = [
    { label: "〜500万", min: 0, max: 5_000_000 },
    { label: "500〜1000万", min: 5_000_000, max: 10_000_000 },
    { label: "1000〜3000万", min: 10_000_000, max: 30_000_000 },
    { label: "3000〜5000万", min: 30_000_000, max: 50_000_000 },
    { label: "5000万〜", min: 50_000_000, max: Infinity },
  ]
  const byRevenueRange: Record<string, Stats> = {}
  for (const r of ranges) {
    const ps = projects.filter(p => p.revenue_plan != null && p.revenue_plan >= r.min && p.revenue_plan < r.max)
    if (ps.length > 0) byRevenueRange[r.label] = calcStats(ps)
  }

  // 月別傾向
  const byMonth: Record<string, Stats> = {}
  for (let m = 1; m <= 12; m++) {
    const ps = projects.filter(p => matchMonth(p.completion_month, m))
    if (ps.length > 0) byMonth[`${m}月`] = calcStats(ps)
  }

  return Response.json({
    overall: calcStats(projects),
    byPropertyType,
    byReferralSource,
    byRevenueRange,
    byMonth,
    totalProjects: projects.length,
  })
}
