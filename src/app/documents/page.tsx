"use client"

import { useState, useEffect } from "react"
import { Search, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 100

type Doc = {
  id: number
  source: string
  project: string
  title: string
  tags: string[]
  source_updated_at: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  scrapbox: "Scrapbox",
  chatwork: "Chatwork",
  limitless: "Limitless",
  plaud: "Plaud",
  upload: "アップロード",
}

const SOURCE_COLORS: Record<string, string> = {
  scrapbox: "bg-green-100 text-green-700",
  chatwork: "bg-blue-100 text-blue-700",
  limitless: "bg-purple-100 text-purple-700",
  plaud: "bg-orange-100 text-orange-700",
  upload: "bg-gray-100 text-gray-700",
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState("")
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [deletingTitles, setDeletingTitles] = useState<Set<string>>(new Set())
  const [deduplicating, setDeduplicating] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  async function search(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(p * PAGE_SIZE) })
      if (q) params.set("q", q)
      if (source) params.set("source", source)
      const res = await fetch(`/api/documents?${params}`)
      const json = await res.json()
      setDocs(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search(page) }, [source, page])

  function goPage(p: number) {
    setPage(p)
  }

  function handleSearch() {
    setPage(0)
    search(0)
  }

  function baseTitle(title: string) {
    return title.replace(/#\d+$/, "").trim()
  }

  // 同じ (source, title) で source_updated_at が複数種類 = 重複アップロード
  const duplicateTitles: Set<string> = (() => {
    const seen: Record<string, Set<string>> = {}
    for (const doc of docs) {
      const key = `${doc.source}::${baseTitle(doc.title)}`
      if (!seen[key]) seen[key] = new Set()
      seen[key].add(doc.source_updated_at ?? "null")
    }
    const dupes = new Set<string>()
    for (const [key, dates] of Object.entries(seen)) {
      if (dates.size > 1) dupes.add(key)
    }
    return dupes
  })()

  async function deleteOne(id: number) {
    setDeletingIds((s) => new Set(s).add(id))
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`削除エラー: ${data.error ?? res.status}`)
        return
      }
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } finally {
      setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }

  async function deleteByTitle(doc: Doc) {
    const key = `${doc.source}::${baseTitle(doc.title)}`
    setDeletingTitles((s) => new Set(s).add(key))
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: baseTitle(doc.title), source: doc.source }),
    })
    setDocs((prev) => prev.filter((d) => !(d.source === doc.source && baseTitle(d.title) === baseTitle(doc.title))))
    setDeletingTitles((s) => { const n = new Set(s); n.delete(key); return n })
  }

  async function deleteAllByQuery() {
    if (!q) return
    if (!confirm(`「${q}」を含むタイトルのドキュメントをすべて削除しますか？`)) return
    setBulkDeleting(true)
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleLike: q }),
      })
      await search()
    } finally {
      setBulkDeleting(false)
    }
  }

  async function deduplicateAll() {
    setDeduplicating(true)
    try {
      const res = await fetch("/api/documents/deduplicate", { method: "POST" })
      const data = await res.json()
      if (data.deletedCount > 0) await search()
    } finally {
      setDeduplicating(false)
    }
  }

  const hasDuplicates = duplicateTitles.size > 0

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">ドキュメント一覧</h1>
        <div className="flex items-center gap-2">
          {hasDuplicates && (
            <div className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
              <AlertTriangle size={14} />
              <span>重複が{duplicateTitles.size}件検出されました</span>
            </div>
          )}
          <button
            onClick={deduplicateAll}
            disabled={deduplicating}
            className="text-xs font-medium bg-orange-600 text-white rounded-lg px-3 py-1.5 hover:bg-orange-700 disabled:opacity-40 whitespace-nowrap"
          >
            {deduplicating ? "整理中..." : "重複を整理する"}
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            placeholder="タイトル・本文を検索..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <select
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">全ソース</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          検索
        </button>
        {q && docs.length > 0 && (
          <button
            onClick={deleteAllByQuery}
            disabled={bulkDeleting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            {bulkDeleting ? "削除中..." : `「${q}」を全削除`}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400">ドキュメントがありません。まず「データ同期」でデータを取り込んでください。</p>
      ) : (
        <>
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>全 {total.toLocaleString()} 件 / {page * PAGE_SIZE + 1}〜{Math.min((page + 1) * PAGE_SIZE, total)} 件表示</span>
          <div className="flex items-center gap-1">
            <button onClick={() => goPage(page - 1)} disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">{page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button onClick={() => goPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {docs.map((doc) => {
            const key = `${doc.source}::${baseTitle(doc.title)}`
            const isDuplicate = duplicateTitles.has(key)
            const isDeleting = deletingIds.has(doc.id)
            const isDeletingTitle = deletingTitles.has(key)
            return (
              <div
                key={doc.id}
                className={`bg-white border rounded-lg px-4 py-3 ${isDuplicate ? "border-orange-200 bg-orange-50/30" : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[doc.source] ?? "bg-gray-100 text-gray-700"}`}>
                        {SOURCE_LABELS[doc.source] ?? doc.source}
                      </span>
                      {doc.project && <span className="text-xs text-gray-400">{doc.project}</span>}
                      {isDuplicate && (
                        <span className="text-xs text-orange-500 font-medium">重複の可能性</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title || "（タイトルなし）"}</p>
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {doc.tags.slice(0, 5).map((tag, i) => (
                          <span key={i} className="text-xs text-gray-400">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.source_updated_at && (
                      <span className="text-xs text-gray-400">{doc.source_updated_at.slice(0, 10)}</span>
                    )}
                    {isDuplicate && (
                      <button
                        onClick={() => deleteByTitle(doc)}
                        disabled={isDeletingTitle}
                        className="text-xs text-orange-600 border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-100 disabled:opacity-40 whitespace-nowrap"
                      >
                        {isDeletingTitle ? "削除中..." : "まとめて削除"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteOne(doc.id)}
                      disabled={isDeleting}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="このチャンクを削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {total > PAGE_SIZE && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button onClick={() => goPage(page - 1)} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={14} /> 前へ
            </button>
            <span className="text-sm text-gray-500">{page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
            <button onClick={() => goPage(page + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              次へ <ChevronRight size={14} />
            </button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
