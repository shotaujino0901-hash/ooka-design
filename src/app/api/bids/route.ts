import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const result = searchParams.get("result")
  const propertyType = searchParams.get("propertyType")
  const db = supabaseAdmin()
  let q = db.from("bids").select("*").order("bid_date", { ascending: false })
  if (result) q = q.eq("result", result)
  if (propertyType) q = q.eq("property_type", propertyType)
  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.from("bids").insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
