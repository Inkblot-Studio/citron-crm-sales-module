import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Vite + browser (Module Federation remote). Public URL + key only; never `service_role`.
 * Uses `@supabase/ssr` `createBrowserClient` for PKCE, refresh, and storage alignment with Supabase docs.
 *
 * Vite only exposes `import.meta.env` keys with the `VITE_` prefix. The dashboard’s
 * `NEXT_PUBLIC_*` names must be copied as `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY`
 * (legacy) or `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
 */
let cached: SupabaseClient | null | undefined

function getUrl(): string | undefined {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || undefined
}

function getKey(): string | undefined {
  const legacy = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  const pub = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()
  return legacy || pub || undefined
}

/**
 * Create a new browser client. Prefer `getSupabase()` in UI code; use this if you need a fresh
 * instance (tests).
 */
export function createClient(): SupabaseClient {
  const url = getUrl()
  const key = getKey()
  if (!url || !key) {
    throw new Error(
      'Missing Vite env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local',
    )
  }
  return createBrowserClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
}

/**
 * Shared singleton for the app. Returns `null` if env is missing (module still loads for the host).
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = getUrl()
  const key = getKey()
  if (!url || !key) {
    if (import.meta.env.DEV) {
      console.warn(
        '[citron/sales] VITE_SUPABASE_URL and a public key (VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY) missing — Intake is disconnected.',
      )
    }
    cached = null
    return null
  }

  cached = createBrowserClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return cached
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getUrl() && getKey())
}
