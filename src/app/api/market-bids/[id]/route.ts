import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("market_bids")
    .update({
      bid_date: body.bid_date,
      project_name: body.project_name,
      property_type: body.property_type ?? null,
      client_name: body.client_name ?? null,
      region: body.region ?? null,
      winning_bidder: body.winning_bidder ?? null,
      winning_amount: Number(body.winning_amount),
      estimated_price: body.estimated_price ? Number(body.estimated_price) : null,
      source: body.source ?? null,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()
  const { error } = await db.from("market_bids").delete().eq("id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
