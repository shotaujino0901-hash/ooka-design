"use client"

import { useState, useEffect } from "react"
import { Loader2, X, Check, Trash2, Plus, Search } from "lucide-react"

const PROPERTY_TYPES = [
  "事業系木造", "事業系非木造", "住宅木造", "住宅非木造",
  "官公庁", "太陽光", "アパート賃貸", "駐車場",
]

type MarketBid = {
  id: number
  bid_date: string
  project_name: string
  property_type: string | null
  client_name: string | null
  region: string | null
  winning_bidder: string | null
  winning_amount: number
  estimated_price: number | null
  source: string | null
  notes: string | null
}

type FormData = Omit<MarketBid, "id"> & { id?: number }

const EMPTY_FORM: FormData = {
  bid_date: new Date().toISOString().split("T")[0],
  project_name: "",
  property_type: null,
  client_name: null,
  region: null,
  winning_bidder: null,
  winning_amount: 0,
  estimated_price: null,
  source: null,
  notes: null,
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 10000).toLocaleString()}万円`

const fmtDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

const calcWinRate = (winning: number, estimated: number | null) =>
  estimated && estimated > 0 ? `${Math.round((winning / estimated) * 100)}%` : "—"

const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"

export default function MarketBidsPage() {
  const [bids, setBids] = useState<MarketBid[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [filterRegion, setFilterRegion] = useState("")
  const [filterPropertyType, setFilterPropertyType] = useState("")
  const [modal, setModal] = useState<{ mode: "add" | "edit"; form: FormData } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function buildUrl() {
    const params = new URLSearchParams()
    if (keyword) params.set("q", keyword)
    if (filterRegion) params.set("region", filterRegion)
    if (filterPropertyType) params.set("property_type", filterPropertyType)
    return `/api/market-bids?${params}`
  }

  function load() {
    setLoading(true)
    fetch(buildUrl())
      .then((r) => r.json())
      .then((d) => { setBids(d ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [keyword, filterRegion, filterPropertyType])

  function openAdd() {
    setModal({ mode: "add", form: { ...EMPTY_FORM } })
    setSaved(false)
  }

  function openEdit(bid: MarketBid) {
    setModal({ mode: "edit", form: { ...bid } })
    setSaved(false)
  }

  function closeModal() { setModal(null) }

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setModal((prev) => prev ? { ...prev, form: { ...prev.form, [k]: v } } : prev)
    setSaved(false)
  }

  async function handleSave() {
    if (!modal) return
    setSaving(true)
    const form = modal.form
    const body = {
      ...form,
      winning_amount: Number(form.winning_amount),
      estimated_price: form.estimated_price ? Number(form.estimated_price) : null,
    }
    if (modal.mode === "add") {
      await fetch("/api/market-bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } else {
      await fetch(`/api/market-bids/${(form as MarketBid).id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setSaved(true)
    if (modal.mode === "add") {
      setTimeout(() => { closeModal(); load() }, 800)
    } else {
      setTimeout(() => setSaved(false), 3000)
      load()
    }
  }

  async function handleDelete() {
    if (!modal || modal.mode !== "edit") return
    const form = modal.form as MarketBid
    if (!confirm(`「${form.project_name}」を削除しますか？`)) return
    await fetch(`/api/market-bids/${form.id}`, { method: "DELETE" })
    closeModal()
    load()
  }

  const avgWinningAmount = bids.length > 0
    ? bids.reduce((s, b) => s + b.winning_amount, 0) / bids.length : null
  const withRate = bids.filter((b) => b.estimated_price && b.estimated_price > 0)
  const avgWinRateNum = withRate.length > 0
    ? withRate.reduce((s, b) => s + b.winning_amount / b.estimated_price!, 0) / withRate.length * 100 : null
  const propertyTypeCount = new Set(bids.map((b) => b.property_type).filter(Boolean)).size

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">市場入札データ（落札実績）</h1>
        <p className="text-xs text-gray-500 mt-0.5">公開入札結果をもとに市場価格を把握します。入札予測の主要参照データです</p>
      </div>

      {bids.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "総件数", value: `${bids.length}件`, color: "text-gray-900" },
            { label: "物件種類数", value: `${propertyTypeCount}種類`, color: "text-gray-900" },
            { label: "平均落札金額", value: fmt(avgWinningAmount), color: "text-blue-700" },
            { label: "平均落札率", value: avgWinRateNum != null ? `${avgWinRateNum.toFixed(1)}%` : "—", color: "text-gray-800" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="案件名・落札者・発注者"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
          />
        </div>
        <input
          type="text"
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          placeholder="地域で絞り込み"
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-36 placeholder:text-gray-400"
        />
        <select
          value={filterPropertyType}
          onChange={(e) => setFilterPropertyType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
        >
          <option value="">全物件種類</option>
          {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
        </select>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          手動入力
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : bids.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
          <p className="text-sm text-gray-400">市場入札データがありません</p>
          <p className="text-xs text-gray-400 mt-1">「データ取込」からExcel・PDFを取り込むか、「手動入力」で追加してください</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">入札日</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">案件名</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">地域</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">物件種類</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">落札者</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">落札金額</th>
                <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">落札率</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid, i) => (
                <tr
                  key={bid.id}
                  onClick={() => openEdit(bid)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${i < bids.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(bid.bid_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{bid.project_name}</p>
                    {bid.client_name && <p className="text-xs text-gray-400 mt-0.5">{bid.client_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{bid.region ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{bid.property_type ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{bid.winning_bidder ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(bid.winning_amount)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">{calcWinRate(bid.winning_amount, bid.estimated_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 truncate pr-4">
                {modal.mode === "add" ? "落札実績を追加" : modal.form.project_name}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>入札日</label>
                  <input type="date" value={modal.form.bid_date}
                    onChange={(e) => setField("bid_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>物件種類</label>
                  <select value={modal.form.property_type ?? ""}
                    onChange={(e) => setField("property_type", e.target.value || null)} className={inputCls}>
                    <option value="">—</option>
                    {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>案件名</label>
                <input type="text" value={modal.form.project_name}
                  onChange={(e) => setField("project_name", e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>地域</label>
                  <input type="text" value={modal.form.region ?? ""}
                    onChange={(e) => setField("region", e.target.value || null)}
                    placeholder="浜松市、静岡市 など" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>発注者</label>
                  <input type="text" value={modal.form.client_name ?? ""}
                    onChange={(e) => setField("client_name", e.target.value || null)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>落札者</label>
                <input type="text" value={modal.form.winning_bidder ?? ""}
                  onChange={(e) => setField("winning_bidder", e.target.value || null)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>落札金額（万円）</label>
                  <input type="number"
                    value={modal.form.winning_amount ? Math.round(modal.form.winning_amount / 10000) : ""}
                    onChange={(e) => setField("winning_amount", Number(e.target.value) * 10000)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>予定価格（万円）</label>
                  <input type="number"
                    value={modal.form.estimated_price ? Math.round(modal.form.estimated_price / 10000) : ""}
                    onChange={(e) => setField("estimated_price", e.target.value ? Number(e.target.value) * 10000 : null)}
                    placeholder="わかれば" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>データソース</label>
                <input type="text" value={modal.form.source ?? ""}
                  onChange={(e) => setField("source", e.target.value || null)}
                  placeholder="○○市入札結果公表、手入力 など" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>備考</label>
                <textarea value={modal.form.notes ?? ""} rows={2}
                  onChange={(e) => setField("notes", e.target.value || null)}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              {modal.mode === "edit" && (
                <button onClick={handleDelete} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={closeModal} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                閉じる
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
                {saving ? "保存中" : saved ? "保存済み" : modal.mode === "add" ? "追加する" : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
