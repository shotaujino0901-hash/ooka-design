"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react"

const PROPERTY_TYPES = [
  "事業系木造", "事業系非木造", "住宅木造", "住宅非木造",
  "官公庁", "太陽光", "アパート賃貸", "駐車場",
]

type Stats = {
  count: number
  avgRevenue: number
  medianRevenue: number
  avgGrossProfitRate: number
  p25GrossProfitRate: number
  p75GrossProfitRate: number
  minGrossProfitRate: number
  maxGrossProfitRate: number
  avgNetProfitRate: number
  avgOutsourcingRate: number
}

type Benchmarks = {
  overall: Stats
  byPropertyType: Record<string, Stats>
  byReferralSource: Record<string, Stats>
  byRevenueRange: Record<string, Stats>
  byMonth: Record<string, Stats>
  totalProjects: number
}

type Prediction = {
  predicted_gross_profit_rate: number
  predicted_net_profit_rate: number
  estimated_gross_profit: number
  estimated_net_profit: number
  recommended_bid_min: number
  recommended_bid_max: number
  win_probability: "高" | "中" | "低"
  win_probability_reason: string
  risk_level: "low" | "medium" | "high"
  risk_reasons: string[]
  analysis: string
  price_sensitivity: string
  key_metrics: {
    外注費見込: number
    外注比率見込: number
    損益分岐粗利率: number
  }
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n / 10000).toLocaleString()}万円`
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toFixed(1)}%`

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

function StatBar({ value, min, max, p25, p75, current }: {
  value: number; min: number; max: number; p25: number; p75: number; current?: number
}) {
  const range = max - min || 1
  const toPos = (v: number) => Math.min(100, Math.max(0, ((v - min) / range) * 100))
  return (
    <div className="relative h-3 bg-gray-100 rounded-full mt-1">
      {/* IQRゾーン */}
      <div
        className="absolute h-full bg-blue-100 rounded-full"
        style={{ left: `${toPos(p25)}%`, width: `${toPos(p75) - toPos(p25)}%` }}
      />
      {/* 平均 */}
      <div
        className="absolute top-0 h-full w-0.5 bg-blue-500"
        style={{ left: `${toPos(value)}%` }}
      />
      {/* 入力金額 */}
      {current != null && (
        <div
          className="absolute top-0 h-full w-0.5 bg-orange-500"
          style={{ left: `${toPos(current)}%` }}
        />
      )}
    </div>
  )
}

