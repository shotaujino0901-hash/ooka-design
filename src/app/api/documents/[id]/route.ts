import { supabaseAdmin } from "@/lib/supabase"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = supabaseAdmin()

  const { error } = await db.from("documents").delete().eq("id", parseInt(id))
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
