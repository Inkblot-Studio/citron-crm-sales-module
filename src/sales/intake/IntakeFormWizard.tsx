import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lock, Shield } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Form,
  FormField,
  Input,
  Select,
  type SelectOption,
  Separator,
  Textarea,
} from '@citron-systems/citron-ui'

import { createManualIntake } from './api'
import {
  defaultIntakeFormDraft,
  draftToIntakeInput,
  hasMinimumIntakeSignal,
  INTAKE_STEP_COUNT,
  INTAKE_STEPS,
  type BrandChoice,
  type IntakeFormDraft,
} from './intakeFormModel'
import {
  BUDGET_BAND_LABELS,
  TIMELINE_LABELS,
  type IntakeBudgetBand,
  type IntakeTimeline,
  type ProjectIntake,
} from './types'

const BUDGET_SELECT: SelectOption[] = [
  { value: '', label: 'Prefer not to say' },
  ...(Object.keys(BUDGET_BAND_LABELS) as IntakeBudgetBand[]).map((k) => ({
    value: k,
    label: BUDGET_BAND_LABELS[k],
  })),
]

const TIMELINE_SELECT: SelectOption[] = [
  { value: '', label: "We'll discuss timing" },
  ...(Object.keys(TIMELINE_LABELS) as IntakeTimeline[]).map((k) => ({
    value: k,
    label: TIMELINE_LABELS[k],
  })),
]

const BRAND_CHOICE: SelectOption[] = [
  { value: 'unsure', label: "Not sure — we'll advise" },
  { value: 'yes', label: 'Yes — we have brand assets & guidelines' },
  { value: 'no', label: 'No — we need direction' },
]

const CURRENCIES: SelectOption[] = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' },
  { value: 'CHF', label: 'CHF' },
]

export type IntakeFormWizardProps = {
  variant: 'internal' | 'client'
  onBack?: () => void
  onCreated?: (row: ProjectIntake) => void
}

