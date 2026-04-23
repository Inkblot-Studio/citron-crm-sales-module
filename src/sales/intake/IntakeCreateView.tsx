import { IntakeFormWizard } from './IntakeFormWizard'
import type { ProjectIntake } from './types'

export interface IntakeCreateViewProps {
  onBack: () => void
  onCreated: (row: ProjectIntake) => void
}

export function IntakeCreateView({ onBack, onCreated }: IntakeCreateViewProps) {
  return <IntakeFormWizard variant="internal" onBack={onBack} onCreated={onCreated} />
}
