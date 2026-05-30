import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { Industries, FinalCta } from "@/components/callguard/Sections";
import { Banknote, Cpu, Landmark, Headphones } from "lucide-react";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — CallGuard" },
      { name: "description", content: "How CallGuard protects banks, fintechs, SaaS, and enterprise support teams from voice-channel social engineering." },
      { property: "og:title", content: "CallGuard for Banks, Fintech & SaaS" },
      { property: "og:description", content: "Industry-specific detectors for the attack patterns hitting your contact center right now." },
    ],
  }),
  component: IndustriesPage,
});

const RISKS = [
  { icon: Landmark, vertical: "Banking", items: ["Wire fraud via authority impersonation", "MFA reset social engineering", "Card replacement fraud", "Branch callback scams"] },
  { icon: Banknote, vertical: "Fintech", items: ["Account takeover via support reset", "Crypto withdrawal coercion", "KYC bypass attempts", "Refund and chargeback abuse"] },
  { icon: Cpu, vertical: "SaaS", items: ["Tenant admin impersonation", "Seat and license manipulation", "Webhook secret extraction", "OAuth scope escalation"] },
  { icon: Headphones, vertical: "Customer Support", items: ["VIP customer impersonation", "Agent coercion and emotional tactics", "Repeat-caller pattern attacks", "Insider-assist scams"] },
];

function IndustriesPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Industries"
        title={<>Tuned for the teams <span className="text-gradient-brand">attackers target first.</span></>}
        subtitle="Pre-trained detectors for the specific manipulation patterns each industry sees — out of the box, customizable per team."
      />

      <Industries />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Industry risks</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">The attack patterns we catch.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {RISKS.map((r) => (
              <div key={r.vertical} className="glass-strong rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
                    <r.icon className="size-5 text-primary-foreground" />
                  </div>
                  <div className="font-semibold">{r.vertical}</div>
                </div>
                <ul className="space-y-2">
                  {r.items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 rounded-full bg-[var(--danger)] shrink-0" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta onAnalyze={() => {}} />
    </SiteLayout>
  );
}