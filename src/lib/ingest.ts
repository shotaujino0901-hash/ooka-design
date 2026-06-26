import { supabaseAdmin } from "./supabase"

export type DocInput = {
  source: string
  source_id: string
  project: string | null
  title: string | null
  content: string
  tags: string[]
  metadata: Record<string, unknown>
  source_updated_at: string | null
}

const CHUNK_SIZE = 1500
const OVERLAP = 200

export function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE - OVERLAP
  }
  return chunks
}

/**
 * ドキュメントをSupabaseに保存。同じsource_idがあればスキップ。
 */
export async function ingestDoc(doc: DocInput): Promise<void> {
  const db = supabaseAdmin()
  const chunks = chunkText(doc.content)

  for (let i = 0; i < chunks.length; i++) {
    const sid = chunks.length > 1 ? `${doc.source_id}#${i}` : doc.source_id

    const { data: existing } = await db
      .from("documents")
      .select("id")
      .eq("source_id", sid)
      .maybeSingle()

    if (existing) continue

    await db.from("documents").insert({
      source: doc.source,
      source_id: sid,
      project: doc.project,
      title: doc.title,
      content: chunks[i],
      tags: doc.tags,
      metadata: { ...doc.metadata, chunk_index: i },
      source_updated_at: doc.source_updated_at,
    })
  }
}
