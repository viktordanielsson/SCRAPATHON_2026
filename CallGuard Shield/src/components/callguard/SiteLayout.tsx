import { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Sections";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      {children}
      <Footer />
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="relative pt-36 pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-cyan)] mb-3">{eyebrow}</div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
    </section>
  );
}