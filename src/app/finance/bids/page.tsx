"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2, Pencil, Trash2, X, Check, Upload, AlertCircle } from "lucide-react"

const PROPERTY_TYPES = [
  "事業系木造", "事業系非木造", "住宅木造", "住宅非木造",
  "官公庁", "太陽光", "アパート賃貸", "駐車場",
]

const RESULT_LABELS: Record<string, string> = { won: "受注", lost: "失注", pending: "検討中" }
const RESULT_COLORS: Record<string, string> = {
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
}

type Bid = {
  id: number
  bid_date: string
  project_name: string
  property_type: string | null
  client_name: string | null
  referral_source: string | null
  bid_amount: number
  competitor_amount: number | null
  result: "won" | "lost" | "pending"
  loss_reason: string | null
  notes: string | null
}

const EMPTY_FORM = {
  bid_date: new Date().toISOString().split("T")[0],
  project_name: "",
  property_type: "",
  client_name: "",
  referral_source: "",
  bid_amount: "",
  competitor_amount: "",
  result: "pending" as const,
  loss_reason: "",
  notes: "",
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 10000).toLocaleString()}万円`

const fmtDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

export default function BidsPage() {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterResult, setFilterResult] = useState("")
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [importError, setImportError] = useState("")
  const [showImport, setShowImport] = useState(false)

  function load() {
    setLoading(true)
    const url = filterResult ? `/api/bids?result=${filterResult}` : "/api/bids"
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setBids(d ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterResult])

  function openNew() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(bid: Bid) {
    setForm({
      bid_date: bid.bid_date,
      project_name: bid.project_name,
      property_type: bid.property_type ?? "",
      client_name: bid.client_name ?? "",
      referral_source: bid.referral_source ?? "",
      bid_amount: bid.bid_amount ? String(Math.round(bid.bid_amount / 10000)) : "",
      competitor_amount: bid.competitor_amount ? String(Math.round(bid.competitor_amount / 10000)) : "",
      result: bid.result,
      loss_reason: bid.loss_reason ?? "",
      notes: bid.notes ?? "",
    })
    setEditId(bid.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.project_name.trim() || !form.bid_amount) return
    setSaving(true)
    const payload = {
      bid_date: form.bid_date,
      project_name: form.project_name,
      property_type: form.property_type || null,
      client_name: form.client_name || null,
      referral_source: form.referral_source || null,
      bid_amount: Number(form.bid_amount) * 10000,
      competitor_amount: form.competitor_amount ? Number(form.competitor_amount) * 10000 : null,
      result: form.result,
      loss_reason: form.loss_reason || null,
      notes: form.notes || null,
    }
    if (editId) {
      await fetch(`/api/bids/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleImportPreview(file: File) {
    setImporting(true)
    setImportError("")
    setImportPreview(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "false")
    const res = await fetch("/api/bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setImportError(data.error ?? "エラーが発生しました"); return }
    setImportPreview(data.records ?? [])
  }

  async function handleImportSave(file: File) {
    setImporting(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "true")
    const res = await fetch("/api/bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      setShowImport(false)
      setImportPreview(null)
      load()
      alert(`${data.saved}件の入札記録をインポートしました`)
    } else {
      setImportError(data.error ?? "エラーが発生しました")
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/bids/${id}`, { method: "DELETE" })
    load()
  }

  // 統計
  const won = bids.filter((b) => b.result === "won")
  const lost = bids.filter((b) => b.result === "lost")
  const winRate = (won.length + lost.length) > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100)
    : null
  const avgWonAmount = won.length > 0
    ? won.reduce((s, b) => s + b.bid_amount, 0) / won.length
    : null
  const avgLostAmount = lost.length > 0
    ? lost.reduce((s, b) => s + b.bid_amount, 0) / lost.length
    : null

  const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
  const labelCls = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">入札記録</h1>
          <p className="text-xs text-gray-500 mt-0.5">過去の入札データを蓄積して予測精度を高めます</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImport(true); setImportPreview(null); setImportError("") }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload size={14} />
            Excel/PDFから取り込み
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            手動追加
          </button>
        </div>
      </div>

      {/* 統計サマリー */}
      {bids.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "総入札数", value: `${bids.length}件`, color: "text-gray-900" },
            { label: "受注率", value: winRate != null ? `${winRate}%` : "—", color: winRate != null && winRate >= 70 ? "text-green-700" : "text-orange-700" },
            { label: "受注平均金額", value: fmt(avgWonAmount), color: "text-green-700" },
            { label: "失注平均金額", value: fmt(avgLostAmount), color: "text-red-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "", label: "すべて" },
          { key: "won", label: "受注のみ" },
          { key: "lost", label: "失注のみ" },
          { key: "pending", label: "検討中" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterResult(key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterResult === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : bids.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-sm text-gray-400 mb-1">入札記録がまだありません</p>
          <button onClick={openNew} className="text-xs text-blue-600 hover:underline">
            最初の入札記録を追加 →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">入札日</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">案件名</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">物件種類</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">入札金額</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">競合金額</th>
                <th className="text-center px-4 py-2.5 text-xs text-gray-500 font-medium">結果</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {bids.map((bid, i) => (
                <tr key={bid.id} className={i < bids.length - 1 ? "border-b border-gray-50" : ""}>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(bid.bid_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{bid.project_name}</p>
                    {bid.loss_reason && (
                      <p className="text-xs text-red-400 mt-0.5">{bid.loss_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{bid.property_type ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(bid.bid_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(bid.competitor_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESULT_COLORS[bid.result]}`}>
                      {RESULT_LABELS[bid.result]}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(bid)} className="text-gray-300 hover:text-blue-500 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(bid.id, bid.project_name)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* インポートモーダル */}
      {showImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Excel / PDF から取り込み</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6">
              {!importPreview ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    入札記録が入ったExcel（.xlsx）またはPDF（.pdf）をアップロードしてください。<br />
                    AIが自動で案件・金額・結果を読み取ります。
                  </p>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 transition-colors">
                    {importing ? (
                      <><Loader2 size={24} className="animate-spin text-blue-400 mb-2" /><p className="text-sm text-gray-500">AIが読み取り中...</p></>
                    ) : (
                      <><Upload size={24} className="text-gray-300 mb-2" /><p className="text-sm text-gray-500">クリックしてファイルを選択</p><p className="text-xs text-gray-400 mt-1">.xlsx / .xls / .pdf</p></>
                    )}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportPreview(f) }}
                    />
                  </label>
                  {importError && (
                    <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
                      <AlertCircle size={14} />{importError}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold text-blue-700">{importPreview.length}件</span>の入札記録を読み取りました。内容を確認して保存してください。
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 font-medium text-gray-500">案件名</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">物件種類</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-500">入札金額</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-500">結果</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">入札日</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((r, i) => (
                          <tr key={i} className={i < importPreview.length - 1 ? "border-b border-gray-50" : ""}>
                            <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{r.project_name}</td>
                            <td className="px-3 py-2 text-gray-500">{r.property_type ?? "—"}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{r.bid_amount ? `${Math.round(r.bid_amount / 10000)}万` : "—"}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full font-medium ${RESULT_COLORS[r.result as string] ?? "bg-gray-100 text-gray-500"}`}>
                                {RESULT_LABELS[r.result as string] ?? r.result}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-400">{r.bid_date ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportPreview(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      やり直す
                    </button>
                    <button
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = ".xlsx,.xls,.pdf"
                        input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleImportSave(f) }
                        input.click()
                      }}
                      disabled={importing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {importing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      {importPreview.length}件を保存する
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 入力フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editId ? "入札記録を編集" : "入札記録を追加"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>入札日</label>
                  <input type="date" value={form.bid_date} onChange={(e) => setForm((f) => ({ ...f, bid_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>結果</label>
                  <select value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value as any }))} className={inputCls}>
                    <option value="pending">検討中</option>
                    <option value="won">受注</option>
                    <option value="lost">失注</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>案件名 <span className="text-red-400">*</span></label>
                <input type="text" value={form.project_name} onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))} placeholder="○○新築工事" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>物件種類</label>
                  <select value={form.property_type} onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value }))} className={inputCls}>
                    <option value="">選択</option>
                    {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>施主名</label>
                  <input type="text" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="○○様" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>紹介先・ルート</label>
                <input type="text" value={form.referral_source} onChange={(e) => setForm((f) => ({ ...f, referral_source: e.target.value }))} placeholder="直接、工務店、不動産 など" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>入札金額（万円）<span className="text-red-400">*</span></label>
                  <input type="number" value={form.bid_amount} onChange={(e) => setForm((f) => ({ ...f, bid_amount: e.target.value }))} placeholder="1500" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>競合金額（万円）</label>
                  <input type="number" value={form.competitor_amount} onChange={(e) => setForm((f) => ({ ...f, competitor_amount: e.target.value }))} placeholder="わかれば" className={inputCls} />
                </div>
              </div>

              {form.result === "lost" && (
                <div>
                  <label className={labelCls}>失注理由</label>
                  <input type="text" value={form.loss_reason} onChange={(e) => setForm((f) => ({ ...f, loss_reason: e.target.value }))} placeholder="価格、他社、白紙など" className={inputCls} />
                </div>
              )}

              <div>
                <label className={labelCls}>備考</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.project_name.trim() || !form.bid_amount}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
