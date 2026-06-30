"use client"

import { useState, useRef } from "react"
import { RefreshCw, Upload, Check, AlertCircle, Loader2 } from "lucide-react"
import { apiSync, apiUpload, apiDocStats } from "@/lib/api"
import { useEffect } from "react"

const RESULT_LABELS: Record<string, string> = { won: "受注", lost: "失注", pending: "検討中" }
const RESULT_COLORS: Record<string, string> = {
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
}

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

  // 入札記録インポート
  const [bidImporting, setBidImporting] = useState(false)
  const [bidPreview, setBidPreview] = useState<any[] | null>(null)
  const [bidImportError, setBidImportError] = useState<string | null>(null)
  const [bidSaving, setBidSaving] = useState(false)
  const [bidSaveResult, setBidSaveResult] = useState<string | null>(null)
  const bidFileRef = useRef<HTMLInputElement>(null)
  const bidSaveFileRef = useRef<File | null>(null)

  // 市場入札データインポート
  const [marketImporting, setMarketImporting] = useState(false)
  const [marketPreview, setMarketPreview] = useState<any[] | null>(null)
  const [marketImportError, setMarketImportError] = useState<string | null>(null)
  const [marketSaving, setMarketSaving] = useState(false)
  const [marketSaveResult, setMarketSaveResult] = useState<string | null>(null)
  const marketFileRef = useRef<HTMLInputElement>(null)
  const marketSaveFileRef = useRef<File | null>(null)

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

  async function handleBidImport(file: File) {
    setBidImporting(true)
    setBidImportError(null)
    setBidPreview(null)
    setBidSaveResult(null)
    bidSaveFileRef.current = file
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "false")
    const res = await fetch("/api/bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setBidImporting(false)
    if (!res.ok) { setBidImportError(data.error ?? "エラーが発生しました"); return }
    setBidPreview(data.records ?? [])
  }

  async function handleBidSave() {
    const file = bidSaveFileRef.current
    if (!file) return
    setBidSaving(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "true")
    const res = await fetch("/api/bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setBidSaving(false)
    if (res.ok) {
      setBidPreview(null)
      setBidSaveResult(`${data.saved}件の入札記録を保存しました`)
      if (bidFileRef.current) bidFileRef.current.value = ""
    } else {
      setBidImportError(data.error ?? "保存に失敗しました")
    }
  }

  async function handleMarketImport(file: File) {
    setMarketImporting(true)
    setMarketImportError(null)
    setMarketPreview(null)
    setMarketSaveResult(null)
    marketSaveFileRef.current = file
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "false")
    const res = await fetch("/api/market-bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setMarketImporting(false)
    if (!res.ok) { setMarketImportError(data.error ?? "エラーが発生しました"); return }
    setMarketPreview(data.records ?? [])
  }

  async function handleMarketSave() {
    const file = marketSaveFileRef.current
    if (!file) return
    setMarketSaving(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("save", "true")
    const res = await fetch("/api/market-bids/import", { method: "POST", body: fd })
    const data = await res.json()
    setMarketSaving(false)
    if (res.ok) {
      setMarketPreview(null)
      setMarketSaveResult(`${data.saved}件の落札データを保存しました`)
      if (marketFileRef.current) marketFileRef.current.value = ""
    } else {
      setMarketImportError(data.error ?? "保存に失敗しました")
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
      <h1 className="text-xl font-bold text-gray-900 mb-6">データ取込</h1>

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

      {/* 入札記録 取り込み */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">入札記録（Excel / PDF）</h2>
        <p className="text-xs text-gray-500 mb-4">過去の入札データをAIが読み取り、入札記録として保存します</p>
        {!bidPreview ? (
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${bidImporting ? "border-blue-300 bg-blue-50 cursor-wait" : "border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50"}`}>
            {bidImporting ? (
              <><Loader2 size={22} className="text-blue-500 mb-2 animate-spin" /><span className="text-sm text-gray-600">AIが読み取り中...</span></>
            ) : (
              <><Upload size={22} className="text-gray-400 mb-2" /><span className="text-sm text-gray-600">クリックしてファイルを選択</span><span className="text-xs text-gray-400 mt-1">.xlsx / .xls / .pdf</span></>
            )}
            <input ref={bidFileRef} type="file" accept=".xlsx,.xls,.pdf" className="hidden" disabled={bidImporting}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBidImport(f) }} />
          </label>
        ) : (
          <div>
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-semibold text-blue-700">{bidPreview.length}件</span>を読み取りました。確認して保存してください。
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">案件名</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">物件種類</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">入札金額</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {bidPreview.map((r, i) => (
                    <tr key={i} className={i < bidPreview.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{r.project_name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.property_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{r.bid_amount ? `${Math.round(r.bid_amount / 10000)}万` : "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${RESULT_COLORS[r.result] ?? "bg-gray-100 text-gray-500"}`}>
                          {RESULT_LABELS[r.result] ?? r.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setBidPreview(null); if (bidFileRef.current) bidFileRef.current.value = "" }}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                やり直す
              </button>
              <button onClick={handleBidSave} disabled={bidSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {bidSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {bidPreview.length}件を保存
              </button>
            </div>
          </div>
        )}
        {bidImportError && <p className="mt-3 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{bidImportError}</p>}
        {bidSaveResult && <p className="mt-3 text-xs text-green-600 flex items-center gap-1"><Check size={12} />{bidSaveResult}</p>}
      </div>

      {/* 市場入札データ（落札結果） */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">市場入札データ（落札結果）</h2>
        <p className="text-xs text-gray-500 mb-4">公開された落札結果データをAIが読み取り、入札予測の参照データとして保存します</p>
        {!marketPreview ? (
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${marketImporting ? "border-blue-300 bg-blue-50 cursor-wait" : "border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50"}`}>
            {marketImporting ? (
              <><Loader2 size={22} className="text-blue-500 mb-2 animate-spin" /><span className="text-sm text-gray-600">AIが読み取り中...</span></>
            ) : (
              <><Upload size={22} className="text-gray-400 mb-2" /><span className="text-sm text-gray-600">クリックしてファイルを選択</span><span className="text-xs text-gray-400 mt-1">.xlsx / .xls / .pdf</span></>
            )}
            <input ref={marketFileRef} type="file" accept=".xlsx,.xls,.pdf" className="hidden" disabled={marketImporting}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMarketImport(f) }} />
          </label>
        ) : (
          <div>
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-semibold text-blue-700">{marketPreview.length}件</span>の落札データを読み取りました。確認して保存してください。
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 max-h-52 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">案件名</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">地域</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">落札者</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">落札金額</th>
                  </tr>
                </thead>
                <tbody>
                  {marketPreview.map((r, i) => (
                    <tr key={i} className={i < marketPreview.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate">{r.project_name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.region ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{r.winning_bidder ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{r.winning_amount ? `${Math.round(r.winning_amount / 10000)}万` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setMarketPreview(null); if (marketFileRef.current) marketFileRef.current.value = "" }}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                やり直す
              </button>
              <button onClick={handleMarketSave} disabled={marketSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {marketSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {marketPreview.length}件を保存
              </button>
            </div>
          </div>
        )}
        {marketImportError && <p className="mt-3 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{marketImportError}</p>}
        {marketSaveResult && <p className="mt-3 text-xs text-green-600 flex items-center gap-1"><Check size={12} />{marketSaveResult}</p>}
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
