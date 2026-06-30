"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Search, FileText, ChevronRight, LayoutList, CalendarDays, CheckSquare } from "lucide-react"

type TodoItem = { text: string; assignee: string; due_date: string; done: boolean }

type Minute = {
  id: number
  title: string
  meeting_date: string
  location: string
  attendees: string
  decisions: string
  todos: TodoItem[]
  created_at: string
}

const fmtDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const fmtDateShort = (s: string) => {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function MinutesPage() {
  const router = useRouter()
  const [minutes, setMinutes] = useState<Minute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"list" | "timeline">("timeline")
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: "",
    meeting_date: new Date().toISOString().split("T")[0],
  })

  function load(q = "") {
    setLoading(true)
    const url = q ? `/api/minutes?q=${encodeURIComponent(q)}` : "/api/minutes"
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setMinutes(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleCreate() {
    if (!form.title.trim()) return
    setCreating(true)
    const res = await fetch("/api/minutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        meeting_date: form.meeting_date,
        todos: [],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/minutes/${data.id}`)
    }
    setCreating(false)
  }

  // タイムライン用: 年月でグループ化
  const grouped = minutes.reduce<Record<string, Minute[]>>((acc, m) => {
    const d = new Date(m.meeting_date)
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const openTodos = (m: Minute) => m.todos.filter((t) => !t.done).length
  const totalTodos = (m: Minute) => m.todos.length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">議事録</h1>
          <p className="text-xs text-gray-500 mt-0.5">{minutes.length}件</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          新規作成
        </button>
      </div>

      {/* 検索・ビュー切り替え */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・参加者・内容で検索"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView("timeline")}
            className={`p-1.5 rounded-md transition-colors ${view === "timeline" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
          >
            <CalendarDays size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
          >
            <LayoutList size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      ) : minutes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
          <FileText size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-1">
            {search ? `"${search}" の検索結果はありません` : "議事録がまだありません"}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 hover:underline">
              最初の議事録を作成 →
            </button>
          )}
        </div>
      ) : view === "timeline" ? (
        // タイムラインビュー
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthKey, items]) => (
            <div key={monthKey}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{monthKey}</h2>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-2">
                  {items.map((m) => (
                    <div key={m.id} className="relative">
                      <div className="absolute -left-[15px] top-3.5 w-2 h-2 rounded-full bg-blue-400 border-2 border-white" />
                      <div
                        onClick={() => router.push(`/minutes/${m.id}`)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-gray-400 shrink-0">{fmtDateShort(m.meeting_date)}</span>
                              <span className="font-medium text-gray-800 truncate">{m.title}</span>
                            </div>
                            {m.attendees && (
                              <p className="text-xs text-gray-400 truncate">{m.attendees}</p>
                            )}
                            {m.decisions && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{m.decisions}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {totalTodos(m) > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${openTodos(m) > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                TODO {openTodos(m) > 0 ? `${openTodos(m)}件未完` : "完了"}
                              </span>
                            )}
                            <ChevronRight size={14} className="text-gray-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // リストビュー
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">タイトル</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">日付</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">参加者</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">TODO</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {minutes.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/minutes/${m.id}`)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${i < minutes.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{m.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(m.meeting_date)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{m.attendees || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {totalTodos(m) > 0 ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${openTodos(m) > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                        {openTodos(m)}/{totalTodos(m)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-gray-300"><ChevronRight size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">新規議事録</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  タイトル<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="○○打ち合わせ、定例会議 など"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">会議日</label>
                <input
                  type="date"
                  value={form.meeting_date}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating && <Loader2 size={13} className="animate-spin" />}
                作成して編集
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
