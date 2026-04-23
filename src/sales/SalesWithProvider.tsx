import { useState } from 'react'
import {
  Badge,
  ModuleContainer,
  PageHeader,
  TabSystem,
} from '@citron-systems/citron-ui'

import { IntakeTab } from './intake/IntakeTab'
import { isDefaultTenant, TENANT_ID } from '@/lib/tenant'

type SalesView = 'sales' | 'intake'

export default function SalesWithProvider() {
  const [view, setView] = useState<SalesView>('sales')

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-surface-0 text-foreground">
      <PageHeader
        className="shrink-0 border-b border-border/40 bg-surface-0 px-4 py-2.5"
        title="Sales"
        subtitle={
          view === 'intake'
            ? 'Review briefs from your team or share the public /intake link with clients — same data in one place.'
            : 'Pipeline and deal workspace. UI reset for a full rebuild.'
        }
        action={
          <div className="flex items-center gap-1.5">
            <TabSystem
              className="hidden sm:inline-flex"
              tabs={[
                { id: 'sales', label: 'Sales' },
                { id: 'intake', label: 'Intake' },
              ]}
              activeTabId={view}
              onTabChange={(id) => setView(id as SalesView)}
            />
            {!isDefaultTenant && (
              <span title="HillCode tenant (VITE_TENANT)">
                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex text-[10px] font-medium py-0 px-1.5"
                >
                  {TENANT_ID}
                </Badge>
              </span>
            )}
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[10px] font-medium py-0 px-1.5"
            >
              Remote
            </Badge>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col min-w-0">
        {view === 'intake' ? (
          <IntakeTab />
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <ModuleContainer
              title="Sales workspace"
              className="w-full max-w-lg rounded-2xl border border-dashed border-border/50 bg-surface-1/40 p-6 text-center"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                This surface is cleared for a full rebuild. Reconnect pipeline, leads, and opportunities
                from the host or your API when the new experience is ready.
              </p>
            </ModuleContainer>
          </div>
        )}
      </div>
    </div>
  )
}
