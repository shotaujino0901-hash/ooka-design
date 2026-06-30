import { supabaseAdmin } from "@/lib/supabase"

function calcStats(subset: any[]) {
  const won = subset.filter((b) => b.result === "won")
  const lost = subset.filter((b) => b.result === "lost")
  const decided = won.length + lost.length
  const competitorAmounts = lost.filter((b) => b.competitor_amount).map((b) => b.competitor_amount as number)
  return {
    count: subset.length,
    wonCount: won.length,
    lostCount: lost.length,
    pendingCount: subset.filter((b) => b.result === "pending").length,
    winRate: decided > 0 ? Math.round((won.length / decided) * 100) : null,
    avgWonAmount: won.length > 0 ? Math.round(won.reduce((s, b) => s + b.bid_amount, 0) / won.length) : null,
    avgLostAmount: lost.length > 0 ? Math.round(lost.reduce((s, b) => s + b.bid_amount, 0) / lost.length) : null,
    avgCompetitorAmount: competitorAmounts.length > 0
      ? Math.round(competitorAmounts.reduce((s, v) => s + v, 0) / competitorAmounts.length)
      : null,
    lossReasons: [...new Set(lost.map((b) => b.loss_reason).filter(Boolean))] as string[],
  }
}

export async function GET() {
  try {
    const db = supabaseAdmin()
    const { data } = await db.from("bids").select("*").order("bid_date", { ascending: false })
    const bids = data ?? []

    const overall = calcStats(bids)

    const propertyTypes = [...new Set(bids.map((b) => b.property_type).filter(Boolean))] as string[]
    const byPropertyType: Record<string, ReturnType<typeof calcStats>> = {}
    for (const pt of propertyTypes) {
      byPropertyType[pt] = calcStats(bids.filter((b) => b.property_type === pt))
    }

    return Response.json({ overall, byPropertyType, totalBids: bids.length })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