export default function PredictPage() {
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null)
  const [loadingBench, setLoadingBench] = useState(true)

  const [propertyType, setPropertyType] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [completionMonth, setCompletionMonth] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [benchTab, setBenchTab] = useState<"property" | "range" | "month" | "referral">("property")

  useEffect(() => {
    fetch("/api/finance/benchmarks")
      .then((r) => r.json())
      .then((d) => { setBenchmarks(d); setLoadingBench(false) })
      .catch(() => setLoadingBench(false))
  }, [])

  const bidAmountNum = bidAmount ? Number(bidAmount) * 10000 : null
  const ptStats = propertyType && benchmarks?.byPropertyType?.[propertyType] ? benchmarks.byPropertyType[propertyType] : null
  const rsStats = referralSource && benchmarks?.byReferralSource?.[referralSource] ? benchmarks.byReferralSource[referralSource] : null

  // 統計ベースの即時計算
  const statPrediction = ptStats && bidAmountNum ? {
    grossProfit: bidAmountNum * (ptStats.avgGrossProfitRate / 100),
    netProfit: bidAmountNum * (ptStats.avgNetProfitRate / 100),
    grossProfitRate: ptStats.avgGrossProfitRate,
    netProfitRate: ptStats.avgNetProfitRate,
    p25GrossProfit: bidAmountNum * (ptStats.p25GrossProfitRate / 100),
    p75GrossProfit: bidAmountNum * (ptStats.p75GrossProfitRate / 100),
  } : null

  async function handlePredict() {
    if (!benchmarks) return
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
          benchmarks,
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
          過去{benchmarks?.totalProjects ?? "—"}件のデータをもとに収益を予測します
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
            disabled={predicting || !benchmarks}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {predicting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {predicting ? "AI予測中..." : "AI予測を実行"}
          </button>
          {ptStats && (
            <p className="text-xs text-gray-400">
              類似案件 <span className="font-medium text-gray-600">{ptStats.count}件</span> のデータを参照
            </p>
          )}
        </div>
      </div>

      {/* 結果エリア */}
      {(statPrediction || prediction || predicting) && (
        <div className="grid grid-cols-2 gap-5 mb-6">
          {/* 統計ベース */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">統計ベース予測</h3>
              <span className="text-xs text-gray-400">過去データの平均値</span>
            </div>
            {statPrediction ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">推定粗利益</span>
                    <span className="font-bold text-green-700">{fmt(statPrediction.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>レンジ（25〜75%ile）</span>
                    <span>{fmt(statPrediction.p25GrossProfit)} 〜 {fmt(statPrediction.p75GrossProfit)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">推定差引利益</span>
                  <span className="font-bold text-blue-700">{fmt(statPrediction.netProfit)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">平均粗利益率</span>
                    <span className="text-green-700 font-medium">{fmtPct(statPrediction.grossProfitRate)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">粗利益率レンジ</span>
                    <span className="text-gray-600">{fmtPct(ptStats?.p25GrossProfitRate)} 〜 {fmtPct(ptStats?.p75GrossProfitRate)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">平均差引利益率</span>
                    <span className="text-blue-700 font-medium">{fmtPct(statPrediction.netProfitRate)}</span>
                  </div>
                  {rsStats && (
                    <div className="flex justify-between text-xs border-t border-gray-50 pt-2">
                      <span className="text-gray-400">紹介先「{referralSource}」実績</span>
                      <span className="text-gray-600">粗利率 {fmtPct(rsStats.avgGrossProfitRate)}</span>
                    </div>
                  )}
                </div>
                {ptStats && bidAmountNum && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">過去案件との粗利率比較</p>
                    <StatBar
                      value={ptStats.avgGrossProfitRate}
                      min={ptStats.minGrossProfitRate}
                      max={ptStats.maxGrossProfitRate}
                      p25={ptStats.p25GrossProfitRate}
                      p75={ptStats.p75GrossProfitRate}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{fmtPct(ptStats.minGrossProfitRate)}</span>
                      <span className="text-blue-600">平均 {fmtPct(ptStats.avgGrossProfitRate)}</span>
                      <span>{fmtPct(ptStats.maxGrossProfitRate)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">物件種類と入札金額を入力してください</p>
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
                <p className="text-xs text-gray-400">過去データを分析中...</p>
              </div>
            ) : prediction ? (
              <div className="space-y-3">
                {/* 受注可能性 */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${WIN_COLOR[prediction.win_probability]}`}>
                  {prediction.win_probability === "高" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  受注可能性: {prediction.win_probability}
                  <span className="text-xs font-normal ml-1">{prediction.win_probability_reason}</span>
                </div>

                {/* 収益予測 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">予測粗利益率</p>
                    <p className="text-base font-bold text-green-700">{fmtPct(prediction.predicted_gross_profit_rate)}</p>
                    <p className="text-xs text-gray-500">{fmt(prediction.estimated_gross_profit)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">予測差引利益率</p>
                    <p className="text-base font-bold text-blue-700">{fmtPct(prediction.predicted_net_profit_rate)}</p>
                    <p className="text-xs text-gray-500">{fmt(prediction.estimated_net_profit)}</p>
                  </div>
                </div>

                {/* 推奨入札レンジ */}
                <div className="border border-gray-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-0.5">推奨入札レンジ</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {fmt(prediction.recommended_bid_min)} 〜 {fmt(prediction.recommended_bid_max)}
                  </p>
                </div>

                {/* リスク */}
                <div className={`border rounded-lg px-3 py-2 text-xs ${RISK_COLOR[prediction.risk_level]}`}>
                  <p className="font-semibold mb-1">{RISK_LABEL[prediction.risk_level]}</p>
                  <ul className="space-y-0.5">
                    {prediction.risk_reasons.map((r, i) => (
                      <li key={i}>・{r}</li>
                    ))}
                  </ul>
                </div>

                {/* 総合分析 */}
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 leading-relaxed">{prediction.analysis}</p>
                </div>

                {/* 価格感度 */}
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

      {/* 追加指標 (AI実行後) */}
      {prediction && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "外注費見込", value: fmt(prediction.key_metrics?.外注費見込), color: "text-gray-800" },
            { label: "外注比率見込", value: fmtPct(prediction.key_metrics?.外注比率見込), color: "text-gray-800" },
            { label: "損益分岐粗利率", value: fmtPct(prediction.key_metrics?.損益分岐粗利率), color: "text-orange-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ベンチマーク参照テーブル */}
      {loadingBench ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
      ) : benchmarks && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {([
              { key: "property", label: "物件種類別" },
              { key: "range", label: "売上規模別" },
              { key: "month", label: "月別傾向" },
              { key: "referral", label: "紹介先別" },
            ] as { key: typeof benchTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBenchTab(key)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors ${benchTab === key ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">
                  {benchTab === "property" ? "物件種類" : benchTab === "range" ? "売上規模" : benchTab === "month" ? "完成月" : "紹介先"}
                </th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">件数</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">平均売上</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">平均粗利率</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">25〜75%ile</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">平均差引利益率</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                benchTab === "property" ? benchmarks.byPropertyType :
                benchTab === "range" ? benchmarks.byRevenueRange :
                benchTab === "month" ? benchmarks.byMonth :
                benchmarks.byReferralSource
              )
                .sort(([, a], [, b]) => b.avgGrossProfitRate - a.avgGrossProfitRate)
                .map(([key, s], i, arr) => (
                  <tr
                    key={key}
                    className={`${propertyType === key ? "bg-blue-50" : ""} ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">{key}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{s.count}件</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmt(s.avgRevenue)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmtPct(s.avgGrossProfitRate)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                      {fmtPct(s.p25GrossProfitRate)} 〜 {fmtPct(s.p75GrossProfitRate)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmtPct(s.avgNetProfitRate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
