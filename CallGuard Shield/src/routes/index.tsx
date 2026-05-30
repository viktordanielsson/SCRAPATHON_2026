import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/callguard/Hero";
import { Stats, FinalCta } from "@/components/callguard/Sections";
import { SiteLayout } from "@/components/callguard/SiteLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CallGuard — Detect social engineering before it becomes a breach" },
      { name: "description", content: "CallGuard's AI analyzes customer support calls in real time, detects manipulation tactics, and alerts agents before sensitive information is exposed." },
      { property: "og:title", content: "CallGuard — Real-time social engineering detection" },
      { property: "og:description", content: "AI-powered call analysis that stops social engineering attacks before they breach your customers." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <Hero onAnalyze={() => {}} />
      <Stats />
      <FinalCta onAnalyze={() => {}} />
    </SiteLayout>
  );
}
