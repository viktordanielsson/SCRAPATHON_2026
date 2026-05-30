import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { Security, FinalCta } from "@/components/callguard/Sections";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Compliance — CallGuard" },
      { name: "description", content: "End-to-end encryption, GDPR, SOC 2 Type II, tamper-evident audit logs, and enterprise-grade access controls." },
      { property: "og:title", content: "CallGuard Security & Compliance" },
      { property: "og:description", content: "Built to the standards your security team already enforces." },
    ],
  }),
  component: SecurityPage,
});

const COMPLIANCE = [
  { name: "SOC 2 Type II", desc: "Audited annually by an independent CPA firm. Report available under NDA." },
  { name: "ISO 27001", desc: "Certified ISMS covering people, process, and technology." },
  { name: "GDPR", desc: "EU data residency, DPA, DPIA support, configurable retention." },
  { name: "HIPAA-ready", desc: "BAA available for healthcare deployments." },
  { name: "PCI DSS", desc: "Tokenized handling of cardholder data references." },
  { name: "FedRAMP path", desc: "GovCloud deployment available on request." },
];

function SecurityPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Security & Compliance"
        title={<>Enterprise security, <span className="text-gradient-brand">by default.</span></>}
        subtitle="CallGuard is built for regulated industries. Encryption, residency, audit, and access control are not add-ons — they ship with every plan."
      />

      <Security />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">Compliance</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Frameworks we map to.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMPLIANCE.map((c) => (
              <div key={c.name} className="glass rounded-2xl p-6">
                <div className="text-[10px] uppercase tracking-widest text-[var(--brand-cyan)] mb-2">Certified</div>
                <div className="font-semibold mb-1">{c.name}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta onAnalyze={() => {}} />
    </SiteLayout>
  );
}