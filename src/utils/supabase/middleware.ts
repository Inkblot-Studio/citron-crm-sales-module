/**
 * Next.js middleware: session refresh is implemented in the **host** that loads this remote.
 * This Vite bundle does not run `middleware.ts` from the host’s filesystem.
 *
 * Add `middleware.ts` in your Next app root if you use Supabase Auth in the host.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export const middlewareIsHostOnly = true
