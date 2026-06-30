import Anthropic from "@anthropic-ai/sdk"
import { searchDocuments, buildContext } from "@/lib/search"
import { getAgent, type AgentId } from "@/lib/agents"
import { supabaseAdmin } from "@/lib/supabase"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildFinanceContext(query: string): Promise<string> {
  const db = supabaseAdmin()

  // Get all projects, sorted by term desc
  const { data } = await db
    .from("financial_projects")
    .select(
      "term_label,project_name,property_type,referral_source,revenue_plan,outsourcing_total,gross_profit,gross_profit_rate,labor_cost,net_profit,outsourcing_rate"
    )
    .order("term", { ascending: false })
    .limit(200)

  if (!data?.length) return ""

  const lines = data.map((p) => {
    const rev = p.revenue_plan ? `${Math.round(p.revenue_plan / 10000)}万円` : "—"
    const gp = p.gross_profit ? `${Math.round(p.gross_profit / 10000)}万円` : "—"
    const gpr = p.gross_profit_rate != null ? `${Number(p.gross_profit_rate).toFixed(1)}%` : "—"
    const lc = p.labor_cost ? `${Math.round(p.labor_cost / 10000)}万円` : "—"
    const np = p.net_profit ? `${Math.round(p.net_profit / 10000)}万円` : "—"
    const outr = p.outsourcing_rate != null ? `${Number(p.outsourcing_rate).toFixed(1)}%` : "—"
    return `[${p.term_label}] ${p.project_name} | ${p.property_type ?? ""} | 紹介:${p.referral_source ?? "—"} | 収入計画:${rev} | 粗利:${gp}(${gpr}) | 外注率:${outr} | 労務費:${lc} | 差引利益:${np}`
  })

  return lines.join("\n")
}

export async function POST(req: Request) {
  const { messages, sourceFilter, agentId } = await req.json()

  const agent = getAgent((agentId as AgentId) ?? "knowledge")
  const userQuery = messages.at(-1)?.content ?? ""

  let context = ""
  let sources: any[] = []

  if (agent.id === "finance") {
    context = await buildFinanceContext(userQuery)
  } else {
    const docs = await searchDocuments(userQuery, 8, sourceFilter ?? agent.sourceFilter)
    context = buildContext(docs)
    sources = docs.map((d) => ({
      source: d.source,
      project: d.project,
      title: d.title,
      updated_at: d.source_updated_at,
    }))
  }

  const systemWithContext = context
    ? `${agent.systemPrompt}\n\n【参照データ】\n${context}`
    : agent.systemPrompt

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemWithContext,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  return Response.json({
    answer: response.content[0].type === "text" ? response.content[0].text : "",
    sources,
    agent: agent.id,
  })
}
