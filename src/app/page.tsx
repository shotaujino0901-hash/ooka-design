"use client"

import Link from "next/link"
import { MessageSquare, Database, RefreshCw } from "lucide-react"

const cards = [
  {
    href: "/chat",
    icon: MessageSquare,
    title: "AI知識ベース",
    desc: "Scrapbox・Chatwork・Limitlessのデータを横断検索。経営判断を自然言語で質問できます。",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/documents",
    icon: Database,
    title: "ドキュメント一覧",
    desc: "取り込み済みのドキュメントを閲覧・検索できます。",
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/sync",
    icon: RefreshCw,
    title: "データ同期",
    desc: "Scrapbox・Chatwork・Limitlessのデータを手動で同期、またはファイルをアップロードします。",
    color: "bg-orange-50 text-orange-600",
  },
]

export default function HomePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">大岡建築設計事務所</h1>
        <p className="text-gray-500 mt-1">社内統合プラットフォーム — Phase 1: AI知識ベース</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map(({ href, icon: Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2.5 rounded-lg mb-4 ${color}`}>
              <Icon size={20} />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1.5">{title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
