import type { SessionControls } from '../hooks/useSession'
import { CallHeader } from './CallHeader'
import { CriticalAlertBanner } from './CriticalAlertBanner'
import { DemoControls } from './DemoControls'
import { SessionStats } from './SessionStats'
import { TacticLegend } from './TacticLegend'
import { ThreatGauge } from './ThreatGauge'
import { TranscriptPanel } from './TranscriptPanel'
import { VoiceAuthMeter } from './VoiceAuthMeter'
import { Panel } from './Panel'

export function AppShell({ controls }: { controls: SessionControls }) {
  return (
    <div className="flex h-screen flex-col bg-base text-ink">
      <CriticalAlertBanner />
      <CallHeader />

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-3 p-3">
        <TranscriptPanel />

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Panel title="Threat Index" bodyClassName="flex justify-center">
            <ThreatGauge />
          </Panel>
          <TacticLegend />
          <VoiceAuthMeter />
          <SessionStats />
        </aside>
      </main>

      <DemoControls controls={controls} />
    </div>
  )
}
