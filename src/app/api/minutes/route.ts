import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")
  const db = supabaseAdmin()
  let query = db
    .from("meeting_minutes")
    .select("id,title,meeting_date,location,attendees,decisions,todos,created_at")
    .order("meeting_date", { ascending: false })
  if (q) query = query.or(`title.ilike.%${q}%,attendees.ilike.%${q}%,content.ilike.%${q}%,decisions.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("meeting_minutes")
    .insert(body)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
