import { Speaker, TACTIC_LABEL } from '@shared/protocol'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { TACTIC_TONE } from '../lib/tacticStyle'
import { useSessionStore } from '../store/sessionStore'

/**
 * The analysis feed — separate from the conversation transcript. Each entry is a
 * detected manipulation tactic with the rationale (why it raises the threat), in
 * the order they fired. The header tracks the running risk those detections drive.
 */
export function AnalysisPanel() {
  const flagIds = useSessionStore((s) => s.flagIds)
  const flags = useSessionStore((s) => s.flags)
  const turns = useSessionStore((s) => s.turns)
  const risk = useSessionStore((s) => s.risk)
  const scrollRef = useAutoScroll<HTMLDivElement>(`${flagIds.length}`)

  const speakerLabel = (turnId: string): string => {
    const sp = turns[turnId]?.speaker
    return sp === Speaker.Caller ? 'Caller' : sp === Speaker.Agent ? 'Agent' : ''
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Analysis
        </span>
        <span className="font-mono text-[11px] text-muted tabular-nums">risk {Math.round(risk)}</span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-5 py-5">
        {flagIds.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-[13px] font-medium text-ink-soft">No tactics yet</span>
            <span className="text-[12px] text-muted">
              Detected manipulation tactics and why the score rises show up here.
            </span>
          </div>
        ) : (
          flagIds.map((id) => {
            const f = flags[id]
            const tone = TACTIC_TONE[f.tactic]
            const who = speakerLabel(f.turnId)
            return (
              <div
                key={id}
                className="rounded-md border-l-2 bg-raised px-3 py-2"
                style={{ borderColor: tone }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold" style={{ color: tone }}>
                    {TACTIC_LABEL[f.tactic]}
                  </span>
                  <span className="font-mono text-[10px] text-muted tabular-nums">
                    {Math.round(f.confidence * 100)}%
                  </span>
                  {who && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
                      {who}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] leading-snug text-ink-soft">{f.rationale}</p>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
