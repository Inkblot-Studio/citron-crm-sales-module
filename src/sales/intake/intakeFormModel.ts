import type { CreateManualIntakeInput } from './api'
import type { IntakeBudgetBand, IntakeTimeline } from './types'

export type BrandChoice = 'unsure' | 'yes' | 'no'

/** Full draft — shared by internal + client wizards. */
export type IntakeFormDraft = {
  project_title: string
  contact_name: string
  contact_email: string
  contact_role: string
  company_name: string
  company_website: string
  project_type: string
  project_summary: string
  goals: string
  success_metrics: string
  vision: string
  inspiration_text: string
  must_have_features: string
  nice_to_have_features: string
  /** “What this engagement does *not* include” — appends to open_notes (industry best practice). */
  out_of_scope: string
  has_brand: BrandChoice
  brand_notes: string
  asset_urls_text: string
  tech_preferences: string
  integrations: string
  hosting_preferences: string
  budget_band: string
  budget_exact: string
  budget_currency: string
  timeline: string
  timeline_notes: string
  open_notes: string
  /** Honeypot for public form — must stay empty. */
  honeypot_website: string
}

export function defaultIntakeFormDraft(): IntakeFormDraft {
  return {
    project_title: '',
    contact_name: '',
    contact_email: '',
    contact_role: '',
    company_name: '',
    company_website: '',
    project_type: '',
    project_summary: '',
    goals: '',
    success_metrics: '',
    vision: '',
    inspiration_text: '',
    must_have_features: '',
    nice_to_have_features: '',
    out_of_scope: '',
    has_brand: 'unsure',
    brand_notes: '',
    asset_urls_text: '',
    tech_preferences: '',
    integrations: '',
    hosting_preferences: '',
    budget_band: '',
    budget_exact: '',
    budget_currency: 'USD',
    timeline: '',
    timeline_notes: '',
    open_notes: '',
    honeypot_website: '',
  }
}

export const INTAKE_STEP_COUNT = 7

export const INTAKE_STEPS: Array<{
  title: string
  lede: string
  why: string
}> = [
  {
    title: 'You & your organization',
    lede: 'Who we are working with and how to reach you.',
    why: 'Most agencies start here so proposals and follow-ups go to the right person.',
  },
  {
    title: 'The project',
    lede: 'Name the initiative and describe what you need in plain language.',
    why: 'A clear “what this is” prevents mismatched scope conversations later.',
  },
  {
    title: 'Goals, vision & inspiration',
    lede: 'Outcomes, success criteria, and references you like or want to avoid.',
    why: 'Structured goals + references match how high-performing digital briefs are written.',
  },
  {
    title: 'Scope & boundaries',
    lede: 'Must-haves, nice-to-haves, and what is explicitly not in scope.',
    why: 'Explicit “out of scope” lines are a standard way to prevent scope creep at the start.',
  },
  {
    title: 'Brand & content',
    lede: 'What you have today and what you need from us.',
    why: 'Separating “existing brand” from “content ownership” is a familiar pattern for web projects.',
  },
  {
    title: 'Technology & platform',
    lede: 'Tools, systems, and constraints — or leave blank if you want recommendations.',
    why: 'Technical and integration needs are their own step in most professional RFPs.',
  },
  {
    title: 'Budget, time & last details',
    lede: 'Rough numbers and dates help us size honestly; you can still refine in a call.',
    why: 'Budget + timeline in one final step is common on Typeform- and RFP-style multi-step intakes.',
  },
]

function linesToUrlArray(s: string): string[] | null {
  if (!s.trim()) return null
  const out = s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
  return out.length ? out : null
}

function parseAmount(s: string): number | null {
  if (!s.trim()) return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseBand(v: string): IntakeBudgetBand | null {
  if (!v) return null
  return v as IntakeBudgetBand
}

function parseTimelineVal(v: string): IntakeTimeline | null {
  if (!v) return null
  return v as IntakeTimeline
}

function buildOpenNotes(d: IntakeFormDraft): string | null {
  const parts: string[] = []
  if (d.out_of_scope.trim()) {
    parts.push(
      `**Out of scope / not included in this engagement**\n${d.out_of_scope.trim()}`,
    )
  }
  if (d.open_notes.trim()) parts.push(d.open_notes.trim())
  return parts.length ? parts.join('\n\n') : null
}

export function draftToIntakeInput(d: IntakeFormDraft): CreateManualIntakeInput {
  const budgetAmt = parseAmount(d.budget_exact)
  const cur = d.budget_currency.trim().toUpperCase()

  return {
    project_title: d.project_title.trim() || null,
    contact_name: d.contact_name.trim() || null,
    contact_email: d.contact_email.trim() || null,
    contact_role: d.contact_role.trim() || null,
    company_name: d.company_name.trim() || null,
    company_website: d.company_website.trim() || null,
    project_type: d.project_type.trim() || null,
    project_summary: d.project_summary.trim() || null,
    goals: d.goals.trim() || null,
    success_metrics: d.success_metrics.trim() || null,
    vision: d.vision.trim() || null,
    inspiration_links: linesToUrlArray(d.inspiration_text),
    must_have_features: d.must_have_features.trim() || null,
    nice_to_have_features: d.nice_to_have_features.trim() || null,
    has_existing_brand: d.has_brand === 'yes' ? true : d.has_brand === 'no' ? false : null,
    brand_notes: d.brand_notes.trim() || null,
    asset_urls: linesToUrlArray(d.asset_urls_text),
    tech_preferences: d.tech_preferences.trim() || null,
    integrations: d.integrations.trim() || null,
    hosting_preferences: d.hosting_preferences.trim() || null,
    budget_band: parseBand(d.budget_band),
    budget_exact_amount: budgetAmt,
    budget_currency: budgetAmt != null ? (cur && /^[A-Z]{2,3}$/i.test(cur) ? cur : 'USD') : null,
    timeline: parseTimelineVal(d.timeline),
    timeline_notes: d.timeline_notes.trim() || null,
    open_notes: buildOpenNotes(d),
  }
}

export function hasMinimumIntakeSignal(d: IntakeFormDraft): boolean {
  const t = (s: string) => s.trim().length > 0
  if (t(d.project_title)) return true
  if (t(d.contact_email) || t(d.contact_name)) return true
  if (t(d.company_name)) return true
  if (t(d.project_summary)) return true
  if (t(d.goals) || t(d.vision) || t(d.must_have_features)) return true
  if (d.budget_band || parseAmount(d.budget_exact) != null) return true
  if (t(d.open_notes) || t(d.out_of_scope)) return true
  if (t(d.project_type) || t(d.inspiration_text)) return true
  if (t(d.tech_preferences) || t(d.integrations)) return true
  if (t(d.brand_notes) || t(d.asset_urls_text)) return true
  return false
}
