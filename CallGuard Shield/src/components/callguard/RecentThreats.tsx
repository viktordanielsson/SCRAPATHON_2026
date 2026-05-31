import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Crosshair, Download, Inbox, Pause, Play, ShieldAlert, Trash2, X } from "lucide-react";

import { AlertLevel, TACTIC_LABEL } from "@/sentinel/protocol";
import {
  reconstruct,
  sessionTitle,
  useHistoryStore,
  type SavedSession,
} from "@/sentinel/store/historyStore";
import { freshState, reduce } from "@/sentinel/store/sessionReducer";
import { selActiveTactics } from "@/sentinel/store/selectors";
import { formatClock } from "@/sentinel/lib/format";
import { TACTIC_ICON, TranscriptView, riskVisual, type TranscriptViewTurn } from "./sentinel-shared";

/** Playback step between events when replaying a recorded call. */
const STEP_MS = 360;

const VERDICT_COLOR: Record<string, string> = {
  "Compromise attempt": "var(--danger)",
  Suspicious: "var(--warning)",
  Cleared: "var(--success)",
};

function verdictColor(v: string) {
  return VERDICT_COLOR[v] ?? "var(--muted-foreground)";
}

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

function fmtWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Recent calls — the real, persisted past conversations from the history store
 * (replaces the former mocked "Recent threats" list). Each entry is an
 * event-sourced recording; clicking one replays it through the live reducer to
 * show the full transcript and what drove the risk.
 */
export function RecentThreats() {
  const sessions = useHistoryStore((s) => s.sessions);
  const remove = useHistoryStore((s) => s.remove);
  const clearAll = useHistoryStore((s) => s.clearAll);
  const [selected, setSelected] = useState<SavedSession | null>(null);

  // SSR: the store is empty on the server (no localStorage) but populated on the
  // client. Render the empty shell until mounted so hydration matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const list = mounted ? sessions : [];

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-[var(--danger)]" />
          <div className="text-sm font-medium">Recent calls</div>
          {list.length > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">({list.length})</span>
          )}
        </div>
        {list.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-[var(--danger)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-8">
          <div className="size-10 rounded-full bg-white/5 mx-auto grid place-items-center mb-3">
            <Inbox className="size-4 text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">No calls recorded yet.</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Run an analysis and it'll be saved here automatically.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => {
            const vc = verdictColor(s.summary.verdict);
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="group w-full text-left rounded-xl p-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{sessionTitle(s)}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span style={{ color: vc }}>{s.summary.verdict}</span>
                      <span>· {timeAgo(s.endedAt)}</span>
                      <span>· {s.summary.turns} turns</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums" style={{ color: vc }}>
                        {Math.round(s.summary.peakRisk)}%
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">peak</div>
                    </div>
                    <Trash2
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(s.id);
                      }}
                      className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition"
                    />
                  </div>
                </div>
                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.summary.peakRisk}%`, background: vc }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && <CallDetail session={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function exportSession(s: SavedSession): void {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `callguard-call-${s.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Full risk curve as a stretch-to-width SVG line; the playhead marker overlays it. */
function RiskSparkline({ data, color, height = 56 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - (Math.max(0, Math.min(100, d)) / 100) * (height - 2) - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.9}
      />
    </svg>
  );
}

/**
 * Replay view for a saved call — the timeline, replayable. Folds the recorded
 * event stream up to a playhead through the live reducer, so you can play/scrub
 * and watch the risk climb and the conversation reveal turn by turn.
 */
