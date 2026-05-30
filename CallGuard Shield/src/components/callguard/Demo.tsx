import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, ShieldAlert, AlertTriangle, Lock, ShieldCheck, ArrowUpRight, PhoneCall, Mic } from "lucide-react";

type Line = {
  speaker: "Caller" | "Agent";
  text: string;
  delay: number;
  riskAfter: number;
  threat?: { id: string; label: string; icon: "authority" | "urgency" | "credential" };
};

const SCRIPT: Line[] = [
  { speaker: "Caller", text: "Hi, this is Michael from IT.", delay: 0, riskAfter: 12 },
  { speaker: "Agent", text: "How can I help you today?", delay: 1400, riskAfter: 12 },
  { speaker: "Caller", text: "The CEO needs access restored immediately — he's locked out and we're in a board meeting.", delay: 1400, riskAfter: 34, threat: { id: "authority", label: "Authority Claim Detected", icon: "authority" } },
  { speaker: "Agent", text: "I'll need to verify your identity first.", delay: 1500, riskAfter: 34 },
  { speaker: "Caller", text: "There is no time for that. Skip the verification just this once — he's about to present.", delay: 1600, riskAfter: 57, threat: { id: "urgency", label: "Urgency Tactic Detected", icon: "urgency" } },
  { speaker: "Caller", text: "Can you just read me the temporary password? I'll relay it to him directly.", delay: 1800, riskAfter: 78, threat: { id: "credential", label: "Credential Request Detected", icon: "credential" } },
  { speaker: "Caller", text: "If this deal falls through because of you, that's on your record.", delay: 1700, riskAfter: 92 },
];

const ICONS = { authority: ShieldAlert, urgency: AlertTriangle, credential: Lock };

