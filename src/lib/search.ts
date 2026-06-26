import { supabaseAdmin } from "./supabase"

export type SearchResult = {
  id: number
  source: string
  project: string | null
  title: string | null
  content: string
  tags: string[]
  source_updated_at: string | null
}

/**
 * キーワードでドキュメントを検索してRAGのコンテキストとして返す
 */
export async function searchDocuments(
  query: string,
  limit = 8,
  sourceFilter?: string[]
): Promise<SearchResult[]> {
  const db = supabaseAdmin()

  // 日本語対応：2〜4文字のN-gramで複数キーワードを生成
  const words = query.trim().split(/\s+/).filter(Boolean)
  const ngrams: string[] = []
  for (const w of words) {
    ngrams.push(w)
    // 3文字以上の単語はさらに分割してサブワードを追加
    if (w.length >= 4) {
      for (let i = 0; i <= w.length - 3; i++) {
        ngrams.push(w.slice(i, i + 3))
      }
    }
  }
  const uniqueNgrams = [...new Set(ngrams)].slice(0, 10)

  const baseQuery = () => {
    let q = db
      .from("documents")
      .select("id, source, project, title, content, tags, source_updated_at")
      .limit(limit)
    if (sourceFilter && sourceFilter.length > 0) {
      q = q.in("source", sourceFilter)
    }
    return q
  }

  // キーワード検索
  if (uniqueNgrams.length > 0) {
    const filter = uniqueNgrams.map((k) => `content.ilike.%${k}%`).join(",")
    const { data, error } = await baseQuery()
      .or(filter)
      .order("source_updated_at", { ascending: false })
    if (!error && data && data.length > 0) {
      return data as SearchResult[]
    }
  }

  // フォールバック：検索ゼロ件なら最新ドキュメントをそのまま返す
  const { data: fallback } = await baseQuery()
    .order("source_updated_at", { ascending: false })
  return (fallback ?? []) as SearchResult[]
}

export function buildContext(docs: SearchResult[]): string {
  return docs
    .map((d) => {
      const label = `[${d.source}] ${d.project ?? ""} / ${d.title ?? ""}`
      const date = d.source_updated_at ? ` (${d.source_updated_at.slice(0, 10)})` : ""
      return `--- ${label}${date} ---\n${d.content}`
    })
    .join("\n\n")
}
