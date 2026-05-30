import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { Demo } from "@/components/callguard/Demo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Interactive Demo — CallGuard" },
      { name: "description", content: "Watch CallGuard catch a live social engineering attack in real time — transcript, risk score, and threat detection." },
      { property: "og:title", content: "Try the CallGuard interactive demo" },
      { property: "og:description", content: "See real-time transcription, risk scoring, and threat detection on a simulated attack call." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Interactive demo"
        title={<>See CallGuard catch an attack <span className="text-gradient-brand">in real time.</span></>}
        subtitle="A simulated impersonation call. Watch the live transcript, risk score, and threat detectors update on every utterance."
      />

      <Demo autoStartSignal={0} />

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="glass-strong rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Want to try it with your own voice?</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Open the live console to grant microphone access and analyze speech in real time.</p>
              <Link to="/app" className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition">
                Open live console <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}