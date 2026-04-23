/**
 * Next.js / App Router: `createServerClient` + `cookies()` lives in the **host** app that embeds
 * this Vite remote, not here. This package has no RSC and no `next/headers`.
 *
 * In the host (e.g. `utils/supabase/server.ts`), use the same URL and your publishable (or anon) key
 * with the `NEXT_PUBLIC_` prefix as in the Supabase Next.js quickstart.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export const serverClientIsHostOnly = true
