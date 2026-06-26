"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Database, RefreshCw, LayoutDashboard } from "lucide-react"

const nav = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/chat", label: "AI知識ベース", icon: MessageSquare },
  { href: "/documents", label: "ドキュメント", icon: Database },
  { href: "/sync", label: "データ同期", icon: RefreshCw },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="text-xs text-gray-500">大岡建築設計事務所</p>
        <h1 className="text-sm font-bold text-gray-900 leading-tight mt-0.5">社内プラットフォーム</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
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
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">Phase 1 - AI知識ベース</p>
      </div>
    </aside>
  )
}
