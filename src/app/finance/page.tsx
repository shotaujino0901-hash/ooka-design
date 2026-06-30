"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Upload, TrendingUp, Loader2, ChevronUp, ChevronDown, AlertCircle, X, Pencil, Check } from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts"

const fmt = (n: number | null | undefined) => {
  if (n == null) return "—"
  return `${Math.round(n / 10000).toLocaleString()}万円`
}
const fmtPct = (n: number | null | undefined) => {
  if (n == null) return "—"
  return `${Number(n).toFixed(1)}%`
}

const PROPERTY_COLORS: Record<string, string> = {
  "事業系非木造": "#3b82f6",
  "事業系木造": "#6366f1",
  "住宅木造": "#8b5cf6",
  "住宅非木造": "#a855f7",
  "官公庁": "#06b6d4",
  "太陽光": "#f59e0b",
  "アパート賃貸": "#10b981",
  "駐車場": "#94a3b8",
  "定期報告": "#64748b",
}

type Project = {
  id: number
  term: number
  term_label: string
  project_name: string
  work_type: string | null
  completion_month: string | null
  property_type: string | null
  referral_source: string | null
  client_name: string | null
  revenue_plan: number | null
  outsourcing_total: number | null
  gross_profit: number | null
  gross_profit_rate: number | null
  labor_cost: number | null
  net_profit: number | null
  outsourcing_rate: number | null
  net_profit_rate: number | null
}

type TermStat = {
  term: number
  termLabel: string
  fiscalYearEnd: string
  count: number
  revenue: number
  grossProfit: number
  laborCost: number
  netProfit: number
  outsourcingTotal: number
  grossProfitRate: number
  laborCostRate: number
  netProfitRate: number
  outsourcingRate: number
}

type Stats = {
  termStats: TermStat[]
  propertyTypeStats: any[]
  referralStats: any[]
  predictions: any[]
  totals: any
  empty?: boolean
}

type SortKey = "term" | "gross_profit_rate" | "revenue_plan" | "gross_profit" | "net_profit" | "outsourcing_rate" | "labor_cost" | "net_profit_rate"