export function IntakeFormWizard({ variant, onBack, onCreated }: IntakeFormWizardProps) {
  const navigate = useNavigate()
  const [d, setD] = useState<IntakeFormDraft>(() => defaultIntakeFormDraft())
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isClient = variant === 'client'
  const progress = ((step + 1) / INTAKE_STEP_COUNT) * 100

  function patch(p: Partial<IntakeFormDraft>) {
    setD((s) => ({ ...s, ...p }))
  }

  function goNext() {
    setError(null)
    setStep((s) => Math.min(s + 1, INTAKE_STEP_COUNT - 1))
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isClient && d.honeypot_website.trim()) {
      setSuccess(true)
      return
    }
    if (!hasMinimumIntakeSignal(d)) {
      setError(
        'Please add at least your email or a project name, or a short description — so we can follow up.',
      )
      return
    }
    setError(null)
    setSaving(true)
    try {
      const row = await createManualIntake(draftToIntakeInput(d))
      if (isClient) {
        setSuccess(true)
        setD(defaultIntakeFormDraft())
      } else {
        onCreated?.(row)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (success && isClient) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Thank you — we received your brief</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We will review what you shared and get back by email. If something was urgent, reply to the
          confirmation or your main contact — this form is not a contract, just the start of a
          conversation.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-8 h-10 px-6 text-sm"
          onClick={() => navigate('/')}
        >
          Back to home
        </Button>
      </div>
    )
  }

  const meta = INTAKE_STEPS[step]!

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-0">
      <header className="shrink-0 border-b border-border/30 bg-surface-0/95 z-20 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start gap-3">
            {!isClient && onBack && (
              <Button
                type="button"
                variant="secondary"
                className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                onClick={onBack}
                disabled={saving}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                Back
              </Button>
            )}
            {!isClient && (
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">New intake</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Same guided steps clients see on your public <span className="font-mono">/intake</span> page.
                </p>
              </div>
            )}
            {isClient && (
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Project brief
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">~8–12 min</p>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Step {step + 1} of {INTAKE_STEP_COUNT}</span>
              <span className="hidden sm:inline">Most teams finish in one sitting</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full bg-primary/90 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{meta.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{meta.lede}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/90 border-l-2 border-primary/30 pl-2.5">
              <span className="font-medium text-foreground/80">Why we ask: </span>
              {meta.why}
            </p>
          </div>

          {isClient && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" strokeWidth={1.75} />
                For scoping only — not legal advice
              </span>
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3 w-3" strokeWidth={1.75} />
                We do not sell your data
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-6">
          <Form onSubmit={handleSubmit} className="space-y-0" autoComplete="on" noValidate>
            {isClient && (
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="intake-hp-website">Website</label>
                <input
                  id="intake-hp-website"
                  name="company_website_confirm"
                  tabIndex={-1}
                  value={d.honeypot_website}
                  onChange={(e) => patch({ honeypot_website: e.currentTarget.value })}
                  autoComplete="off"
                />
              </div>
            )}

            {error && (
              <div
                className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <Card className="border border-border/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground/90">
                  {isClient ? 'All fields are optional — skip what does not apply' : 'Optional fields; skip what does not apply yet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {step === 0 && <StepContact d={d} patch={patch} />}
                {step === 1 && <StepProject d={d} patch={patch} />}
                {step === 2 && <StepGoals d={d} patch={patch} />}
                {step === 3 && <StepScope d={d} patch={patch} />}
                {step === 4 && <StepBrand d={d} patch={patch} />}
                {step === 5 && <StepTech d={d} patch={patch} />}
                {step === 6 && <StepBudget d={d} patch={patch} />}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="order-2 text-[10px] text-muted-foreground leading-relaxed sm:order-1 sm:max-w-sm">
                {isClient
                  ? 'By continuing you share information to scope a potential engagement. It is not a binding agreement; we will confirm next steps in writing if we proceed.'
                  : 'Creates a new row in your Intake list for triage. Not a client contract.'}
              </p>
              <div className="order-1 flex w-full flex-wrap justify-end gap-2 sm:order-2 sm:w-auto">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 min-w-[5rem] text-sm"
                    onClick={goBack}
                    disabled={saving}
                  >
                    Previous
                  </Button>
                )}
                {step < INTAKE_STEP_COUNT - 1 && (
                  <Button
                    type="button"
                    variant="primary"
                    className="h-10 min-w-[7.5rem] text-sm"
                    onClick={goNext}
                    disabled={saving}
                  >
                    Continue
                  </Button>
                )}
                {step === INTAKE_STEP_COUNT - 1 && (
                  <Button type="submit" variant="primary" className="h-10 min-w-[10rem] text-sm" disabled={saving}>
                    {saving ? 'Submitting…' : isClient ? 'Submit project brief' : 'Save to Intake'}
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}

function StepContact({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Your name" hint="Primary contact">
          <Input
            value={d.contact_name}
            onChange={(e) => patch({ contact_name: e.currentTarget.value })}
            className="h-10 text-sm"
            autoComplete="name"
          />
        </FormField>
        <FormField label="Your role" hint="e.g. Founder, Marketing, Product">
          <Input
            value={d.contact_role}
            onChange={(e) => patch({ contact_role: e.currentTarget.value })}
            className="h-10 text-sm"
            autoComplete="organization-title"
          />
        </FormField>
        <FormField className="sm:col-span-2" label="Work email" hint="Best for proposals and follow-up">
          <Input
            type="email"
            value={d.contact_email}
            onChange={(e) => patch({ contact_email: e.currentTarget.value })}
            className="h-10 text-sm"
            autoComplete="email"
          />
        </FormField>
        <FormField label="Company or team" hint="Optional">
          <Input
            value={d.company_name}
            onChange={(e) => patch({ company_name: e.currentTarget.value })}
            className="h-10 text-sm"
            autoComplete="organization"
          />
        </FormField>
        <FormField label="Current website" hint="If you have one">
          <Input
            type="url"
            value={d.company_website}
            onChange={(e) => patch({ company_website: e.currentTarget.value })}
            placeholder="https://"
            className="h-10 text-sm"
            autoComplete="url"
          />
        </FormField>
      </div>
    </div>
  )
}

function StepProject({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <FormField label="Project working title" hint="A label we can use until a final name is set">
        <Input
          value={d.project_title}
          onChange={(e) => patch({ project_title: e.currentTarget.value })}
          className="h-10 text-sm font-medium"
          placeholder="e.g. 2025 website relaunch, Customer portal v1"
        />
      </FormField>
      <FormField
        label="What are we building?"
        hint="Websites, web apps, and landing pages are all different — a phrase or two is enough"
      >
        <Textarea
          value={d.project_type}
          onChange={(e) => patch({ project_type: e.currentTarget.value })}
          rows={2}
          className="min-h-[3rem] text-sm"
          placeholder="e.g. A multi-language marketing site with a lead form and blog"
        />
      </FormField>
      <FormField
        label="Overview & context"
        hint="Who it is for, the problem, and any constraints (single column: easier to read on mobile, like most modern intakes)"
      >
        <Textarea
          value={d.project_summary}
          onChange={(e) => patch({ project_summary: e.currentTarget.value })}
          rows={6}
          className="min-h-[8rem] text-sm leading-relaxed"
        />
      </FormField>
    </div>
  )
}

function StepGoals({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <FormField
        label="What does success look like for the business?"
        hint="Leads, revenue, retention, NPS, speed to launch — whatever matters to leadership"
      >
        <Textarea
          value={d.goals}
          onChange={(e) => patch({ goals: e.currentTarget.value })}
          rows={4}
          className="min-h-[5.5rem] text-sm"
        />
      </FormField>
      <FormField
        label="How will you measure that success?"
        hint="KPIs, milestones, or qualitative signals (as used in many agency SOWs)"
      >
        <Textarea
          value={d.success_metrics}
          onChange={(e) => patch({ success_metrics: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
      <FormField label="12–24 month vision" hint="If this goes well, what should exist next?">
        <Textarea
          value={d.vision}
          onChange={(e) => patch({ vision: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
      <FormField
        label="Reference & inspiration (links)"
        hint="One per line. Say in your notes if you like the layout, the tone, or what to avoid"
      >
        <Textarea
          value={d.inspiration_text}
          onChange={(e) => patch({ inspiration_text: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-xs font-mono"
          placeholder="https://"
        />
      </FormField>
    </div>
  )
}

function StepScope({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <FormField
        label="Must-haves for launch"
        hint="If these are missing, the project is not done — a pattern used to prevent scope arguments later"
      >
        <Textarea
          value={d.must_have_features}
          onChange={(e) => patch({ must_have_features: e.currentTarget.value })}
          rows={4}
          className="min-h-[5.5rem] text-sm"
          placeholder="e.g. CMS, contact forms, analytics, language switch, WCAG, CRM hook-up…"
        />
      </FormField>
      <FormField
        label="Nice-to-haves (later phases)"
        hint="Valuable, but we could add after go-live"
      >
        <Textarea
          value={d.nice_to_have_features}
          onChange={(e) => patch({ nice_to_have_features: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
      <Separator className="bg-border/30" />
      <FormField
        label="Out of scope & exclusions"
        hint="A clear “not included” list is how professional intakes set expectations (same idea as a statement of work boundary)"
      >
        <Textarea
          value={d.out_of_scope}
          onChange={(e) => patch({ out_of_scope: e.currentTarget.value })}
          rows={4}
          className="min-h-[5.5rem] text-sm"
          placeholder="e.g. Ongoing social media, paid ads management, 24/7 support, training beyond handover…"
        />
      </FormField>
    </div>
  )
}

function StepBrand({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <FormField label="Existing brand" hint="What we are building on, if anything">
        <Select
          value={d.has_brand}
          onChange={(e) => patch({ has_brand: e.currentTarget.value as BrandChoice })}
          options={BRAND_CHOICE}
          className="h-10 min-h-10 text-sm"
        />
      </FormField>
      <FormField
        label="Brand, voice, and copy"
        hint="Tone, languages, who writes copy, taboos, accessibility goals"
      >
        <Textarea
          value={d.brand_notes}
          onChange={(e) => patch({ brand_notes: e.currentTarget.value })}
          rows={4}
          className="min-h-[5.5rem] text-sm"
        />
      </FormField>
      <FormField
        label="Links to files & media"
        hint="One URL per line (drives, brand portals) — like many agency briefs, collect links in one place"
      >
        <Textarea
          value={d.asset_urls_text}
          onChange={(e) => patch({ asset_urls_text: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-xs font-mono"
        />
      </FormField>
    </div>
  )
}

function StepTech({ d, patch }: { d: IntakeFormDraft; patch: (p: Partial<IntakeFormDraft>) => void }) {
  return (
    <div className="space-y-4">
      <FormField
        label="Stack & platform"
        hint="e.g. React, WordPress, headless, Shopify, no preference / recommend for us"
      >
        <Textarea
          value={d.tech_preferences}
          onChange={(e) => patch({ tech_preferences: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
      <FormField
        label="Integrations & data flows"
        hint="Auth, payments, CRM, email, webhooks, compliance"
      >
        <Textarea
          value={d.integrations}
          onChange={(e) => patch({ integrations: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
      <FormField
        label="Hosting, DNS, and access"
        hint="Where it should run, who owns the domain, security requirements"
      >
        <Textarea
          value={d.hosting_preferences}
          onChange={(e) => patch({ hosting_preferences: e.currentTarget.value })}
          rows={3}
          className="min-h-[4.5rem] text-sm"
        />
      </FormField>
    </div>
  )
}

function StepBudget({
  d,
  patch,
}: {
  d: IntakeFormDraft
  patch: (p: Partial<IntakeFormDraft>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Budget range" hint="Ballpark is fine; refines in a call">
          <Select
            value={d.budget_band}
            onChange={(e) => patch({ budget_band: e.currentTarget.value })}
            options={BUDGET_SELECT}
            className="h-10 min-h-10 text-sm"
          />
        </FormField>
        <FormField label="If you have a firm number" hint="Before tax, optional">
          <Input
            value={d.budget_exact}
            onChange={(e) => patch({ budget_exact: e.currentTarget.value })}
            className="h-10 text-sm tabular-nums"
            inputMode="decimal"
            placeholder="e.g. 25000"
          />
        </FormField>
        <FormField className="sm:col-span-2" label="Currency" hint="3-letter code">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:max-w-md">
            <Select
              value={CURRENCIES.some((c) => c.value === d.budget_currency) ? d.budget_currency : ''}
              onChange={(e) => patch({ budget_currency: e.currentTarget.value || 'USD' })}
              options={[{ value: '', label: 'Quick pick…' }, ...CURRENCIES]}
              className="h-10 min-h-10 text-sm"
            />
            <Input
              value={d.budget_currency}
              onChange={(e) => patch({ budget_currency: e.currentTarget.value.toUpperCase() })}
              className="h-10 text-sm"
              maxLength={4}
              placeholder="USD"
              aria-label="Currency code"
            />
          </div>
        </FormField>
        <FormField className="sm:col-span-2" label="When do you need to be live?">
          <Select
            value={d.timeline}
            onChange={(e) => patch({ timeline: e.currentTarget.value })}
            options={TIMELINE_SELECT}
            className="h-10 min-h-10 text-sm"
          />
        </FormField>
        <FormField className="sm:col-span-2" label="Key dates or constraints" hint="Launches, holidays, other teams">
          <Textarea
            value={d.timeline_notes}
            onChange={(e) => patch({ timeline_notes: e.currentTarget.value })}
            rows={2}
            className="min-h-[3.5rem] text-sm"
          />
        </FormField>
      </div>
      <Separator className="bg-border/30" />
      <FormField
        label="Anything we should know that did not fit above?"
        hint="Stakeholders, past vendors, things to avoid in writing or in meetings"
      >
        <Textarea
          value={d.open_notes}
          onChange={(e) => patch({ open_notes: e.currentTarget.value })}
          rows={4}
          className="min-h-[5.5rem] text-sm"
        />
      </FormField>
    </div>
  )
}
