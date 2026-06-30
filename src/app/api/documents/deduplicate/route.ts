import { supabaseAdmin } from "@/lib/supabase"

// 同じ (source, title) で source_updated_at が複数ある = 重複アップロード
// 最新の source_updated_at を持つチャンク群を残して古いものを削除
export async function POST() {
  const db = supabaseAdmin()

  const { data: allDocs, error } = await db
    .from("documents")
    .select("id, source, title, source_updated_at")

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // (source, title) ごとに source_updated_at → id[] をグループ化
  const groups: Record<string, { dateMap: Record<string, number[]> }> = {}

  for (const doc of allDocs ?? []) {
    const key = `${doc.source}:::${doc.title ?? ""}`
    if (!groups[key]) groups[key] = { dateMap: {} }
    const dateKey = doc.source_updated_at ?? "null"
    if (!groups[key].dateMap[dateKey]) groups[key].dateMap[dateKey] = []
    groups[key].dateMap[dateKey].push(doc.id)
  }

  let deletedCount = 0

  for (const group of Object.values(groups)) {
    const dateEntries = Object.entries(group.dateMap).filter(([k]) => k !== "null")
    if (dateEntries.length <= 1) continue

    // 日付昇順 → 最新を残して古いものを削除
    dateEntries.sort(([a], [b]) => a.localeCompare(b))
    const idsToDelete = dateEntries.slice(0, -1).flatMap(([, ids]) => ids)
    if (idsToDelete.length === 0) continue

    const { error: delError } = await db.from("documents").delete().in("id", idsToDelete)
    if (delError) console.error("deduplicate delete error:", delError)
    else deletedCount += idsToDelete.length
  }

  return Response.json({ deletedCount })
}
