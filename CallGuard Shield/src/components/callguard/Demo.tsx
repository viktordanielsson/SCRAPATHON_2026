import { useEffect, useMemo, useState } from "react";
import { Play, RotateCcw, PhoneCall, Mic } from "lucide-react";

import { CallStatus } from "@/sentinel/protocol";
import { useSession } from "@/sentinel/hooks/useSession";
import { useElapsed } from "@/sentinel/hooks/useElapsed";
import { useAutoScroll } from "@/sentinel/hooks/useAutoScroll";
import { useSessionStore } from "@/sentinel/store/sessionStore";
import { selActiveAlert, selActiveTactics, selStats } from "@/sentinel/store/selectors";
import { SCENARIOS } from "@/sentinel/scenarios";
import { formatClock } from "@/sentinel/lib/format";
import {
  CriticalBanner, Recommendation, RiskDonut, TacticGrid, TranscriptView,
  riskVisual, type TranscriptViewTurn,
} from "@/components/callguard/sentinel-shared";

/**
 * Interactive demo. Runs the *real* SENTINEL engine in mock mode: the
 * MockEventSource replays a scripted scenario through the same reducer, store,
 * and protocol the live console uses — so this is a faithful, API-key-free
 * preview of the product, not a separate fake.
 */
export function Demo({ autoStartSignal }: { autoStartSignal: number }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const controls = useSession("mock");
  const s = useSessionStore();

  const running = s.status === CallStatus.Connecting || s.status === CallStatus.Live;
  const elapsed = useElapsed(s.startedAt, s.endedAt);
  const stats = selStats(s);
  const activeTactics = selActiveTactics(s);
  const alert = selActiveAlert(s);
  const risk = riskVisual(s.risk);
  const scrollRef = useAutoScroll<HTMLDivElement>(s.turnIds.length + s.flagIds.length);

  const turns: TranscriptViewTurn[] = useMemo(
    () =>
      s.turnIds.map((id) => ({
        ...s.turns[id],
        turnId: id,
        flags: s.flagIds.map((fid) => s.flags[fid]).filter((f) => f.turnId === id),
      })),
    [s.turnIds, s.turns, s.flagIds, s.flags],
  );

  const start = (id = scenarioId) => {
    setScenarioId(id);
    controls.start(id);
  };

  useEffect(() => {
    if (autoStartSignal > 0) {
      start();
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartSignal]);

  return (
    <section id="demo" className="relative py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Interactive demo</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
              Watch CallGuard catch an attack <span className="text-gradient-brand">in real time.</span>
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => start()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition"
            >
              <Play className="size-4" /> {running ? "Restart simulation" : "Analyze new call"}
            </button>
            <button
              onClick={controls.resetDemo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-strong hover:bg-white/5 transition"
            >
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {/* Scenario picker */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => start(sc.id)}
              className={`text-left rounded-2xl px-4 py-3 border transition ${
                scenarioId === sc.id
                  ? "border-[var(--brand-cyan)]/40 bg-[var(--brand-cyan)]/10"
                  : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-sm font-medium">{sc.label}</div>
              <div className="text-[11px] text-muted-foreground max-w-xs">{sc.description}</div>
            </button>
          ))}
        </div>

        <div className="glass-strong rounded-3xl p-2 shadow-card-premium">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-[var(--danger)]" />
                <div className="size-2.5 rounded-full bg-[var(--warning)]" />
                <div className="size-2.5 rounded-full bg-[var(--success)]" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                callguard.app/call/{s.sessionId ? s.sessionId.slice(-8) : "standby"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="size-3" /> {formatClock(elapsed)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${running ? "bg-[var(--danger)] animate-pulse" : "bg-muted-foreground"}`} />
                {running ? "REC" : "IDLE"}
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-2 p-2">
            {/* Transcript */}
            <div className="lg:col-span-3 glass rounded-2xl p-5 min-h-[520px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Live transcript</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mic className="size-3" /> Speaker diarization on
                </div>
              </div>
              {turns.length === 0 && !running ? (
                <EmptyTranscript onStart={() => start()} />
              ) : (
                <TranscriptView turns={turns} running={running} scrollRef={scrollRef} />
              )}
              {alert && (
                <div className="mt-4">
                  <CriticalBanner message={alert.message} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-2">
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk score</div>
                  <div
                    className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in oklab, ${risk.color} 18%, transparent)`, color: risk.color }}
                  >
                    {risk.label}
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <RiskDonut score={s.risk} size={128} />
                  <div className="flex-1 text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Tactics</span><span className="tabular-nums text-foreground">{stats.tacticCount}</span></div>
                    <div className="flex justify-between"><span>Flags</span><span className="tabular-nums text-foreground">{stats.totalFlags}</span></div>
                    <div className="flex justify-between"><span>Caller turns</span><span className="tabular-nums text-foreground">{stats.callerTurns}</span></div>
                    <div className="flex justify-between"><span>Peak risk</span><span className="tabular-nums text-foreground">{Math.round(stats.peakRisk)}</span></div>
                  </div>
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Detected tactics</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">{activeTactics.size} active</div>
                </div>
                <TacticGrid active={activeTactics} />
              </div>
              {alert && <Recommendation />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyTranscript({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 grid place-items-center text-center py-16">
      <div className="space-y-4">
        <div className="size-14 rounded-full bg-gradient-brand mx-auto grid place-items-center shadow-glow">
          <PhoneCall className="size-6 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold">No active call</div>
          <div className="text-sm text-muted-foreground">Pick a scenario and start the simulation to see CallGuard analyze a live attack.</div>
        </div>
        <button onClick={onStart} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium">
          <Play className="size-3.5" /> Start simulation
        </button>
      </div>
    </div>
  );
}
