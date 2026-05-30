import { ArrowRight, Play, ShieldAlert, Activity, AlertTriangle, Lock, Mic } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Hero({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <section id="top" className="relative pt-36 pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-muted-foreground">Real-time threat detection</span>
            <span className="text-foreground/60">·</span>
            <span className="text-foreground">SOC 2 Type II</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] leading-[1.05] tracking-tight font-semibold">
            Detect social engineering{" "}
            <span className="text-gradient-brand">before it becomes a breach.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            CallGuard's AI analyzes customer support calls in real time, identifies manipulation tactics, and alerts agents before sensitive information is exposed.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition"
            >
              Launch live demo
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass-strong font-medium hover:bg-white/5 transition"
            >
              <Play className="size-4" /> Watch demo
            </Link>
          </div>
          <div className="flex items-center gap-8 pt-6 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Trusted by security teams at</span>
            <div className="flex items-center gap-6 opacity-70">
              <span className="font-semibold tracking-tight text-sm">NORTHBANK</span>
              <span className="font-semibold tracking-tight text-sm">Helix</span>
              <span className="font-semibold tracking-tight text-sm">Vaultpay</span>
            </div>
          </div>
        </div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-brand opacity-20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative glass-strong rounded-2xl p-5 shadow-card-premium animate-float">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-[var(--danger)]" />
              <div className="size-2.5 rounded-full bg-[var(--warning)]" />
              <div className="size-2.5 rounded-full bg-[var(--success)]" />
            </div>
            <span className="ml-3 text-xs text-muted-foreground font-mono">callguard / live-monitor</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--danger)] animate-pulse" /> Live
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="col-span-2 glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Risk score</div>
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-semibold text-[var(--danger)]">92</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </div>
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-danger rounded-full" style={{ width: "92%" }} />
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex flex-col justify-between">
            <ShieldAlert className="size-5 text-[var(--danger)]" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Threat</div>
              <div className="text-sm font-semibold text-[var(--danger)]">HIGH RISK</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Voice signal</span>
            <Mic className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-[var(--brand-cyan)] to-[var(--brand-violet)]"
                style={{
                  height: `${20 + Math.abs(Math.sin(i * 0.6) * 80)}%`,
                  opacity: 0.4 + Math.abs(Math.sin(i * 0.6) * 0.6),
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Activity className="size-3" /> Detected threats
          </div>
          {[
            { icon: ShieldAlert, label: "Authority Manipulation", level: "Critical" },
            { icon: AlertTriangle, label: "Urgency Tactics", level: "High" },
            { icon: Lock, label: "Credential Harvesting", level: "Critical" },
          ].map((t) => (
            <div key={t.label} className="flex items-center justify-between glass rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <t.icon className="size-4 text-[var(--danger)]" />
                <span className="text-sm">{t.label}</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--danger)]">{t.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}