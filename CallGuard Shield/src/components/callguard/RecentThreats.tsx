import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, X, Download, Trash2, Clock, Inbox } from "lucide-react";

import { TACTIC_LABEL } from "@/sentinel/protocol";
import {
  reconstruct,
  sessionTitle,
  useHistoryStore,
  type SavedSession,
} from "@/sentinel/store/historyStore";
import { selActiveTactics } from "@/sentinel/store/selectors";
import { formatClock } from "@/sentinel/lib/format";
import { TACTIC_ICON, TranscriptView, type TranscriptViewTurn } from "./sentinel-shared";

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

function CallDetail({ session, onClose }: { session: SavedSession; onClose: () => void }) {
  const state = useMemo(() => reconstruct(session.events), [session]);
  const tactics = useMemo(() => selActiveTactics(state), [state]);
  const turns: TranscriptViewTurn[] = useMemo(
    () =>
      state.turnIds.map((id) => ({
        ...state.turns[id],
        turnId: id,
        flags: state.flagIds.map((fid) => state.flags[fid]).filter((f) => f.turnId === id),
      })),
    [state],
  );
  const vc = verdictColor(session.summary.verdict);
  const drivers = [...tactics.entries()].sort((a, b) => b[1].count - a[1].count);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl glass-strong shadow-card-premium"
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
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <Stat label="peak risk" value={Math.round(session.summary.peakRisk)} color={vc} />
            <Stat label="final" value={Math.round(session.summary.finalRisk)} />
            <Stat label="flags" value={session.summary.totalFlags} />
            <Stat label="caller turns" value={session.summary.callerTurns} />
          </div>

          {/* What drove it */}
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              What drove it
            </div>
            {drivers.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No manipulation tactics detected. Call cleared.</p>
            ) : (
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
            )}
          </div>

          {/* Transcript */}
          <div className="mb-2 mt-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Clock className="size-3.5" /> Conversation
          </div>
          <div className="flex flex-col">
            <TranscriptView turns={turns} running={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
