"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, Printer, Trash2, ArrowLeft, Plus, X, FileText } from "lucide-react"

type TodoItem = {
  text: string
  assignee: string
  due_date: string
  done: boolean
}

type Minute = {
  id: number
  title: string
  meeting_date: string
  location: string
  attendees: string
  content: string
  decisions: string
  todos: TodoItem[]
}

const fmtJp = (s: string) => {
  if (!s) return ""
  const d = new Date(s)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"
const sectionCls = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100"

export default function MinuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [minute, setMinute] = useState<Minute | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [generatingSlide, setGeneratingSlide] = useState(false)
  const [slideError, setSlideError] = useState<string | null>(null)

  useEffect(() => { params.then((p) => setId(p.id)) }, [params])

  useEffect(() => {
    if (!id) return
    fetch(`/api/minutes/${id}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setMinute(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  function set<K extends keyof Minute>(k: K, v: Minute[K]) {
    setMinute((prev) => (prev ? { ...prev, [k]: v } : prev))
    setSaved(false)
  }

  function setTodo(idx: number, k: keyof TodoItem, v: string | boolean) {
    setMinute((prev) => {
      if (!prev) return prev
      const todos = prev.todos.map((t, i) => (i === idx ? { ...t, [k]: v } : t))
      return { ...prev, todos }
    })
    setSaved(false)
  }

  function addTodo() {
    setMinute((prev) => {
      if (!prev) return prev
      return { ...prev, todos: [...prev.todos, { text: "", assignee: "", due_date: "", done: false }] }
    })
    setSaved(false)
  }

  function removeTodo(idx: number) {
    setMinute((prev) => {
      if (!prev) return prev
      return { ...prev, todos: prev.todos.filter((_, i) => i !== idx) }
    })
    setSaved(false)
  }

  async function handleSave() {
    if (!minute || !id) return
    setSaving(true)
    await fetch(`/api/minutes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minute),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDelete() {
    if (!minute || !id) return
    if (!confirm(`「${minute.title}」を削除しますか？`)) return
    await fetch(`/api/minutes/${id}`, { method: "DELETE" })
    router.push("/minutes")
  }

  function handlePrint() {
    setTab("preview")
    setTimeout(() => window.print(), 200)
  }

  async function handleGenerateSlide() {
    if (!id) return
    setGeneratingSlide(true)
    setSlideError(null)
    try {
      const res = await fetch(`/api/minutes/${id}/slide`, { method: "POST" })
      if (!res.ok) throw new Error("生成に失敗しました")
      const html = await res.text()
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${minute?.title ?? "議事録"}_振り返り資料.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setSlideError(e.message ?? "エラーが発生しました")
    } finally {
      setGeneratingSlide(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-gray-300" size={32} />
    </div>
  )
  if (!minute) return <div className="p-8 text-center text-gray-500">議事録が見つかりません</div>

  const openTodos = minute.todos.filter((t) => !t.done)
  const doneTodos = minute.todos.filter((t) => t.done)

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } aside { display: none !important; } body { background: white; } }`}</style>

      <div className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="no-print px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
          <button onClick={() => router.push("/minutes")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{minute.title}</p>
            <p className="text-xs text-gray-400">{fmtJp(minute.meeting_date)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateSlide}
              disabled={generatingSlide}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {generatingSlide ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {generatingSlide ? "生成中..." : "資料生成"}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Printer size={13} />
              印刷・PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
              {saving ? "保存中" : saved ? "保存済み" : "保存する"}
            </button>
            <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* 資料生成エラー */}
        {slideError && (
          <div className="no-print px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 shrink-0">
            {slideError}
          </div>
        )}

        {/* タブ */}
        <div className="no-print flex border-b border-gray-200 bg-white shrink-0">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm transition-colors ${tab === t ? "border-b-2 border-blue-600 text-blue-700 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t === "edit" ? "編集" : "プレビュー"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {tab === "edit" ? (
            // ── 編集フォーム ──────────────────────────────────────────────────
            <div className="p-6 max-w-2xl mx-auto space-y-6">
              {/* 基本情報 */}
              <section>
                <h2 className={sectionCls}>基本情報</h2>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>タイトル</label>
                    <input type="text" value={minute.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>会議日</label>
                      <input type="date" value={minute.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>場所</label>
                      <input type="text" value={minute.location} onChange={(e) => set("location", e.target.value)} placeholder="会議室A、Zoom など" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>参加者</label>
                    <input type="text" value={minute.attendees} onChange={(e) => set("attendees", e.target.value)} placeholder="大岡、田中、山田（カンマ区切り）" className={inputCls} />
                  </div>
                </div>
              </section>

              {/* 議事内容 */}
              <section>
                <h2 className={sectionCls}>議事内容</h2>
                <textarea
                  value={minute.content}
                  onChange={(e) => set("content", e.target.value)}
                  rows={8}
                  placeholder={"・○○の件について議論\n・設計変更の確認\n・スケジュール調整"}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400"
                />
              </section>

              {/* 決定事項 */}
              <section>
                <h2 className={sectionCls}>決定事項</h2>
                <textarea
                  value={minute.decisions}
                  onChange={(e) => set("decisions", e.target.value)}
                  rows={4}
                  placeholder={"・設計図面を○○仕様に変更\n・次回打ち合わせは7月15日"}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400"
                />
              </section>

              {/* TODO */}
              <section>
                <h2 className={sectionCls}>TODO・アクションアイテム</h2>
                <div className="space-y-2">
                  {minute.todos.map((todo, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={(e) => setTodo(idx, "done", e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={todo.text}
                        onChange={(e) => setTodo(idx, "text", e.target.value)}
                        placeholder="タスク内容"
                        className={`flex-1 bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 ${todo.done ? "line-through text-gray-400" : ""}`}
                      />
                      <input
                        type="text"
                        value={todo.assignee}
                        onChange={(e) => setTodo(idx, "assignee", e.target.value)}
                        placeholder="担当"
                        className="w-20 bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                      />
                      <input
                        type="date"
                        value={todo.due_date}
                        onChange={(e) => setTodo(idx, "due_date", e.target.value)}
                        className="w-36 bg-white text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button onClick={() => removeTodo(idx)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addTodo} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={13} />
                  TODOを追加
                </button>
              </section>
            </div>
          ) : (
            // ── プレビュー ────────────────────────────────────────────────────
            <div className="p-8 flex justify-center">
              <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl p-10">
                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-1">株式会社 大岡成光建築事務所</p>
                  <h1 className="text-2xl font-bold text-gray-900">議　事　録</h1>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6 pb-6 border-b border-gray-200">
                  {[
                    ["会議名", minute.title],
                    ["日時", fmtJp(minute.meeting_date)],
                    ["場所", minute.location || "—"],
                    ["参加者", minute.attendees || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-gray-400 w-16 shrink-0">{label}</span>
                      <span className="text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>

                {minute.content && (
                  <div className="mb-6">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">議事内容</h2>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{minute.content}</p>
                  </div>
                )}

                {minute.decisions && (
                  <div className="mb-6 bg-blue-50 rounded-lg p-4">
                    <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">決定事項</h2>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{minute.decisions}</p>
                  </div>
                )}

                {minute.todos.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">TODO・アクションアイテム</h2>
                    {openTodos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-orange-600 font-medium mb-1.5">未完了（{openTodos.length}件）</p>
                        <div className="space-y-1.5">
                          {openTodos.map((todo, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0 inline-block" />
                              <span className="flex-1 text-gray-800">{todo.text}</span>
                              {todo.assignee && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{todo.assignee}</span>}
                              {todo.due_date && <span className="text-xs text-gray-400">{fmtJp(todo.due_date)}まで</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {doneTodos.length > 0 && (
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1.5">完了（{doneTodos.length}件）</p>
                        <div className="space-y-1.5">
                          {doneTodos.map((todo, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="w-4 h-4 rounded border-2 border-green-400 bg-green-100 shrink-0 inline-block" />
                              <span className="flex-1 line-through">{todo.text}</span>
                              {todo.assignee && <span className="text-xs px-2 py-0.5 rounded bg-gray-50">{todo.assignee}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
