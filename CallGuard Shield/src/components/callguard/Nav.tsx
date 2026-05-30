import { Shield, Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const LINKS = [
  { to: "/product", label: "Product" },
  { to: "/industries", label: "Industries" },
  { to: "/security", label: "Security" },
  { to: "/pricing", label: "Pricing" },
  { to: "/demo", label: "Demo" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="glass rounded-2xl md:rounded-full px-4 md:px-5 py-2.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center shadow-glow">
              <Shield className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">CallGuard</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">Series A</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hover:text-foreground transition"
                activeProps={{ className: "text-foreground" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/app" className="hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-full bg-gradient-brand text-primary-foreground hover:opacity-90 transition">
              Get started
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden size-9 grid place-items-center rounded-full glass-strong"
              aria-label="Toggle menu"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden mt-2 glass-strong rounded-2xl p-3 animate-fade-up">
            <nav className="flex flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
                  activeProps={{ className: "text-foreground bg-white/5" }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/app"
                onClick={() => setOpen(false)}
                className="mt-2 text-center text-sm font-medium px-4 py-3 rounded-xl bg-gradient-brand text-primary-foreground"
              >
                Get started
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}