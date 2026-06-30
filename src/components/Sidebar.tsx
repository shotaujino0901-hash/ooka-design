"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare, Database, RefreshCw, Home, BarChart2, PieChart, ClipboardList,
  ChevronDown, ChevronRight, Settings, FileText, BarChart3, NotebookPen,
  Lightbulb, Globe, Users, type LucideIcon,
} from "lucide-react"

type NavChild = { href: string; label: string; icon: LucideIcon }
type NavGroup = { key: string; label: string; icon: LucideIcon; children: NavChild[] }
type NavLink  = { href: string; label: string; icon: LucideIcon }

function isGroup(item: NavGroup | NavLink): item is NavGroup {
  return "children" in item
}

const BID_PATHS = ["/finance/bids", "/finance/market-bids", "/finance/predict"]

const nav: (NavGroup | NavLink)[] = [
  { href: "/", label: "ホーム", icon: Home },
  {
    key: "finance",
    label: "経営指標",
    icon: BarChart2,
    children: [
      { href: "/finance", label: "ダッシュボード", icon: PieChart },
      { href: "/finance/projects", label: "案件一覧", icon: ClipboardList },
      { href: "/reports", label: "レポート", icon: BarChart3 },
    ],
  },
  {
    key: "bids",
    label: "入札",
    icon: FileText,
    children: [
      { href: "/finance/bids", label: "入札記録", icon: FileText },
      { href: "/finance/market-bids", label: "市場落札データ", icon: Globe },
      { href: "/finance/predict", label: "入札予測", icon: Lightbulb },
    ],
  },
  { href: "/customers", label: "顧客管理", icon: Users },
  { href: "/chat", label: "AI知識ベース", icon: MessageSquare },
  { href: "/minutes", label: "議事録", icon: NotebookPen },
  { href: "/invoices", label: "請求書", icon: FileText },
  { href: "/documents", label: "ドキュメント", icon: Database },
  { href: "/sync", label: "データ取込", icon: RefreshCw },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isBidPath = BID_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const isFinancePath = !isBidPath && (
    pathname === "/finance" ||
    pathname.startsWith("/finance/") ||
    pathname.startsWith("/reports")
  )

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    finance: isFinancePath,
    bids: isBidPath,
  })

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="text-xs text-gray-500">大岡建築設計事務所</p>
        <h1 className="text-sm font-bold text-gray-900 leading-tight mt-0.5">社内プラットフォーム</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          if (isGroup(item)) {
            const { key, label, icon: Icon, children } = item
            const isActive = key === "finance" ? isFinancePath : key === "bids" ? isBidPath : false
            const isOpen = !!openGroups[key] || isActive
            return (
              <div key={key}>
                <button
                  onClick={() => toggleGroup(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? "text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {isOpen
                    ? <ChevronDown size={13} className="text-gray-400" />
                    : <ChevronRight size={13} className="text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                    {children.map(({ href, label: cl, icon: CI }) => {
                      const active = href === "/finance"
                        ? pathname === "/finance"
                        : pathname === href || pathname.startsWith(href + "/")
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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

          const { href, label, icon: Icon } = item
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
            pathname === "/settings" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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
