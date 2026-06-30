import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from("app_settings").select("*").eq("id", 1).single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? {})
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("app_settings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
