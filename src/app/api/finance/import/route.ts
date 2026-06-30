import * as XLSX from "xlsx"
import { supabaseAdmin } from "@/lib/supabase"

type ColConfig = {
  term: number
  termLabel: string
  fiscalYearEnd: string
  projectNameCol: number
  workTypeCol: number
  completionMonthCol: number
  paymentReceivedCol: number
  orderStatusCol: number
  propertyTypeCol: number
  referralSourceCol: number
  clientNameCol: number
  revenuePlanCol: number
  outsourcingTotalCol: number
  grossProfitCol: number
  grossProfitRateCol: number
  laborCostCol: number
  netProfitCol: number
}

const SHEET_CONFIGS: Record<string, ColConfig> = {
  "～2020年8月": {
    term: 6, termLabel: "第六期", fiscalYearEnd: "2020-08",
    projectNameCol: 0, workTypeCol: -1, completionMonthCol: -1, paymentReceivedCol: -1, orderStatusCol: -1,
    propertyTypeCol: -1, referralSourceCol: -1, clientNameCol: -1,
    revenuePlanCol: 1, outsourcingTotalCol: 12, grossProfitCol: 13, grossProfitRateCol: 14,
    laborCostCol: -1, netProfitCol: -1,
  },
  "～2021年8月": {
    term: 7, termLabel: "第七期", fiscalYearEnd: "2021-08",
    projectNameCol: 0, workTypeCol: -1, completionMonthCol: 1, paymentReceivedCol: -1, orderStatusCol: -1,
    propertyTypeCol: 3, referralSourceCol: 4, clientNameCol: 5,
    revenuePlanCol: 6, outsourcingTotalCol: 17, grossProfitCol: 18, grossProfitRateCol: 19,
    laborCostCol: -1, netProfitCol: -1,
  },
  "～2022年8月": {
    term: 8, termLabel: "第八期", fiscalYearEnd: "2022-08",
    projectNameCol: 0, workTypeCol: -1, completionMonthCol: 1, paymentReceivedCol: 3, orderStatusCol: 4,
    propertyTypeCol: 5, referralSourceCol: 6, clientNameCol: 7,
    revenuePlanCol: 8, outsourcingTotalCol: 19, grossProfitCol: 20, grossProfitRateCol: 21,
    laborCostCol: 22, netProfitCol: 23,
  },
  "～2023年8月": {
    term: 9, termLabel: "第九期", fiscalYearEnd: "2023-08",
    projectNameCol: 1, workTypeCol: -1, completionMonthCol: 2, paymentReceivedCol: 4, orderStatusCol: 5,
    propertyTypeCol: 6, referralSourceCol: 7, clientNameCol: 8,
    revenuePlanCol: 9, outsourcingTotalCol: 20, grossProfitCol: 21, grossProfitRateCol: 22,
    laborCostCol: 23, netProfitCol: 24,
  },
  "～2024年8月": {
    term: 10, termLabel: "第十期", fiscalYearEnd: "2024-08",
    projectNameCol: 1, workTypeCol: -1, completionMonthCol: 3, paymentReceivedCol: 5, orderStatusCol: 6,
    propertyTypeCol: 7, referralSourceCol: 8, clientNameCol: 9,
    revenuePlanCol: 10, outsourcingTotalCol: 21, grossProfitCol: 22, grossProfitRateCol: 23,
    laborCostCol: 24, netProfitCol: 26,
  },
  "～2025年8月": {
    term: 11, termLabel: "第十一期", fiscalYearEnd: "2025-08",
    projectNameCol: 0, workTypeCol: 1, completionMonthCol: 3, paymentReceivedCol: 5, orderStatusCol: 6,
    propertyTypeCol: 7, referralSourceCol: 8, clientNameCol: 9,
    revenuePlanCol: 10, outsourcingTotalCol: 21, grossProfitCol: 22, grossProfitRateCol: 23,
    laborCostCol: 24, netProfitCol: 25,
  },
  "～2026年8月": {
    term: 12, termLabel: "第十二期", fiscalYearEnd: "2026-08",
    projectNameCol: 0, workTypeCol: 1, completionMonthCol: 3, paymentReceivedCol: 5, orderStatusCol: 6,
    propertyTypeCol: 7, referralSourceCol: 8, clientNameCol: 9,
    revenuePlanCol: 10, outsourcingTotalCol: 21, grossProfitCol: 23, grossProfitRateCol: 24,
    laborCostCol: 25, netProfitCol: 26,
  },
}

