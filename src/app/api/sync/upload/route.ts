import { ingestDoc } from "@/lib/ingest"

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const source = (formData.get("source") as string) || "upload"

  if (!file) {
    return Response.json({ error: "ファイルがありません" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = file.name

  let text = ""
  if (filename.toLowerCase().endsWith(".pdf")) {
    try {
      // pdf-parse v1（テストスキップのため内部パスから直接インポート）
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default
      const result = await pdfParse(buffer)
      text = result.text
    } catch (err) {
      console.error("PDF parse error:", err)
      return Response.json(
        { error: `PDF解析エラー: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      )
    }
  } else {
    text = buffer.toString("utf-8")
  }

  if (!text.trim()) {
    return Response.json({ error: "テキストを抽出できませんでした" }, { status: 400 })
  }

  await ingestDoc({
    source,
    source_id: `${source}/${filename}`,
    project: source,
    title: filename,
    content: text,
    tags: [source],
    metadata: { filename },
    source_updated_at: new Date().toISOString(),
  })

  return Response.json({ status: "ok", filename })
}
