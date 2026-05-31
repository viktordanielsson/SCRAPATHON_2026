import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Shield, Mic, MicOff, Square, ShieldAlert, Activity, Clock, ChevronRight,
  Settings, Bell, Search, LayoutDashboard, PhoneCall, Building2,
  Bot, Ear, AlertTriangle, Crosshair,
} from "lucide-react";

import { CallStatus, TACTIC_LABEL, type Tactic } from "@/sentinel/protocol";
import { useSession } from "@/sentinel/hooks/useSession";
import { useElapsed } from "@/sentinel/hooks/useElapsed";
import { useAutoScroll } from "@/sentinel/hooks/useAutoScroll";
import { useSessionStore } from "@/sentinel/store/sessionStore";
import { selActiveAlert, selActiveTactics, selDrivers, selStats } from "@/sentinel/store/selectors";
import { SCENARIOS } from "@/sentinel/scenarios";
import { formatClock } from "@/sentinel/lib/format";
import {
  CriticalBanner, LiveAdvice, Recommendation, RiskDonut, TacticGrid, TranscriptView,
  TACTIC_ICON, type TranscriptViewTurn,
} from "@/components/callguard/sentinel-shared";
import { ConsoleShell } from "@/components/callguard/ConsoleShell";
import { IncidentReport } from "@/components/callguard/IncidentReport";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "CallGuard — Live console" },
      { name: "description", content: "Real-time social engineering detection console." },
    ],
  }),
  component: AppDashboard,
});

type ConsoleMode = "analyze" | "live";

