/**
 * Public-facing project brief — share: https://your-domain.com/intake
 * Requires the same Vite env as the CRM (Supabase URL + anon key) when deployed.
 */
import { useEffect } from 'react'
import { ModuleContainer } from '@citron-systems/citron-ui'

import { isSupabaseConfigured } from '@/lib/supabase'

import { IntakeFormWizard } from './IntakeFormWizard'

export default function ClientIntakePage() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Project brief'
    return () => {
      document.title = prev
    }
  }, [])

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-0 p-6 text-foreground">
        <ModuleContainer
          title="Intake is not available yet"
          className="max-w-md rounded-2xl border border-border/30 bg-surface-1/40 p-6 text-center"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page needs a configured Supabase project. Set <code className="text-xs font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs font-mono">VITE_SUPABASE_ANON_KEY</code> in your deployment environment, then redeploy.
          </p>
        </ModuleContainer>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-0 text-foreground">
      <IntakeFormWizard variant="client" />
    </div>
  )
}
