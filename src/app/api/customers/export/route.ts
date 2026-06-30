import * as XLSX from "xlsx"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  const db = supabaseAdmin()
  const { data } = await db.from("customers").select("*").order("updated_at", { ascending: false })
  const customers = data ?? []

  const rows = customers.map((c: any) => ({
    "名前": c.name,
    "会社名": c.company ?? "",
    "種別": c.type ?? "個人",
    "電話番号": c.phone ?? "",
    "メールアドレス": c.email ?? "",
    "住所": c.address ?? "",
    "備考": c.notes ?? "",
    "次回アクション": c.next_action ?? "",
    "アクション期限": c.next_action_date ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  // 列幅調整
  ws["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 16 },
    { wch: 28 }, { wch: 30 }, { wch: 30 }, { wch: 24 }, { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "顧客一覧")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
  const uint8 = new Uint8Array(buf)

  const date = new Date().toISOString().slice(0, 10)
  return new Response(uint8, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers_${date}.xlsx"`,
    },
  })
}