// ── 案件詳細・編集モーダル ──────────────────────────────────────
function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: (updated: Project) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    project_name: project.project_name,
    property_type: project.property_type ?? "",
    referral_source: project.referral_source ?? "",
    client_name: project.client_name ?? "",
    completion_month: project.completion_month ?? "",
    work_type: project.work_type ?? "",
    revenue_plan: project.revenue_plan ?? 0,
    outsourcing_total: project.outsourcing_total ?? 0,
    gross_profit: project.gross_profit ?? 0,
    labor_cost: project.labor_cost ?? 0,
  })

  const marginalProfit =
    project.gross_profit != null && project.labor_cost != null
      ? project.gross_profit - project.labor_cost
      : project.net_profit
  const marginalProfitRate =
    marginalProfit != null && project.revenue_plan != null && project.revenue_plan > 0
      ? (marginalProfit / (project.revenue_plan / 1.1)) * 100
      : null

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/finance/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        revenue_plan: Number(form.revenue_plan),
        outsourcing_total: Number(form.outsourcing_total),
        gross_profit: Number(form.gross_profit),
        labor_cost: Number(form.labor_cost),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!data.error) {
      onSaved(data.project)
      setEditing(false)
    }
  }

  const Field = ({ label, name, type = "text" }: { label: string; name: keyof typeof form; type?: string }) => (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={form[name] as string | number}
          onChange={(e) => setForm((f) => ({ ...f, [name]: type === "number" ? e.target.value : e.target.value }))}
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      ) : (
        <p className="text-gray-800 font-medium text-sm">{(form[name] as string) || "—"}</p>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-400">{project.term_label}</p>
            {editing ? (
              <input
                value={form.project_name}
                onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                className="w-full text-base font-bold text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <h2 className="text-base font-bold text-gray-900 mt-0.5 leading-snug">{form.project_name}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                保存
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200"
              >
                <Pencil size={12} />
                編集
              </button>
            )}
            {editing && (
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs">キャンセル</button>
            )}
            {!editing && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="物件種類" name="property_type" />
            <Field label="業務内容" name="work_type" />
            <Field label="紹介先" name="referral_source" />
            <Field label="氏名・担当者" name="client_name" />
            <Field label="完成月" name="completion_month" />
          </div>

          {/* 収支 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">収支情報</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="収入計画（税込）" name="revenue_plan" type="number" />
              <Field label="外注費合計" name="outsourcing_total" type="number" />
              <Field label="粗利益" name="gross_profit" type="number" />
              <Field label="労務費" name="labor_cost" type="number" />
            </div>

            {!editing && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                {[
                  { label: "外注比率", value: project.outsourcing_rate != null ? fmtPct(project.outsourcing_rate) : "—" },
                  { label: "粗利益率", value: fmtPct(project.gross_profit_rate) },
                  { label: "労務費", value: fmt(project.labor_cost) },
                  { label: "限界利益（差引利益）", value: fmt(marginalProfit), highlight: true },
                  { label: "限界利益率", value: fmtPct(marginalProfitRate), highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className={`text-xs ${highlight ? "text-blue-600 font-semibold" : "text-gray-500"}`}>{label}</p>
                    <p className={`font-bold ${highlight ? "text-blue-700" : "text-gray-800 text-sm"}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────────
export default function FinancePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [activeTerm, setActiveTerm] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("term")
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [statsRes, projRes] = await Promise.all([
      fetch("/api/finance/stats"),
      fetch(`/api/finance/projects?sort=${sortKey}&order=${sortAsc ? "asc" : "desc"}&limit=500`),
    ])
    const [statsData, projData] = await Promise.all([statsRes.json(), projRes.json()])
    setStats(statsData)
    setProjects(projData.projects ?? [])
    setLoading(false)
  }, [sortKey, sortAsc])

  useEffect(() => { load() }, [load])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/finance/import", { method: "POST", body: fd })
    const data = await res.json()
    if (data.error) setImportResult(`エラー: ${data.error}`)
    else { setImportResult(`インポート完了: ${data.total}件`); await load() }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function handleSaved(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedProject(updated)
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp size={11} className="inline ml-0.5" /> : <ChevronDown size={11} className="inline ml-0.5" />
      : null

  // フィルタ + 検索
  const q = searchQuery.toLowerCase()
  const filteredProjects = projects.filter((p) => {
    if (activeTerm != null && p.term !== activeTerm) return false
    if (!q) return true
    return (
      p.project_name.toLowerCase().includes(q) ||
      (p.referral_source ?? "").toLowerCase().includes(q) ||
      (p.client_name ?? "").toLowerCase().includes(q) ||
      (p.property_type ?? "").toLowerCase().includes(q)
    )
  })

  const currentTermStat = activeTerm != null ? stats?.termStats.find((t) => t.term === activeTerm) : null
  const kpis = currentTermStat
    ? { revenue: currentTermStat.revenue, grossProfit: currentTermStat.grossProfit, netProfit: currentTermStat.netProfit, grossProfitRate: currentTermStat.grossProfitRate, count: currentTermStat.count }
    : stats?.totals
    ? { revenue: stats.totals.revenue, grossProfit: stats.totals.grossProfit, netProfit: stats.totals.netProfit, grossProfitRate: stats.totals.avgGrossProfitRate, count: stats.totals.count }
    : null

  const activePropertyStats = activeTerm != null
    ? (() => {
        const map: Record<string, { count: number; revenue: number; grossProfit: number }> = {}
        filteredProjects.forEach((p) => {
          const k = p.property_type ?? "その他"
          if (!map[k]) map[k] = { count: 0, revenue: 0, grossProfit: 0 }
          map[k].count++
          map[k].revenue += p.revenue_plan ?? 0
          map[k].grossProfit += p.gross_profit ?? 0
        })
        return Object.entries(map).map(([k, v]) => ({ propertyType: k, ...v })).sort((a, b) => b.revenue - a.revenue)
      })()
    : stats?.propertyTypeStats ?? []

  const overviewChartData = [
    ...(stats?.termStats ?? []).map((t: TermStat) => ({
      name: t.termLabel.replace("第", "").replace("期", "期"),
      売上: Math.round(t.revenue / 10000),
      粗利益: Math.round(t.grossProfit / 10000),
      限界利益: Math.round(t.netProfit / 10000),
      粗利益率: parseFloat(t.grossProfitRate.toFixed(1)),
      限界利益率: parseFloat(t.netProfitRate.toFixed(1)),
      isPrediction: false,
    })),
    ...(stats?.predictions ?? []).map((p: any) => ({
      name: `${p.term === 13 ? "十三" : "十四"}期(予)`,
      売上: p.revenue ? Math.round(p.revenue / 10000) : 0,
      粗利益: p.grossProfit ? Math.round(p.grossProfit / 10000) : 0,
      限界利益: 0,
      粗利益率: 0,
      限界利益率: 0,
      isPrediction: true,
    })),
  ]

  // 限界利益 Top10（検索・期フィルタ後）
  const marginalProfitTop10 = [...filteredProjects]
    .map((p) => ({
      ...p,
      marginalProfit: p.gross_profit != null && p.labor_cost != null ? p.gross_profit - p.labor_cost : p.net_profit,
    }))
    .filter((p) => p.marginalProfit != null && p.marginalProfit > 0)
    .sort((a, b) => (b.marginalProfit ?? 0) - (a.marginalProfit ?? 0))
    .slice(0, 10)

  const maxMarginal = marginalProfitTop10[0]?.marginalProfit ?? 1
  const sortedTermStats = [...(stats?.termStats ?? [])].reverse()

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
  }

  const isEmpty = !stats || stats.empty || projects.length === 0

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} onSaved={handleSaved} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">経営数字ダッシュボード</h1>
            <p className="text-xs text-gray-500 mt-0.5">収支計画書 第六期〜第十二期</p>
          </div>
          <div className="flex items-center gap-3">
            {importResult && (
              <span className={`text-sm ${importResult.startsWith("エラー") ? "text-red-500" : "text-green-600"}`}>{importResult}</span>
            )}
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${importing ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? "インポート中..." : "Excelインポート"}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </div>

        {/* Term Tabs */}
        {!isEmpty && (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5">
            <button
              onClick={() => setActiveTerm(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTerm == null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              全期間
            </button>
            {sortedTermStats.map((t: TermStat) => (
              <button
                key={t.term}
                onClick={() => setActiveTerm(t.term)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTerm === t.term ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {t.termLabel}
                <span className="ml-1 opacity-60">({t.count}件)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-80 text-gray-400">
            <AlertCircle size={48} className="mb-4 opacity-40" />
            <p className="text-lg font-medium text-gray-500">データがありません</p>
            <p className="text-sm mt-1">「Excelインポート」から収支計画書をアップロードしてください</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              {[
                { label: activeTerm ? "売上計画（税込）" : "累計売上（税込）", value: fmt(kpis?.revenue), color: "text-gray-900" },
                { label: activeTerm ? "粗利益合計" : "累計粗利益", value: fmt(kpis?.grossProfit), color: "text-green-700" },
                { label: activeTerm ? "差引利益合計" : "累計差引利益", value: fmt(kpis?.netProfit), color: "text-blue-700" },
                { label: "粗利益率", value: fmtPct(kpis?.grossProfitRate), color: Number(kpis?.grossProfitRate) >= 60 ? "text-green-600" : "text-orange-500" },
                { label: "案件数", value: `${kpis?.count?.toLocaleString() ?? "—"}件`, color: "text-gray-900" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {activeTerm == null ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-blue-500" />期別売上・粗利推移（万円）
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={overviewChartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 100)}億`} />
                        <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}万円`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="売上" radius={[2, 2, 0, 0]}>{overviewChartData.map((d, i) => <Cell key={i} fill={d.isPrediction ? "#bfdbfe" : "#3b82f6"} />)}</Bar>
                        <Bar dataKey="粗利益" radius={[2, 2, 0, 0]}>{overviewChartData.map((d, i) => <Cell key={i} fill={d.isPrediction ? "#bbf7d0" : "#10b981"} />)}</Bar>
                        <Bar dataKey="限界利益" radius={[2, 2, 0, 0]}>{overviewChartData.map((d, i) => <Cell key={i} fill={d.isPrediction ? "#e9d5ff" : "#8b5cf6"} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-400 text-right mt-1">薄色 = 回帰予測</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">粗利益率・限界利益率推移（%）</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={overviewChartData.filter((d) => !d.isPrediction)} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "目標60%", fontSize: 10, fill: "#f59e0b" }} />
                        <Line type="monotone" dataKey="粗利益率" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="限界利益率" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">物件種類別 累計売上</h2>
                    <ResponsiveContainer width="100%" height={Math.max(240, (stats?.propertyTypeStats ?? []).length * 34)}>
                      <BarChart layout="vertical" data={(stats?.propertyTypeStats ?? []).map((t: any) => ({ name: t.propertyType, 売上: Math.round(t.revenue / 10000) }))} margin={{ top: 0, right: 8, bottom: 0, left: 64 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={64} />
                        <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}万円`} />
                        <Bar dataKey="売上" radius={[0, 2, 2, 0]}>{(stats?.propertyTypeStats ?? []).map((t: any, i: number) => <Cell key={i} fill={PROPERTY_COLORS[t.propertyType] ?? "#94a3b8"} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">紹介先別 累計売上 Top10</h2>
                    <ResponsiveContainer width="100%" height={Math.max(240, (stats?.referralStats ?? []).slice(0, 10).length * 34)}>
                      <BarChart layout="vertical" data={(stats?.referralStats ?? []).slice(0, 10).map((t: any) => ({ name: t.referralSource?.slice(0, 12), 売上: Math.round(t.revenue / 10000) }))} margin={{ top: 0, right: 8, bottom: 0, left: 76 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={76} />
                        <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}万円`} />
                        <Bar dataKey="売上" fill="#6366f1" radius={[0, 2, 2, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {stats?.predictions && stats.predictions.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h2 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
                      <TrendingUp size={14} />来期売上予測（線形回帰）
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {stats.predictions.map((p: any) => (
                        <div key={p.term} className="bg-white rounded-lg p-3 border border-blue-100">
                          <p className="text-xs text-blue-500 font-medium">{p.termLabel}</p>
                          <p className="text-xl font-bold text-blue-900 mt-1">{fmt(p.revenue)}</p>
                          <p className="text-sm text-gray-500">粗利益予測: {fmt(p.grossProfit)}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-400 mt-2">※ 第八〜十二期のトレンドから線形回帰で算出した参考値です</p>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">物件種類別 売上構成</h2>
                  <ResponsiveContainer width="100%" height={Math.max(220, activePropertyStats.length * 34)}>
                    <BarChart layout="vertical" data={activePropertyStats.map((t) => ({ name: t.propertyType, 売上: Math.round(t.revenue / 10000) }))} margin={{ top: 0, right: 8, bottom: 0, left: 64 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={64} />
                      <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}万円`} />
                      <Bar dataKey="売上" radius={[0, 2, 2, 0]}>{activePropertyStats.map((t, i) => <Cell key={i} fill={PROPERTY_COLORS[t.propertyType] ?? "#94a3b8"} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-1">限界利益 Top10</h2>
                  <p className="text-xs text-gray-400 mb-3">粗利益 − 労務費</p>
                  <div className="space-y-2">
                    {marginalProfitTop10.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedProject(p)}>
                        <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">{p.project_name}</span>
                            <span className="text-xs font-semibold text-blue-700 ml-2 shrink-0">
                              {Math.round((p.marginalProfit ?? 0) / 10000).toLocaleString()}万
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${((p.marginalProfit ?? 0) / maxMarginal) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}
