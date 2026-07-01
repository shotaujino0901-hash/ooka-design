"use client"

import { useState, useEffect } from "react"
import { Printer, Loader2 } from "lucide-react"

type Tab = "monthly" | "term" | "project"

type Project = {
  id: number
  term: number
  term_label: string
  project_name: string
  completion_month: string | null
  property_type: string | null
  referral_source: string | null
  client_name: string | null
  revenue_plan: number | null
  outsourcing_total: number | null
  outsourcing_rate: number | null
  gross_profit: number | null
  gross_profit_rate: number | null
  labor_cost: number | null
  net_profit: number | null
  net_profit_rate: number | null
}

const TERMS = [
  { value: 6, label: "第六期" },
  { value: 7, label: "第七期" },
  { value: 8, label: "第八期" },
  { value: 9, label: "第九期" },
  { value: 10, label: "第十期" },
  { value: 11, label: "第十一期" },
  { value: 12, label: "第十二期" },
]

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 10000).toLocaleString()}万円`
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toFixed(1)}%`

function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <Printer size={13} />
      印刷・PDF
    </button>
  )
}

// ── 月次レポート ──────────────────────────────────────────────────────────────

function MonthlyReport() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/finance/projects?completionMonth=${year}/${month}&sort=revenue_plan&order=desc`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const totalRevenue = projects.reduce((s, p) => s + (p.revenue_plan ?? 0), 0)
  const totalGrossProfit = projects.reduce((s, p) => s + (p.gross_profit ?? 0), 0)
  const totalNetProfit = projects.reduce((s, p) => s + (p.net_profit ?? 0), 0)
  const avgGrossProfitRate =
    projects.length > 0
      ? projects.reduce((s, p) => s + (p.gross_profit_rate ?? 0), 0) / projects.length
      : null

  return (
    <div>
      <div className="no-print flex items-center gap-3 mb-5">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <PrintBtn />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-xs text-gray-400">株式会社 大岡成光建築事務所</p>
            <h2 className="text-lg font-bold text-gray-900">{year}年{month}月　月次経営レポート</h2>
            <p className="text-xs text-gray-400 mt-0.5">出力日: {new Date().toLocaleDateString("ja-JP")}</p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "完成予定件数", value: `${projects.length}件`, color: "text-gray-900" },
              { label: "売上合計（税込）", value: fmt(totalRevenue), color: "text-gray-900" },
              { label: "粗利合計", value: fmt(totalGrossProfit), color: "text-green-700" },
              { label: "平均粗利益率", value: fmtPct(avgGrossProfitRate), color: "text-blue-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-600">完成予定案件一覧</span>
            </div>
            {projects.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">該当する案件がありません</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">案件名</th>
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">物件種類</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">売上計画</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">粗利益</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">粗利率</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">差引利益</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => (
                    <tr key={p.id} className={i < projects.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-4 py-2 font-medium text-gray-800">{p.project_name}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{p.property_type ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{fmt(p.revenue_plan)}</td>
                      <td className="px-4 py-2 text-right text-green-700">{fmt(p.gross_profit)}</td>
                      <td className="px-4 py-2 text-right text-green-700">{fmtPct(p.gross_profit_rate)}</td>
                      <td className="px-4 py-2 text-right text-blue-700">{fmt(p.net_profit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-xs text-gray-700">合計（{projects.length}件）</td>
                    <td className="px-4 py-2 text-right text-gray-800">{fmt(totalRevenue)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{fmt(totalGrossProfit)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{fmtPct(avgGrossProfitRate)}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{fmt(totalNetProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── 期別サマリー ──────────────────────────────────────────────────────────────

function TermReport() {
  const [term, setTerm] = useState(12)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const termLabel = TERMS.find((t) => t.value === term)?.label ?? `第${term}期`

  useEffect(() => {
    setLoading(true)
    fetch(`/api/finance/projects?term=${term}&sort=completion_month&order=asc`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [term])

  const totalRevenue = projects.reduce((s, p) => s + (p.revenue_plan ?? 0), 0)
  const totalGrossProfit = projects.reduce((s, p) => s + (p.gross_profit ?? 0), 0)
  const totalNetProfit = projects.reduce((s, p) => s + (p.net_profit ?? 0), 0)
  const avgGrossProfitRate =
    projects.length > 0
      ? projects.reduce((s, p) => s + (p.gross_profit_rate ?? 0), 0) / projects.length
      : null

  return (
    <div>
      <div className="no-print flex items-center gap-3 mb-5">
        <select
          value={term}
          onChange={(e) => setTerm(Number(e.target.value))}
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <PrintBtn />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-xs text-gray-400">株式会社 大岡成光建築事務所</p>
            <h2 className="text-lg font-bold text-gray-900">{termLabel}　期別サマリーレポート</h2>
            <p className="text-xs text-gray-400 mt-0.5">出力日: {new Date().toLocaleDateString("ja-JP")}</p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "案件数", value: `${projects.length}件`, color: "text-gray-900" },
              { label: "売上合計（税込）", value: fmt(totalRevenue), color: "text-gray-900" },
              { label: "粗利合計", value: fmt(totalGrossProfit), color: "text-green-700" },
              { label: "差引利益合計", value: fmt(totalNetProfit), color: "text-blue-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">案件名</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">完成月</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">物件種類</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">売上計画</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">粗利益</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">粗利率</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">差引利益</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className={i < projects.length - 1 ? "border-b border-gray-50" : ""}>
                    <td className="px-4 py-2 font-medium text-gray-800 max-w-xs">{p.project_name}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.completion_month ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.property_type ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{fmt(p.revenue_plan)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{fmt(p.gross_profit)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{fmtPct(p.gross_profit_rate)}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{fmt(p.net_profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td colSpan={3} className="px-4 py-2 text-xs text-gray-700">合計（{projects.length}件）</td>
                  <td className="px-4 py-2 text-right text-gray-800">{fmt(totalRevenue)}</td>
                  <td className="px-4 py-2 text-right text-green-700">{fmt(totalGrossProfit)}</td>
                  <td className="px-4 py-2 text-right text-green-700">{fmtPct(avgGrossProfitRate)}</td>
                  <td className="px-4 py-2 text-right text-blue-700">{fmt(totalNetProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── 案件別レポート ────────────────────────────────────────────────────────────

function ProjectReport() {
  const [term, setTerm] = useState<number | "">("")
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    const url = term
      ? `/api/finance/projects?term=${term}&sort=completion_month&order=asc`
      : `/api/finance/projects?sort=term&order=desc`
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [term])

  const filtered = search
    ? projects.filter((p) => p.project_name.includes(search))
    : projects

  if (selected) {
    return (
      <div>
        <div className="no-print flex items-center gap-3 mb-5">
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            ← 案件一覧に戻る
          </button>
          <PrintBtn />
        </div>

        <div className="mb-5">
          <p className="text-xs text-gray-400">株式会社 大岡成光建築事務所</p>
          <h2 className="text-lg font-bold text-gray-900">案件詳細レポート</h2>
          <p className="text-xs text-gray-400 mt-0.5">出力日: {new Date().toLocaleDateString("ja-JP")}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">{selected.project_name}</h3>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm mb-6 pb-6 border-b border-gray-100">
            {[
              ["期", selected.term_label],
              ["完成月", selected.completion_month ?? "—"],
              ["物件種類", selected.property_type ?? "—"],
              ["施主", selected.client_name ?? "—"],
              ["紹介先", selected.referral_source ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-gray-400 w-16 shrink-0">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">収支詳細</h4>
          <div className="space-y-2.5">
            {[
              {
                label: "収入計画（税込）",
                value: fmt(selected.revenue_plan),
                sub: null,
                color: "text-gray-900 font-bold",
              },
              {
                label: "外注費合計",
                value: fmt(selected.outsourcing_total),
                sub: `外注比率 ${fmtPct(selected.outsourcing_rate)}`,
                color: "text-gray-700",
              },
              {
                label: "粗利益",
                value: fmt(selected.gross_profit),
                sub: `粗利益率 ${fmtPct(selected.gross_profit_rate)}`,
                color: "text-green-700 font-bold",
              },
              {
                label: "労務費",
                value: fmt(selected.labor_cost),
                sub: null,
                color: "text-gray-700",
              },
              {
                label: "差引利益",
                value: fmt(selected.net_profit),
                sub: `差引利益率 ${fmtPct(selected.net_profit_rate)}`,
                color: "text-blue-700 font-bold",
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2.5">
                <span className="text-sm text-gray-500">{label}</span>
                <div className="text-right">
                  <span className={`text-sm ${color}`}>{value}</span>
                  {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print flex items-center gap-3 mb-5">
        <select
          value={term}
          onChange={(e) => setTerm(e.target.value ? Number(e.target.value) : "")}
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">全期</option>
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="案件名で検索"
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 w-52"
        />
        <span className="text-xs text-gray-400">{filtered.length}件</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-gray-300" size={28} />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">案件名</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">期</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">完成月</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">売上計画</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">粗利率</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{p.project_name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{p.term_label}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{p.completion_month ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{fmt(p.revenue_plan)}</td>
                  <td className="px-4 py-2 text-right text-green-700">{fmtPct(p.gross_profit_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("monthly")

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } aside { display: none !important; } body { background: white; } }`}</style>

      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">レポート</h1>
          <p className="text-xs text-gray-500 mt-0.5">各種経営レポートの確認・印刷</p>
        </div>

        <div className="no-print flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {(
            [
              { key: "monthly", label: "月次レポート" },
              { key: "term", label: "期別サマリー" },
              { key: "project", label: "案件別" },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                tab === key
                  ? "bg-white text-gray-900 font-medium shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "monthly" && <MonthlyReport />}
        {tab === "term" && <TermReport />}
        {tab === "project" && <ProjectReport />}
      </div>
    </>
  )
}
