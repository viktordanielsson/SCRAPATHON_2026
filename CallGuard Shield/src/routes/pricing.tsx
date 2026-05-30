import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { Pricing, FinalCta } from "@/components/callguard/Sections";
import { Check, Minus } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CallGuard" },
      { name: "description", content: "Free, Pro, and Enterprise plans. Start free, scale with your call volume." },
      { property: "og:title", content: "CallGuard Pricing" },
      { property: "og:description", content: "Transparent pricing for contact centers of every size." },
    ],
  }),
  component: PricingPage,
});

const ROWS: { feature: string; free: boolean | string; pro: boolean | string; ent: boolean | string }[] = [
  { feature: "Monthly call volume", free: "10", pro: "500", ent: "Unlimited" },
  { feature: "Real-time risk score", free: true, pro: true, ent: true },
  { feature: "Email alerts", free: true, pro: true, ent: true },
  { feature: "Live agent overlay", free: false, pro: true, ent: true },
  { feature: "Slack & SIEM webhooks", free: false, pro: true, ent: true },
  { feature: "Custom detectors", free: false, pro: false, ent: true },
  { feature: "On-prem / VPC deployment", free: false, pro: false, ent: true },
  { feature: "SSO, SCIM, audit logs", free: false, pro: false, ent: true },
  { feature: "Dedicated SOC liaison", free: false, pro: false, ent: true },
  { feature: "SLA", free: "Community", pro: "Business hours", ent: "24/7 · 99.95%" },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-[var(--brand-cyan)]" />;
  if (v === false) return <Minus className="size-4 text-muted-foreground/50" />;
  return <span className="text-sm">{v}</span>;
}

function PricingPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Pricing"
        title={<>Start free. <span className="text-gradient-brand">Scale with your call volume.</span></>}
        subtitle="Simple per-call economics, with an Enterprise tier for regulated, high-volume contact centers."
      />

      <Pricing />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Compare plans</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Every feature, side by side.</h2>
          </div>
          <div className="glass-strong rounded-3xl overflow-hidden">
            <div className="grid grid-cols-4 text-sm">
              <div className="px-5 py-4 border-b border-white/5 text-muted-foreground uppercase tracking-widest text-[10px]">Feature</div>
              <div className="px-5 py-4 border-b border-white/5 text-muted-foreground uppercase tracking-widest text-[10px]">Free</div>
              <div className="px-5 py-4 border-b border-white/5 text-muted-foreground uppercase tracking-widest text-[10px]">Pro</div>
              <div className="px-5 py-4 border-b border-white/5 text-muted-foreground uppercase tracking-widest text-[10px] bg-[var(--brand-cyan)]/5">Enterprise</div>
              {ROWS.flatMap((r, i) => [
                <div key={`f-${i}`} className="px-5 py-4 border-b border-white/5">{r.feature}</div>,
                <div key={`free-${i}`} className="px-5 py-4 border-b border-white/5"><Cell v={r.free} /></div>,
                <div key={`pro-${i}`} className="px-5 py-4 border-b border-white/5"><Cell v={r.pro} /></div>,
                <div key={`ent-${i}`} className="px-5 py-4 border-b border-white/5 bg-[var(--brand-cyan)]/5"><Cell v={r.ent} /></div>,
              ])}
            </div>
          </div>
        </div>
      </section>

      <FinalCta onAnalyze={() => {}} />
    </SiteLayout>
  );
}