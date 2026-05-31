/**
 * Shared SENTINEL ⇄ CallGuard view helpers. The dashboard pages (/app, /demo)
 * consume the real in-browser engine (src/sentinel) and render it in CallGuard's
 * dark theme. These map the protocol's tactic/risk vocabulary onto CallGuard's
 * icons, colors, and a couple of reusable panels.
 */
import { memo, type ComponentType } from "react";
import { ShieldAlert, ShieldCheck, Volume2 } from "lucide-react";

import {
  RiskBand,
  riskBandFor,
  Speaker,
  TACTIC_LABEL,
  type Tactic,
} from "@/sentinel/protocol";
import type { TacticActivity } from "@/sentinel/store/selectors";
import type { FlagState, TurnState } from "@/sentinel/store/sessionReducer";
import {
  IconFalseAuthority,
  IconFear,
  IconPretexting,
  IconRapportBuilding,
  IconReciprocity,
  IconUrgency,
} from "./icons";

/** Bespoke per-tactic glyphs — currentColor so neutral/flagged coloring works. */
export const TACTIC_ICON: Record<Tactic, ComponentType<{ className?: string }>> = {
  Urgency: IconUrgency,
  FalseAuthority: IconFalseAuthority,
  Pretexting: IconPretexting,
  Fear: IconFear,
  Reciprocity: IconReciprocity,
  RapportBuilding: IconRapportBuilding,
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

/** Circular risk gauge — gradient sweep (band color → violet) with a soft glow. */
export function RiskDonut({ score, size = 144 }: { score: number; size?: number }) {
  const { color } = riskVisual(score);
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" style={{ width: size, height: size }}>
        <defs>
          <linearGradient id="cg-donut" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--brand-violet)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke="url(#cg-donut)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 400ms ease",
            filter: `drop-shadow(0 0 6px color-mix(in oklab, ${color} 55%, transparent))`,
          }}
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
        const pct = on ? Math.round(hit.maxConfidence * 100) : 0;
        return (
          <div
            key={t}
            className={`relative overflow-hidden rounded-xl px-3 py-3 border transition ${
              on
                ? "border-[var(--danger)]/25 bg-gradient-to-br from-[var(--danger)]/12 to-[var(--brand-violet)]/[0.06] animate-fade-up"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-7 rounded-lg grid place-items-center transition ${
                  on
                    ? "bg-gradient-to-br from-[var(--danger)]/25 to-[var(--brand-violet)]/20 text-[var(--danger)]"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                <Icon className={`size-3.5 ${on ? "icon-grad-danger" : ""}`} />
              </span>
              <span className={`text-xs font-medium ${on ? "" : "text-muted-foreground"}`}>
                {TACTIC_LABEL[t]}
              </span>
            </div>
            <div
              className="text-[10px] uppercase tracking-widest mt-2 tabular-nums"
              style={{ color: on ? "var(--danger)" : undefined }}
            >
              {on ? `Flagged · ${pct}%` : "Clear"}
            </div>
            {on && (
              <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--danger)] to-[var(--brand-violet)] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
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

/** Ultra-short per-tactic directive — a few words an agent can read mid-call. */
const ADVICE_SHORT: Record<Tactic, string> = {
  Urgency: "Slow down",
  FalseAuthority: "Verify their authority",
  Pretexting: "Confirm their identity",
  Fear: "Don't be pressured",
  Reciprocity: "You owe them nothing",
  RapportBuilding: "Stay skeptical",
};

/**
 * Live advice strip — sits between the call control and the transcript. Shows ONE
 * glanceable directive (a few words) the agent can read without breaking the
 * conversation: the specific "don't do X" once a request is in play, a counter to
 * the top active tactic, or a calm all-clear. Color tracks the live risk band.
 */
export function LiveAdvice({
  running,
  risk,
  drivers,
  ask,
  hasAlert,
}: {
  running: boolean;
  risk: number;
  drivers: Tactic[];
  ask?: { action: string; target: string } | null;
  hasAlert: boolean;
}) {
  const top = drivers[0];
  const hasAsk = !!ask && ask.action.trim().length > 0;

  let headline: string;
  let sub: string;
  let Icon: ComponentType<{ className?: string }> = ShieldCheck;
  let color = "var(--success)";
  let active = false;

  if (hasAlert && hasAsk) {
    headline = `Don't ${ask!.action}`;
    sub = "Call back on the number already on file before acting";
    Icon = ShieldAlert;
    color = "var(--danger)";
    active = true;
  } else if (top) {
    headline = ADVICE_SHORT[top];
    sub = `${TACTIC_LABEL[top]} detected — hold the line`;
    Icon = TACTIC_ICON[top];
    color = riskVisual(risk).color;
    active = true;
  } else if (running) {
    headline = "All clear";
    sub = "Keep listening — nothing flagged yet";
    color = "var(--success)";
  } else {
    headline = "Standing by";
    sub = "Start a call to begin live guidance";
    color = "var(--muted-foreground)";
  }

  return (
    <div
      className="glass rounded-2xl px-5 py-4 flex items-center gap-4 transition"
      style={active ? { borderColor: color } : undefined}
    >
      <span
        className="size-12 shrink-0 rounded-xl grid place-items-center"
        style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Advice</span>
          {active && (
            <span className="text-[10px] uppercase tracking-widest" style={{ color }}>
              {riskVisual(risk).label}
            </span>
          )}
        </div>
        <div
          className="text-xl md:text-2xl font-semibold tracking-tight leading-tight truncate"
          style={{ color }}
        >
          {headline}
        </div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
    </div>
  );
}

