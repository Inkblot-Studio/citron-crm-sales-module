import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardCopy, ExternalLink, Mail, Plus, RefreshCw, Sparkles, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  ModuleContainer,
  ModuleSkeleton,
  ScrollArea,
  SearchBar,
  Separator,
  TabSystem,
} from '@citron-systems/citron-ui'

import { isSupabaseConfigured } from '@/lib/supabase'
import { getPublicIntakeFormUrl } from '@/utils/publicIntakeUrl'
import { listIntakes, updateIntakeFields, updateIntakeStatus, type IntakeFieldPatch } from './api'
import { IntakeCreateView } from './IntakeCreateView'
import {
  BUDGET_BAND_LABELS,
  STATUS_LABELS,
  TAG_LABELS,
  TIMELINE_LABELS,
  type IntakeStatus,
  type ProjectIntake,
} from './types'

const STATUS_FILTERS: Array<{ id: IntakeStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'converted', label: 'Converted' },
  { id: 'archived', label: 'Archived' },
]

const iconBtnBase =
  'inline-flex items-center justify-center h-8 w-8 min-w-8 min-h-8 shrink-0 p-0 rounded-lg border-0 shadow-none ' +
  'active:scale-[0.96] transition-[transform,background-color,filter,color] duration-100 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-0 '

const iconBtnSecondary =
  iconBtnBase + 'bg-card text-foreground hover:bg-muted hover:text-foreground'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function displayTitle(i: ProjectIntake): string {
  return (
    i.project_title ||
    i.company_name ||
    i.contact_name ||
    i.contact_email ||
    'Untitled intake'
  )
}

function displaySubtitle(i: ProjectIntake): string {
  const parts: string[] = []
  if (i.contact_name) parts.push(i.contact_name)
  if (i.company_name && i.company_name !== i.project_title) parts.push(i.company_name)
  if (i.budget_band) parts.push(BUDGET_BAND_LABELS[i.budget_band])
  if (i.timeline) parts.push(TIMELINE_LABELS[i.timeline])
  return parts.join(' · ')
}

function tagBadgeVariant(tag: string): 'warning' | 'error' | 'success' | 'secondary' {
  if (tag === 'high_budget') return 'success'
  if (tag === 'urgent') return 'error'
  if (tag.startsWith('missing') || tag.startsWith('unknown') || tag === 'unclear_scope') {
    return 'warning'
  }
  return 'secondary'
}

function statusBadgeVariant(
  status: IntakeStatus,
): 'default' | 'secondary' | 'success' | 'warning' | 'outline' {
  switch (status) {
    case 'new':
      return 'warning'
    case 'reviewed':
      return 'secondary'
    case 'qualified':
    case 'converted':
      return 'success'
    case 'archived':
      return 'outline'
    default:
      return 'default'
  }
}

function IntakeSetup() {
  return (
    <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Connect Intake</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The public form is a third-party tool (we use{' '}
            <strong className="text-foreground/90">Tally</strong> — not Supabase). Supabase only stores
            rows and runs the optional webhook that normalizes submissions. This screen only reads that
            database.
          </p>
        </div>

        <Card className="rounded-2xl border-0 bg-surface-1/90 shadow-sm ring-1 ring-border/20">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base">What to create in Supabase</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              One normal project in your Supabase org — name it anything (e.g.{' '}
              <span className="text-foreground/80">your-org-crm</span> or <span className="text-foreground/80">intake</span>
              ). No special &quot;Citron&quot; template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <ol className="list-decimal pl-4 space-y-2 text-sm text-foreground/90">
              <li>
                <span className="text-muted-foreground">Dashboard → </span>
                <strong className="font-medium">New project</strong>
                <span className="text-muted-foreground"> (Postgres + API).</span>
              </li>
              <li>
                Run the SQL in <code className="text-xs bg-muted/50 px-1 py-0.5 rounded">supabase/migrations/</code> on that project
                (tables + RLS, including <code className="text-xs bg-muted/50 px-1 py-0.5 rounded">0002_…</code> so this module can read
                with the anon key).
              </li>
              <li>
                Deploy the Edge Function <code className="text-xs bg-muted/50 px-1 py-0.5 rounded">intake-webhook</code> and point{' '}
                <strong className="font-medium">Tally&apos;s webhook</strong> at it (writes use the service role).
              </li>
              <li>
                Set env on the <strong className="font-medium">Vite / host</strong> build:
              </li>
            </ol>
            <div className="rounded-xl bg-surface-2/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/90 ring-1 ring-border/30">
              <div>VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=&lt;anon public key from Settings → API&gt;</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keys are in <strong className="text-foreground/80">Project Settings → API</strong>. Do not put the <code className="text-[10px] bg-muted/40 px-0.5 rounded">service_role</code> key in the browser.
            </p>
            <a
              className="inline-flex text-xs font-medium text-primary hover:underline"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Open Supabase dashboard
              <ExternalLink className="ml-1 inline h-3 w-3 align-middle" strokeWidth={2} />
            </a>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          See <code className="text-[10px] bg-muted/30 px-1 rounded">docs/intake/README.md</code> for the full Tally field map and webhook URL.
        </p>
      </div>
    </div>
  )
}

function intakeWebhookUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return ''
  return `${String(base).replace(/\/$/, '')}/functions/v1/intake-webhook`
}

export function IntakeTab() {
  const configured = isSupabaseConfigured()
  const [intakes, setIntakes] = useState<ProjectIntake[]>([])
  const [loading, setLoading] = useState(() => Boolean(configured))
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef(search)
  searchRef.current = search
  const [statusFilter, setStatusFilter] = useState<IntakeStatus | 'all'>('all')
  const [selected, setSelected] = useState<ProjectIntake | null>(null)
  const [intakeSubView, setIntakeSubView] = useState<'list' | 'create'>('list')
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle')
  const [clientFormCopy, setClientFormCopy] = useState<'idle' | 'ok' | 'err'>('idle')
  const publicFormUrl = useMemo(() => getPublicIntakeFormUrl(), [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    setError(null)
    try {
      const rows = await listIntakes({ status: statusFilter, search: searchRef.current })
      setIntakes(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load intakes'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    void load()
  }, [configured, statusFilter, load])

  const stats = useMemo(() => {
    const total = intakes.length
    const newCount = intakes.filter((i) => i.status === 'new').length
    const flagged = intakes.filter((i) =>
      i.tags.some((t) => ['missing_assets', 'unclear_scope', 'missing_contact'].includes(t)),
    ).length
    const highBudget = intakes.filter((i) => i.tags.includes('high_budget')).length
    return { total, newCount, flagged, highBudget }
  }, [intakes])

  async function handleStatusChange(intake: ProjectIntake, next: IntakeStatus) {
    const prev = intake.status
    setIntakes((rows) => rows.map((r) => (r.id === intake.id ? { ...r, status: next } : r)))
    setSelected((s) => (s && s.id === intake.id ? { ...s, status: next } : s))
    try {
      await updateIntakeStatus(intake.id, next)
    } catch (e) {
      setIntakes((rows) => rows.map((r) => (r.id === intake.id ? { ...r, status: prev } : r)))
      setSelected((s) => (s && s.id === intake.id ? { ...s, status: prev } : s))
      const msg = e instanceof Error ? e.message : 'Failed to update status'
      setError(msg)
    }
  }

  if (!configured) {
    return <IntakeSetup />
  }

  if (intakeSubView === 'create') {
    return (
      <IntakeCreateView
        onBack={() => setIntakeSubView('list')}
        onCreated={(row) => {
          setIntakeSubView('list')
          setIntakes((prev) => [row, ...prev])
          setSelected(row)
        }}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/30 bg-surface-0/80 px-4 py-3">
        <div className="mx-auto max-w-4xl flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold">Submissions</h2>
            <p className="text-xs text-muted-foreground">
              New, flagged, and budget signals update as rows load from Supabase.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="flex gap-2 text-center">
              {[
                { k: 'total', label: 'Total', v: stats.total },
                { k: 'new', label: 'New', v: stats.newCount },
                { k: 'flag', label: 'Flagged', v: stats.flagged },
                { k: 'hi', label: 'High $', v: stats.highBudget },
              ].map((m) => (
                <div
                  key={m.k}
                  className="min-w-[3.5rem] rounded-lg bg-surface-1/80 px-2 py-1 ring-1 ring-border/20"
                >
                  <div className="text-lg font-semibold tabular-nums leading-none text-foreground">
                    {m.v}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              onClick={() => setIntakeSubView('create')}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              New intake
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={iconBtnSecondary}
              aria-label="Refresh"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3">
        <div className="mx-auto w-full max-w-4xl shrink-0">
          <Card className="rounded-2xl border border-primary/20 bg-gradient-to-br from-amber-500/[0.06] to-surface-0 ring-1 ring-border/20">
            <CardHeader className="space-y-1 pb-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-base font-semibold">Client form link</CardTitle>
                <CardDescription className="text-xs leading-relaxed sm:text-sm">
                  Send this URL by email or Slack. Clients do <strong className="font-medium text-foreground/85">not</strong> use Citron — they
                  open the page, fill the brief, and submit. New responses show up in the list below (same as Google
                  Forms, but in your Intake list).
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-surface-2/60 px-3 py-2 text-[11px] leading-relaxed text-foreground/90 ring-1 ring-border/20">
                  {publicFormUrl}
                </code>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="h-9 gap-1.5 px-3 text-xs"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(publicFormUrl)
                        setClientFormCopy('ok')
                        setTimeout(() => setClientFormCopy('idle'), 2000)
                      } catch {
                        setClientFormCopy('err')
                        setTimeout(() => setClientFormCopy('idle'), 2000)
                      }
                    }}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {clientFormCopy === 'ok' ? 'Copied' : clientFormCopy === 'err' ? 'Copy failed' : 'Copy link'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 gap-1.5 px-3 text-xs"
                    onClick={() => window.open(publicFormUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Open form
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Requires the same deployed build and Supabase env as this app. If the link 404s, check your host
                path and that this module is served as the full app (not only the remote chunk).
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBar
            id="intake-search"
            placeholder="Search title, company, email, summary…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load()
            }}
            className="crm-toolbar-search h-8 min-h-8 w-full min-w-0 flex-1"
          />
          <TabSystem
            className="w-full shrink-0 sm:w-auto"
            tabs={STATUS_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
            activeTabId={statusFilter}
            onTabChange={(id) => setStatusFilter(id as IntakeStatus | 'all')}
          />
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
          <Collapsible
            className="mb-2 rounded-xl border border-border/20 bg-surface-0/50 ring-1 ring-border/10"
            title={
              <span className="text-xs font-medium text-foreground/90">Tally &amp; webhook URL</span>
            }
            defaultOpen={false}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Point Tally&apos;s outbound webhook to this URL. The Edge Function <code className="text-[10px] bg-muted/40 px-0.5 rounded">intake-webhook</code> normalizes
              the payload; deploy it with the Supabase CLI if it is not live yet. (Optional if you use the
              in-app /intake link above.)
            </p>
            {intakeWebhookUrl() ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-surface-2/60 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/90 ring-1 ring-border/20">
                  {intakeWebhookUrl()}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 shrink-0 gap-1.5 text-xs"
                  onClick={async () => {
                    const url = intakeWebhookUrl()
                    if (!url) return
                    try {
                      await navigator.clipboard.writeText(url)
                      setCopyState('ok')
                      setTimeout(() => setCopyState('idle'), 2000)
                    } catch {
                      setCopyState('err')
                      setTimeout(() => setCopyState('idle'), 2000)
                    }
                  }}
                >
                  <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {copyState === 'ok' ? 'Copied' : copyState === 'err' ? 'Copy failed' : 'Copy'}
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Set <code className="text-[10px] bg-muted/30 px-0.5 rounded">VITE_SUPABASE_URL</code> to show the full webhook URL.
              </p>
            )}
          </Collapsible>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/25 bg-surface-1/50">
            <ScrollArea className="h-full min-h-0 w-full max-h-full flex-1 p-2" maxHeight="100%">
            {loading ? (
              <div className="space-y-2 p-2">
                <ModuleSkeleton />
                <ModuleSkeleton />
              </div>
            ) : error ? (
              <ModuleContainer
                title="Could not load intakes"
                className="m-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
              >
                <p className="text-xs text-destructive/90 leading-relaxed">{error}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Confirm migrations <code className="text-[10px] bg-muted/40 px-0.5 rounded">0002_…</code> and{' '}
                  <code className="text-[10px] bg-muted/40 px-0.5 rounded">0003_…</code> are applied.{' '}
                  <code className="text-[10px] bg-muted/40 px-0.5 rounded">0003</code> allows creating rows from the browser with
                  the anon key.
                </p>
              </ModuleContainer>
            ) : intakes.length === 0 ? (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/45 bg-surface-0/25 px-6 py-10 text-center m-1">
                <p className="text-sm text-foreground/90">No intakes yet</p>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Add one with <strong className="font-medium text-foreground/85">New intake</strong>, or connect Tally
                  to the webhook above.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 p-1">
                {intakes.map((intake) => (
                  <li key={intake.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(intake)}
                      className="w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-0"
                    >
                      <div className="rounded-xl bg-surface-0/80 px-3 py-2.5 ring-1 ring-border/15 transition hover:ring-border/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold truncate text-foreground">
                                {displayTitle(intake)}
                              </span>
                              <Badge
                                variant={statusBadgeVariant(intake.status)}
                                className="text-[10px] py-0 px-1.5"
                              >
                                {STATUS_LABELS[intake.status]}
                              </Badge>
                            </div>
                            {displaySubtitle(intake) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {displaySubtitle(intake)}
                              </p>
                            )}
                            {intake.ai_summary && (
                              <p className="text-xs leading-snug text-foreground/80 line-clamp-2">
                                {intake.ai_summary}
                              </p>
                            )}
                            {intake.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {intake.tags.map((t) => (
                                  <Badge
                                    key={t}
                                    variant={tagBadgeVariant(t)}
                                    className="text-[10px] py-0 px-1.5"
                                  >
                                    {TAG_LABELS[t] ?? t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <time
                            className="shrink-0 text-[10px] text-muted-foreground tabular-nums"
                            dateTime={intake.created_at}
                          >
                            {formatDate(intake.created_at)}
                          </time>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </ScrollArea>
          </div>
        </div>
      </div>

      <IntakeDetailDialog
        intake={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onIntakePatched={(id, patch) => {
          setIntakes((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
          setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s))
        }}
      />
    </div>
  )
}

interface IntakeDetailDialogProps {
  intake: ProjectIntake | null
  onClose: () => void
  onStatusChange: (intake: ProjectIntake, next: IntakeStatus) => void
  onIntakePatched: (id: string, patch: Partial<IntakeFieldPatch>) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed">
        {empty ? <span className="text-muted-foreground italic">Not provided</span> : children}
      </div>
    </div>
  )
}

function IntakeDetailDialog({
  intake,
  onClose,
  onStatusChange,
  onIntakePatched,
}: IntakeDetailDialogProps) {
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)

  useEffect(() => {
    if (!intake) return
    setTitleDraft(intake.project_title ?? '')
    setTitleError(null)
  }, [intake?.id, intake?.project_title])

  async function saveProjectTitle() {
    if (!intake) return
    const next = titleDraft.trim() || null
    if (next === (intake.project_title?.trim() || null)) return
    setTitleSaving(true)
    setTitleError(null)
    try {
      await updateIntakeFields(intake.id, { project_title: next })
      onIntakePatched(intake.id, { project_title: next })
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : 'Save failed')
      setTitleDraft(intake.project_title ?? '')
    } finally {
      setTitleSaving(false)
    }
  }

  if (!intake) {
    return null
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-lg ring-1 ring-border/25 sm:max-w-2xl"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/30 px-4 py-3">
          <div className="min-w-0 flex-1 pr-2">
            <DialogTitle className="sr-only">Intake — {displayTitle(intake)}</DialogTitle>
            <FormField
              label="Project title"
              error={titleError}
              className="space-y-1.5"
            >
              <Input
                id="intake-detail-project-title"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.currentTarget.value)}
                onBlur={() => void saveProjectTitle()}
                disabled={titleSaving}
                placeholder="e.g. New website"
                autoComplete="off"
                className="h-9 text-sm font-semibold"
              />
            </FormField>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {formatDate(intake.created_at)} · {STATUS_LABELS[intake.status]}
              {titleSaving ? ' · Saving…' : null}
            </DialogDescription>
          </div>
          <DialogClose
            className={iconBtnSecondary}
            aria-label="Close"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </DialogClose>
        </DialogHeader>

        <ScrollArea
          className="px-4 py-3"
          maxHeight="min(70vh, 560px)"
          style={{ minHeight: 0 }}
        >
          <div className="space-y-4 pr-1">
            {intake.ai_summary && (
              <div className="rounded-xl bg-surface-2/60 p-3 ring-1 ring-border/20">
                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    AI summary
                  </span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {intake.ai_summary}
                </p>
              </div>
            )}

            {intake.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {intake.tags.map((t) => (
                  <Badge key={t} variant={tagBadgeVariant(t)} className="text-[10px] py-0 px-1.5">
                    {TAG_LABELS[t] ?? t}
                  </Badge>
                ))}
              </div>
            )}

            <Separator className="bg-border/30" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Contact">{intake.contact_name}</Field>
              <Field label="Role">{intake.contact_role}</Field>
              <Field label="Email">
                {intake.contact_email ? (
                  <a
                    href={`mailto:${intake.contact_email}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" strokeWidth={1.75} />
                    {intake.contact_email}
                  </a>
                ) : null}
              </Field>
              <Field label="Company">{intake.company_name}</Field>
              <Field label="Website">
                {intake.company_website ? (
                  <a
                    href={intake.company_website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{intake.company_website}</span>
                  </a>
                ) : null}
              </Field>
              <Field label="Project type">{intake.project_type}</Field>
            </div>

            <Separator className="bg-border/30" />

            <Field label="Project overview">{intake.project_summary}</Field>
            <Field label="Goals">{intake.goals}</Field>
            <Field label="Success metrics">{intake.success_metrics}</Field>
            <Field label="Vision">{intake.vision}</Field>

            {intake.inspiration_links && intake.inspiration_links.length > 0 && (
              <Field label="Inspiration links">
                <ul className="space-y-0.5">
                  {intake.inspiration_links.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </Field>
            )}

            <Separator className="bg-border/30" />

            <Field label="Must-have features">{intake.must_have_features}</Field>
            <Field label="Nice-to-have features">{intake.nice_to_have_features}</Field>

            <Separator className="bg-border/30" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Budget band">
                {intake.budget_band ? BUDGET_BAND_LABELS[intake.budget_band] : null}
              </Field>
              <Field label="Budget (exact)">
                {intake.budget_exact_amount !== null
                  ? `${intake.budget_currency ?? 'USD'} ${intake.budget_exact_amount.toLocaleString()}`
                  : null}
              </Field>
              <Field label="Timeline">
                {intake.timeline ? TIMELINE_LABELS[intake.timeline] : null}
              </Field>
              <Field label="Timeline notes">{intake.timeline_notes}</Field>
            </div>

            <Separator className="bg-border/30" />

            <Field label="Tech preferences">{intake.tech_preferences}</Field>
            <Field label="Integrations">{intake.integrations}</Field>
            <Field label="Hosting preferences">{intake.hosting_preferences}</Field>

            <Separator className="bg-border/30" />

            <Field label="Existing brand">
              {intake.has_existing_brand === null
                ? null
                : intake.has_existing_brand
                  ? 'Yes'
                  : 'No'}
            </Field>
            <Field label="Brand notes">{intake.brand_notes}</Field>

            {intake.asset_urls && intake.asset_urls.length > 0 && (
              <Field label="Uploaded assets">
                <ul className="space-y-0.5">
                  {intake.asset_urls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </Field>
            )}

            <Separator className="bg-border/30" />

            <Field label="Open notes">{intake.open_notes}</Field>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/30 px-4 py-3 sm:justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(['new', 'reviewed', 'qualified', 'converted', 'archived'] as IntakeStatus[]).map(
              (s) => (
                <Button
                  key={s}
                  type="button"
                  variant={intake.status === s ? 'primary' : 'secondary'}
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => onStatusChange(intake, s)}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ),
            )}
          </div>
          <Button type="button" variant="secondary" className="h-7 px-3 text-xs" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
