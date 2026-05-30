import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/callguard/SiteLayout";
import { Contact } from "@/components/callguard/Sections";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Demo Request — CallGuard" },
      { name: "description", content: "Talk to the CallGuard security team. Request a guided demo, security pack, or pricing for your contact center." },
      { property: "og:title", content: "Contact CallGuard" },
      { property: "og:description", content: "Get a custom threat model for your contact center and answers to procurement questions." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Contact"
        title={<>Talk to our <span className="text-gradient-brand">security team.</span></>}
        subtitle="Guided walkthrough, custom threat model, and answers to your procurement questions — usually within one business day."
      />
      <Contact />
    </SiteLayout>
  );
}