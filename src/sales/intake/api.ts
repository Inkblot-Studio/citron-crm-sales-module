import { getSupabase } from '@/lib/supabase'
import type {
  IntakeBudgetBand,
  IntakeStatus,
  IntakeTimeline,
  ProjectIntake,
} from './types'

const TABLE = 'project_intakes'

export interface ListIntakesOptions {
  search?: string
  status?: IntakeStatus | 'all'
  limit?: number
}

export async function listIntakes(
  opts: ListIntakesOptions = {},
): Promise<ProjectIntake[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { search, status = 'all', limit = 100 } = opts
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') query = query.eq('status', status)

  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    query = query.or(
      [
        `project_title.ilike.${q}`,
        `company_name.ilike.${q}`,
        `contact_name.ilike.${q}`,
        `contact_email.ilike.${q}`,
        `project_summary.ilike.${q}`,
        `goals.ilike.${q}`,
        `ai_summary.ilike.${q}`,
      ].join(','),
    )
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ProjectIntake[]
}

export async function updateIntakeStatus(
  id: string,
  status: IntakeStatus,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function updateIntakeNotes(
  id: string,
  internal_notes: string | null,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from(TABLE)
    .update({ internal_notes })
    .eq('id', id)
  if (error) throw error
}

export type IntakeFieldPatch = Pick<
  ProjectIntake,
  'project_title' | 'contact_name' | 'contact_email' | 'company_name' | 'project_summary' | 'goals'
>

export async function updateIntakeFields(
  id: string,
  patch: Partial<IntakeFieldPatch>,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) throw error
}

export type CreateManualIntakeInput = {
  project_title?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_role?: string | null
  company_name?: string | null
  company_website?: string | null
  project_summary?: string | null
  project_type?: string | null
  goals?: string | null
  success_metrics?: string | null
  vision?: string | null
  inspiration_links?: string[] | null
  must_have_features?: string | null
  nice_to_have_features?: string | null
  has_existing_brand?: boolean | null
  brand_notes?: string | null
  asset_urls?: string[] | null
  tech_preferences?: string | null
  integrations?: string | null
  hosting_preferences?: string | null
  budget_band?: IntakeBudgetBand | null
  budget_exact_amount?: number | null
  budget_currency?: string | null
  timeline?: IntakeTimeline | null
  timeline_notes?: string | null
  open_notes?: string | null
}

function nilStr(s: string | undefined | null): string | null {
  const t = s?.trim()
  return t ? t : null
}

export async function createManualIntake(
  input: CreateManualIntakeInput,
): Promise<ProjectIntake> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const now = new Date().toISOString()
  const raw_payload = {
    source: 'manual',
    v: 2,
    form: 'intake_create_full',
    created_at: now,
  }

  const budgetAmt = input.budget_exact_amount ?? null
  const currency = nilStr(input.budget_currency ?? undefined) ?? (budgetAmt != null ? 'USD' : null)

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      source: 'manual',
      raw_payload: raw_payload,
      project_title: nilStr(input.project_title ?? undefined),
      contact_name: nilStr(input.contact_name ?? undefined),
      contact_email: nilStr(input.contact_email ?? undefined),
      contact_role: nilStr(input.contact_role ?? undefined),
      company_name: nilStr(input.company_name ?? undefined),
      company_website: nilStr(input.company_website ?? undefined),
      project_summary: nilStr(input.project_summary ?? undefined),
      project_type: nilStr(input.project_type ?? undefined),
      goals: nilStr(input.goals ?? undefined),
      success_metrics: nilStr(input.success_metrics ?? undefined),
      vision: nilStr(input.vision ?? undefined),
      inspiration_links: input.inspiration_links?.length ? input.inspiration_links : null,
      must_have_features: nilStr(input.must_have_features ?? undefined),
      nice_to_have_features: nilStr(input.nice_to_have_features ?? undefined),
      has_existing_brand: input.has_existing_brand ?? null,
      brand_notes: nilStr(input.brand_notes ?? undefined),
      asset_urls: input.asset_urls?.length ? input.asset_urls : null,
      tech_preferences: nilStr(input.tech_preferences ?? undefined),
      integrations: nilStr(input.integrations ?? undefined),
      hosting_preferences: nilStr(input.hosting_preferences ?? undefined),
      budget_band: input.budget_band ?? null,
      budget_exact_amount: budgetAmt,
      budget_currency: currency,
      timeline: input.timeline ?? null,
      timeline_notes: nilStr(input.timeline_notes ?? undefined),
      open_notes: nilStr(input.open_notes ?? undefined),
      tags: ['manual_entry'],
      status: 'new' as const,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectIntake
}
