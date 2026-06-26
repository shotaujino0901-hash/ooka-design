import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const db = supabaseAdmin()
  const { data: rows } = await db.from("documents").select("source")
  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    counts[row.source] = (counts[row.source] ?? 0) + 1
  }
  return Response.json(
    Object.entries(counts).map(([source, count]) => ({ source, count }))
  )
}
