"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Database, RefreshCw, Home, BarChart2, PieChart, ClipboardList, ChevronDown, ChevronRight, Settings, FileText, BarChart3, NotebookPen, Lightbulb } from "lucide-react"

const nav = [
  { href: "/", label: "ホーム", icon: Home },
  {
    href: "/finance",
    label: "経営指標",
    icon: BarChart2,
    children: [
      { href: "/finance", label: "ダッシュボード", icon: PieChart },
      { href: "/finance/projects", label: "案件一覧", icon: ClipboardList },
      { href: "/finance/predict", label: "入札予測", icon: Lightbulb },
      { href: "/reports", label: "レポート", icon: BarChart3 },
    ],
  },
  { href: "/chat", label: "AI知識ベース", icon: MessageSquare },
  { href: "/minutes", label: "議事録", icon: NotebookPen },
  { href: "/invoices", label: "請求書", icon: FileText },
  { href: "/documents", label: "ドキュメント", icon: Database },
  { href: "/sync", label: "データ同期", icon: RefreshCw },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isFinance = pathname.startsWith("/finance") || pathname.startsWith("/reports") || pathname.startsWith("/predict")
  const [financeOpen, setFinanceOpen] = useState(isFinance)

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="text-xs text-gray-500">大岡建築設計事務所</p>
        <h1 className="text-sm font-bold text-gray-900 leading-tight mt-0.5">社内プラットフォーム</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon, children }) => {
          if (children) {
            const isOpen = financeOpen || isFinance
            return (
              <div key={href}>
                <button
                  onClick={() => setFinanceOpen((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isFinance
                      ? "text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {isOpen
                    ? <ChevronDown size={13} className="text-gray-400" />
                    : <ChevronRight size={13} className="text-gray-400" />
                  }
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                    {children.map(({ href: ch, label: cl, icon: CI }) => {
                      const active = pathname === ch
                      return (
                        <Link
                          key={ch}
                          href={ch}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            active
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          <CI size={14} />
                          {cl}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Settings size={15} />
          設定
        </Link>
        <p className="text-xs text-gray-400 px-3 pt-2">Phase 1-2 実装中</p>
      </div>
    </aside>
  )
}
