import type { SessionControls } from '../hooks/useSession'
import { CallHeader } from './CallHeader'
import { DemoControls } from './DemoControls'
import { SessionStats } from './SessionStats'
import { TacticLegend } from './TacticLegend'
import { TranscriptPanel } from './TranscriptPanel'
import { VerdictStrip } from './VerdictStrip'
import { VoiceAuthMeter } from './VoiceAuthMeter'

export function AppShell({ controls }: { controls: SessionControls }) {
  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <CallHeader />

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5">
        <VerdictStrip />

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
          <TranscriptPanel />
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <TacticLegend />
            <VoiceAuthMeter />
            <SessionStats />
          </aside>
        </div>
      </main>

      <DemoControls controls={controls} />
    </div>
  )
}
