"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Lock } from "lucide-react"
import { AGENTS, type AgentId } from "@/lib/agents"

type Message = { role: "user" | "assistant"; content: string; sources?: Source[] }
type Source = { source: string; project?: string; title?: string; updated_at?: string }

const SOURCE_LABELS: Record<string, string> = {
  scrapbox: "Scrapbox",
  chatwork: "Chatwork",
  limitless: "Limitless",
  plaud: "Plaud Note",
  upload: "アップロード",
}

export default function ChatPage() {
  const [histories, setHistories] = useState<Record<AgentId, Message[]>>({
    knowledge: [], finance: [], bid: [], minutes: [],
  })
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [agentId, setAgentId] = useState<AgentId>("knowledge")
  const bottomRef = useRef<HTMLDivElement>(null)

  const agent = AGENTS.find((a) => a.id === agentId)!
  const messages = histories[agentId] ?? []

  function setMessages(updater: ((m: Message[]) => Message[]) | Message[]) {
    setHistories((prev) => ({
      ...prev,
      [agentId]: typeof updater === "function" ? updater(prev[agentId] ?? []) : updater,
    }))
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function selectAgent(id: AgentId) {
    if (!AGENTS.find((a) => a.id === id)?.available) return
    setAgentId(id)
  }

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: "user", content: input }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, agentId }),
      })
      const data = await res.json()
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "エラーが発生しました。" },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* エージェント選択サイドバー */}
      <div className="w-52 border-r border-gray-200 bg-gray-50 p-3 flex flex-col gap-2 shrink-0">
        <p className="text-xs font-medium text-gray-500 px-2 pt-1 pb-2">エージェント選択</p>
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => selectAgent(a.id)}
            disabled={!a.available}
            className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
              a.id === agentId
                ? "bg-blue-600 text-white"
                : a.available
                ? "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"
                : "bg-white border border-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base">{a.icon}</span>
              {!a.available && <Lock size={10} className="text-gray-300" />}
            </div>
            <p className="text-xs font-medium mt-1">{a.name}</p>
            {!a.available && (
              <p className="text-xs mt-0.5 text-gray-300">Phase {a.phase}</p>
            )}
          </button>
        ))}
      </div>

      {/* チャット本体 */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 bg-white px-6 py-3">
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
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-3xl mb-3">{agent.icon}</p>
              <p className="font-medium text-gray-600">{agent.name}</p>
              <p className="text-sm mt-1">{agent.description}</p>
            </div>
          )}
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
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex gap-3 items-end">
            <textarea
              className="flex-1 bg-white text-gray-900 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              rows={2}
              placeholder={`${agent.name}に質問する...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
              }}
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
    </div>
  )
}
