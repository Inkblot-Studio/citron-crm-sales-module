import { useState } from 'react'
import { ListFilter, Plus, Upload, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EntityCard,
  Input,
  Label,
  MetricComparisonList,
  ModuleContainer,
  PageHeader,
  ScrollArea,
  SearchBar,
  Separator,
  StatCards,
  TabSystem,
} from '@citron-systems/citron-ui'

/** Shared 32×32 header / dialog icon control (matches Marketing/Contacts toolbars). */
const iconBtnBase =
  'inline-flex items-center justify-center h-8 w-8 min-w-8 min-h-8 shrink-0 p-0 rounded-lg border-0 shadow-none ' +
  'active:scale-[0.96] transition-[transform,background-color,filter,color] duration-100 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-0 '

const iconBtnPrimary =
  iconBtnBase + 'hover:brightness-95 data-[state=open]:brightness-95'

const iconBtnSecondary =
  iconBtnBase + 'bg-card text-foreground hover:bg-muted hover:text-foreground'

const iconBtnFilter = (active: boolean) =>
  iconBtnBase +
  'bg-transparent ' +
  (active
    ? 'text-primary'
    : 'text-muted-foreground hover:bg-muted hover:text-foreground')

export default function SalesWithProvider() {
  const [activeTabId, setActiveTabId] = useState('pipeline')
  const [filtersActive, setFiltersActive] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-surface-0 text-foreground">
      <PageHeader
        className="shrink-0 border-b border-border/40 bg-surface-0 px-4 py-2.5"
        title="Sales"
        subtitle="Pipeline, leads, and opportunities for your CRM host."
        action={
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-medium py-0 px-1.5">
              Remote
            </Badge>
            <Button
              type="button"
              variant="secondary"
              className={iconBtnSecondary}
              aria-label="Import"
            >
              <Upload className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={iconBtnFilter(filtersActive)}
              aria-label="Filters"
              aria-pressed={filtersActive}
              onClick={() => setFiltersActive((v) => !v)}
            >
              <ListFilter className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <Button
              type="button"
              variant="primary"
              className={iconBtnPrimary}
              aria-label="New opportunity"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col px-4 py-3 gap-3">
        <StatCards
          className="shrink-0"
          items={[
            { label: 'Open pipeline', value: '$1.24M', change: '+8.2%', changeVariant: 'success' },
            { label: 'Qualified leads', value: '142', change: '+12', changeVariant: 'success' },
            { label: 'Win rate (90d)', value: '34%', change: '−2.1%', changeVariant: 'error' },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 flex-1">
          <Card className="lg:col-span-2 flex flex-col min-h-0 rounded-xl border-0 bg-surface-1/80 shadow-sm ring-1 ring-border/20">
            <CardHeader className="shrink-0 space-y-2.5 px-4 py-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <CardTitle className="text-base font-semibold">Pipeline</CardTitle>
                  <CardDescription className="text-xs leading-snug">
                    Stages and deals are placeholder data for the host integration.
                  </CardDescription>
                </div>
                <TabSystem
                  className="shrink-0 w-full sm:w-auto"
                  tabs={[
                    { id: 'leads', label: 'Leads' },
                    { id: 'pipeline', label: 'Pipeline' },
                    { id: 'deals', label: 'Deals' },
                  ]}
                  activeTabId={activeTabId}
                  onTabChange={setActiveTabId}
                />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <SearchBar
                  id="sales-search"
                  placeholder="Search leads and deals…"
                  autoComplete="off"
                  className="w-full min-w-0 min-h-8 h-8 flex-1 crm-toolbar-search"
                />
              </div>
            </CardHeader>
            <Separator className="shrink-0 bg-border/40" />
            <CardContent className="flex-1 min-h-0 p-3 pt-3">
              <ScrollArea className="h-full max-h-[min(400px,48vh)] rounded-xl bg-surface-2/50 p-2.5">
                <div className="space-y-3 pr-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Highlight
                  </p>
                  <EntityCard
                    name="Acme Corp — Enterprise expansion"
                    entityType="Deal"
                    subtitle="Proposal sent · $240,000 ARR"
                    statusLabel="Negotiation"
                    metadata={{
                      Stage: 'Proposal',
                      Owner: 'Jordan Lee',
                      'Close date': 'May 15, 2026',
                    }}
                  />
                  <Separator className="bg-border/30" />
                  <ModuleContainer
                    title="Sample row"
                    className="rounded-lg border border-dashed border-border/50 bg-surface-0/30 p-2.5"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Host applications should replace this block with live deal and stage data from your
                      API.
                    </p>
                  </ModuleContainer>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col min-h-0 rounded-xl border-0 bg-surface-1/80 shadow-sm ring-1 ring-border/20">
            <CardHeader className="px-4 py-3 space-y-0.5">
              <CardTitle className="text-sm font-semibold">Funnel snapshot</CardTitle>
              <CardDescription className="text-xs">Volume by stage (mock).</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 px-4 pb-4">
              <MetricComparisonList
                items={[
                  { label: 'New', value: '58', variant: 'default' },
                  { label: 'Qualified', value: '34', variant: 'success' },
                  { label: 'Proposal', value: '12', variant: 'warning' },
                  { label: 'Closed won', value: '9', variant: 'success' },
                ]}
              />
              <Separator className="bg-border/30" />
              <div className="space-y-1.5">
                <Label htmlFor="filter-owner" className="text-xs text-muted-foreground">
                  Filter by owner (demo)
                </Label>
                <Input
                  id="filter-owner"
                  placeholder="e.g. jordan@company.com"
                  className="h-8 min-h-8 text-sm rounded-lg border-0 bg-muted/30 shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-xl border-0 p-0 shadow-lg ring-1 ring-border/25 sm:max-w-md"
        >
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/30 px-4 py-3">
            <div className="min-w-0 pr-2">
              <DialogTitle className="text-sm font-semibold">New opportunity</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Placeholder form — connect fields to your host API.
              </DialogDescription>
            </div>
            <DialogClose
              className={iconBtnSecondary}
              aria-label="Close"
              type="button"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-3 px-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="opp-name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="opp-name"
                className="h-8 min-h-8 text-sm rounded-lg border-0 bg-muted/30"
                placeholder="e.g. Acme — renewal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-amount" className="text-xs text-muted-foreground">
                Amount
              </Label>
              <Input
                id="opp-amount"
                className="h-8 min-h-8 text-sm rounded-lg border-0 bg-muted/30"
                placeholder="$0.00"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border/30 px-4 py-3 sm:justify-end gap-2">
            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" className="h-8 px-3 text-xs" onClick={() => setNewOpen(false)}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
