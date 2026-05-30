import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crosshair, Download, Languages, Pause, Play, Trash2, X } from 'lucide-react'
import { AlertLevel } from '@shared/protocol'
import { formatClock } from '../lib/format'
import { redactText } from '../lib/redaction'
import { riskColor } from '../lib/riskColor'
import { reconstruct, useHistoryStore, type SavedSession } from '../store/historyStore'
import { freshState, reduce } from '../store/sessionReducer'
import { Sparkline } from './Sparkline'
import { TranscriptTurn } from './TranscriptTurn'

/** Playback step between events when replaying a recorded call. */
const STEP_MS = 360

const VERDICT_COLOR: Record<string, string> = {
  'Compromise attempt': '#DC2626',
  Suspicious: '#B7791F',
  Cleared: '#6B7280',
}

function fmtWhen(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function exportSession(s: SavedSession): void {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sentinel-call-${s.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function Detail({ session }: { session: SavedSession }) {
  const events = session.events
  const lastIndex = Math.max(0, events.length - 1)
  // Playhead over the event stream. Starts at the end (full call shown).
  const [n, setN] = useState(lastIndex)
  const [playing, setPlaying] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)

  // Advance one event per tick while playing; stop at the end.
  useEffect(() => {
    if (!playing) return
    if (n >= lastIndex) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setN((x) => Math.min(lastIndex, x + 1)), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, n, lastIndex])

  // State AT the playhead (re-folded) and the FULL risk curve (drawn statically).
  const state = useMemo(
    () => events.slice(0, n + 1).reduce((s, e) => reduce(s, e), freshState()),
    [events, n],
  )
  const fullScores = useMemo(() => reconstruct(events).riskHistory.map((h) => h.score), [events])

  const band = riskColor(state.risk)
  const verdictColor = VERDICT_COLOR[session.summary.verdict] ?? '#6B7280'
  const ask = state.ask?.action
    ? redactText(`${state.ask.action}${state.ask.target ? ` — ${state.ask.target}` : ''}`).masked
    : ''
  const elapsed = events.length ? events[Math.min(n, lastIndex)].ts - events[0].ts : 0
  const alertFired = state.alerts.some((a) => !a.dismissed && a.level === AlertLevel.Critical)
  const hasTranslation = state.turnIds.some((id) => !!state.turns[id].translation)
  const atEnd = n >= lastIndex

  // Playhead marker tracks the SAME scale as the scrubber (event index), so it
  // sits under the playhead even when risk updates are front-loaded in the call.
  const markerFrac = lastIndex > 0 ? Math.min(1, Math.max(0, n / lastIndex)) : 0

  const TL_W = 440
  const TL_H = 64

  const togglePlay = () => {
    if (atEnd) {
      setN(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between border-b border-hairline px-5 py-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold text-ink">{fmtWhen(session.startedAt)}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: verdictColor, backgroundColor: `${verdictColor}14` }}
            >
              {session.summary.verdict}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
            peak {Math.round(session.summary.peakRisk)} · {session.summary.totalFlags} flags ·{' '}
            {formatClock(session.summary.durationMs)}
          </div>
        </div>
        <button
          onClick={() => exportSession(session)}
          title="Export JSON"
          className="flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[11px] text-ink-soft transition-colors hover:bg-raised"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* Replay readout — risk at the playhead */}
        <div className="flex items-center gap-4">
          <span
            className="text-[40px] font-semibold leading-none tabular-nums"
            style={{ color: band.color }}
          >
            {Math.round(state.risk)}
          </span>
          <span
            className="text-[12px] font-semibold uppercase tracking-wider"
            style={{ color: band.color }}
          >
            {band.label}
          </span>
          {alertFired && (
            <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-critical">
              Alert fired
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">
            {formatClock(elapsed)}
          </span>
        </div>

        {/* Threat timeline with a moving playhead */}
        {fullScores.length >= 2 && (
          <div className="relative mt-3" style={{ width: TL_W, height: TL_H }}>
            <Sparkline data={fullScores} color={band.color} width={TL_W} height={TL_H} />
            <div
              className="absolute top-0 h-full w-px bg-ink/40"
              style={{ left: `${markerFrac * TL_W}px` }}
            />
          </div>
        )}

        {/* Transport: play/pause + scrubber */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={togglePlay}
            title={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-strong"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={lastIndex}
            value={n}
            onChange={(e) => {
              setPlaying(false)
              setN(Number(e.target.value))
            }}
            className="h-1 flex-1 cursor-pointer accent-accent"
            aria-label="Scrub call"
          />
          <span className="font-mono text-[10px] text-muted tabular-nums">
            {n + 1}/{events.length}
          </span>
        </div>

        {ask && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-raised px-3 py-2">
            <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                Caller wants
              </div>
              <div className="text-[12.5px] font-semibold text-ink">{ask}</div>
            </div>
          </div>
        )}

        <div className="mb-2 mt-4 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            Conversation
          </span>
          {hasTranslation && (
            <button
              onClick={() => setShowEnglish((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-hairline px-2 py-0.5 text-[10px] text-ink-soft transition-colors hover:bg-raised"
              title="Translation is computed once and stored; this toggles the view"
            >
              <Languages className="h-3 w-3" />
              {showEnglish ? 'Show original' : 'Show English'}
            </button>
          )}
        </div>
        {state.turnIds.length === 0 ? (
          <p className="text-[12px] text-muted">Press play to replay the call from the start.</p>
        ) : (
          <div className="space-y-4">
            {state.turnIds.map((id) => (
              <TranscriptTurn
                key={id}
                turn={state.turns[id]}
                flags={state.flagIds.map((fid) => state.flags[fid]).filter((f) => f.turnId === id)}
                translated={showEnglish}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sessions = useHistoryStore((s) => s.sessions)
  const remove = useHistoryStore((s) => s.remove)
  const clearAll = useHistoryStore((s) => s.clearAll)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0] ?? null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[82vh] w-full max-w-4xl overflow-hidden rounded-xl border border-hairline bg-surface shadow-card"
          >
            {/* List */}
            <div className="flex w-64 shrink-0 flex-col border-r border-hairline">
              <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  History · {sessions.length}
                </span>
                {sessions.length > 0 && (
                  <button
                    onClick={() => {
                      clearAll()
                      setSelectedId(null)
                    }}
                    className="text-[10px] uppercase tracking-wide text-muted transition-colors hover:text-critical"
                  >
                    Clear
                  </button>
                )}
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12px] text-muted">
                    No saved calls yet. Run a call and it'll be recorded here.
                  </p>
                ) : (
                  sessions.map((s) => {
                    const active = selected?.id === s.id
                    const vc = VERDICT_COLOR[s.summary.verdict] ?? '#6B7280'
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={`group flex w-full items-center justify-between gap-2 border-b border-hairline px-4 py-2.5 text-left transition-colors ${
                          active ? 'bg-raised' : 'hover:bg-raised/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-medium text-ink">
                            {fmtWhen(s.startedAt)}
                          </div>
                          <div className="font-mono text-[10px] text-muted tabular-nums">
                            peak {Math.round(s.summary.peakRisk)} · {s.summary.turns} turns
                          </div>
                        </div>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: vc }}
                          title={s.summary.verdict}
                        />
                        <Trash2
                          onClick={(e) => {
                            e.stopPropagation()
                            remove(s.id)
                            if (selectedId === s.id) setSelectedId(null)
                          }}
                          className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity hover:text-critical group-hover:opacity-100"
                        />
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Detail */}
            {selected ? (
              <Detail key={selected.id} session={selected} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
                Select a call to view its timeline.
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex items-center rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
