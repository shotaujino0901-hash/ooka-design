import { supabaseAdmin } from "@/lib/supabase"

function percentile(arr: number[], p: number): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const propertyType = searchParams.get("property_type")
  const region = searchParams.get("region")

  const db = supabaseAdmin()
  let query = db.from("market_bids").select("*")
  if (propertyType) query = query.eq("property_type", propertyType)
  if (region) query = query.ilike("region", `%${region}%`)

  const { data } = await query
  const bids = data ?? []
  const amounts = bids.map((b: any) => b.winning_amount).filter(Boolean) as number[]
  const withEstimated = bids.filter((b: any) => b.estimated_price && b.winning_amount)
  const winRates = withEstimated.map((b: any) => (b.winning_amount / b.estimated_price) as number)

  const bidderCounts: Record<string, number> = {}
  for (const b of bids) {
    if ((b as any).winning_bidder) {
      const name = (b as any).winning_bidder as string
      bidderCounts[name] = (bidderCounts[name] ?? 0) + 1
    }
  }
  const topBidders = Object.entries(bidderCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  return Response.json({
    count: bids.length,
    avgWinningAmount: amounts.length > 0 ? Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length) : null,
    minWinningAmount: amounts.length > 0 ? Math.min(...amounts) : null,
    maxWinningAmount: amounts.length > 0 ? Math.max(...amounts) : null,
    p25WinningAmount: amounts.length > 0 ? Math.round(percentile(amounts, 25) ?? 0) : null,
    p75WinningAmount: amounts.length > 0 ? Math.round(percentile(amounts, 75) ?? 0) : null,
    medianWinningAmount: amounts.length > 0 ? Math.round(percentile(amounts, 50) ?? 0) : null,
    avgEstimatedPrice: withEstimated.length > 0
      ? Math.round(withEstimated.reduce((s: number, b: any) => s + b.estimated_price, 0) / withEstimated.length)
      : null,
    avgWinRate: winRates.length > 0
      ? Math.round(winRates.reduce((s, v) => s + v, 0) / winRates.length * 1000) / 10
      : null,
    topBidders,
  })
}
