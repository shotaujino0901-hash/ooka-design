import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get("source")
  const q = searchParams.get("q")
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200)
  const offset = Number(searchParams.get("offset") ?? "0")

  const db = supabaseAdmin()
  let query = db
    .from("documents")
    .select("id, source, project, title, tags, source_updated_at")
    .order("source_updated_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (source) query = query.eq("source", source)
  if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