function AppDashboard() {
  const [mode, setMode] = useState<ConsoleMode>("analyze");
  const [personaId, setPersonaId] = useState(SCENARIOS[0].id);
  const controls = useSession(mode);
  const s = useSessionStore();

  const running = s.status === CallStatus.Connecting || s.status === CallStatus.Live;
  const elapsed = useElapsed(s.startedAt, s.endedAt);
  const stats = selStats(s);
  const activeTactics = selActiveTactics(s);
  const alert = selActiveAlert(s);
  const drivers = selDrivers(s);
  const scrollRef = useAutoScroll<HTMLDivElement>(s.turnIds.length + s.flagIds.length);

  const hasAsk = !!s.ask && s.ask.action.trim().length > 0;
  const askLine = hasAsk ? `${s.ask!.action}${s.ask!.target ? ` — ${s.ask!.target}` : ""}` : "";

  const turns: TranscriptViewTurn[] = useMemo(
    () =>
      s.turnIds.map((id) => ({
        ...s.turns[id],
        turnId: id,
        flags: s.flagIds.map((fid) => s.flags[fid]).filter((f) => f.turnId === id),
      })),
    [s.turnIds, s.turns, s.flagIds, s.flags],
  );

  const timeline = useMemo(() => {
    const events: TimelineEvent[] = s.flagIds.map((fid) => {
      const f = s.flags[fid];
      return { kind: "flag", label: `${TACTIC_LABEL[f.tactic]} detected`, detail: f.rationale, tactic: f.tactic };
    });
    if (alert) events.push({ kind: "alert", label: "Critical alert", detail: alert.message });
    return events;
  }, [s.flagIds, s.flags, alert]);

  const start = () => controls.start(mode === "live" ? personaId : undefined);

  return (
    <ConsoleShell title="Live console" subtitle={s.sessionId ? s.sessionId.slice(0, 14) : "No session"}>
      {/* Content */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left/main column */}
          <div className="xl:col-span-2 space-y-4">
            {/* Control panel */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-hero opacity-30 pointer-events-none" />
              <div className="relative flex flex-wrap items-center gap-6">
                <button
                  onClick={running ? controls.stop : start}
                  className={`relative size-24 rounded-full grid place-items-center font-semibold shrink-0 transition shadow-glow ${running ? "bg-gradient-danger text-white" : "bg-gradient-brand text-primary-foreground hover:scale-[1.03]"}`}
                >
                  {running && <span className="absolute inset-0 rounded-full animate-pulse-ring" />}
                  {running ? <Square className="size-8" /> : <Mic className="size-8" />}
                </button>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-1">
                    {s.status === CallStatus.Connecting
                      ? "Connecting…"
                      : s.status === CallStatus.Live
                        ? mode === "live" ? "Listening · AI caller live" : "Listening · detector live"
                        : s.status === CallStatus.Error
                          ? "Error"
                          : "Idle"}
                  </div>
                  <div className={`text-2xl md:text-3xl font-semibold tracking-tight ${running ? "" : "text-gradient-iris"}`}>
                    {running ? "Listening…" : "Start Call Analysis"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 max-w-md">
                    {mode === "live"
                      ? "An AI caller role-plays an attacker on the line. Speak as the support agent — CallGuard transcribes both sides in real time."
                      : "Hold the call on speaker. CallGuard transcribes every utterance and scores social-engineering risk per turn with the live detector."}
                  </div>
                  {s.status === CallStatus.Error && (
                    <div className="text-xs text-[var(--warning)] mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-3" />
                      Could not start the session. Check microphone permission and that GEMINI_API_KEY is set.
                    </div>
                  )}

                  {/* Mode + persona selectors */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full glass p-0.5 text-xs">
                      {([
                        { id: "analyze", label: "Analyze call", icon: Ear },
                        { id: "live", label: "AI caller", icon: Bot },
                      ] as const).map((m) => (
                        <button
                          key={m.id}
                          disabled={running}
                          onClick={() => setMode(m.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition disabled:opacity-50 ${mode === m.id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <m.icon className="size-3.5" /> {m.label}
                        </button>
                      ))}
                    </div>
                    {mode === "live" && (
                      <select
                        value={personaId}
                        disabled={running}
                        onChange={(e) => setPersonaId(e.target.value)}
                        className="glass rounded-full px-3 py-1.5 text-xs text-foreground outline-none disabled:opacity-50 [&>option]:bg-[oklch(0.1_0.015_260)]"
                      >
                        {SCENARIOS.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-auto">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Elapsed</div>
                  <div className="text-3xl font-semibold tabular-nums">{formatClock(elapsed)}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {s.status === CallStatus.Live ? <Mic className="size-3" /> : <MicOff className="size-3" />}
                    {s.status === CallStatus.Live ? "Mic active" : "Mic inactive"}
                  </div>
                </div>
              </div>
            </div>

            {/* Live advice — one glanceable directive between control and transcript */}
            <LiveAdvice
              running={running}
              risk={s.risk}
              drivers={drivers}
              ask={s.ask}
              hasAlert={!!alert}
            />

            {/* Transcript */}
            <div className="glass-strong rounded-2xl flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 icon-grad icon-glow" />
                  <div className="text-sm font-medium">Live transcript</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${running ? "bg-[var(--danger)] animate-pulse" : "bg-muted-foreground"}`} />
                  {running ? "REC" : "IDLE"}
                </div>
              </div>
              <div className="flex-1 flex flex-col p-5 max-h-[480px]">
                {turns.length === 0 ? (
                  <div className="flex-1 grid place-items-center text-center py-10">
                    <div>
                      <div className="size-12 rounded-full bg-white/5 border border-white/10 mx-auto grid place-items-center mb-3">
                        <Mic className="size-5 icon-grad" />
                      </div>
                      <div className="font-semibold">No transcript yet</div>
                      <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        Press <button onClick={start} className="underline text-foreground">Start Call Analysis</button> and allow microphone access to begin.
                      </div>
                    </div>
                  </div>
                ) : (
                  <TranscriptView turns={turns} running={running} scrollRef={scrollRef} />
                )}
                {alert && (
                  <div className="mt-4">
                    <CriticalBanner message={alert.message} onDismiss={() => s.dismissAlert(alert.alertId)} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — analysis & operator guidance */}
          <div className="space-y-6">
            {/* The Ask — what the caller is trying to get done (neutral until it escalates) */}
            {hasAsk && (
              <div className="glass rounded-2xl p-4 flex items-start gap-2.5">
                <Crosshair className="mt-0.5 size-4 shrink-0 icon-grad" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Caller wants</div>
                  <div className="text-sm font-semibold">{askLine}</div>
                </div>
              </div>
            )}

            {/* Risk score */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk score</div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">peak {Math.round(stats.peakRisk)}</span>
              </div>
              <div className="flex items-center justify-center">
                <RiskDonut score={s.risk} />
              </div>
            </div>

            {/* Detected tactics */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Detected tactics</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{activeTactics.size} active · {stats.totalFlags} flags</div>
              </div>
              <TacticGrid active={activeTactics} />
            </div>

            {/* Detection timeline removed from dashboard — Timeline component + its
                `timeline` memo are kept below for later reuse. */}
            {alert && <Recommendation ask={s.ask} drivers={drivers} />}
          </div>
        </div>

        <IncidentReport />
    </ConsoleShell>
  );
}

type TimelineEvent = { kind: "flag" | "alert"; label: string; detail: string; tactic?: Tactic };

function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 icon-grad icon-glow" />
          <div className="text-sm font-medium">Detection timeline</div>
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{timeline.length} events</div>
      </div>
      {timeline.length === 0 ? (
        <div className="text-sm text-muted-foreground py-10 text-center">No events yet — detections will appear here as the call progresses.</div>
      ) : (
        <ol className="relative border-l border-white/10 ml-2 space-y-3">
          {timeline.map((e, i) => {
            const isAlert = e.kind === "alert";
            const Icon = isAlert ? ShieldAlert : e.tactic ? TACTIC_ICON[e.tactic] : ShieldAlert;
            return (
              <li key={i} className="pl-5 relative animate-fade-up">
                <span className={`absolute -left-[7px] top-1.5 size-3 rounded-full ${isAlert ? "bg-[var(--danger)] animate-pulse-ring" : "bg-[var(--brand-cyan)]"}`} />
                <div className="flex items-start gap-2">
                  <Icon className={`size-4 mt-0.5 ${isAlert ? "text-[var(--danger)]" : "text-[var(--brand-cyan)]"}`} />
                  <div className="flex-1">
                    <div className={`text-sm ${isAlert ? "font-semibold text-[var(--danger)]" : "font-medium"}`}>{e.label}</div>
                    {e.detail && <div className="text-[11px] text-muted-foreground">{e.detail}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
