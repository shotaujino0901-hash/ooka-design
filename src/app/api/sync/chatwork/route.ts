import { ingestDoc } from "@/lib/ingest"

const BASE = "https://api.chatwork.com/v2"

function headers() {
  return { "X-ChatWorkToken": process.env.CHATWORK_API_TOKEN ?? "" }
}

async function fetchRooms(): Promise<{ room_id: number; name: string }[]> {
  const res = await fetch(`${BASE}/rooms`, { headers: headers() })
  if (!res.ok) return []
  return res.json()
}

async function fetchMessages(roomId: number): Promise<{
  message_id: string
  body: string
  send_time: number
  account: { name: string }
}[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/messages?force=1`, {
    headers: headers(),
  })
  if (!res.ok) return []
  return res.json()
}

export async function POST() {
  const rooms = await fetchRooms()
  let synced = 0

  for (const room of rooms) {
    const messages = await fetchMessages(room.room_id)
    for (const msg of messages) {
      if (!msg.body.trim()) continue
      const date = msg.send_time
        ? new Date(msg.send_time * 1000).toISOString()
        : null

      await ingestDoc({
        source: "chatwork",
        source_id: `room_${room.room_id}_msg_${msg.message_id}`,
        project: room.name,
        title: `${room.name} - ${date?.slice(0, 10) ?? ""}`,
        content: `[${room.name}] ${msg.account.name}:\n${msg.body}`,
        tags: [room.name],
        metadata: { room_id: room.room_id, sender: msg.account.name },
        source_updated_at: date,
      })
      synced++
    }
  }

  return Response.json({ status: "ok", synced })
}
