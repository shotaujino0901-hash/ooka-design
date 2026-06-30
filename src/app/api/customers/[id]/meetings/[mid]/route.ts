import { supabaseAdmin } from "@/lib/supabase"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("customer_meetings")
    .select("*")
    .eq("id", mid)
    .eq("customer_id", id)
    .single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("customer_meetings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", mid)
    .eq("customer_id", id)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params
  const db = supabaseAdmin()
  const { error } = await db
    .from("customer_meetings")
    .delete()
    .eq("id", mid)
    .eq("customer_id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
