/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set per-tenant in `tenants/<id>/env` (copied to `.env.local` by HillCode inject) */
  readonly VITE_TENANT?: string
  readonly VITE_SUPABASE_URL?: string
  /** Legacy JWT-style anon key from Project Settings → API */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** New publishable key (`sb_publishable_…`) from Project Settings → API */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
