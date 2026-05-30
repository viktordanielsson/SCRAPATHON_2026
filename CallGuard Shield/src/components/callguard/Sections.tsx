import { useState } from "react";
import { Mic, FileAudio, Brain, Gauge, BellRing, Building2, Cpu, ArrowRight, Check, ChevronDown, Lock, ShieldCheck, FileText, Users, ServerCog, Mail, MessageSquare, Building } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function HowItWorks() {
  const steps = [
    { icon: Mic, title: "Call recording", desc: "Capture audio from any softphone, contact center, or VoIP stack." },
    { icon: FileAudio, title: "AI transcription", desc: "Whisper-grade ASR with speaker diarization and PII redaction." },
    { icon: Brain, title: "Threat analysis", desc: "Detect authority, urgency, pretexting, and credential-harvesting patterns." },
    { icon: Gauge, title: "Risk scoring", desc: "A calibrated 0–100 score updates per utterance, not per call." },
    { icon: BellRing, title: "Real-time alert", desc: "Agents and supervisors are notified in under two seconds." },
  ];
  return (
    <section id="product" className="py-28 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Product · How it works</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Five layers, one verdict — in under two seconds.</h2>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-12 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className="glass rounded-2xl p-5 relative hover:bg-white/5 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
                    <s.icon className="size-5 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Step {i + 1}</span>
                </div>
                <div className="font-semibold mb-1">{s.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stats() {
  const stats = [
    { v: "$1M+", l: "Average cost of a social engineering breach" },
    { v: "85%+", l: "Detection accuracy across pilots" },
    { v: "<2 sec", l: "Median alert response time" },
    { v: "10×", l: "Average first-year ROI" },
  ];
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Why CallGuard</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Your support line is now a security perimeter.</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.l} className="glass rounded-2xl p-6">
              <div className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient-brand">{s.v}</div>
              <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Industries() {
  const verticals = [
    {
      icon: Building2,
      tag: "Banking & financial services",
      title: "Stop call-center fraud at the source.",
      items: [
        { name: "Password reset fraud", detail: "Attackers impersonate customers to hijack reset flows and gain account access." },
        { name: "Account access scams", detail: "Pretexting agents into bypassing MFA, security questions, or device verification." },
        { name: "Fund transfer manipulation", detail: "Urgency and authority tactics used to authorize fraudulent wires and ACH transfers." },
      ],
      stat: "62% of bank fraud losses originate in voice channels.",
    },
    {
      icon: Cpu,
      tag: "Technology & SaaS",
      title: "Protect every support touchpoint.",
      items: [
        { name: "Account takeovers", detail: "Social engineering of support to reset credentials on high-value tenants." },
        { name: "2FA bypass attacks", detail: "Convincing agents to disable, re-enroll, or relay one-time codes for attackers." },
        { name: "Support fraud", detail: "Refund abuse, plan downgrades, and seat manipulation via impersonation." },
      ],
      stat: "Support is the #1 initial-access vector in SaaS breaches.",
    },
  ];
  return (
    <section id="industries" className="py-28 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Industries</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Built for the teams attackers target first.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {verticals.map((v) => (
            <IndustryCard key={v.tag} v={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

function IndustryCard({ v }: { v: { icon: any; tag: string; title: string; stat: string; items: { name: string; detail: string }[] } }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="glass-strong rounded-3xl p-7 transition hover:bg-white/[0.03]">
      <div className="flex items-center justify-between mb-6">
        <div className="size-12 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow">
          <v.icon className="size-6 text-primary-foreground" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{v.tag}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight mb-2">{v.title}</div>
      <div className="text-sm text-muted-foreground mb-5">{v.stat}</div>
      <ul className="space-y-2">
        {v.items.map((i) => {
          const isOpen = open === i.name;
          return (
            <li key={i.name} className="rounded-xl border border-white/5 overflow-hidden bg-white/[0.02]">
              <button
                onClick={() => setOpen(isOpen ? null : i.name)}
                className="w-full flex items-center gap-3 text-sm px-3 py-3 hover:bg-white/[0.03] transition"
              >
                <span className="size-5 rounded-full bg-[var(--danger)]/15 text-[var(--danger)] grid place-items-center shrink-0">
                  <Check className="size-3" />
                </span>
                <span className="flex-1 text-left">{i.name}</span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pl-11 text-sm text-muted-foreground animate-fade-up leading-relaxed">
                  {i.detail}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Security() {
  const items = [
    { icon: Lock, title: "End-to-end encryption", desc: "AES-256 at rest and TLS 1.3 in transit. Customer-managed keys via AWS KMS or HashiCorp Vault." },
    { icon: ShieldCheck, title: "GDPR compliance", desc: "DPA, DPIA support, data residency in EU/US, and configurable retention windows down to 24 hours." },
    { icon: FileText, title: "Audit logging", desc: "Tamper-evident logs for every access, alert, and override — streamed to your SIEM in real time." },
    { icon: Users, title: "Role-based access control", desc: "SSO via Okta, Azure AD, and Google. SCIM provisioning. Granular roles for SOC, support, and execs." },
    { icon: ServerCog, title: "Secure data processing", desc: "On-prem and VPC deployment. PII redaction before storage. Zero training on customer audio." },
  ];
  return (
    <section id="security" className="py-28 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Enterprise security</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Built to the standards your security team already enforces.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["SOC 2 Type II", "ISO 27001", "GDPR", "HIPAA-ready", "PCI DSS"].map((b) => (
              <span key={b} className="text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full glass text-muted-foreground">
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.title} className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition group">
              <div className="size-11 rounded-xl bg-gradient-brand grid place-items-center shadow-glow mb-4 group-hover:scale-105 transition">
                <it.icon className="size-5 text-primary-foreground" />
              </div>
              <div className="font-semibold mb-1.5">{it.title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{it.desc}</div>
            </div>
          ))}
          <div className="glass-strong rounded-2xl p-6 md:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Need a security review?</div>
              <div className="text-sm text-muted-foreground">Request our SOC 2 report, pen-test summary, and architecture whitepaper.</div>
            </div>
            <Link to="/contact" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium hover:scale-[1.02] transition">
              Request security pack <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="py-28 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Contact</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">Talk to our security team.</h2>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Get a guided walkthrough, a custom threat model for your contact center, and answers to your procurement questions.
            </p>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="size-9 rounded-xl glass grid place-items-center"><Mail className="size-4 text-[var(--brand-cyan)]" /></span>
                <span>sales@callguard.app</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="size-9 rounded-xl glass grid place-items-center"><MessageSquare className="size-4 text-[var(--brand-cyan)]" /></span>
                <span>Response within one business day</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="size-9 rounded-xl glass grid place-items-center"><Building className="size-4 text-[var(--brand-cyan)]" /></span>
                <span>Stockholm · London · New York</span>
              </div>
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); alert("Thanks — our team will reach out shortly."); }}
            className="glass-strong rounded-3xl p-7 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" placeholder="Alex Lindqvist" />
              <Field label="Work email" placeholder="alex@company.com" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company" placeholder="Nordea" />
              <Field label="Call volume / month" placeholder="50,000" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">What are you protecting?</label>
              <textarea rows={4} placeholder="Tell us about your contact center and security priorities..." className="mt-2 w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-cyan)]/60 transition" />
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.01] transition">
              Request a demo <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input {...rest} className="mt-2 w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-cyan)]/60 transition" />
    </div>
  );
}

export function Pricing() {
  const plans = [
    { name: "Free", price: "$0", per: "forever", desc: "For teams evaluating CallGuard.", features: ["10 calls / month", "Real-time risk score", "Email alerts", "Community support"], cta: "Start free" },
    { name: "Pro", price: "$299", per: "/ month", desc: "For growing support and security teams.", features: ["500 calls / month", "Live agent overlay", "Slack & SIEM webhooks", "Threat playbooks", "Priority support"], cta: "Start Pro trial" },
    { name: "Enterprise", price: "$1,299", per: "/ month", desc: "For regulated, high-volume contact centers.", features: ["Unlimited calls", "On-prem & VPC deployment", "Custom detectors", "SSO, SCIM & audit logs", "Dedicated SOC liaison"], cta: "Talk to sales", featured: true },
  ];
  return (
    <section id="pricing" className="py-28 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Start free. Scale with your call volume.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-7 ${p.featured ? "glass-strong ring-1 ring-[var(--brand-cyan)]/40 shadow-glow" : "glass"}`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-brand text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="text-sm text-muted-foreground">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <div className="text-4xl font-semibold tracking-tight">{p.price}</div>
                <div className="text-sm text-muted-foreground">{p.per}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">{p.desc}</div>
              <button className={`mt-6 w-full px-4 py-2.5 rounded-full font-medium transition ${p.featured ? "bg-gradient-brand text-primary-foreground hover:scale-[1.02]" : "glass-strong hover:bg-white/5"}`}>
                {p.cta}
              </button>
              <div className="mt-6 h-px bg-white/5" />
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="size-5 rounded-full bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)] grid place-items-center">
                      <Check className="size-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <section className="py-28 relative">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative glass-strong rounded-3xl p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
          <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />
          <div className="relative">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Your support team is your <span className="text-gradient-brand">weakest security link.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
              CallGuard protects every conversation — across banks, fintechs, SaaS, and enterprise support.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition">
                Launch live demo <ArrowRight className="size-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full glass-strong font-medium hover:bg-white/5 transition">
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} CallGuard, Inc. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <a className="hover:text-foreground transition">Security</a>
          <a className="hover:text-foreground transition">Privacy</a>
          <a className="hover:text-foreground transition">SOC 2</a>
          <a className="hover:text-foreground transition">Status</a>
        </div>
      </div>
    </footer>
  );
}