import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Crosshair, ShieldAlert, X } from "lucide-react";

import { CallStatus, TACTIC_LABEL } from "@/sentinel/protocol";
import { useSessionStore } from "@/sentinel/store/sessionStore";
import { selActiveTactics, selStats } from "@/sentinel/store/selectors";
import { formatClock } from "@/sentinel/lib/format";
import { TACTIC_ICON } from "./sentinel-shared";

const VERDICT_COLOR: Record<string, string> = {
  "Compromise attempt": "var(--danger)",
  Suspicious: "var(--warning)",
  Cleared: "var(--success)",
};

function verdictFor(peak: number): string {
  if (peak >= 70) return "Compromise attempt";
  if (peak >= 40) return "Suspicious";
  return "Cleared";
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

/**
 * Incident report — the "hang up → instant report" overlay. Appears when the call
 * ends, summarizing the verdict, what the caller wanted (The Ask), what drove the
 * risk, and the key stats. Derived entirely from live session state.
 */
export function IncidentReport() {
  const s = useSessionStore();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // New call (any non-ended status) re-arms the report.
    if (s.status !== CallStatus.Ended) setClosed(false);
  }, [s.status]);

  const stats = selStats(s);
  const tactics = useMemo(() => selActiveTactics(s), [s]);

  const open = s.status === CallStatus.Ended && !closed;
  if (!open || typeof document === "undefined") return null;

  const peak = s.peakRisk;
  const verdict = verdictFor(peak);
  const vc = VERDICT_COLOR[verdict] ?? "var(--muted-foreground)";
  const durationMs = s.startedAt && s.endedAt ? s.endedAt - s.startedAt : 0;
  const drivers = [...tactics.entries()].sort((a, b) => b[1].count - a[1].count);
  const hasAsk = !!s.ask && s.ask.action.trim().length > 0;
  const askLine = hasAsk ? `${s.ask!.action}${s.ask!.target ? ` — ${s.ask!.target}` : ""}` : "";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-up"
      onClick={() => setClosed(true)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-card-premium"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-4" style={{ color: vc }} />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Incident report
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: vc, background: `color-mix(in oklab, ${vc} 18%, transparent)` }}
            >
              {verdict}
            </span>
          </div>
          <button
            onClick={() => setClosed(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="peak risk" value={Math.round(peak)} color={vc} />
            <Stat label="final" value={Math.round(s.risk)} />
            <Stat label="flags" value={stats.totalFlags} />
            <Stat label="duration" value={formatClock(durationMs)} />
          </div>

          {hasAsk && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
              <Crosshair className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-cyan)]" />
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Caller wanted
                </div>
                <div className="text-[13px] font-semibold">{askLine}</div>
              </div>
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <Clock className="size-3.5" /> What drove it
            </div>
            {drivers.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No manipulation tactics detected. Call cleared.
              </p>
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
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/5 px-6 py-3">
          <button
            onClick={() => setClosed(true)}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-white/5 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