/** Per-tactic counter-guidance — phrased as a handling instruction, not a label. */
const COUNTER: Record<Tactic, string> = {
  Urgency: "The rush is the attack — it is safe to slow down.",
  FalseAuthority: "Rank is unverified — authority does not bypass verification.",
  Pretexting: "The backstory may be fabricated — confirm identity independently.",
  Fear: "Fear is being used as leverage — pause before you act.",
  Reciprocity: "A favor does not earn access — hold the policy.",
  RapportBuilding: "Friendliness is not identity — verify anyway.",
};

const GENERIC_ITEMS = [
  "Do not share credentials or one-time codes over this call.",
  "Escalate to your supervisor immediately.",
  "Verify identity through a secure callback channel.",
];

function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

/**
 * The operator directive — what to DO right now, shown once a critical alert
 * fires. Names the SPECIFIC request ("The Ask") when the detector has identified
 * it ("Do not reset MFA on account ending 4827"); otherwise generic guidance.
 * The Speak button is manual so it is never audible to the caller unless chosen.
 */
export function Recommendation({
  ask,
  drivers = [],
}: {
  ask?: { action: string; target: string } | null;
  drivers?: Tactic[];
}) {
  const hasAsk = !!ask && ask.action.trim().length > 0;
  const top = drivers[0];
  const why = top ? COUNTER[top] : "";
  const headline = hasAsk ? `Do not ${ask!.action}` : "Hold — verify before you act";
  const detail = hasAsk
    ? `The caller is working to ${ask!.action}${ask!.target ? ` on ${ask!.target}` : ""} without verifying identity. Call the customer back on the number already on file before acting.`
    : "Do not reset MFA, read back codes, or change account access. Call the customer back on the number already on file.";

  return (
    <div className="glass rounded-2xl p-5 animate-fade-up border border-[var(--danger)]/30">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-[var(--danger)]" />
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Do this now</div>
        </div>
        <button
          onClick={() => speak(`${headline}. ${detail}`)}
          title="Read aloud (for the agent's ear only)"
          className="inline-flex items-center gap-1 rounded-full glass px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition"
        >
          <Volume2 className="size-3" /> Speak
        </button>
      </div>
      <div className="text-base font-semibold tracking-tight">{headline}</div>
      <p className="text-sm text-muted-foreground mt-1">{detail}</p>
      {(why || drivers.length > 0) && (
        <p className="text-[11px] text-muted-foreground mt-2">
          {drivers.length > 0 && (
            <span className="font-medium text-foreground">
              {drivers.slice(0, 3).map((t) => TACTIC_LABEL[t]).join(" · ")}
            </span>
          )}
          {why && <> — {why}</>}
        </p>
      )}
      <ul className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
        {GENERIC_ITEMS.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
            <span className="mt-1.5 size-1 rounded-full bg-[var(--brand-cyan)] shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
