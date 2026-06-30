"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, ChevronUp, ChevronDown, X, Pencil, Check, Plus } from "lucide-react"

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

const PROPERTY_TYPES = Object.keys(PROPERTY_COLORS)

const TERM_LABELS: Record<number, string> = {
  6: "第六期", 7: "第七期", 8: "第八期", 9: "第九期",
  10: "第十期", 11: "第十一期", 12: "第十二期", 13: "第十三期",
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

type TermStat = { term: number; termLabel: string; count: number }
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
    if (!data.error) { onSaved(data.project); setEditing(false) }
  }

  const Field = ({ label, name, type = "text" }: { label: string; name: keyof typeof form; type?: string }) => (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={form[name] as string | number}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
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
              <>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}保存
                </button>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs">キャンセル</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                  <Pencil size={12} />編集
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </>
            )}
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="物件種類" name="property_type" />
            <Field label="業務内容" name="work_type" />
            <Field label="紹介先" name="referral_source" />
            <Field label="氏名・担当者" name="client_name" />
            <Field label="完成月" name="completion_month" />
          </div>
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
                  { label: "外注比率", value: fmtPct(project.outsourcing_rate) },
                  { label: "粗利益率", value: fmtPct(project.gross_profit_rate) },
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

// ── 案件追加モーダル ────────────────────────────────────────────
function AddProjectModal({
  terms,
  onClose,
  onAdded,
}: {
  terms: TermStat[]
  onClose: () => void
  onAdded: (p: Project) => void
}) {
  const latestTerm = terms[0]?.term ?? 12
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    term: latestTerm,
    project_name: "",
    property_type: "",
    referral_source: "",
    client_name: "",
    completion_month: "",
    work_type: "",
    revenue_plan: "",
    outsourcing_total: "",
    gross_profit: "",
    labor_cost: "",
  })

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.project_name.trim()) return alert("物件名を入力してください")
    setSaving(true)
    const res = await fetch("/api/finance/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        term: Number(form.term),
        term_label: TERM_LABELS[Number(form.term)] ?? `第${form.term}期`,
        revenue_plan: Number(form.revenue_plan) || 0,
        outsourcing_total: Number(form.outsourcing_total) || 0,
        gross_profit: Number(form.gross_profit) || 0,
        labor_cost: Number(form.labor_cost) || 0,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { alert(`エラー: ${data.error}`); return }
    onAdded(data.project)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">案件を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">期 <span className="text-red-400">*</span></label>
              <select
                value={form.term}
                onChange={(e) => set("term", e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {terms.map((t) => (
                  <option key={t.term} value={t.term}>{t.termLabel}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">物件名 <span className="text-red-400">*</span></label>
              <input
                value={form.project_name}
                onChange={(e) => set("project_name", e.target.value)}
                placeholder="例）○○邸新築工事"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">物件種類</label>
              <select
                value={form.property_type}
                onChange={(e) => set("property_type", e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">選択...</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">完成月</label>
              <input
                value={form.completion_month}
                onChange={(e) => set("completion_month", e.target.value)}
                placeholder="例）2026/03"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">紹介先</label>
              <input
                value={form.referral_source}
                onChange={(e) => set("referral_source", e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">氏名・担当者</label>
              <input
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">収支情報</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "収入計画（税込）", key: "revenue_plan" as const },
                { label: "外注費合計", key: "outsourcing_total" as const },
                { label: "粗利益", key: "gross_profit" as const },
                { label: "労務費", key: "labor_cost" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder="0"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              追加する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────────
export default function FinanceProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [termStats, setTermStats] = useState<TermStat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTerm, setActiveTerm] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("term")
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const [statsRes, projRes] = await Promise.all([
      fetch("/api/finance/stats"),
      fetch(`/api/finance/projects?sort=${sortKey}&order=${sortAsc ? "asc" : "desc"}&limit=500`),
    ])
    const [statsData, projData] = await Promise.all([statsRes.json(), projRes.json()])
    const ts: TermStat[] = (statsData.termStats ?? []).map((t: any) => ({
      term: t.term,
      termLabel: t.termLabel,
      count: t.count,
    })).reverse()
    setTermStats(ts)
    setProjects(projData.projects ?? [])
    setLoading(false)
  }, [sortKey, sortAsc])

  useEffect(() => { load() }, [load])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function handleSaved(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedProject(updated)
  }

  function handleAdded(p: Project) {
    setProjects((prev) => [p, ...prev])
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp size={11} className="inline ml-0.5" /> : <ChevronDown size={11} className="inline ml-0.5" />
      : null

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

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} onSaved={handleSaved} />
      )}
      {showAddModal && (
        <AddProjectModal terms={termStats} onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">案件一覧</h1>
            <p className="text-xs text-gray-500 mt-0.5">収支計画書 第六期〜第十二期</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            案件を追加
          </button>
        </div>

        {/* Term Tabs */}
        {termStats.length > 0 && (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5">
            <button
              onClick={() => setActiveTerm(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTerm == null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              全期間
            </button>
            {termStats.map((t) => (
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
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3">
            <span className="text-sm font-semibold text-gray-700 shrink-0">
              {filteredProjects.length}件
            </span>
            <input
              type="text"
              placeholder="物件名・紹介先・氏名・種類で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-sm bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 shrink-0">行クリックで詳細・編集</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {activeTerm == null && <th className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">期</th>}
                  <th className="text-left px-3 py-2 font-medium text-gray-500">物件名</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">種類</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">紹介先</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">完成月</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("revenue_plan")}>収入計画 <SortIcon k="revenue_plan" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("gross_profit")}>粗利益 <SortIcon k="gross_profit" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("gross_profit_rate")}>粗利率 <SortIcon k="gross_profit_rate" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("labor_cost")}>労務費 <SortIcon k="labor_cost" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("net_profit")}>限界利益 <SortIcon k="net_profit" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("net_profit_rate")}>限界利益率 <SortIcon k="net_profit_rate" /></th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 cursor-pointer hover:text-blue-600 whitespace-nowrap" onClick={() => toggleSort("outsourcing_rate")}>外注率 <SortIcon k="outsourcing_rate" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.slice(0, 500).map((p) => {
                  const gpr = p.gross_profit_rate
                  const gprColor = gpr == null ? "" : gpr >= 70 ? "text-green-600 font-semibold" : gpr >= 50 ? "text-blue-600" : gpr >= 30 ? "text-yellow-600" : "text-red-500"
                  const npr = p.net_profit_rate
                  const nprColor = npr == null ? "" : npr >= 40 ? "text-green-600 font-semibold" : npr >= 20 ? "text-blue-600" : npr >= 0 ? "text-gray-600" : "text-red-500"
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => setSelectedProject(p)}>
                      {activeTerm == null && <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{p.term_label}</td>}
                      <td className="px-3 py-2 text-gray-800 max-w-48 truncate" title={p.project_name}>{p.project_name}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs whitespace-nowrap" style={{ background: (PROPERTY_COLORS[p.property_type ?? ""] ?? "#94a3b8") + "20", color: PROPERTY_COLORS[p.property_type ?? ""] ?? "#64748b" }}>
                          {p.property_type ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 max-w-24 truncate" title={p.referral_source ?? ""}>{p.referral_source ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.completion_month ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{p.revenue_plan ? `${Math.round(p.revenue_plan / 10000).toLocaleString()}万` : "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{p.gross_profit ? `${Math.round(p.gross_profit / 10000).toLocaleString()}万` : "—"}</td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${gprColor}`}>{fmtPct(p.gross_profit_rate)}</td>
                      <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{p.labor_cost ? `${Math.round(p.labor_cost / 10000).toLocaleString()}万` : "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-700 font-medium whitespace-nowrap">{p.net_profit ? `${Math.round(p.net_profit / 10000).toLocaleString()}万` : "—"}</td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${nprColor}`}>{fmtPct(p.net_profit_rate)}</td>
                      <td className="px-3 py-2 text-right text-gray-400 whitespace-nowrap">{p.outsourcing_rate != null ? `${Number(p.outsourcing_rate).toFixed(1)}%` : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredProjects.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">該当する案件が見つかりません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
