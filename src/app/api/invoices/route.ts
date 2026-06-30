import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("invoices")
    .select("id,invoice_number,client_name,issue_date,due_date,total,status")
    .order("created_at", { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()

  // 請求書番号を自動採番: YYYYMM-NNN
  const now = new Date()
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const { count } = await db
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .like("invoice_number", `${prefix}-%`)
  const seq = String((count ?? 0) + 1).padStart(3, "0")
  const invoice_number = `${prefix}-${seq}`

  const { data, error } = await db
    .from("invoices")
    .insert({ ...body, invoice_number })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
