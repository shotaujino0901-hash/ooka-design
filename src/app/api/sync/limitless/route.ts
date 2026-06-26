import { ingestDoc } from "@/lib/ingest"

const BASE = "https://api.limitless.ai/v1"

function headers() {
  return { "X-API-Key": process.env.LIMITLESS_API_KEY ?? "" }
}

export async function POST() {
  let synced = 0
  let cursor: string | undefined

  while (true) {
    const params = new URLSearchParams({
      limit: "50",
      includeMarkdown: "true",
      includeHeadings: "true",
    })
    if (cursor) params.set("cursor", cursor)

    const res = await fetch(`${BASE}/lifelogs?${params}`, { headers: headers() })
    if (!res.ok) break

    const data = await res.json()
    const lifelogs: {
      id: string
      title: string
      markdown: string
      startTime: string
    }[] = data?.data?.lifelogs ?? []
    const nextCursor: string | undefined = data?.meta?.lifelogs?.nextCursor

    for (const log of lifelogs) {
      const content = log.markdown?.trim()
      if (!content) continue
      const date = log.startTime
        ? new Date(log.startTime).toISOString()
        : null

      await ingestDoc({
        source: "limitless",
        source_id: log.id,
        project: "Limitless AI",
        title: log.title ?? "Lifelog",
        content,
        tags: ["lifelog", "limitless"],
        metadata: { lifelog_id: log.id },
        source_updated_at: date,
      })
      synced++
    }

    if (!nextCursor) break
    cursor = nextCursor
  }

  return Response.json({ status: "ok", synced })
}
