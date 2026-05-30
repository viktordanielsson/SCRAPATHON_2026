import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { HowItWorks, FinalCta } from "@/components/callguard/Sections";
import { Activity, Bell, Brain, Gauge, Lock, Mic, Network, ShieldCheck, Workflow } from "lucide-react";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product — CallGuard" },
      { name: "description", content: "How CallGuard analyzes calls in real time: capture, transcribe, detect, score, and alert in under two seconds." },
      { property: "og:title", content: "CallGuard Product — Real-time social engineering detection" },
      { property: "og:description", content: "Five-layer pipeline that scores every utterance and alerts agents before sensitive info is exposed." },
    ],
  }),
  component: ProductPage,
});

const FEATURES = [
  { icon: Mic, title: "Universal call capture", desc: "Drop-in integrations with Genesys, Five9, Amazon Connect, Twilio, Zoom Phone, and any SIP/WebRTC stack." },
  { icon: Brain, title: "Context-aware NLU", desc: "LLM-backed detectors trained on social engineering corpora, fine-tuned per industry vertical." },
  { icon: Gauge, title: "Per-utterance risk scoring", desc: "A calibrated 0–100 score recalculated on every sentence — not just at end-of-call." },
  { icon: Bell, title: "Sub-2s agent alerts", desc: "In-browser overlay, Slack, Teams, and webhook alerts for SOC and supervisor escalation." },
  { icon: ShieldCheck, title: "Recommended actions", desc: "Playbook-driven guidance: verify identity, escalate, mute, terminate — always with audit trail." },
  { icon: Lock, title: "PII redaction at the edge", desc: "Numbers, emails, and credentials are masked before audio or text ever leaves your VPC." },
  { icon: Network, title: "SIEM + SOAR integration", desc: "Stream events to Splunk, Datadog, Sentinel, and Chronicle. Trigger Tines or Torq playbooks." },
  { icon: Activity, title: "Continuous learning", desc: "Analyst feedback loop refines detectors weekly without retraining on your raw audio." },
];

const FLOW = [
  { label: "Caller", desc: "Inbound voice channel" },
  { label: "Capture", desc: "SIP / WebRTC tap" },
  { label: "ASR", desc: "Diarization + redaction" },
  { label: "Detect", desc: "5 threat detectors" },
  { label: "Score", desc: "Calibrated risk model" },
  { label: "Alert", desc: "Agent · SOC · SIEM" },
];

function ProductPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Product"
        title={<>One pipeline. <span className="text-gradient-brand">Every call, scored live.</span></>}
        subtitle="CallGuard sits between your contact-center voice stack and your security tooling. It transcribes, detects, scores, and alerts — on every utterance, in under two seconds."
      />

      <HowItWorks />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Workflow</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">From SIP tap to SOC playbook.</h2>
          </div>
          <div className="glass-strong rounded-3xl p-6 md:p-10 overflow-x-auto">
            <div className="flex items-stretch gap-3 min-w-[760px]">
              {FLOW.map((s, i) => (
                <div key={s.label} className="flex items-stretch gap-3 flex-1">
                  <div className="glass rounded-2xl p-5 flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Stage {i + 1}</div>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="self-center text-muted-foreground"><Workflow className="size-4" /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Features</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything your security and support teams need.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 hover:bg-white/[0.04] transition">
                <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow mb-4">
                  <f.icon className="size-5 text-primary-foreground" />
                </div>
                <div className="font-semibold mb-1">{f.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta onAnalyze={() => {}} />
    </SiteLayout>
  );
}