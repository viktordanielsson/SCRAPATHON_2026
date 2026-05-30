import type { SessionControls } from '../hooks/useSession'
import { AnalysisPanel } from './AnalysisPanel'
import { CallHeader } from './CallHeader'
import { DemoControls } from './DemoControls'
import { ImperativeBanner } from './ImperativeBanner'
import { IncidentReport } from './IncidentReport'
import { RedactionTripwire } from './RedactionTripwire'
import { SessionStats } from './SessionStats'
import { TacticLegend } from './TacticLegend'
import { TranscriptPanel } from './TranscriptPanel'
import { VerdictStrip } from './VerdictStrip'

export function AppShell({ controls }: { controls: SessionControls }) {
  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <CallHeader />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5">
        {/* Active guardrails — say what to do, intercept leaks — above the score. */}
        <ImperativeBanner />
        <RedactionTripwire />
        <VerdictStrip />

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px] gap-4">
          <TranscriptPanel />
          <AnalysisPanel />
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <TacticLegend />
            <SessionStats />
          </aside>
        </div>
      </main>

      <DemoControls controls={controls} />

      {/* Hang up → instant incident report (overlay). */}
      <IncidentReport controls={controls} />
    </div>
  )
}
