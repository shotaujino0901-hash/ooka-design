import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get("q")

  const db = supabaseAdmin()
  let query = db.from("customers").select("*").order("updated_at", { ascending: false })
  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,company.ilike.%${keyword}%,email.ilike.%${keyword}%`)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("customers")
    .insert({
      name: body.name,
      company: body.company ?? null,
      type: body.type ?? "個人",
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      notes: body.notes ?? null,
      next_action: body.next_action ?? null,
      next_action_date: body.next_action_date ?? null,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
