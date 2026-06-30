"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ChevronLeft, Printer, Check, Trash2, Sparkles } from "lucide-react"

type AgendaItem = { topic: string; content: string; status: string }
type ActionItem = { task: string; owner: string; due: string }

type Meeting = {
  id: number
  customer_id: number
  title: string
  meeting_date: string
  summary: string | null
  agenda_items: AgendaItem[]
  action_items: ActionItem[]
  slide_html: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  "確認済み": "bg-green-100 text-green-700",
  "要確認": "bg-yellow-100 text-yellow-700",
  "継続": "bg-gray-100 text-gray-600",
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = use(params)
  const router = useRouter()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"preview" | "slide">("preview")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/customers/${id}/meetings/${mid}`)
      .then((r) => r.json())
      .then((d) => { setMeeting(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id, mid])

  async function handleDelete() {
    if (!meeting) return
    if (!confirm(`「${meeting.title}」を削除しますか？`)) return
    await fetch(`/api/customers/${id}/meetings/${mid}`, { method: "DELETE" })
    router.push(`/customers/${id}`)
  }

  async function handleSave() {
    if (!meeting) return
    setSaving(true)
    await fetch(`/api/customers/${id}/meetings/${mid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meeting),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handlePrint() {
    if (!meeting?.slide_html) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(meeting.slide_html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 500)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  if (!meeting) return <div className="p-8 text-gray-500">記録が見つかりません</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/customers/${id}`)} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{meeting.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{meeting.meeting_date}</p>
        </div>
        <div className="flex items-center gap-2">
          {meeting.slide_html && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer size={14} />
              印刷（PDF）
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saving ? "保存中" : saved ? "保存済み" : "保存する"}
          </button>
          <button onClick={handleDelete} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { key: "preview", label: "打ち合わせ内容" },
          { key: "slide", label: "振り返りスライド（A4）" },
        ] as { key: typeof tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {key === "slide" && <Sparkles size={12} className="inline mr-1" />}
            {label}
          </button>
        ))}
      </div>

      {/* 打ち合わせ内容タブ */}
      {tab === "preview" && (
        <div className="space-y-5">
          {/* サマリー */}
          {meeting.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">打ち合わせ概要</p>
              <p className="text-sm text-blue-900 leading-relaxed">{meeting.summary}</p>
            </div>
          )}

          {/* 確認事項 */}
          {meeting.agenda_items?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">確認事項</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {meeting.agenda_items.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-800">{item.topic}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションアイテム */}
          {meeting.action_items?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">次回アクション</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {meeting.action_items.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{item.task}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.owner === "弊社" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {item.owner}
                    </span>
                    <p className="text-xs text-gray-400 shrink-0 w-24 text-right">{item.due}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* スライドタブ */}
      {tab === "slide" && (
        <div>
          {meeting.slide_html ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">A4印刷対応のプレビューです。「印刷（PDF）」ボタンで保存できます。</p>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ minHeight: "297mm" }}>
                <iframe
                  srcDoc={meeting.slide_html}
                  className="w-full"
                  style={{ height: "297mm", border: "none" }}
                  title="打ち合わせ振り返り資料"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
              <Sparkles size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">スライドが生成されていません</p>
              <p className="text-xs text-gray-400 mt-1">Plaudから自動生成するとA4スライドが作成されます</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
