/**
 * Bespoke iconography + gradient primitives for the CallGuard console.
 *
 * Two things live here:
 *  1. CgGradientDefs — a single hidden <svg><defs> holding the brand/danger/iris
 *     linearGradients. Rendered ONCE near the app root; any icon (lucide or
 *     bespoke) can then stroke itself with `url(#cg-brand)` via the .icon-grad
 *     utilities. objectBoundingBox units mean the gradient remaps to each icon's
 *     own box, so one defs block serves every size.
 *  2. The six social-engineering tactic icons — hand-drawn SVGs unique to the
 *     product (a stock lucide glyph never says "pretexting"). They stroke with
 *     currentColor so the existing active/neutral color logic keeps working;
 *     add `.icon-grad-danger` to light one with the danger gradient when flagged.
 *
 * AuroraField is the soft brand-light bleed that sits behind the console panels
 * — the "aurora editorial" backdrop.
 */
import type { ReactElement, ReactNode } from "react";

export type CgIcon = (props: { className?: string }) => ReactElement;

/** Shared <svg> chrome so every bespoke icon matches lucide's weight + caps. */
function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The six tactics — distinct silhouettes, recognizable at 14px.
 * ------------------------------------------------------------------ */

/** Urgency — a stopwatch with a lightning bolt for hands (time pressure). */
export const IconUrgency: CgIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M10 2.6h4" />
    <path d="M12 2.6V5" />
    <path d="M18.6 6.1l1.3-1.3" />
    <circle cx="12" cy="13.2" r="7.4" />
    <path d="M12.7 9.4 10 13.6h2.1l-.8 3.1L15 12.4h-2.1z" />
  </Svg>
);

/** False authority — a forged authority medal (rosette + ribbon + check). */
export const IconFalseAuthority: CgIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M9.2 13.7 7.6 21l4.4-2.4L16.4 21l-1.6-7.3" />
    <circle cx="12" cy="8.6" r="5.6" />
    <path d="M9.7 8.7l1.6 1.6 3.1-3.3" />
  </Svg>
);

/** Pretexting — a domino mask: a fabricated face/backstory worn over the truth. */
export const IconPretexting: CgIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M3.6 9C3.6 7.4 5.6 7 7.9 8c2.1.9 6.1.9 8.2 0 2.3-1 4.3-.6 4.3 1 0 4.6-3.6 6.3-6.8 5-1.2-.5-2.4-.5-3.6 0-3.2 1.3-6.8-.4-6.8-5z" />
    <path d="M8.5 10h.01" />
    <path d="M15.5 10h.01" />
  </Svg>
);

/** Fear — a ringing alarm bell with motion lines (threat / intimidation). */
export const IconFear: CgIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M7.6 16c-.4-4 .8-7 4.4-7s4.8 3 4.4 7z" />
    <path d="M6.4 16h11.2" />
    <path d="M12 9V7.4" />
    <path d="M10.6 18.4a1.5 1.3 0 0 0 2.8 0" />
    <path d="M4.6 10.8c-.7 1-.7 2.3 0 3.3" />
    <path d="M19.4 10.8c.7 1 .7 2.3 0 3.3" />
  </Svg>
);

/** Reciprocity — a gift: an unsolicited favor that expects access in return. */
export const IconReciprocity: CgIcon = ({ className }) => (
  <Svg className={className}>
    <rect x="4.3" y="11" width="15.4" height="8.6" rx="1.2" />
    <path d="M3.5 8.2h17v2.8h-17z" />
    <path d="M12 8.2v11.4" />
    <path d="M12 8.2C12 6.4 10.4 5 9.2 6c-1 .8-.2 2.2 2.8 2.2 3 0 3.8-1.4 2.8-2.2C13.6 5 12 6.4 12 8.2z" />
  </Svg>
);

/** Rapport building — a friendly speech bubble cradling a heart. */
export const IconRapportBuilding: CgIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M5 5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8.5l-3.8 3.1V15H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M12 13c-1.5-1.3-3-2.1-3-3.5 0-1 .8-1.6 1.7-1.5.7.1 1.1.6 1.3 1.1.2-.5.6-1 1.3-1.1.9-.1 1.7.5 1.7 1.5 0 1.4-1.5 2.2-3 3.5z" />
  </Svg>
);

/* ------------------------------------------------------------------ *
 * Shared gradient defs + aurora backdrop.
 * ------------------------------------------------------------------ */

/**
 * One hidden defs block; render once at the app root. Icons reference these by
 * id via `stroke: url(#cg-brand)` (the .icon-grad-* utilities in styles.css).
 */
export function CgGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cg-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.80 0.16 200)" />
          {/* violet end lightened so thin 1.75px strokes clear ~4.5:1 on dark */}
          <stop offset="100%" stopColor="oklch(0.74 0.18 290)" />
        </linearGradient>
        <linearGradient id="cg-danger" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.74 0.20 40)" />
          <stop offset="100%" stopColor="oklch(0.60 0.25 14)" />
        </linearGradient>
        {/* Cyan → violet → ember; used for the risk gauge sweep. */}
        <linearGradient id="cg-iris" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.80 0.16 200)" />
          <stop offset="52%" stopColor="oklch(0.74 0.18 290)" />
          <stop offset="100%" stopColor="oklch(0.66 0.24 18)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Aurora editorial backdrop — three slow-drifting blurred brand-light blobs.
 * Absolutely positioned; drop it inside a `relative` container and keep the real
 * content above it with `relative z-10`.
 */
export function AuroraField({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -left-28 -top-32 size-[460px] rounded-full opacity-30 blur-[110px] animate-float"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.16 200 / 0.22), transparent 64%)" }}
      />
      <div
        className="absolute -right-24 -top-24 size-[420px] rounded-full opacity-30 blur-[120px] animate-float [animation-delay:-2.5s]"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.22 290 / 0.22), transparent 64%)" }}
      />
      <div
        className="absolute left-1/3 bottom-[-13rem] size-[520px] rounded-full opacity-30 blur-[130px] animate-float [animation-delay:-4.5s]"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.20 255 / 0.18), transparent 64%)" }}
      />
    </div>
  );
}
