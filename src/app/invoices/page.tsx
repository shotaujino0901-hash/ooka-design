"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, FileText, ChevronRight } from "lucide-react"

type Invoice = {
  id: number
  invoice_number: string
  client_name: string
  issue_date: string
  due_date: string | null
  total: number
  status: "draft" | "sent" | "paid"
}

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  sent: "送付済み",
  paid: "入金済み",
}
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
}

const fmtDate = (s: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    client_name: "",
    issue_date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!form.client_name.trim()) return
    setCreating(true)
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: form.client_name,
        issue_date: form.issue_date,
        items: [{ description: "", quantity: 1, unit_price: 0, amount: 0 }],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/invoices/${data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">請求書</h1>
          <p className="text-xs text-gray-500 mt-0.5">{invoices.length}件</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          新規作成
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-gray-300" size={32} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 text-center">
          <FileText size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-1">請求書がまだありません</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            最初の請求書を作成 →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">請求書番号</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">請求先</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">発行日</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">支払期日</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">金額（税込）</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">ステータス</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${i < invoices.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.client_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    ¥{inv.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-gray-300">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">新規請求書</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  請求先（会社名・お名前）<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="○○株式会社"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">発行日</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
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
                disabled={creating || !form.client_name.trim()}
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
