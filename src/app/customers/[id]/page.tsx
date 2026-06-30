"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Check, Trash2, ChevronLeft, Sparkles, FileText, Plus, ExternalLink } from "lucide-react"

type Customer = {
  id: number
  name: string
  company: string | null
  type: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  next_action: string | null
  next_action_date: string | null
}

type Meeting = {
  id: number
  customer_id: number
  title: string
  meeting_date: string
  source_document_id: number | null
  summary: string | null
  agenda_items: { topic: string; content: string; status: string }[]
  action_items: { task: string; owner: string; due: string }[]
  slide_html: string | null
  created_at: string
}

type Project = {
  id: number
  project_name: string
  completion_month: string | null
  revenue: number | null
  gross_profit_rate: number | null
  result: string | null
}

type PlaudDoc = {
  id: number
  title: string
  source: string
  source_updated_at: string
}

const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [plaudDocs, setPlaudDocs] = useState<PlaudDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"info" | "meetings" | "projects">("info")

  // 打ち合わせ生成
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  async function load() {
    const [cRes, mRes, dRes] = await Promise.all([
      fetch(`/api/customers/${id}`),
      fetch(`/api/customers/${id}/meetings`),
      fetch(`/api/documents?source=plaud&limit=50`),
    ])
    const [c, m, d] = await Promise.all([cRes.json(), mRes.json(), dRes.json()])
    setCustomer(c)
    setMeetings(m ?? [])
    setPlaudDocs(Array.isArray(d) ? d : [])
    // 案件を顧客名で検索
    if (c?.name) {
      const pRes = await fetch(`/api/finance/projects?clientName=${encodeURIComponent(c.name)}&limit=100`)
      const p = await pRes.json()
      setProjects(Array.isArray(p?.projects) ? p.projects : [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSave() {
    if (!customer) return
    setSaving(true)
    await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDelete() {
    if (!customer) return
    if (!confirm(`「${customer.name}」を削除しますか？打ち合わせ記録もすべて削除されます。`)) return
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    router.push("/customers")
  }

  async function handleGenerateMeeting() {
    if (!selectedDocId) return
    setGenerating(true)
    const res = await fetch(`/api/customers/${id}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_document_id: selectedDocId, generate: true }),
    })
    const data = await res.json()
    setGenerating(false)
    setShowMeetingModal(false)
    if (res.ok) {
      router.push(`/customers/${id}/meetings/${data.id}`)
    }
  }

  function setField(k: keyof Customer, v: string | null) {
    setCustomer((prev) => prev ? { ...prev, [k]: v } : prev)
    setSaved(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
  if (!customer) return <div className="p-8 text-gray-500">顧客が見つかりません</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/customers")} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          {customer.company && <p className="text-xs text-gray-500 mt-0.5">{customer.company}</p>}
        </div>
        <button onClick={handleDelete} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { key: "info", label: "基本情報" },
          { key: "meetings", label: `打ち合わせ記録（${meetings.length}）` },
          { key: "projects", label: `関連案件（${projects.length}）` },
        ] as { key: typeof tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 基本情報タブ */}
      {tab === "info" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>名前</label>
              <input type="text" value={customer.name} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>種別</label>
              <select value={customer.type} onChange={(e) => setField("type", e.target.value)} className={inputCls}>
                <option>個人</option>
                <option>法人</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>会社名</label>
              <input type="text" value={customer.company ?? ""} onChange={(e) => setField("company", e.target.value || null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>電話番号</label>
              <input type="tel" value={customer.phone ?? ""} onChange={(e) => setField("phone", e.target.value || null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>メールアドレス</label>
              <input type="email" value={customer.email ?? ""} onChange={(e) => setField("email", e.target.value || null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>住所</label>
              <input type="text" value={customer.address ?? ""} onChange={(e) => setField("address", e.target.value || null)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-100">
            <div>
              <label className={labelCls}>次回アクション</label>
              <input type="text" value={customer.next_action ?? ""} onChange={(e) => setField("next_action", e.target.value || null)}
                placeholder="電話フォロー、見積送付 など" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>アクション期限</label>
              <input type="date" value={customer.next_action_date ?? ""} onChange={(e) => setField("next_action_date", e.target.value || null)} className={inputCls} />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelCls}>備考・メモ</label>
            <textarea value={customer.notes ?? ""} rows={3}
              onChange={(e) => setField("notes", e.target.value || null)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
              {saving ? "保存中" : saved ? "保存済み" : "保存する"}
            </button>
          </div>
        </div>
      )}

      {/* 打ち合わせ記録タブ */}
      {tab === "meetings" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowMeetingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Sparkles size={14} />
              Plaudから自動生成
            </button>
          </div>
          {meetings.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
              <p className="text-sm text-gray-400">打ち合わせ記録がありません</p>
              <p className="text-xs text-gray-400 mt-1">Plaudの音声記録からAIが自動で振り返り資料を生成します</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {meetings.map((m, i) => (
                <div key={m.id}
                  onClick={() => router.push(`/customers/${id}/meetings/${m.id}`)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < meetings.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <FileText size={16} className="text-gray-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{m.title}</p>
                    {m.summary && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.summary}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{m.meeting_date}</p>
                    <div className="flex items-center gap-2 mt-0.5 justify-end">
                      {m.action_items?.length > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                          TO {m.action_items.length}件
                        </span>
                      )}
                      {m.slide_html && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">資料あり</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-gray-300" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 関連案件タブ */}
      {tab === "projects" && (
        <div>
          {projects.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
              <p className="text-sm text-gray-400">「{customer.name}」名義の案件が見つかりません</p>
              <p className="text-xs text-gray-400 mt-1">案件の施主名と顧客名が一致する場合に表示されます</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">案件名</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">完成月</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">売上</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">粗利率</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => (
                    <tr key={p.id} className={i < projects.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.project_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.completion_month ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {p.revenue ? `${Math.round(p.revenue / 10000).toLocaleString()}万円` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {p.gross_profit_rate ? `${Number(p.gross_profit_rate).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Plaud選択モーダル */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Plaudドキュメントを選択</h2>
              <button onClick={() => setShowMeetingModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-xs text-gray-500 mb-3">取り込み済みのPlaud音声記録を選択すると、AIが打ち合わせ記録と振り返りスライドを自動生成します。</p>
              {plaudDocs.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Plaudドキュメントがありません<br /><span className="text-xs">「データ取込」からアップロードしてください</span></p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {plaudDocs.map((doc) => (
                    <label key={doc.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedDocId === String(doc.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}>
                      <input type="radio" name="plaud_doc" value={doc.id}
                        checked={selectedDocId === String(doc.id)}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                        className="text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400">{doc.source_updated_at?.slice(0, 10)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowMeetingModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">キャンセル</button>
              <button onClick={handleGenerateMeeting} disabled={generating || !selectedDocId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? "AI生成中..." : "自動生成する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
