import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Shield, Mic, MicOff, Play, Square, ShieldAlert, AlertTriangle, Lock,
  Heart, Users, Activity, Clock, ChevronRight, Settings, Bell, Search,
  LayoutDashboard, PhoneCall, History, Building2, ShieldCheck, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "CallGuard — Live console" },
      { name: "description", content: "Real-time social engineering detection console." },
    ],
  }),
  component: AppDashboard,
});

type ThreatKey = "authority" | "urgency" | "credential" | "emotional" | "social";

const THREAT_META: Record<ThreatKey, { label: string; icon: typeof ShieldAlert; weight: number }> = {
  authority:  { label: "Authority Claim",        icon: ShieldAlert,    weight: 22 },
  urgency:    { label: "Urgency Tactic",         icon: AlertTriangle,  weight: 20 },
  credential: { label: "Credential Request",     icon: Lock,           weight: 28 },
  emotional:  { label: "Emotional Manipulation", icon: Heart,          weight: 14 },
  social:     { label: "Social Proof",           icon: Users,          weight: 10 },
};

const PATTERNS: { rx: RegExp; key: ThreatKey }[] = [
  { rx: /\b(ceo|cfo|cto|manager|supervisor|director|board|executive|from it|i.?t department|head of)\b/i, key: "authority" },
  { rx: /\b(immediately|right now|asap|urgent|hurry|no time|deadline|in a meeting|locked out|emergency)\b/i, key: "urgency" },
  { rx: /\b(password|otp|one.?time|verification code|2fa|two.?factor|pin|credentials|reset|security question|temporary code)\b/i, key: "credential" },
  { rx: /\b(please|i.?ll lose my job|on your record|in trouble|fired|disappointed|begging|favou?r)\b/i, key: "emotional" },
  { rx: /\b(everyone does|other agents|last time|usually you|standard procedure|always do this|trust me)\b/i, key: "social" },
];

// Fallback simulated transcript for browsers without SpeechRecognition or when the user declines mic.
const SIM_LINES = [
  "Hi, this is Michael from IT.",
  "The CEO is locked out and we are in a board meeting right now.",
  "There is no time for verification, skip it just this once.",
  "Can you read me the temporary password? I will relay it to him.",
  "If this deal falls through because of you, that is on your record.",
];

