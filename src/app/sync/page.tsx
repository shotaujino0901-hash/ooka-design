"use client"

import { useState, useRef } from "react"
import { RefreshCw, Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { apiSync, apiUpload, apiDocStats } from "@/lib/api"
import { useEffect } from "react"

type Stats = { source: string; count: number }[]
type SyncResult = { status: string; synced?: number; total?: number; by_project?: Record<string, number> }

const SOURCE_LABELS: Record<string, string> = {
  scrapbox: "Scrapbox",
  chatwork: "Chatwork",
  limitless: "Limitless AI",
}

export default function SyncPage() {
  const [stats, setStats] = useState<Stats>([])
  const [results, setResults] = useState<Record<string, SyncResult | string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadStats() {
    try {
      const data = await apiDocStats()
      setStats(data)
    } catch {
      // バックエンド未起動時は無視
    }
  }

  useEffect(() => { loadStats() }, [])

  async function handleSync(target: "scrapbox" | "chatwork" | "limitless") {
    setLoading((l) => ({ ...l, [target]: true }))
    try {
      const res = await apiSync(target)
      setResults((r) => ({ ...r, [target]: res }))
    } catch (e: unknown) {
      setResults((r) => ({ ...r, [target]: e instanceof Error ? e.message : "エラーが発生しました" }))
    } finally {
      setLoading((l) => ({ ...l, [target]: false }))
      loadStats()
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadResult(null)
    setUploadError(null)
    setUploading(true)
    try {
      const res = await apiUpload(file, "plaud")
      if (res.error) {
        setUploadError(res.error)
      } else {
        setUploadResult(`完了: ${res.filename}`)
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました")
    } finally {
      setUploading(false)
      loadStats()
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">データ同期</h1>

      {/* 取り込み状況 */}
      {stats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">取り込み済みドキュメント数</h2>
          <div className="flex gap-6">
            {stats.map((s) => (
              <div key={s.source} className="text-center">
                <p className="text-2xl font-bold text-blue-600">{s.count.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{SOURCE_LABELS[s.source] ?? s.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自動同期ソース */}
      <div className="space-y-4 mb-6">
        {(["scrapbox", "chatwork", "limitless"] as const).map((target) => {
          const result = results[target]
          const isLoading = loading[target]
          return (
            <div key={target} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{SOURCE_LABELS[target]}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {target === "scrapbox" && "全プロジェクトのページを取り込みます"}
                    {target === "chatwork" && "全ルームのメッセージを取り込みます"}
                    {target === "limitless" && "Lifelog（会話記録）を取り込みます"}
                  </p>
                </div>
                <button
                  onClick={() => handleSync(target)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> 同期中...</>
                  ) : (
                    <><RefreshCw size={14} /> 同期する</>
                  )}
                </button>
              </div>
              {result && (
                <div className="mt-3 text-xs">
                  {typeof result === "string" ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle size={12} /> {result}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check size={12} />
                      {result.total !== undefined
                        ? `${result.total}件同期完了`
                        : `${result.synced ?? 0}件同期完了`}
                      {result.by_project && (
                        <span className="text-gray-500 ml-1">
                          ({Object.entries(result.by_project).map(([p, c]) => `${p}: ${c}`).join(", ")})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ファイルアップロード */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Plaud Note / ファイルアップロード</h2>
        <p className="text-xs text-gray-500 mb-4">TXTまたはPDFファイルをアップロードして知識ベースに追加します</p>
        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors ${uploading ? "border-blue-300 bg-blue-50 cursor-wait" : "border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50"}`}>
          {uploading ? (
            <Loader2 size={24} className="text-blue-500 mb-2 animate-spin" />
          ) : (
            <Upload size={24} className="text-gray-400 mb-2" />
          )}
          <span className="text-sm text-gray-600">{uploading ? "アップロード中..." : "クリックしてファイルを選択"}</span>
          <span className="text-xs text-gray-400 mt-1">.txt / .pdf</span>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        {uploadResult && (
          <p className="mt-3 text-xs text-green-600 flex items-center gap-1">
            <Check size={12} /> {uploadResult}
          </p>
        )}
        {uploadError && (
          <p className="mt-3 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {uploadError}
          </p>
        )}
      </div>
    </div>
  )
}
