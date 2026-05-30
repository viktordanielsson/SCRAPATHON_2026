/**
 * Shared SENTINEL ⇄ CallGuard view helpers. The dashboard pages (/app, /demo)
 * consume the real in-browser engine (src/sentinel) and render it in CallGuard's
 * dark theme. These map the protocol's tactic/risk vocabulary onto CallGuard's
 * icons, colors, and a couple of reusable panels.
 */
import { memo } from "react";
import {
  AlertTriangle,
  Drama,
  Flame,
  Gift,
  HeartHandshake,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  RiskBand,
  riskBandFor,
  Speaker,
  TACTIC_LABEL,
  type Tactic,
} from "@/sentinel/protocol";
import type { TacticActivity } from "@/sentinel/store/selectors";
import type { FlagState, TurnState } from "@/sentinel/store/sessionReducer";

export const TACTIC_ICON: Record<Tactic, LucideIcon> = {
  Urgency: AlertTriangle,
  FalseAuthority: ShieldAlert,
  Pretexting: Drama,
  Fear: Flame,
  Reciprocity: Gift,
  RapportBuilding: HeartHandshake,
};

/** Map a 0–100 risk score onto a CallGuard color var + a short label. */
export function riskVisual(score: number): { color: string; label: string } {
  switch (riskBandFor(score)) {
    case RiskBand.Critical:
      return { color: "var(--danger)", label: "HIGH RISK" };
    case RiskBand.High:
      return { color: "var(--warning)", label: "ELEVATED" };
    case RiskBand.Elevated:
      return { color: "var(--brand-cyan)", label: "MONITORING" };
    default:
      return { color: "var(--success)", label: "SECURE" };
  }
}

/** Circular risk gauge — the donut shared by the console and the demo. */
export function RiskDonut({ score, size = 144 }: { score: number; size?: number }) {
  const { color } = riskVisual(score);
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="60" cy="60" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease, stroke 400ms" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl font-semibold tabular-nums" style={{ color }}>
            {Math.round(score)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">of 100</div>
        </div>
      </div>
    </div>
  );
}

/** Grid of the six social-engineering tactics, lit by live detector activity. */
export function TacticGrid({ active }: { active: Map<Tactic, TacticActivity> }) {
  const tactics = Object.keys(TACTIC_LABEL) as Tactic[];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {tactics.map((t) => {
        const Icon = TACTIC_ICON[t];
        const hit = active.get(t);
        const on = !!hit;
        return (
          <div
            key={t}
            className={`rounded-xl px-3 py-3 border transition ${
              on
                ? "bg-[var(--danger)]/10 border-[var(--danger)]/30 animate-fade-up"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-7 rounded-lg grid place-items-center ${
                  on ? "bg-[var(--danger)]/20 text-[var(--danger)]" : "bg-white/5 text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
              </span>
              <span className={`text-xs font-medium ${on ? "" : "text-muted-foreground"}`}>
                {TACTIC_LABEL[t]}
              </span>
            </div>
            <div
              className="text-[10px] uppercase tracking-widest mt-2 tabular-nums"
              style={{ color: on ? "var(--danger)" : undefined }}
            >
              {on ? `Flagged · ${Math.round(hit.maxConfidence * 100)}%` : "Clear"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface TranscriptViewTurn extends TurnState {
  turnId: string;
  flags: FlagState[];
}

/**
 * One transcript bubble. Memoized so a streaming interim update only re-renders
 * the turn that actually changed, not every bubble in the list — the single
 * biggest win for keeping a fast transcript feeling real-time.
 */
const TranscriptRow = memo(
  function TranscriptRow({ turn, running }: { turn: TranscriptViewTurn; running: boolean }) {
    const isCaller = turn.speaker === Speaker.Caller;
    const interim = !turn.final;
    return (
      <div className={`flex gap-3 animate-fade-up ${isCaller ? "" : "flex-row-reverse"}`}>
        <div
          className={`size-8 shrink-0 rounded-full grid place-items-center text-xs font-semibold ${
            isCaller ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)]"
          }`}
        >
          {isCaller ? "C" : "A"}
        </div>
        <div className={`max-w-[78%] ${isCaller ? "" : "text-right"}`}>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{turn.speaker}</div>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isCaller ? "bg-white/5 border border-white/5" : "bg-[var(--brand-cyan)]/10 border border-[var(--brand-cyan)]/20"
            } ${interim ? "text-muted-foreground border-dashed" : ""}`}
          >
            {turn.text || "…"}
            {interim && running && (
              <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-foreground animate-caret align-middle" />
            )}
          </div>
          {turn.flags.length > 0 && (
            <div className={`mt-1.5 flex flex-wrap gap-1.5 ${isCaller ? "" : "justify-end"}`}>
              {turn.flags.map((f, i) => {
                const Icon = TACTIC_ICON[f.tactic];
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--danger)]/12 border border-[var(--danger)]/30 text-[var(--danger)]"
                    title={f.rationale}
                  >
                    <Icon className="size-3" />
                    {TACTIC_LABEL[f.tactic]}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
  (a, b) =>
    a.running === b.running &&
    a.turn.text === b.turn.text &&
    a.turn.final === b.turn.final &&
    a.turn.speaker === b.turn.speaker &&
    a.turn.flags.length === b.turn.flags.length,
);

/** Live transcript bubbles with inline tactic badges. Caller left, agent right. */
export function TranscriptView({
  turns,
  running,
  scrollRef,
}: {
  turns: TranscriptViewTurn[];
  running: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
      {turns.map((turn) => (
        <TranscriptRow key={turn.turnId} turn={turn} running={running} />
      ))}
    </div>
  );
}

/** The CRITICAL banner — fires only off a Critical alert from the engine. */
export function CriticalBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="animate-fade-up">
      <div className="relative rounded-2xl p-5 bg-gradient-danger shadow-danger overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative flex items-start gap-3">
          <div className="size-10 rounded-full bg-white/15 grid place-items-center animate-pulse-ring">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">CallGuard alert</div>
            <div className="text-lg font-semibold tracking-tight">HIGH RISK SOCIAL ENGINEERING ATTEMPT</div>
            <div className="text-sm opacity-90 mt-1">{message}</div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs uppercase tracking-widest opacity-80 hover:opacity-100 transition"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Recommended-actions card, shown once a critical alert fires. */
export function Recommendation() {
  const items = [
    "Do not share credentials or one-time codes over this call.",
    "Escalate to your supervisor immediately.",
    "Verify identity through a secure callback channel.",
  ];
  return (
    <div className="glass rounded-2xl p-5 animate-fade-up border border-[var(--brand-cyan)]/20">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="size-4 text-[var(--brand-cyan)]" />
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Recommended actions</div>
      </div>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1 size-1.5 rounded-full bg-[var(--brand-cyan)] shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
