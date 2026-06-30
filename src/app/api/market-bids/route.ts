import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get("region")
  const propertyType = searchParams.get("property_type")
  const keyword = searchParams.get("q")

  const db = supabaseAdmin()
  let query = db.from("market_bids").select("*").order("bid_date", { ascending: false }).limit(500)

  if (region) query = query.ilike("region", `%${region}%`)
  if (propertyType) query = query.eq("property_type", propertyType)
  if (keyword) {
    query = query.or(
      `project_name.ilike.%${keyword}%,client_name.ilike.%${keyword}%,winning_bidder.ilike.%${keyword}%`
    )
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("market_bids")
    .insert({
      bid_date: body.bid_date ?? new Date().toISOString().split("T")[0],
      project_name: body.project_name,
      property_type: body.property_type ?? null,
      client_name: body.client_name ?? null,
      region: body.region ?? null,
      winning_bidder: body.winning_bidder ?? null,
      winning_amount: Number(body.winning_amount) || 0,
      estimated_price: body.estimated_price ? Number(body.estimated_price) : null,
      source: body.source ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
