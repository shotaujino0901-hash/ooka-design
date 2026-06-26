// Next.jsの内部APIルートを呼ぶ（外部バックエンド不要）

export async function apiChat(
  messages: { role: string; content: string }[],
  sourceFilter?: string[]
) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, source_filter: sourceFilter ?? null }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiSync(target: "scrapbox" | "chatwork" | "limitless") {
  const res = await fetch(`/api/sync/${target}`, { method: "POST" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiUpload(file: File, source: string) {
  const form = new FormData()
  form.append("file", file)
  form.append("source", source)
  const res = await fetch("/api/sync/upload", { method: "POST", body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiDocStats() {
  const res = await fetch("/api/documents/stats")
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
