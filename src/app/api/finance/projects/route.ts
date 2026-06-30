import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.project_name) return Response.json({ error: "project_name is required" }, { status: 400 })
  if (!body.term) return Response.json({ error: "term is required" }, { status: 400 })

  const rev = Number(body.revenue_plan) || 0
  const out = Number(body.outsourcing_total) || 0
  const gp = Number(body.gross_profit) || 0
  const lc = Number(body.labor_cost) || 0

  const outsourcing_rate = rev > 0 ? (out / rev) * 100 : 0
  const gross_profit_rate = rev > 0 ? (gp / rev) * 100 : 0
  const net_profit = gp - lc
  const net_profit_rate = rev > 0 ? (net_profit / (rev / 1.1)) * 100 : 0

  const db = supabaseAdmin()
  const { data, error } = await db
    .from("financial_projects")
    .insert({
      term: Number(body.term),
      term_label: body.term_label ?? `第${body.term}期`,
      fiscal_year_end: body.fiscal_year_end ?? "",
      project_name: body.project_name,
      work_type: body.work_type || null,
      completion_month: body.completion_month || null,
      property_type: body.property_type || null,
      referral_source: body.referral_source || null,
      client_name: body.client_name || null,
      revenue_plan: rev,
      outsourcing_total: out,
      gross_profit: gp,
      gross_profit_rate,
      labor_cost: lc,
      net_profit,
      outsourcing_rate,
      net_profit_rate,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ project: data })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const term = searchParams.get("term")
  const propertyType = searchParams.get("propertyType")
  const referralSource = searchParams.get("referralSource")
  const completionMonth = searchParams.get("completionMonth")
  const clientName = searchParams.get("clientName")
  const sort = searchParams.get("sort") ?? "gross_profit_rate"
  const order = searchParams.get("order") ?? "desc"
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 1000)

  const db = supabaseAdmin()
  let query = db.from("financial_projects").select("*")

  if (term) query = query.eq("term", parseInt(term))
  if (propertyType) query = query.eq("property_type", propertyType)
  if (referralSource) query = query.eq("referral_source", referralSource)
  if (completionMonth) query = query.ilike("completion_month", `%${completionMonth}%`)
  if (clientName) query = query.ilike("client_name", `%${clientName}%`)

  query = query.order(sort as any, { ascending: order === "asc" }).limit(limit)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ projects: data ?? [] })
}
