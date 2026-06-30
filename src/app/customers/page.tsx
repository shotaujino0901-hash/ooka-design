"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Search, X, Check, User, Building2, AlertCircle, Download, Upload } from "lucide-react"

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

type ImportRecord = {
  name: string
  company: string | null
  type: string
  phone: string | null
  email: string | null
}

const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"

const EMPTY: Omit<Customer, "id"> = {
  name: "", company: null, type: "個人", phone: null, email: null,
  address: null, notes: null, next_action: null, next_action_date: null,
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  // インポート
  const importFileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportRecord[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSaving, setImportSaving] = useState(false)
  const importFileCache = useRef<File | null>(null)

  // エクスポート
  const [exporting, setExporting] = useState(false)

  function load() {
    setLoading(true)
    const url = keyword ? `/api/customers?q=${encodeURIComponent(keyword)}` : "/api/customers"
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setCustomers(d ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [keyword])

  function setField(k: string, v: string | null) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setShowAdd(false)
      setForm({ ...EMPTY })
      router.push(`/customers/${data.id}`)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/customers/export")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `customers_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    setImportError(null)
    setImportPreview(null)
    importFileCache.current = file
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "false")
    const res = await fetch("/api/customers/import", { method: "POST", body: fd })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setImportError(data.error ?? "エラーが発生しました"); return }
    setImportPreview(data.records ?? [])
  }

  async function handleImportSave() {
    const file = importFileCache.current
    if (!file) return
    setImportSaving(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "true")
    const res = await fetch("/api/customers/import", { method: "POST", body: fd })
    const data = await res.json()
    setImportSaving(false)
    if (res.ok) {
      setImportPreview(null)
      if (importFileRef.current) importFileRef.current.value = ""
      load()
    } else {
      setImportError(data.error ?? "保存に失敗しました")
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const withAction = customers.filter((c) => c.next_action_date)
  const overdue = withAction.filter((c) => c.next_action_date! < today)
  const upcoming = withAction.filter((c) =>
    c.next_action_date! >= today &&
    c.next_action_date! <= new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">顧客管理</h1>
          <p className="text-xs text-gray-500 mt-0.5">施主・法人の情報・案件・打ち合わせを一元管理</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            エクスポート
          </button>
          <label className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${importing ? "opacity-50 cursor-wait" : ""}`}>
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            インポート
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f) }}
            />
          </label>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            顧客を追加
          </button>
        </div>
      </div>

      {/* インポートプレビュー */}
      {importPreview && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-5">
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-semibold text-blue-700">{importPreview.length}件</span>を読み取りました。確認して保存してください。
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">名前</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">会社名</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">種別</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">電話</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">メール</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((r, i) => (
                  <tr key={i} className={i < importPreview.length - 1 ? "border-b border-gray-50" : ""}>
                    <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                    <td className="px-3 py-2 text-gray-500">{r.company ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{r.type}</td>
                    <td className="px-3 py-2 text-gray-500">{r.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{r.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setImportPreview(null); if (importFileRef.current) importFileRef.current.value = "" }}
              className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleImportSave}
              disabled={importSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {importSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {importPreview.length}件を保存
            </button>
          </div>
          {importError && <p className="mt-2 text-xs text-red-600">{importError}</p>}
        </div>
      )}
      {importError && !importPreview && (
        <p className="mb-4 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />{importError}
        </p>
      )}

      {/* アクションアラート */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={13} className="text-red-500" />
                <p className="text-xs font-semibold text-red-700">期限切れアクション {overdue.length}件</p>
              </div>
              {overdue.slice(0, 3).map((c) => (
                <p key={c.id} className="text-xs text-red-600 cursor-pointer hover:underline" onClick={() => router.push(`/customers/${c.id}`)}>
                  {c.name}：{c.next_action}
                </p>
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={13} className="text-yellow-600" />
                <p className="text-xs font-semibold text-yellow-700">今週のアクション {upcoming.length}件</p>
              </div>
              {upcoming.slice(0, 3).map((c) => (
                <p key={c.id} className="text-xs text-yellow-700 cursor-pointer hover:underline" onClick={() => router.push(`/customers/${c.id}`)}>
                  {c.name}：{c.next_action}（{c.next_action_date}）
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 検索 */}
      <div className="relative mb-4 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="名前・会社名・メール"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
        />
      </div>

      {/* 顧客リスト */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-sm text-gray-400">顧客が登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">「顧客を追加」または「インポート」で登録してください</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {customers.map((c, i) => (
            <div
              key={c.id}
              onClick={() => router.push(`/customers/${c.id}`)}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < customers.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                {c.type === "法人" ? <Building2 size={16} className="text-blue-600" /> : <User size={16} className="text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{c.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                </div>
              </div>
              {c.next_action && (
                <div className={`text-right shrink-0 max-w-48 ${c.next_action_date && c.next_action_date < today ? "text-red-600" : "text-gray-500"}`}>
                  <p className="text-xs font-medium truncate">{c.next_action}</p>
                  {c.next_action_date && <p className="text-xs">{c.next_action_date}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 追加モーダル */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">顧客を追加</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>名前 *</label>
                  <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)}
                    placeholder="山田 太郎" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>種別</label>
                  <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={inputCls}>
                    <option>個人</option>
                    <option>法人</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>会社名</label>
                <input type="text" value={form.company ?? ""} onChange={(e) => setField("company", e.target.value || null)}
                  placeholder="（法人の場合）" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>電話番号</label>
                  <input type="tel" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value || null)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>メール</label>
                  <input type="email" value={form.email ?? ""} onChange={(e) => setField("email", e.target.value || null)} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">キャンセル</button>
              <button onClick={handleAdd} disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                追加して詳細へ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
