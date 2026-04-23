/**
 * Full URL to the public client form (no Citron login). Same idea as Google Forms:
 * share the link, they submit, you see rows in Intake.
 *
 * Respects Vite `base` (e.g. app hosted at /app/) so the path is correct.
 */
export function getPublicIntakeFormUrl(): string {
  const base = (import.meta.env.BASE_URL as string) || '/'
  if (typeof window === 'undefined') {
    return `${base.replace(/\/$/, '') || ''}/intake`.replace(/\/\/+/, '/')
  }
  return new URL('intake', new URL(base, window.location.origin).href).href
}
