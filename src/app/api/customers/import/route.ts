import * as XLSX from "xlsx"
import { supabaseAdmin } from "@/lib/supabase"

const COL = {
  name: ["名前", "氏名", "Name"],
  company: ["会社名", "法人名", "Company"],
  type: ["種別", "Type"],
  phone: ["電話番号", "電話", "Tel", "Phone"],
  email: ["メールアドレス", "メール", "Email"],
  address: ["住所", "Address"],
  notes: ["備考", "メモ", "Notes"],
  next_action: ["次回アクション", "アクション", "Action"],
  next_action_date: ["アクション期限", "期限", "Due"],
}

function findCol(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim()
    }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const save = formData.get("save") === "true"

    if (!file) return Response.json({ error: "ファイルが必要です" }, { status: 400 })

    const name = file.name.toLowerCase()
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return Response.json({ error: "Excel ファイル（.xlsx / .xls）のみ対応しています" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: "buffer" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[]

    const records = rawRows
      .map((r) => ({
        name: findCol(r, COL.name) ?? "",
        company: findCol(r, COL.company),
        type: ["個人", "法人"].includes(findCol(r, COL.type) ?? "") ? findCol(r, COL.type)! : "個人",
        phone: findCol(r, COL.phone),
        email: findCol(r, COL.email),
        address: findCol(r, COL.address),
        notes: findCol(r, COL.notes),
        next_action: findCol(r, COL.next_action),
        next_action_date: findCol(r, COL.next_action_date),
      }))
      .filter((r) => r.name)

    if (records.length === 0) {
      return Response.json({ error: "「名前」列が見つからないか、データが空です" }, { status: 400 })
    }

    if (save) {
      const db = supabaseAdmin()
      await db.from("customers").insert(records)
      return Response.json({ saved: records.length })
    }

    return Response.json({ records })
  } catch (e: any) {
    return Response.json({ error: e.message ?? "インポートに失敗しました" }, { status: 500 })
  }
}