export function Demo({ autoStartSignal }: { autoStartSignal: number }) {
  const [lines, setLines] = useState<{ line: Line; typedChars: number }[]>([]);
  const [risk, setRisk] = useState(0);
  const [threats, setThreats] = useState<Line["threat"][]>([]);
  const [alert, setAlert] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<number[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setLines([]);
    setRisk(0);
    setThreats([]);
    setAlert(false);
    setElapsed(0);
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    reset();
    setRunning(true);
    let cursor = 600;
    let prevRisk = 0;

    SCRIPT.forEach((line, idx) => {
      cursor += line.delay;
      const startAt = cursor;

      // Push line as empty (start typing)
      timers.current.push(window.setTimeout(() => {
        setLines((prev) => [...prev, { line, typedChars: 0 }]);
      }, startAt));

      // Type characters
      const typeDuration = Math.min(2200, 30 + line.text.length * 22);
      const steps = Math.max(8, Math.floor(line.text.length / 3));
      for (let s = 1; s <= steps; s++) {
        const at = startAt + (typeDuration * s) / steps;
        timers.current.push(window.setTimeout(() => {
          setLines((prev) => {
            const copy = [...prev];
            const last = copy.length - 1;
            if (last >= 0 && copy[last].line === line) {
              copy[last] = { line, typedChars: Math.floor((line.text.length * s) / steps) };
            }
            return copy;
          });
          if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
          }
        }, at));
      }

      // Animate risk to riskAfter after typing completes
      const riskStart = startAt + typeDuration;
      const from = prevRisk;
      const to = line.riskAfter;
      prevRisk = to;
      const riskSteps = 24;
      const riskDuration = 700;
      for (let s = 1; s <= riskSteps; s++) {
        timers.current.push(window.setTimeout(() => {
          const t = s / riskSteps;
          const eased = 1 - Math.pow(1 - t, 3);
          setRisk(Math.round(from + (to - from) * eased));
        }, riskStart + (riskDuration * s) / riskSteps));
      }

      if (line.threat) {
        timers.current.push(window.setTimeout(() => {
          setThreats((prev) => (prev.find((p) => p?.id === line.threat!.id) ? prev : [...prev, line.threat]));
        }, riskStart + 250));
      }

      cursor = startAt + typeDuration;

      if (idx === SCRIPT.length - 1) {
        timers.current.push(window.setTimeout(() => {
          setAlert(true);
        }, cursor + 600));
        timers.current.push(window.setTimeout(() => {
          setRunning(false);
        }, cursor + 800));
      }
    });
  }, [reset]);

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => window.clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (autoStartSignal > 0) {
      start();
      // Scroll to demo
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartSignal]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const riskColor =
    risk >= 75 ? "var(--danger)" : risk >= 45 ? "var(--warning)" : risk >= 20 ? "var(--brand-cyan)" : "var(--success)";
  const riskLabel =
    risk >= 75 ? "HIGH RISK" : risk >= 45 ? "ELEVATED" : risk >= 20 ? "MONITORING" : "SECURE";

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
              onClick={start}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition"
            >
              <Play className="size-4" /> {running ? "Restart simulation" : "Analyze new call"}
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-strong hover:bg-white/5 transition"
            >
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
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
              <span className="text-xs text-muted-foreground font-mono">callguard.app/call/8f23a-live</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="size-3" /> {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(Math.floor(elapsed) % 60).toString().padStart(2, "0")}
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
              <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
                {lines.length === 0 && !running && (
                  <EmptyTranscript onStart={start} />
                )}
                {lines.map((entry, i) => {
                  const isLast = i === lines.length - 1;
                  const text = entry.line.text.slice(0, entry.typedChars);
                  const isCaller = entry.line.speaker === "Caller";
                  return (
                    <div key={i} className={`flex gap-3 animate-fade-up ${isCaller ? "" : "flex-row-reverse"}`}>
                      <div className={`size-8 shrink-0 rounded-full grid place-items-center text-xs font-semibold ${isCaller ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)]"}`}>
                        {isCaller ? "C" : "A"}
                      </div>
                      <div className={`max-w-[78%] ${isCaller ? "" : "text-right"}`}>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          {entry.line.speaker}
                        </div>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isCaller ? "bg-white/5 border border-white/5" : "bg-[var(--brand-cyan)]/10 border border-[var(--brand-cyan)]/20"}`}>
                          {text}
                          {isLast && running && entry.typedChars < entry.line.text.length && (
                            <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-foreground animate-caret align-middle" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {alert && (
                  <div className="animate-fade-up mt-4">
                    <div className="relative rounded-2xl p-5 bg-gradient-danger shadow-danger overflow-hidden">
                      <div className="absolute inset-0 grid-bg opacity-20" />
                      <div className="relative flex items-start gap-3">
                        <div className="size-10 rounded-full bg-white/15 grid place-items-center animate-pulse-ring">
                          <ShieldAlert className="size-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">CallGuard alert</div>
                          <div className="text-lg font-semibold tracking-tight">HIGH RISK SOCIAL ENGINEERING ATTEMPT</div>
                          <div className="text-sm opacity-90 mt-1">Recommend immediate intervention. Do not share credentials.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-2">
              <RiskMeter risk={risk} color={riskColor} label={riskLabel} />
              <ThreatPanel threats={threats} />
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
    <div className="h-full grid place-items-center text-center py-16">
      <div className="space-y-4">
        <div className="size-14 rounded-full bg-gradient-brand mx-auto grid place-items-center shadow-glow">
          <PhoneCall className="size-6 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold">No active call</div>
          <div className="text-sm text-muted-foreground">Start the simulation to see CallGuard analyze a live attack.</div>
        </div>
        <button onClick={onStart} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium">
          <Play className="size-3.5" /> Start simulation
        </button>
      </div>
    </div>
  );
}

function RiskMeter({ risk, color, label }: { risk: number; color: string; label: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (risk / 100) * circumference;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk score</div>
        <div className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
          {label}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
            <circle cx="60" cy="60" r="54" stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" />
            <circle
              cx="60" cy="60" r="54"
              stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-4xl font-semibold tabular-nums" style={{ color }}>{risk}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">of 100</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {["Authority", "Urgency", "Credential", "Pretext"].map((k, i) => {
            const v = Math.min(100, Math.max(0, risk - i * 10 + (i === 0 ? 8 : 0)));
            return (
              <div key={k}>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>{k}</span><span className="tabular-nums">{Math.round(v)}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${v}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThreatPanel({ threats }: { threats: Line["threat"][] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Detected threats</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{threats.length} active</div>
      </div>
      {threats.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">No threats detected yet.</div>
      ) : (
        <div className="space-y-2">
          {threats.map((t) => {
            const Icon = ICONS[t!.icon];
            return (
              <div key={t!.id} className="animate-fade-up flex items-center gap-3 rounded-xl px-3 py-3 bg-[var(--danger)]/8 border border-[var(--danger)]/25">
                <div className="size-8 rounded-lg bg-[var(--danger)]/20 grid place-items-center">
                  <Icon className="size-4 text-[var(--danger)]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t!.label}</div>
                  <div className="text-[11px] text-muted-foreground">Pattern matched · Confidence 96%</div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Recommendation() {
  const items = [
    "Do not share credentials over this call.",
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