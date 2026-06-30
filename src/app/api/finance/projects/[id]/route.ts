import { supabaseAdmin } from "@/lib/supabase"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const update: Record<string, any> = { ...body }

  // 派生値の再計算
  const rev = update.revenue_plan
  const out = update.outsourcing_total
  const gp = update.gross_profit
  const lc = update.labor_cost

  if (rev != null && out != null) {
    update.outsourcing_rate = rev > 0 ? (out / rev) * 100 : 0
  }
  if (rev != null && gp != null) {
    update.gross_profit_rate = rev > 0 ? (gp / rev) * 100 : 0
  }
  if (gp != null && lc != null) {
    update.net_profit = gp - lc
  }
  const np = update.net_profit
  if (np != null && rev != null) {
    update.net_profit_rate = rev > 0 ? (np / (rev / 1.1)) * 100 : 0
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from("financial_projects")
    .update(update)
    .eq("id", parseInt(id))
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ project: data })
}