function getNum(row: any[], col: number): number | null {
  if (col < 0 || col >= row.length) return null
  const v = row[col]
  return typeof v === "number" && isFinite(v) ? v : null
}

function getStr(row: any[], col: number): string | null {
  if (col < 0 || col >= row.length) return null
  const v = String(row[col] ?? "").trim()
  return v || null
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): any[] {
  const config = SHEET_CONFIGS[sheetName]
  if (!config) return []

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
  const rows: any[] = []

  for (let i = 4; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const projectName = getStr(row, config.projectNameCol)
    if (!projectName) continue
    if (/合計|小計|計$|固.*収入|変動収入|小　計|中　計|合　計/.test(projectName)) continue

    const revenuePlan = getNum(row, config.revenuePlanCol)
    if (!revenuePlan || revenuePlan <= 0) continue

    const outsourcingTotal = getNum(row, config.outsourcingTotalCol) ?? 0
    const grossProfit = getNum(row, config.grossProfitCol)
    let grossProfitRate = getNum(row, config.grossProfitRateCol)
    const laborCost = getNum(row, config.laborCostCol)
    const netProfit = getNum(row, config.netProfitCol)

    // Normalize: some sheets store rate as decimal (0.91), others as percent (91.4)
    if (grossProfitRate !== null && grossProfitRate > 0 && grossProfitRate <= 1.0) {
      grossProfitRate = grossProfitRate * 100
    }

    const outsourcingRate = revenuePlan > 0 ? (outsourcingTotal / revenuePlan) * 100 : null
    const revenuePlanExclTax = revenuePlan / 1.1
    const netProfitRate =
      netProfit !== null && revenuePlanExclTax > 0
        ? (netProfit / revenuePlanExclTax) * 100
        : null

    rows.push({
      term: config.term,
      term_label: config.termLabel,
      fiscal_year_end: config.fiscalYearEnd,
      project_name: projectName,
      work_type: getStr(row, config.workTypeCol),
      completion_month: getStr(row, config.completionMonthCol),
      payment_received: getNum(row, config.paymentReceivedCol),
      order_status: getStr(row, config.orderStatusCol),
      property_type: getStr(row, config.propertyTypeCol),
      referral_source: getStr(row, config.referralSourceCol),
      client_name: getStr(row, config.clientNameCol),
      revenue_plan: revenuePlan,
      outsourcing_total: outsourcingTotal,
      gross_profit: grossProfit,
      gross_profit_rate: grossProfitRate,
      labor_cost: laborCost,
      net_profit: netProfit,
      outsourcing_rate: outsourcingRate,
      net_profit_rate: netProfitRate,
    })
  }

  return rows
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return Response.json({ error: "ファイルが必要です" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: "buffer" })

    const allRows: any[] = []
    for (const sheetName of Object.keys(SHEET_CONFIGS)) {
      const ws = wb.Sheets[sheetName]
      if (!ws) continue
      const rows = parseSheet(ws, sheetName)
      allRows.push(...rows)
    }

    if (allRows.length === 0) {
      return Response.json({ error: "データが見つかりませんでした" }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Re-import: clear existing data
    await db.from("financial_projects").delete().neq("id", 0)

    // Insert in batches of 100
    for (let i = 0; i < allRows.length; i += 100) {
      const batch = allRows.slice(i, i + 100)
      const { error } = await db.from("financial_projects").insert(batch)
      if (error) throw error
    }

    const byTerm: Record<string, number> = {}
    for (const r of allRows) {
      byTerm[r.term_label] = (byTerm[r.term_label] ?? 0) + 1
    }

    return Response.json({ success: true, total: allRows.length, byTerm })
  } catch (e: any) {
    return Response.json({ error: e.message ?? "インポートエラー" }, { status: 500 })
  }
}
