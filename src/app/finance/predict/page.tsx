"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Info, Globe } from "lucide-react"

const PROPERTY_TYPES = [
  "事業系木造", "事業系非木造", "住宅木造", "住宅非木造",
  "官公庁", "太陽光", "アパート賃貸", "駐車場",
]

type MarketStats = {
  count: number
  avgWinningAmount: number | null
  minWinningAmount: number | null
  maxWinningAmount: number | null
  p25WinningAmount: number | null
  p75WinningAmount: number | null
  medianWinningAmount: number | null
  avgEstimatedPrice: number | null
  avgWinRate: number | null
  topBidders: { name: string; count: number }[]
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
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(false)

  const [propertyType, setPropertyType] = useState("")
  const [region, setRegion] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [completionMonth, setCompletionMonth] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)

  const bidAmountNum = bidAmount ? Number(bidAmount) * 10000 : null

  useEffect(() => {
    if (!propertyType) { setMarketStats(null); return }
    setLoadingMarket(true)
    const params = new URLSearchParams({ property_type: propertyType })
    if (region) params.set("region", region)
    fetch(`/api/market-bids/stats?${params}`)
      .then((r) => r.json())
      .then((d) => { setMarketStats(d); setLoadingMarket(false) })
      .catch(() => setLoadingMarket(false))
  }, [propertyType, region])

  async function handlePredict() {
    setPredicting(true)
    setPrediction(null)
    try {
      const res = await fetch("/api/finance/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: propertyType || null,
          region: region || null,
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
        <p className="text-xs text-gray-500 mt-0.5">市場の落札データをメインに、自社実績を補足参照して分析します</p>
      </div>

      {/* 入力フォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">案件情報を入力</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物件種類</label>
            <select
              value={propertyType}
              onChange={(e) => { setPropertyType(e.target.value); setPrediction(null) }}
              className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">選択してください</option>
              {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">地域</label>
            <input
              type="text"
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPrediction(null) }}
              placeholder="浜松市、静岡県 など"
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
            disabled={predicting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {predicting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {predicting ? "AI予測中..." : "AI予測を実行"}
          </button>
          {marketStats && marketStats.count > 0 && (
            <p className="text-xs text-gray-400">
              市場データ <span className="font-medium text-gray-600">{marketStats.count}件</span>
              {marketStats.avgWinRate != null && (
                <span>（平均落札率 <span className="text-blue-700 font-medium">{marketStats.avgWinRate.toFixed(1)}%</span>）</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 結果エリア */}
      {(marketStats || prediction || predicting || loadingMarket) && (
        <div className="grid grid-cols-2 gap-5 mb-6">
          {/* 市場落札データ */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={15} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">市場落札データ</h3>
              <span className="text-xs text-gray-400">
                {propertyType || "全体"}{region ? ` / ${region}` : ""}
              </span>
            </div>
            {loadingMarket ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : marketStats && marketStats.count > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">参照件数</p>
                    <p className="text-xl font-bold text-blue-700">{marketStats.count}件</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">平均落札率</p>
                    <p className="text-xl font-bold text-gray-800">
                      {marketStats.avgWinRate != null ? `${marketStats.avgWinRate.toFixed(1)}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-400">落札/予定価格</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">平均落札金額</span>
                    <span className="font-medium text-gray-800">{fmt(marketStats.avgWinningAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">中央値</span>
                    <span className="text-gray-600">{fmt(marketStats.medianWinningAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>レンジ（25〜75%ile）</span>
                    <span>{fmt(marketStats.p25WinningAmount)} 〜 {fmt(marketStats.p75WinningAmount)}</span>
                  </div>
                </div>
                {bidAmountNum && marketStats.avgWinningAmount && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      入力金額は市場平均より{" "}
                      <span className={bidAmountNum <= marketStats.avgWinningAmount ? "text-green-700 font-medium" : "text-orange-600 font-medium"}>
                        {fmt(Math.abs(bidAmountNum - marketStats.avgWinningAmount))}{" "}
                        {bidAmountNum <= marketStats.avgWinningAmount ? "低い" : "高い"}
                      </span>
                      {marketStats.p25WinningAmount && marketStats.p75WinningAmount && (
                        <span className="text-gray-400">
                          {" / "}
                          {bidAmountNum >= marketStats.p25WinningAmount && bidAmountNum <= marketStats.p75WinningAmount
                            ? "四分位レンジ内"
                            : bidAmountNum < marketStats.p25WinningAmount ? "25%ile以下（低め）" : "75%ile以上（高め）"}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {marketStats.topBidders.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-1.5">主要落札者</p>
                    <div className="flex flex-wrap gap-1">
                      {marketStats.topBidders.slice(0, 6).map((b) => (
                        <span key={b.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {b.name}（{b.count}件）
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-gray-400">市場データがありません</p>
                <p className="text-xs text-gray-400 mt-1">「データ取込」から落札実績を登録してください</p>
              </div>
            )}
          </div>

          {/* AI予測分析 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-800">AI予測分析</h3>
              <span className="text-xs text-gray-400">市場データ + 自社実績</span>
            </div>
            {predicting ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 size={24} className="animate-spin text-purple-400" />
                <p className="text-xs text-gray-400">市場データと自社実績を分析中...</p>
              </div>
            ) : prediction ? (
              <div className="space-y-3">
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm font-medium ${WIN_COLOR[prediction.win_probability]}`}>
                  {prediction.win_probability === "高" ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                  <span>
                    受注可能性: {prediction.win_probability}
                    <span className="text-xs font-normal ml-1 block mt-0.5">{prediction.win_probability_reason}</span>
                  </span>
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
                    {prediction.risk_reasons.map((r, i) => <li key={i}>・{r}</li>)}
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
    </div>
  )
}
