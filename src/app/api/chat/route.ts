import Anthropic from "@anthropic-ai/sdk"
import { searchDocuments, buildContext } from "@/lib/search"
import { getAgent, type AgentId } from "@/lib/agents"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { messages, sourceFilter, agentId } = await req.json()

  const agent = getAgent((agentId as AgentId) ?? "knowledge")
  const userQuery = messages.at(-1)?.content ?? ""

  const docs = await searchDocuments(
    userQuery,
    8,
    sourceFilter ?? agent.sourceFilter
  )
  const context = buildContext(docs)

  const systemWithContext = context
    ? `${agent.systemPrompt}\n\n【参照資料】\n${context}`
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
    sources: docs.map((d) => ({
      source: d.source,
      project: d.project,
      title: d.title,
      updated_at: d.source_updated_at,
    })),
    agent: agent.id,
  })
}
