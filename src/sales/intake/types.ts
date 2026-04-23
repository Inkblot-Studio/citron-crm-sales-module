export type IntakeStatus =
  | 'new'
  | 'reviewed'
  | 'qualified'
  | 'converted'
  | 'archived'

export type IntakeBudgetBand =
  | 'under_5k'
  | 'band_5k_15k'
  | 'band_15k_50k'
  | 'band_50k_100k'
  | 'over_100k'
  | 'unknown'

export type IntakeTimeline =
  | 'asap'
  | 'lt_1_month'
  | 'within_1_3_months'
  | 'within_3_6_months'
  | 'flexible'
  | 'unknown'

/**
 * Intake row — mirror of `project_intakes` in Supabase. Every content column
 * is nullable by design: the form never forces a client to fill in fields.
 */
export interface ProjectIntake {
  id: string
  created_at: string
  updated_at: string

  source: string
  external_submission_id: string | null
  external_form_id: string | null

  contact_name: string | null
  contact_email: string | null
  contact_role: string | null
  company_name: string | null
  company_website: string | null

  project_title: string | null
  project_summary: string | null
  project_type: string | null

  goals: string | null
  success_metrics: string | null
  vision: string | null
  inspiration_links: string[] | null

  must_have_features: string | null
  nice_to_have_features: string | null

  has_existing_brand: boolean | null
  brand_notes: string | null
  asset_urls: string[] | null

  tech_preferences: string | null
  integrations: string | null
  hosting_preferences: string | null

  budget_band: IntakeBudgetBand | null
  budget_exact_amount: number | null
  budget_currency: string | null
  timeline: IntakeTimeline | null
  timeline_notes: string | null

  open_notes: string | null

  tags: string[]
  ai_summary: string | null
  ai_model: string | null
  ai_generated_at: string | null

  status: IntakeStatus
  assigned_to: string | null
  internal_notes: string | null

  raw_payload: unknown
}

export const BUDGET_BAND_LABELS: Record<IntakeBudgetBand, string> = {
  under_5k: '< $5k',
  band_5k_15k: '$5k – $15k',
  band_15k_50k: '$15k – $50k',
  band_50k_100k: '$50k – $100k',
  over_100k: '> $100k',
  unknown: 'Unknown',
}

export const TIMELINE_LABELS: Record<IntakeTimeline, string> = {
  asap: 'ASAP',
  lt_1_month: '< 1 month',
  within_1_3_months: '1 – 3 months',
  within_3_6_months: '3 – 6 months',
  flexible: 'Flexible',
  unknown: 'Unknown',
}

export const STATUS_LABELS: Record<IntakeStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  qualified: 'Qualified',
  converted: 'Converted',
  archived: 'Archived',
}

export const TAG_LABELS: Record<string, string> = {
  missing_assets: 'Missing assets',
  unclear_scope: 'Unclear scope',
  missing_contact: 'No contact',
  high_budget: 'High budget',
  urgent: 'Urgent',
  unknown_budget: 'Unknown budget',
  unknown_timeline: 'Unknown timeline',
  manual_entry: 'Created in CRM',
}