type TimelineEntry = { t: number; label: string; kind: "threat" | "alert"; threat?: ThreatKey };
type TranscriptEntry = { id: number; speaker: "Caller" | "Agent"; text: string; t: number; live?: boolean };

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function AppDashboard() {
  const [listening, setListening] = useState(false);
  const [usingMic, setUsingMic] = useState(false);
  const [permission, setPermission] = useState<"idle" | "granted" | "denied" | "simulated">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [risk, setRisk] = useState(0);
  const [detected, setDetected] = useState<Record<ThreatKey, number>>({ authority: 0, urgency: 0, credential: 0, emotional: 0, social: 0 });
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [highRiskTriggered, setHighRiskTriggered] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const idRef = useRef(0);
  const simTimersRef = useRef<number[]>([]);

  const cleanup = useCallback(() => {
    simTimersRef.current.forEach((t) => clearTimeout(t));
    simTimersRef.current = [];
    if (recognitionRef.current) {
      try { recognitionRef.current.onresult = null; recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (!listening) return;
    const iv = window.setInterval(() => {
      setElapsed((performance.now() - startedAtRef.current) / 1000);
    }, 100);
    return () => clearInterval(iv);
  }, [listening]);

  const analyzeText = useCallback((text: string, t: number) => {
    let added = 0;
    const fired: ThreatKey[] = [];
    PATTERNS.forEach(({ rx, key }) => {
      if (rx.test(text)) {
        setDetected((prev) => {
          if (prev[key] > 0) return prev;
          fired.push(key);
          added += THREAT_META[key].weight;
          return { ...prev, [key]: 1 };
        });
      }
    });
    if (fired.length) {
      setTimeline((prev) => [
        ...prev,
        ...fired.map<TimelineEntry>((k) => ({ t, label: `${THREAT_META[k].label} Detected`, kind: "threat", threat: k })),
      ]);
    }
    if (added > 0) {
      setRisk((r) => {
        const next = Math.min(100, r + added);
        if (next >= 75 && !highRiskTriggered) {
          setHighRiskTriggered(true);
          setTimeline((prev) => [...prev, { t, label: "High Risk Triggered", kind: "alert" }]);
        }
        return next;
      });
    }
  }, [highRiskTriggered]);

  const appendFinal = useCallback((text: string) => {
    if (!text.trim()) return;
    const t = (performance.now() - startedAtRef.current) / 1000;
    setTranscript((prev) => [...prev, { id: ++idRef.current, speaker: "Caller", text: text.trim(), t }]);
    analyzeText(text, t);
  }, [analyzeText]);

  const updateLive = useCallback((text: string) => {
    setTranscript((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.live) {
        copy[copy.length - 1] = { ...last, text };
      } else {
        copy.push({ id: ++idRef.current, speaker: "Caller", text, t: (performance.now() - startedAtRef.current) / 1000, live: true });
      }
      return copy;
    });
  }, []);

  const finalizeLive = useCallback((text: string) => {
    setTranscript((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.live) {
        copy[copy.length - 1] = { ...last, text, live: false };
      } else {
        copy.push({ id: ++idRef.current, speaker: "Caller", text, t: (performance.now() - startedAtRef.current) / 1000 });
      }
      return copy;
    });
    const t = (performance.now() - startedAtRef.current) / 1000;
    analyzeText(text, t);
  }, [analyzeText]);

  const runSimulation = useCallback(() => {
    setPermission("simulated");
    setUsingMic(false);
    let cursor = 800;
    SIM_LINES.forEach((line) => {
      const lineStart = cursor;
      // type live
      const steps = Math.max(10, Math.floor(line.length / 3));
      const dur = Math.min(2400, 400 + line.length * 35);
      for (let s = 1; s <= steps; s++) {
        const at = lineStart + (dur * s) / steps;
        simTimersRef.current.push(window.setTimeout(() => {
          updateLive(line.slice(0, Math.floor((line.length * s) / steps)));
        }, at));
      }
      simTimersRef.current.push(window.setTimeout(() => finalizeLive(line), lineStart + dur + 120));
      cursor = lineStart + dur + 900;
    });
    simTimersRef.current.push(window.setTimeout(() => setListening(false), cursor + 200));
  }, [updateLive, finalizeLive]);

  const startMic = useCallback(async () => {
    cleanup();
    setTranscript([]);
    setTimeline([]);
    setDetected({ authority: 0, urgency: 0, credential: 0, emotional: 0, social: 0 });
    setRisk(0);
    setHighRiskTriggered(false);
    setElapsed(0);
    startedAtRef.current = performance.now();
    setListening(true);

    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      runSimulation();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermission("granted");
      setUsingMic(true);

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (ev: any) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const txt = res[0].transcript;
          if (res.isFinal) {
            finalizeLive(txt);
          } else {
            interim += txt;
          }
        }
        if (interim) updateLive(interim);
      };
      rec.onend = () => {
        if (listening) {
          try { rec.start(); } catch {}
        }
      };
      rec.start();
      recognitionRef.current = rec;
    } catch {
      setPermission("denied");
      runSimulation();
    }
  }, [cleanup, finalizeLive, updateLive, runSimulation, listening]);

  const stop = useCallback(() => {
    setListening(false);
    cleanup();
  }, [cleanup]);

  const riskMeta = useMemo(() => {
    if (risk >= 75) return { label: "HIGH RISK", color: "var(--danger)" };
    if (risk >= 40) return { label: "MEDIUM RISK", color: "var(--warning)" };
    if (risk >= 15) return { label: "LOW RISK", color: "var(--brand-cyan)" };
    return { label: "SECURE", color: "var(--success)" };
  }, [risk]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/5 bg-white/[0.015]">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-white/5">
          <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center shadow-glow">
            <Shield className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm">CallGuard</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Console</div>
          </div>
        </Link>
        <nav className="p-3 space-y-1 text-sm">
          {[
            { icon: LayoutDashboard, label: "Live console", active: true },
            { icon: PhoneCall, label: "Calls" },
            { icon: History, label: "Incidents" },
            { icon: Building2, label: "Teams" },
            { icon: ShieldCheck, label: "Policies" },
            { icon: Settings, label: "Settings" },
          ].map((i) => (
            <button key={i.label} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${i.active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"}`}>
              <i.icon className="size-4" /> {i.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="glass rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="size-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="font-medium">All systems normal</span>
            </div>
            <div className="text-muted-foreground">SOC 2 · GDPR · ISO 27001</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Live console</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Session #8f23a</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm text-muted-foreground w-64">
              <Search className="size-3.5" />
              <input placeholder="Search calls, agents, threats..." className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground" />
            </div>
            <button className="size-9 glass rounded-full grid place-items-center"><Bell className="size-4" /></button>
            <div className="size-9 rounded-full bg-gradient-brand grid place-items-center text-xs font-semibold text-primary-foreground">AL</div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left/main column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Control panel */}
            <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
              <div className="relative flex flex-wrap items-center gap-6">
                <button
                  onClick={listening ? stop : startMic}
                  className={`relative size-24 rounded-full grid place-items-center font-semibold shrink-0 transition shadow-glow ${listening ? "bg-gradient-danger text-white" : "bg-gradient-brand text-primary-foreground hover:scale-[1.03]"}`}
                >
                  {listening && <span className="absolute inset-0 rounded-full animate-pulse-ring" />}
                  {listening ? <Square className="size-8" /> : <Mic className="size-8" />}
                </button>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-1">
                    {listening ? (usingMic ? "Listening · microphone live" : "Listening · simulated stream") : "Idle"}
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {listening ? "Listening…" : "Start Call Analysis"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {listening
                      ? "CallGuard is transcribing this call and scoring social-engineering risk per utterance."
                      : "Click the button to grant microphone access. CallGuard will analyze speech in real time."}
                  </div>
                  {permission === "denied" && (
                    <div className="text-xs text-[var(--warning)] mt-2">Microphone blocked — running a simulated session so you can still see the console.</div>
                  )}
                  {permission === "simulated" && !listening && (
                    <div className="text-xs text-muted-foreground mt-2">Last session ran in simulated mode.</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-auto">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Elapsed</div>
                  <div className="text-3xl font-semibold tabular-nums">{fmtTime(elapsed)}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {usingMic ? <Mic className="size-3" /> : <MicOff className="size-3" />}
                    {usingMic ? "Mic active" : "Mic inactive"}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk + transcript grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <RiskCard risk={risk} meta={riskMeta} />
              <ThreatGrid detected={detected} />
            </div>

            <Transcript transcript={transcript} listening={listening} onStart={startMic} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Timeline timeline={timeline} />
            <RecentIncidents />
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ risk, meta }: { risk: number; meta: { label: string; color: string } }) {
  const c = 2 * Math.PI * 52;
  const offset = c - (risk / 100) * c;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk score</div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)`, color: meta.color }}>
          {meta.label}
        </span>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative size-36">
          <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
            <circle cx="60" cy="60" r="52" stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" fill="none" />
            <circle cx="60" cy="60" r="52" stroke={meta.color} strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 400ms ease, stroke 400ms" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-4xl font-semibold tabular-nums" style={{ color: meta.color }}>{Math.round(risk)}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">of 100</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreatGrid({ detected }: { detected: Record<ThreatKey, number> }) {
  const keys = Object.keys(THREAT_META) as ThreatKey[];
  return (
    <div className="md:col-span-2 glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Detected threats</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {keys.filter((k) => detected[k]).length} / {keys.length} active
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {keys.map((k) => {
          const meta = THREAT_META[k];
          const on = detected[k] > 0;
          return (
            <div key={k} className={`rounded-xl px-3 py-3 border transition ${on ? "bg-[var(--danger)]/10 border-[var(--danger)]/30 animate-fade-up" : "border-white/5 bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2">
                <span className={`size-7 rounded-lg grid place-items-center ${on ? "bg-[var(--danger)]/20 text-[var(--danger)]" : "bg-white/5 text-muted-foreground"}`}>
                  <meta.icon className="size-3.5" />
                </span>
                <span className={`text-xs font-medium ${on ? "" : "text-muted-foreground"}`}>{meta.label}</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest mt-2" style={{ color: on ? "var(--danger)" : "" }}>
                {on ? "Flagged" : "Clear"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Transcript({ transcript, listening, onStart }: { transcript: TranscriptEntry[]; listening: boolean; onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [transcript]);
  return (
    <div className="glass-strong rounded-2xl flex flex-col min-h-[360px]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[var(--brand-cyan)]" />
          <div className="text-sm font-medium">Live transcript</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`size-1.5 rounded-full ${listening ? "bg-[var(--danger)] animate-pulse" : "bg-muted-foreground"}`} />
          {listening ? "REC" : "IDLE"}
        </div>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[420px]">
        {transcript.length === 0 && (
          <div className="h-full grid place-items-center text-center py-10">
            <div>
              <div className="size-12 rounded-full bg-gradient-brand mx-auto grid place-items-center shadow-glow mb-3">
                <Mic className="size-5 text-primary-foreground" />
              </div>
              <div className="font-semibold">No transcript yet</div>
              <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Press <button onClick={onStart} className="underline text-foreground">Start Call Analysis</button> and allow microphone access to begin.
              </div>
            </div>
          </div>
        )}
        {transcript.map((e) => (
          <div key={e.id} className="animate-fade-up">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
              <span>{e.speaker}</span>
              <span className="tabular-nums">{fmtTime(e.t)}</span>
              {e.live && <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px]">interim</span>}
            </div>
            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed inline-block max-w-full ${e.live ? "bg-white/[0.03] border border-dashed border-white/10 text-muted-foreground" : "bg-white/5 border border-white/5"}`}>
              {e.text || "…"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[var(--brand-cyan)]" />
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
            const Icon = isAlert ? ShieldAlert : (e.threat ? THREAT_META[e.threat].icon : AlertTriangle);
            return (
              <li key={i} className="pl-5 relative animate-fade-up">
                <span className={`absolute -left-[7px] top-1.5 size-3 rounded-full ${isAlert ? "bg-[var(--danger)] animate-pulse-ring" : "bg-[var(--brand-cyan)]"}`} />
                <div className="flex items-start gap-2">
                  <Icon className={`size-4 mt-0.5 ${isAlert ? "text-[var(--danger)]" : "text-[var(--brand-cyan)]"}`} />
                  <div className="flex-1">
                    <div className={`text-sm ${isAlert ? "font-semibold text-[var(--danger)]" : "font-medium"}`}>{e.label}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">{fmtTime(e.t)}</div>
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

function RecentIncidents() {
  const incidents = [
    { title: "Executive Impersonation", agent: "Maya R.", score: 94, time: "12 min ago" },
    { title: "Password Reset Scam",      agent: "Jonas K.", score: 91, time: "38 min ago" },
    { title: "Account Recovery Fraud",   agent: "Priya S.", score: 87, time: "1 h ago" },
    { title: "Vendor Payment Fraud",     agent: "Liam T.",  score: 89, time: "2 h ago" },
  ];
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-[var(--danger)]" />
          <div className="text-sm font-medium">Recent threats</div>
        </div>
        <a className="text-[11px] text-[var(--brand-cyan)] inline-flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer">
          View all <ArrowUpRight className="size-3" />
        </a>
      </div>
      <div className="space-y-2">
        {incidents.map((i) => (
          <div key={i.title} className="rounded-xl p-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{i.title}</div>
                <div className="text-[11px] text-muted-foreground">{i.agent} · {i.time}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[var(--danger)] tabular-nums">{i.score}%</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk</div>
              </div>
            </div>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-danger" style={{ width: `${i.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}