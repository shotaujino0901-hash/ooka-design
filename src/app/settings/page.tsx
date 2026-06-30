"use client"

import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"

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

const DEFAULTS: Settings = {
  company_name: "株式会社 大岡成光建築事務所",
  postal_code: "434-0046",
  address: "静岡県浜松市浜名区染地台1-43-33",
  phone: "053-424-7100",
  fax: "053-424-7101",
  email: "",
  invoice_registration_number: "",
  bank_name: "",
  branch_name: "",
  account_type: "普通",
  account_number: "",
  account_holder: "",
  payment_due_days: 30,
  invoice_notes: "",
}

function Section({ title }: { title: string }) {
  return (
    <div className="col-span-2 pt-2">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">{title}</h2>
    </div>
  )
}

function Field({
  label, name, value, onChange, type = "text", placeholder = "", hint = ""
}: {
  label: string
  name: keyof Settings
  value: string | number
  onChange: (k: keyof Settings, v: string) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)) }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function set(k: keyof Settings, v: string) {
    setForm((f) => ({ ...f, [k]: k === "payment_due_days" ? Number(v) : v }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
          <p className="text-xs text-gray-500 mt-0.5">請求書などに使用する会社情報を管理します</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" />保存中...</>
          ) : saved ? (
            <><Check size={14} />保存しました</>
          ) : (
            "保存する"
          )}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-2 gap-4">

          <Section title="会社情報" />

          <div className="col-span-2">
            <Field label="会社名" name="company_name" value={form.company_name} onChange={set} placeholder="株式会社 ○○建築事務所" />
          </div>
          <Field label="郵便番号" name="postal_code" value={form.postal_code} onChange={set} placeholder="430-0000" />
          <div className="col-span-2">
            <Field label="住所" name="address" value={form.address} onChange={set} placeholder="静岡県浜松市..." />
          </div>
          <Field label="電話番号" name="phone" value={form.phone} onChange={set} placeholder="053-424-7100" />
          <Field label="FAX番号" name="fax" value={form.fax} onChange={set} placeholder="053-424-7181" />
          <div className="col-span-2">
            <Field label="メールアドレス" name="email" value={form.email} onChange={set} type="email" placeholder="info@example.com" />
          </div>
          <div className="col-span-2">
            <Field
              label="適格請求書発行事業者登録番号（インボイス番号）"
              name="invoice_registration_number"
              value={form.invoice_registration_number}
              onChange={set}
              placeholder="T-0000000000000"
              hint="登録していない場合は空欄のままで構いません"
            />
          </div>

          <Section title="振込先口座" />

          <Field label="銀行名" name="bank_name" value={form.bank_name} onChange={set} placeholder="○○銀行" />
          <Field label="支店名" name="branch_name" value={form.branch_name} onChange={set} placeholder="○○支店" />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">口座種別</label>
            <select
              value={form.account_type}
              onChange={(e) => set("account_type", e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="普通">普通</option>
              <option value="当座">当座</option>
            </select>
          </div>
          <Field label="口座番号" name="account_number" value={form.account_number} onChange={set} placeholder="1234567" />
          <div className="col-span-2">
            <Field label="口座名義（カナ）" name="account_holder" value={form.account_holder} onChange={set} placeholder="カ）オオオカセイコウケンチクジムショ" />
          </div>

          <Section title="請求書デフォルト設定" />

          <Field
            label="支払い期限（請求日から何日後）"
            name="payment_due_days"
            value={form.payment_due_days}
            onChange={set}
            type="number"
            hint="例）30 と入力すると「請求日の30日後」が支払期日になります"
          />
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">備考欄デフォルトテキスト</label>
            <textarea
              value={form.invoice_notes}
              onChange={(e) => set("invoice_notes", e.target.value)}
              rows={3}
              placeholder="お振込の際は振込手数料をご負担ください。"
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
