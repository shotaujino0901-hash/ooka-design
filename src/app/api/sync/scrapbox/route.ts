import { ingestDoc, chunkText } from "@/lib/ingest"

const BASE = "https://scrapbox.io/api"

function getProjects(): string[] {
  const names = process.env.SCRAPBOX_PROJECT_NAMES ?? ""
  return names.split(",").map((s) => s.trim()).filter(Boolean)
}

function headers(): Record<string, string> {
  const sid = process.env.SCRAPBOX_CONNECT_SID
  return sid ? { Cookie: `connect.sid=${sid}` } : {}
}

async function fetchPages(project: string): Promise<{ title: string; updated: number }[]> {
  const pages: { title: string; updated: number }[] = []
  let skip = 0
  while (true) {
    const res = await fetch(`${BASE}/pages/${encodeURIComponent(project)}?skip=${skip}&limit=100`, {
      headers: headers(),
    })
    if (!res.ok) break
    const data = await res.json()
    pages.push(...(data.pages ?? []))
    if ((data.pages ?? []).length < 100) break
    skip += 100
  }
  return pages
}

async function fetchPageContent(project: string, title: string): Promise<{ lines?: { text: string }[]; tags?: string[] } | null> {
  const res = await fetch(
    `${BASE}/pages/${encodeURIComponent(project)}/${encodeURIComponent(title)}`,
    { headers: headers() }
  )
  if (!res.ok) return null
  return res.json()
}

function extractTags(lines: { text: string }[]): string[] {
  const tags = new Set<string>()
  for (const line of lines) {
    for (const word of line.text.split(/\s+/)) {
      if (word.startsWith("#")) tags.add(word.slice(1))
    }
  }
  return [...tags]
}

export async function POST() {
  const projects = getProjects()
  let total = 0
  const byProject: Record<string, number> = {}

  for (const project of projects) {
    const pages = await fetchPages(project)
    let count = 0

    for (const pageMeta of pages) {
      const page = await fetchPageContent(project, pageMeta.title)
      if (!page) continue

      const lines = page.lines ?? []
      const content = lines.map((l) => l.text).join("\n").trim()
      if (!content) continue

      const tags = extractTags(lines)
      const updatedAt = pageMeta.updated
        ? new Date(pageMeta.updated * 1000).toISOString()
        : null

      await ingestDoc({
        source: "scrapbox",
        source_id: `${project}/${pageMeta.title}`,
        project,
        title: pageMeta.title,
        content,
        tags,
        metadata: { project },
        source_updated_at: updatedAt,
      })
      count++
    }

    byProject[project] = count
    total += count
  }

  return Response.json({ status: "ok", total, by_project: byProject })
}
