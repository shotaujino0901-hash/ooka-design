"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MessageSquare, RefreshCw, BarChart2, ClipboardList, TrendingUp, FileText, Loader2, ArrowRight, Calendar } from "lucide-react"

const SOURCE_LABELS: Record<string, string> = {
  scrapbox: "Scrapbox",
  chatwork: "Chatwork",
  limitless: "Limitless",
  plaud: "Plaud Note",
  upload: "アップロード",
}

const SOURCE_COLORS: Record<string, string> = {
  scrapbox: "bg-green-100 text-green-700",
  chatwork: "bg-blue-100 text-blue-700",
  limitless: "bg-purple-100 text-purple-700",
  plaud: "bg-orange-100 text-orange-700",
  upload: "bg-gray-100 text-gray-700",
}

const fmt = (n: number | null | undefined) => {
  if (n == null) return "—"
  return `${Math.round(n / 10000).toLocaleString()}万円`
}
const fmtPct = (n: number | null | undefined) => {
  if (n == null) return "—"
  return `${Number(n).toFixed(1)}%`
}

type DocStat = { source: string; count: number }
type Project = {
  id: number; term_label: string; project_name: string
  revenue_plan: number | null; net_profit: number | null; net_profit_rate: number | null
  property_type: string | null; gross_profit_rate: number | null
}

export default function HomePage() {
  const [docStats, setDocStats] = useState<DocStat[]>([])
  const [financeStats, setFinanceStats] = useState<any>(null)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [monthlyProjects, setMonthlyProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const dateLabel = today.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  })
  const currentMonthLabel = `${today.getFullYear()}年${today.getMonth() + 1}月`
  // completion_monthの形式に合わせる（例: "2026/6"）
  const completionMonthQuery = `${today.getFullYear()}/${today.getMonth() + 1}`

  useEffect(() => {
    async function load() {
      const [docRes, finRes, projRes, monthRes] = await Promise.allSettled([
        fetch("/api/documents/stats").then((r) => r.json()),
        fetch("/api/finance/stats").then((r) => r.json()),
        fetch("/api/finance/projects?sort=term&order=desc&limit=5").then((r) => r.json()),
        fetch(`/api/finance/projects?completionMonth=${completionMonthQuery}&sort=revenue_plan&order=desc`).then((r) => r.json()),
      ])
      if (docRes.status === "fulfilled") setDocStats(docRes.value ?? [])
      if (finRes.status === "fulfilled") setFinanceStats(finRes.value)
      if (projRes.status === "fulfilled") setRecentProjects(projRes.value.projects ?? [])
      if (monthRes.status === "fulfilled") setMonthlyProjects(monthRes.value.projects ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // 最新期のKPI
  const latestTerm = financeStats?.termStats?.[financeStats.termStats.length - 1]
  const kpi = latestTerm
    ? {
        label: latestTerm.termLabel,
        revenue: latestTerm.revenue,
        grossProfit: latestTerm.grossProfit,
        netProfit: latestTerm.netProfit,
        grossProfitRate: latestTerm.grossProfitRate,
        netProfitRate: latestTerm.netProfitRate,
        count: latestTerm.count,
      }
    : null

  const totalDocs = docStats.reduce((s, d) => s + d.count, 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-400">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">大岡建築設計事務所</h1>
        <p className="text-sm text-gray-500 mt-0.5">社内統合プラットフォーム</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gray-300" size={32} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* 今期KPI */}
          {kpi && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {kpi.label}の経営数字
                </h2>
                <Link href="/finance" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  詳細を見る <ArrowRight size={11} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "売上計画（税込）", value: fmt(kpi.revenue), sub: null, color: "text-gray-900" },
                  { label: "粗利益", value: fmt(kpi.grossProfit), sub: fmtPct(kpi.grossProfitRate), color: "text-green-700" },
                  { label: "限界利益", value: fmt(kpi.netProfit), sub: fmtPct(kpi.netProfitRate), color: "text-blue-700" },
                  { label: "案件数", value: `${kpi.count}件`, sub: null, color: "text-gray-900" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-3 gap-5">
            {/* クイックアクション */}
            <section className="col-span-1">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">クイックアクション</h2>
              <div className="space-y-2">
                {[
                  { href: "/chat", icon: MessageSquare, label: "AI知識ベースに質問", color: "text-blue-600 bg-blue-50" },
                  { href: "/finance/projects", icon: ClipboardList, label: "案件一覧を確認", color: "text-indigo-600 bg-indigo-50" },
                  { href: "/finance", icon: TrendingUp, label: "経営ダッシュボード", color: "text-green-600 bg-green-50" },
                  { href: "/sync", icon: RefreshCw, label: "データ同期", color: "text-orange-600 bg-orange-50" },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <div className={`p-1.5 rounded-lg ${color}`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{label}</span>
                    <ArrowRight size={13} className="ml-auto text-gray-300 group-hover:text-gray-400" />
                  </Link>
                ))}
              </div>
            </section>

            {/* 右カラム */}
            <div className="col-span-2 space-y-5">
              {/* 最近の案件 */}
              {recentProjects.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近の案件</h2>
                    <Link href="/finance/projects" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                      一覧 <ArrowRight size={11} />
                    </Link>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {recentProjects.map((p, i) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 px-4 py-3 ${i < recentProjects.length - 1 ? "border-b border-gray-50" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 font-medium truncate">{p.project_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.term_label}　{p.property_type ?? ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-700">{p.revenue_plan ? `${Math.round(p.revenue_plan / 10000).toLocaleString()}万` : "—"}</p>
                          <p className="text-xs text-blue-600">{fmtPct(p.net_profit_rate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 月次サマリー */}
              <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={12} />
                      {currentMonthLabel}の完成予定案件
                    </h2>
                    <Link href="/finance/projects" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                      案件一覧 <ArrowRight size={11} />
                    </Link>
                  </div>
                  {monthlyProjects.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 text-center">
                      <p className="text-xs text-gray-400">今月完成予定の案件はありません</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {monthlyProjects.map((p, i) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${i < monthlyProjects.length - 1 ? "border-b border-gray-50" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-medium truncate">{p.project_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{p.property_type ?? ""}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-gray-700">
                              {p.revenue_plan ? `${Math.round(p.revenue_plan / 10000).toLocaleString()}万` : "—"}
                            </p>
                            <p className="text-xs text-green-600">{fmtPct(p.gross_profit_rate)}</p>
                          </div>
                        </div>
                      ))}
                      {monthlyProjects.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                          <span>{monthlyProjects.length}件</span>
                          <span>売上計 {Math.round(monthlyProjects.reduce((s, p) => s + (p.revenue_plan ?? 0), 0) / 10000).toLocaleString()}万円</span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

              {/* ドキュメント蓄積状況 */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    知識ベース — 合計 {totalDocs.toLocaleString()} チャンク
                  </h2>
                  <Link href="/documents" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    一覧 <ArrowRight size={11} />
                  </Link>
                </div>
                {docStats.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center">
                    <FileText size={20} className="text-gray-300 mx-auto mb-1.5" />
                    <p className="text-sm text-gray-400">まだドキュメントがありません</p>
                    <Link href="/sync" className="text-xs text-blue-600 hover:underline mt-1 inline-block">データ同期へ →</Link>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap gap-3">
                    {docStats.map((d) => (
                      <div key={d.source} className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[d.source] ?? "bg-gray-100 text-gray-700"}`}>
                          {SOURCE_LABELS[d.source] ?? d.source}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">{d.count.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">件</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
