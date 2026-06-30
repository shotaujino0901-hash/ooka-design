"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react"

const PROPERTY_TYPES = [
  "事業系木造", "事業系非木造", "住宅木造", "住宅非木造",
  "官公庁", "太陽光", "アパート賃貸", "駐車場",
]

type BidTypeStats = {
  count: number
  wonCount: number
  lostCount: number
  pendingCount: number
  winRate: number | null
  avgWonAmount: number | null
  avgLostAmount: number | null
  avgCompetitorAmount: number | null
  lossReasons: string[]
}

type BidsStats = {
  overall: BidTypeStats
  byPropertyType: Record<string, BidTypeStats>
  totalBids: number
}

type Prediction = {
  win_probability: "高" | "中" | "低"
  win_probability_reason: string
  recommended_bid_min: number
  recommended_bid_max: number
  risk_level: "low" | "medium" | "high"
  risk_reasons: string[]
  analysis: string
  price_sensitivity: string
  competitor_insight: string
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 10000).toLocaleString()}万円`

const RISK_COLOR: Record<string, string> = {
  low: "text-green-700 bg-green-50 border-green-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  high: "text-red-700 bg-red-50 border-red-200",
}
const RISK_LABEL: Record<string, string> = { low: "低リスク", medium: "中リスク", high: "高リスク" }
const WIN_COLOR: Record<string, string> = {
  高: "text-green-700 bg-green-50",
  中: "text-yellow-700 bg-yellow-50",
  低: "text-red-700 bg-red-50",
}

export default function PredictPage() {
  const [bidsStats, setBidsStats] = useState<BidsStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [propertyType, setPropertyType] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [completionMonth, setCompletionMonth] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)

  useEffect(() => {
    fetch("/api/finance/bids-stats")
      .then((r) => r.json())
      .then((d) => { setBidsStats(d); setLoadingStats(false) })
      .catch(() => setLoadingStats(false))
  }, [])

  const bidAmountNum = bidAmount ? Number(bidAmount) * 10000 : null
  const ptStats = propertyType && bidsStats?.byPropertyType?.[propertyType]
    ? bidsStats.byPropertyType[propertyType] : null

  async function handlePredict() {
    setPredicting(true)
    setPrediction(null)
    try {
      const res = await fetch("/api/finance/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: propertyType || null,
          referral_source: referralSource || null,
          completion_month: completionMonth || null,
          bid_amount: bidAmountNum,
        }),
      })
      if (res.ok) setPrediction(await res.json())
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">入札価格予測</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          過去{bidsStats?.totalBids ?? "—"}件の入札記録をもとに分析します
        </p>
      </div>

      {/* 入力フォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">案件情報を入力</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物件種類</label>
            <select
              value={propertyType}
              onChange={(e) => { setPropertyType(e.target.value); setPrediction(null) }}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">選択してください</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">紹介先・ルート</label>
            <input
              type="text"
              value={referralSource}
              onChange={(e) => { setReferralSource(e.target.value); setPrediction(null) }}
              placeholder="直接、工務店、不動産 など"
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">入札金額（税込・万円）</label>
            <div className="relative">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => { setBidAmount(e.target.value); setPrediction(null) }}
                placeholder="例: 1500"
                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">万円</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">完成予定</label>
            <input
              type="month"
              value={completionMonth}
              onChange={(e) => { setCompletionMonth(e.target.value); setPrediction(null) }}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePredict}
            disabled={predicting || loadingStats}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {predicting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {predicting ? "AI予測中..." : "AI予測を実行"}
          </button>
          {ptStats && (
            <p className="text-xs text-gray-400">
              類似案件 <span className="font-medium text-gray-600">{ptStats.count}件</span>（受注率 <span className="font-medium text-green-700">{ptStats.winRate != null ? `${ptStats.winRate}%` : "—"}</span>）
            </p>
          )}
        </div>
      </div>

      {/* 結果エリア */}
      {(ptStats || prediction || predicting) && (
        <div className="grid grid-cols-2 gap-5 mb-6">
          {/* 入札実績ベース */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">入札実績サマリー</h3>
              <span className="text-xs text-gray-400">{propertyType || "全体"}</span>
            </div>
            {ptStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">受注率</p>
                    <p className="text-xl font-bold text-green-700">
                      {ptStats.winRate != null ? `${ptStats.winRate}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-400">{ptStats.wonCount}勝 / {ptStats.lostCount}敗</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">入札件数</p>
                    <p className="text-xl font-bold text-gray-800">{ptStats.count}件</p>
                    <p className="text-xs text-gray-400">検討中 {ptStats.pendingCount}件</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">受注平均金額</span>
                    <span className="font-medium text-green-700">{fmt(ptStats.avgWonAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">失注平均金額</span>
                    <span className="font-medium text-red-600">{fmt(ptStats.avgLostAmount)}</span>
                  </div>
                  {ptStats.avgCompetitorAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">競合平均金額（失注時）</span>
                      <span className="font-medium text-gray-700">{fmt(ptStats.avgCompetitorAmount)}</span>
                    </div>
                  )}
                  {bidAmountNum && ptStats.avgWonAmount && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        入力金額は受注平均より{" "}
                        <span className={bidAmountNum <= ptStats.avgWonAmount ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                          {bidAmountNum <= ptStats.avgWonAmount
                            ? `${Math.round((ptStats.avgWonAmount - bidAmountNum) / 10000)}万円 低い`
                            : `${Math.round((bidAmountNum - ptStats.avgWonAmount) / 10000)}万円 高い`}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                {ptStats.lossReasons.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-1">主な失注理由</p>
                    <div className="flex flex-wrap gap-1">
                      {ptStats.lossReasons.map((r) => (
                        <span key={r} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">物件種類を選択してください</p>
            )}
          </div>

          {/* AIベース */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-800">AI予測分析</h3>
              <span className="text-xs text-gray-400">多角的分析</span>
            </div>
            {predicting ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 size={24} className="animate-spin text-purple-400" />
                <p className="text-xs text-gray-400">入札データを分析中...</p>
              </div>
            ) : prediction ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${WIN_COLOR[prediction.win_probability]}`}>
                  {prediction.win_probability === "高" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  受注可能性: {prediction.win_probability}
                  <span className="text-xs font-normal ml-1">{prediction.win_probability_reason}</span>
                </div>

                <div className="border border-gray-100 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">推奨入札レンジ</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {fmt(prediction.recommended_bid_min)} 〜 {fmt(prediction.recommended_bid_max)}
                  </p>
                </div>

                <div className={`border rounded-lg px-3 py-2 text-xs ${RISK_COLOR[prediction.risk_level]}`}>
                  <p className="font-semibold mb-1">{RISK_LABEL[prediction.risk_level]}</p>
                  <ul className="space-y-0.5">
                    {prediction.risk_reasons.map((r, i) => (
                      <li key={i}>・{r}</li>
                    ))}
                  </ul>
                </div>

                {prediction.competitor_insight && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                    <p className="font-medium mb-0.5">競合分析</p>
                    <p>{prediction.competitor_insight}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 leading-relaxed">{prediction.analysis}</p>
                </div>

                <div className="flex items-start gap-1.5 text-xs text-gray-400">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>{prediction.price_sensitivity}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">「AI予測を実行」ボタンを押してください</p>
            )}
          </div>
        </div>
      )}

      {/* 物件種類別入札実績テーブル */}
      {loadingStats ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
      ) : bidsStats && Object.keys(bidsStats.byPropertyType).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">物件種類別 入札実績</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">物件種類</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">件数</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">受注率</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">受注平均</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">失注平均</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">競合平均</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bidsStats.byPropertyType)
                .sort(([, a], [, b]) => (b.winRate ?? -1) - (a.winRate ?? -1))
                .map(([pt, s], i, arr) => (
                  <tr
                    key={pt}
                    className={`${propertyType === pt ? "bg-blue-50" : ""} ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">{pt}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{s.count}件</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700">
                      {s.winRate != null ? `${s.winRate}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmt(s.avgWonAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{fmt(s.avgLostAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{fmt(s.avgCompetitorAmount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
