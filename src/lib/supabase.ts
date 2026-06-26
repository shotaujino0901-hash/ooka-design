import { createClient } from "@supabase/supabase-js"

function getClient(key: "anon" | "service") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
  const apiKey =
    key === "service"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!apiKey) throw new Error(`Supabase ${key} key is not set`)
  return createClient(url, apiKey)
}

// リクエスト時に毎回生成（ビルド時に評価されない）
export const supabase = () => getClient("anon")
export const supabaseAdmin = () => getClient("service")