function CallDetail({ session, onClose }: { session: SavedSession; onClose: () => void }) {
  const events = session.events;
  const lastIndex = Math.max(0, events.length - 1);
  const [n, setN] = useState(lastIndex);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (n >= lastIndex) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setN((x) => Math.min(lastIndex, x + 1)), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, n, lastIndex]);

  // State AT the playhead (re-folded) and the FULL call (curve + drivers).
  const state = useMemo(
    () => events.slice(0, n + 1).reduce((st, e) => reduce(st, e), freshState()),
    [events, n],
  );
  const full = useMemo(() => reconstruct(events), [events]);
  const fullScores = full.riskHistory.map((h) => h.score);
  const drivers = useMemo(
    () => [...selActiveTactics(full).entries()].sort((a, b) => b[1].count - a[1].count),
    [full],
  );

  const vis = riskVisual(state.risk);
  const vc = verdictColor(session.summary.verdict);
  const elapsed = events.length ? events[Math.min(n, lastIndex)].ts - events[0].ts : 0;
  const alertFired = state.alerts.some((a) => !a.dismissed && a.level === AlertLevel.Critical);
  const atEnd = n >= lastIndex;
  const markerFrac = lastIndex > 0 ? Math.min(1, Math.max(0, n / lastIndex)) : 0;
  const hasAsk = !!state.ask && state.ask.action.trim().length > 0;
  const askLine = hasAsk ? `${state.ask!.action}${state.ask!.target ? ` — ${state.ask!.target}` : ""}` : "";

  const turns: TranscriptViewTurn[] = useMemo(
    () =>
      state.turnIds.map((id) => ({
        ...state.turns[id],
        turnId: id,
        flags: state.flagIds.map((fid) => state.flags[fid]).filter((f) => f.turnId === id),
      })),
    [state],
  );

  const togglePlay = () => {
    if (atEnd) {
      setN(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-card-premium"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold">{fmtWhen(session.startedAt)}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: vc, background: `color-mix(in oklab, ${vc} 18%, transparent)` }}
              >
                {session.summary.verdict}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
              peak {Math.round(session.summary.peakRisk)} · {session.summary.totalFlags} flags ·{" "}
              {formatClock(session.summary.durationMs)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSession(session)}
              title="Export JSON"
              className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
            >
              <Download className="size-3.5" /> Export
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Replay readout — risk at the playhead */}
          <div className="flex items-center gap-3">
            <span className="text-4xl font-semibold tabular-nums" style={{ color: vis.color }}>
              {Math.round(state.risk)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: vis.color }}>
              {vis.label}
            </span>
            {alertFired && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--danger)]"
                style={{ background: "color-mix(in oklab, var(--danger) 18%, transparent)" }}
              >
                Alert fired
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
              {formatClock(elapsed)}
            </span>
          </div>

          {/* Threat timeline with a moving playhead */}
          {fullScores.length >= 2 && (
            <div className="relative mt-3" style={{ height: 56 }}>
              <RiskSparkline data={fullScores} color={vis.color} height={56} />
              <div
                className="absolute top-0 h-full w-px bg-white/50"
                style={{ left: `${markerFrac * 100}%` }}
              />
            </div>
          )}

          {/* Transport: play/pause + scrubber */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={togglePlay}
              title={playing ? "Pause" : atEnd ? "Replay" : "Play"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground hover:opacity-90 transition"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={lastIndex}
              value={n}
              onChange={(e) => {
                setPlaying(false);
                setN(Number(e.target.value));
              }}
              className="h-1 flex-1 cursor-pointer"
              style={{ accentColor: "var(--brand-cyan)" }}
              aria-label="Scrub call"
            />
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {n + 1}/{events.length}
            </span>
          </div>

          {hasAsk && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
              <Crosshair className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-cyan)]" />
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Caller wanted
                </div>
                <div className="text-[13px] font-semibold">{askLine}</div>
              </div>
            </div>
          )}

          {/* Conversation up to the playhead */}
          <div className="mb-2 mt-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Clock className="size-3.5" /> Conversation
          </div>
          {turns.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Press play to replay from the start.</p>
          ) : (
            <TranscriptView turns={turns} running={false} />
          )}

          {/* What drove it — whole-call summary */}
          {drivers.length > 0 && (
            <>
              <div className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                What drove it
              </div>
              <ul className="space-y-1.5">
                {drivers.map(([tactic, activity]) => {
                  const Icon = TACTIC_ICON[tactic];
                  return (
                    <li key={tactic} className="flex items-center gap-2 text-[12.5px]">
                      <Icon className="size-3.5 text-[var(--danger)]" />
                      <span className="font-medium">{TACTIC_LABEL[tactic]}</span>
                      <span className="text-muted-foreground">
                        ×{activity.count} · peak {Math.round(activity.maxConfidence * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
