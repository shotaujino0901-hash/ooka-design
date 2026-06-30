"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, Printer, Trash2, ArrowLeft, Plus, X } from "lucide-react"

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type Invoice = {
  id: number
  invoice_number: string
  client_name: string
  client_postal_code: string
  client_address: string
  issue_date: string
  due_date: string | null
  items: InvoiceItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string
  status: "draft" | "sent" | "paid"
}

type Settings = {
  company_name: string
  postal_code: string
  address: string
  phone: string
  fax: string
  email: string
  invoice_registration_number: string
  bank_name: string
  branch_name: string
  account_type: string
  account_number: string
  account_holder: string
  payment_due_days: number
  invoice_notes: string
}

const STATUS_LABELS: Record<string, string> = { draft: "下書き", sent: "送付済み", paid: "入金済み" }
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
}
const NEXT_STATUS: Record<string, "draft" | "sent" | "paid"> = { draft: "sent", sent: "paid", paid: "draft" }
const NEXT_LABEL: Record<string, string> = { draft: "送付済みにする", sent: "入金済みにする", paid: "下書きに戻す" }

const fmtJp = (s: string | null | undefined) => {
  if (!s) return ""
  const d = new Date(s)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function recalc(items: InvoiceItem[], taxRate: number) {
  const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0)
  const tax_amount = Math.floor((subtotal * taxRate) / 100)
  const total = subtotal + tax_amount
  return { subtotal, tax_amount, total }
}

// ── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({
  invoice,
  setField,
  setItem,
  addItem,
  removeItem,
}: {
  invoice: Invoice
  setField: <K extends keyof Invoice>(k: K, v: Invoice[K]) => void
  setItem: (idx: number, k: keyof InvoiceItem, v: string | number) => void
  addItem: () => void
  removeItem: (idx: number) => void
}) {
  const inputCls = "w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
  const labelCls = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* 請求先 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          請求先
        </h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>会社名・お名前</label>
            <input
              type="text"
              value={invoice.client_name}
              onChange={(e) => setField("client_name", e.target.value)}
              placeholder="○○株式会社"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>郵便番号</label>
              <input
                type="text"
                value={invoice.client_postal_code}
                onChange={(e) => setField("client_postal_code", e.target.value)}
                placeholder="430-0000"
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>住所</label>
              <input
                type="text"
                value={invoice.client_address}
                onChange={(e) => setField("client_address", e.target.value)}
                placeholder="静岡県浜松市..."
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 日付 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          日付
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>発行日</label>
            <input
              type="date"
              value={invoice.issue_date}
              onChange={(e) => setField("issue_date", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>支払期日</label>
            <input
              type="date"
              value={invoice.due_date ?? ""}
              onChange={(e) => setField("due_date", e.target.value || null)}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* 品目 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          品目
        </h2>
        <div className="space-y-2">
          {invoice.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                {idx === 0 && <label className={labelCls}>品目・内容</label>}
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => setItem(idx, "description", e.target.value)}
                  placeholder="設計料"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className={labelCls}>数量</label>}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => setItem(idx, "quantity", Number(e.target.value))}
                  min={0}
                  className={inputCls}
                />
              </div>
              <div className="col-span-3">
                {idx === 0 && <label className={labelCls}>単価（円）</label>}
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => setItem(idx, "unit_price", Number(e.target.value))}
                  min={0}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2 flex items-end gap-1">
                <div className="flex-1">
                  {idx === 0 && <label className={labelCls}>金額</label>}
                  <div className={`${inputCls} bg-gray-50 text-right text-gray-700`}>
                    {item.amount.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className={`text-gray-300 hover:text-red-400 transition-colors shrink-0 ${idx === 0 ? "mt-5" : ""}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={13} />
          品目を追加
        </button>

        {/* 合計 */}
        <div className="mt-4 border-t border-gray-100 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">小計</span>
            <span className="text-gray-700">¥{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">消費税</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={invoice.tax_rate}
                  onChange={(e) => {
                    const tax_rate = Number(e.target.value)
                    const { subtotal, tax_amount, total } = recalc(invoice.items, tax_rate)
                    setField("tax_rate", tax_rate)
                    setField("subtotal", subtotal)
                    setField("tax_amount", tax_amount)
                    setField("total", total)
                  }}
                  min={0}
                  max={100}
                  className="w-14 bg-white text-gray-900 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <span className="text-gray-700">¥{invoice.tax_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
            <span className="text-gray-900">合計（税込）</span>
            <span className="text-gray-900">¥{invoice.total.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* 備考 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100">
          備考
        </h2>
        <textarea
          value={invoice.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
          placeholder="お振込の際は振込手数料をご負担ください。"
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400"
        />
      </section>
    </div>
  )
}

// ── Print Preview ────────────────────────────────────────────────────────────

function PrintPreview({ invoice, settings }: { invoice: Invoice; settings: Settings | null }) {
  const s = settings
  const hasBank = s?.bank_name || s?.branch_name || s?.account_number

  return (
    <div className="p-8 flex justify-center">
      <div
        id="invoice-print"
        className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl p-10 text-gray-900"
        style={{ minHeight: "297mm", fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif" }}
      >
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-center tracking-[0.3em] mb-8">請　求　書</h1>

        {/* ヘッダー2カラム */}
        <div className="flex justify-between mb-8">
          {/* 左：請求先 */}
          <div className="flex-1">
            {invoice.client_postal_code && (
              <p className="text-xs text-gray-500 mb-1">〒{invoice.client_postal_code}</p>
            )}
            {invoice.client_address && (
              <p className="text-xs text-gray-600 mb-2">{invoice.client_address}</p>
            )}
            <p className="text-lg font-bold border-b-2 border-gray-900 pb-1 inline-block pr-4">
              {invoice.client_name || "○○株式会社"} 御中
            </p>
          </div>

          {/* 右：発行者情報 */}
          <div className="text-right text-xs text-gray-600 space-y-0.5 ml-8 shrink-0">
            <p className="text-sm font-bold text-gray-900 mb-1">{s?.company_name ?? ""}</p>
            {s?.postal_code && <p>〒{s.postal_code}</p>}
            {s?.address && <p>{s.address}</p>}
            {s?.phone && <p>TEL: {s.phone}</p>}
            {s?.fax && <p>FAX: {s.fax}</p>}
            {s?.email && <p>{s.email}</p>}
            {s?.invoice_registration_number && (
              <p className="mt-1">登録番号 {s.invoice_registration_number}</p>
            )}
            <p className="mt-2">発行日: {fmtJp(invoice.issue_date)}</p>
            <p className="font-mono text-gray-500">No. {invoice.invoice_number}</p>
          </div>
        </div>

        {/* ご請求金額 */}
        <div className="border-2 border-gray-900 rounded-lg p-5 mb-6 text-center">
          <p className="text-xs text-gray-500 mb-1">ご請求金額（税込）</p>
          <p className="text-4xl font-bold tracking-wider">
            ¥{invoice.total.toLocaleString()}
          </p>
          {invoice.due_date && (
            <p className="text-xs text-gray-500 mt-2">
              お支払期日: <span className="font-medium text-gray-700">{fmtJp(invoice.due_date)}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4 text-center">下記のとおりご請求申し上げます。</p>

        {/* 品目テーブル */}
        <table className="w-full text-sm mb-4 border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left px-3 py-2 font-medium w-1/2">品目・内容</th>
              <th className="text-right px-3 py-2 font-medium w-16">数量</th>
              <th className="text-right px-3 py-2 font-medium">単価</th>
              <th className="text-right px-3 py-2 font-medium">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 border-b border-gray-100">{item.description || "　"}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right">{item.quantity}</td>
                <td className="px-3 py-2 border-b border-gray-100 text-right">
                  {item.unit_price.toLocaleString()}
                </td>
                <td className="px-3 py-2 border-b border-gray-100 text-right">
                  {item.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 合計 */}
        <div className="flex justify-end mb-6">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="px-4 py-1 text-gray-500 text-right">小計</td>
                <td className="px-4 py-1 text-right font-medium w-36">¥{invoice.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="px-4 py-1 text-gray-500 text-right">消費税（{invoice.tax_rate}%）</td>
                <td className="px-4 py-1 text-right font-medium">¥{invoice.tax_amount.toLocaleString()}</td>
              </tr>
              <tr className="border-t-2 border-gray-900">
                <td className="px-4 py-2 text-right font-bold">合計（税込）</td>
                <td className="px-4 py-2 text-right font-bold text-lg">¥{invoice.total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 備考 */}
        {invoice.notes && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">備考</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* 振込先 */}
        {hasBank && (
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">振込先</p>
            <p className="text-sm text-gray-800">
              {s?.bank_name} {s?.branch_name} {s?.account_type} {s?.account_number}
            </p>
            {s?.account_holder && (
              <p className="text-xs text-gray-600 mt-0.5">口座名義: {s.account_holder}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"edit" | "preview">("edit")

  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([inv, s]) => {
        if (!inv.error) {
          // Apply settings defaults for new invoices
          if (!inv.notes && s?.invoice_notes) inv.notes = s.invoice_notes
          if (!inv.due_date && s?.payment_due_days && inv.issue_date) {
            const d = new Date(inv.issue_date)
            d.setDate(d.getDate() + (s.payment_due_days || 30))
            inv.due_date = d.toISOString().split("T")[0]
          }
          setInvoice(inv)
        }
        setSettings(s)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function setField<K extends keyof Invoice>(k: K, v: Invoice[K]) {
    setInvoice((prev) => (prev ? { ...prev, [k]: v } : prev))
    setSaved(false)
  }

  function setItem(idx: number, k: keyof InvoiceItem, v: string | number) {
    setInvoice((prev) => {
      if (!prev) return prev
      const items = prev.items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [k]: v }
        if (k === "quantity" || k === "unit_price") {
          updated.amount = Number(updated.quantity) * Number(updated.unit_price)
        }
        return updated
      })
      return { ...prev, items, ...recalc(items, prev.tax_rate) }
    })
    setSaved(false)
  }

  function addItem() {
    setInvoice((prev) => {
      if (!prev) return prev
      const items = [...prev.items, { description: "", quantity: 1, unit_price: 0, amount: 0 }]
      return { ...prev, items, ...recalc(items, prev.tax_rate) }
    })
    setSaved(false)
  }

  function removeItem(idx: number) {
    setInvoice((prev) => {
      if (!prev) return prev
      const items = prev.items.filter((_, i) => i !== idx)
      return { ...prev, items, ...recalc(items, prev.tax_rate) }
    })
    setSaved(false)
  }

  async function handleSave() {
    if (!invoice || !id) return
    setSaving(true)
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleStatusChange() {
    if (!invoice || !id) return
    const next = NEXT_STATUS[invoice.status]
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) setField("status", next)
  }

  async function handleDelete() {
    if (!invoice || !id) return
    if (!confirm(`請求書 ${invoice.invoice_number} を削除しますか？`)) return
    await fetch(`/api/invoices/${id}`, { method: "DELETE" })
    router.push("/invoices")
  }

  function handlePrint() {
    setTab("preview")
    setTimeout(() => window.print(), 200)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    )
  }
  if (!invoice) {
    return <div className="p-8 text-center text-gray-500">請求書が見つかりません</div>
  }

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 no-print shrink-0">
          <button
            onClick={() => router.push("/invoices")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono text-sm text-gray-500">{invoice.invoice_number}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[invoice.status]}`}
            >
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleStatusChange}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {NEXT_LABEL[invoice.status]}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Printer size={13} />
              印刷・PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <Check size={13} />
              ) : null}
              {saving ? "保存中" : saved ? "保存済み" : "保存する"}
            </button>
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 bg-white no-print shrink-0">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "edit" ? "編集" : "プレビュー"}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto">
          {tab === "edit" ? (
            <EditForm
              invoice={invoice}
              setField={setField}
              setItem={setItem}
              addItem={addItem}
              removeItem={removeItem}
            />
          ) : (
            <PrintPreview invoice={invoice} settings={settings} />
          )}
        </div>
      </div>
    </>
  )
}
