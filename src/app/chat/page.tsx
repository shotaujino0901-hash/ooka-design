"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Plus, Trash2 } from "lucide-react"
import { AGENTS, type AgentId } from "@/lib/agents"

type Message = { role: "user" | "assistant"; content: string; sources?: Source[] }
type Source = { source: string; project?: string; title?: string; updated_at?: string }

type Conversation = {
  id: string
  agentId: AgentId
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "ooka_chat_conversations"

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function save(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
}

const SOURCE_LABELS: Record<string, string> = {
  scrapbox: "Scrapbox",
  chatwork: "Chatwork",
  limitless: "Limitless",
  plaud: "Plaud Note",
  upload: "アップロード",
}

function groupByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()
  const week = new Date(now.getTime() - 7 * 86400000)
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "今日", items: [] },
    { label: "昨日", items: [] },
    { label: "過去7日", items: [] },
    { label: "それ以前", items: [] },
  ]
  for (const c of convs) {
    const d = new Date(c.updatedAt)
    if (d.toDateString() === today) groups[0].items.push(c)
    else if (d.toDateString() === yesterday) groups[1].items.push(c)
    else if (d >= week) groups[2].items.push(c)
    else groups[3].items.push(c)
  }
  return groups.filter((g) => g.items.length > 0)
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("knowledge")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const convs = loadConversations()
    setConversations(convs)
    if (convs.length > 0) setCurrentId(convs[0].id)
  }, [])

  const current = conversations.find((c) => c.id === currentId) ?? null
  const messages = current?.messages ?? []
  const agentId = current?.agentId ?? selectedAgentId
  const agent = AGENTS.find((a) => a.id === agentId)!

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  function newChat() {
    setCurrentId(null)
    setInput("")
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = conversations.filter((c) => c.id !== id)
    setConversations(updated)
    save(updated)
    if (currentId === id) setCurrentId(updated[0]?.id ?? null)
  }

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: "user", content: input }
    setInput("")
    setLoading(true)

    const effectiveAgentId = current?.agentId ?? selectedAgentId
    let targetId = currentId
    let prevMessages: Message[]
    let updatedConvs: Conversation[]

    if (targetId) {
      prevMessages = current?.messages ?? []
      updatedConvs = conversations.map((c) =>
        c.id === targetId
          ? { ...c, messages: [...c.messages, userMsg], updatedAt: new Date().toISOString() }
          : c
      )
    } else {
      targetId = Date.now().toString()
      prevMessages = []
      const newConv: Conversation = {
        id: targetId,
        agentId: selectedAgentId,
        title: input.slice(0, 40),
        messages: [userMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updatedConvs = [newConv, ...conversations]
      setCurrentId(targetId)
    }

    setConversations(updatedConvs)
    save(updatedConvs)

    const finalTargetId = targetId
    try {
      const history = [...prevMessages, userMsg].map(({ role, content }) => ({ role, content }))
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, agentId: effectiveAgentId }),
      })
      const data = await res.json()
      const assistantMsg: Message = { role: "assistant", content: data.answer, sources: data.sources }
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === finalTargetId
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date().toISOString() }
            : c
        )
        save(next)
        return next
      })
    } catch {
      const errorMsg: Message = { role: "assistant", content: "エラーが発生しました。" }
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === finalTargetId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
        save(next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const groups = groupByDate(conversations)

  return (
    <div className="flex h-full">
      {/* 履歴サイドバー */}
      <div className="w-60 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={15} />
            新しいチャット
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
          {groups.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-6">履歴はありません</p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="text-xs font-medium text-gray-400 px-2 py-1">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((c) => {
                  const a = AGENTS.find((ag) => ag.id === c.agentId)
                  return (
                    <div
                      key={c.id}
                      onClick={() => setCurrentId(c.id)}
                      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        c.id === currentId
                          ? "bg-blue-100 text-blue-900"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-sm shrink-0">{a?.icon ?? "💬"}</span>
                      <span className="text-xs flex-1 truncate">{c.title || "新しいチャット"}</span>
                      <button
                        onClick={(e) => deleteConversation(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-opacity shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* チャット本体 */}
      <div className="flex flex-col flex-1 min-w-0">
        {currentId === null ? (
          /* 新規チャット: エージェント選択 */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <p className="text-lg font-semibold text-gray-700 mb-6">エージェントを選択</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {AGENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => a.available && setSelectedAgentId(a.id)}
                  disabled={!a.available}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                    a.id === selectedAgentId && a.available
                      ? "bg-blue-600 text-white border-blue-600"
                      : a.available
                      ? "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                      : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <span className="text-xl">{a.icon}</span>
                  <p className="text-sm font-medium mt-1">{a.name}</p>
                  {!a.available && <p className="text-xs mt-0.5 text-gray-300">Phase {a.phase}</p>}
                </button>
              ))}
            </div>
            <div className="mt-8 w-full max-w-md">
              <div className="flex gap-2 items-end">
                <textarea
                  className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                  rows={2}
                  placeholder={`${AGENTS.find((a) => a.id === selectedAgentId)?.name ?? ""}に質問する...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Enter で送信 / Shift+Enter で改行</p>
            </div>
          </div>
        ) : (
          <>
            {/* ヘッダー */}
            <div className="border-b border-gray-200 bg-white px-6 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{agent.icon}</span>
                <div>
                  <h1 className="font-semibold text-gray-900 text-sm">{agent.name}</h1>
                  <p className="text-xs text-gray-400">{agent.description}</p>
                </div>
              </div>
            </div>

            {/* メッセージ */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-2xl">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-400 px-1">参照資料</p>
                        {msg.sources.slice(0, 4).map((s, j) => (
                          <div key={j} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                            <span className="font-medium text-gray-700">[{SOURCE_LABELS[s.source] ?? s.source}]</span>{" "}
                            {s.project && <span>{s.project} / </span>}
                            <span>{s.title}</span>
                            {s.updated_at && <span className="text-gray-400 ml-1">({s.updated_at.slice(0, 10)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 入力 */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
              <div className="flex gap-3 items-end">
                <textarea
                  className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                  rows={2}
                  placeholder={`${agent.name}に質問する...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Enter で送信 / Shift+Enter で改行</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
