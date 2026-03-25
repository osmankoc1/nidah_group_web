"use client";

import { type ComponentType, type SVGProps } from "react";

// ── SVG silhouettes (fill="currentColor" — CSS `color` prop controls hue) ────

function Excavator(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 56" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="8" y="42" width="76" height="12" rx="6" />
      <rect x="14" y="37" width="64" height="8" rx="3" />
      <rect x="14" y="17" width="44" height="22" rx="4" />
      <rect x="8" y="21" width="8" height="13" rx="2" />
      <polygon points="52,19 88,3 92,10 56,26" />
      <polygon points="88,5 100,28 94,30 82,7" />
      <polygon points="96,28 110,33 106,47 93,42" />
    </svg>
  );
}

function DumpTruck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 56" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="22" cy="46" r="8" />
      <circle cx="82" cy="46" r="8" />
      <circle cx="100" cy="46" r="8" />
      <rect x="14" y="35" width="98" height="6" rx="2" />
      <polygon points="36,9 108,9 110,36 36,36" />
      <rect x="6" y="20" width="32" height="17" rx="4" />
      <rect x="30" y="12" width="5" height="9" rx="2" />
    </svg>
  );
}

function WheelLoader(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 56" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="84" cy="44" r="10" />
      <circle cx="36" cy="44" r="10" />
      <rect x="28" y="26" width="62" height="16" rx="5" />
      <rect x="64" y="14" width="26" height="14" rx="4" />
      <rect x="11" y="21" width="54" height="5" rx="2" transform="rotate(-6 11 21)" />
      <polygon points="4,19 22,15 24,38 4,38" />
    </svg>
  );
}

function Grader(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 140 56" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="104" cy="46" r="8" />
      <circle cx="122" cy="46" r="8" />
      <circle cx="14" cy="46" r="7" />
      <rect x="12" y="33" width="112" height="7" rx="3" />
      <rect x="36" y="38" width="58" height="6" rx="1" />
      <rect x="80" y="16" width="46" height="19" rx="4" />
      <rect x="10" y="31" width="36" height="4" rx="2" transform="rotate(2 10 31)" />
    </svg>
  );
}

function Crane(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 90 100" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="16" cy="84" r="8" />
      <circle cx="36" cy="84" r="8" />
      <circle cx="60" cy="84" r="8" />
      <circle cx="78" cy="84" r="8" />
      <rect x="8" y="68" width="76" height="14" rx="4" />
      <rect x="24" y="52" width="44" height="18" rx="3" />
      <rect x="26" y="44" width="24" height="20" rx="4" />
      <polygon points="40,48 44,4 50,4 54,48" />
      <polygon points="44,6 74,22 72,27 42,11" />
      <rect x="72" y="26" width="2" height="18" rx="1" />
      <rect x="69" y="42" width="8" height="5" rx="2" />
    </svg>
  );
}

function Forklift(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 60" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="56" y="26" width="40" height="22" rx="4" />
      <rect x="28" y="28" width="32" height="18" rx="3" />
      <rect x="38" y="12" width="30" height="18" rx="2" />
      <rect x="36" y="10" width="34" height="4" rx="2" />
      <rect x="22" y="5" width="5" height="34" rx="2" />
      <rect x="33" y="5" width="5" height="34" rx="2" />
      <rect x="20" y="25" width="21" height="5" rx="1" />
      <rect x="2" y="29" width="22" height="4" rx="1" />
      <rect x="2" y="36" width="22" height="4" rx="1" />
      <circle cx="36" cy="50" r="8" />
      <circle cx="82" cy="50" r="6" />
    </svg>
  );
}

// ── Machine list ──────────────────────────────────────────────────────────────

type Machine = { Component: ComponentType<SVGProps<SVGSVGElement>>; label: string };

const MACHINES: Machine[] = [
  { Component: Excavator,   label: "Ekskavatör"      },
  { Component: DumpTruck,   label: "Damperli Kamyon" },
  { Component: WheelLoader, label: "Kepçe"           },
  { Component: Grader,      label: "Greyder"         },
  { Component: Crane,       label: "Vinç"            },
  { Component: Forklift,    label: "Forklift"        },
];

const DOUBLED = [...MACHINES, ...MACHINES];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  variant: "site" | "admin";
  /** "full" = two-layer splash marquee. "mini" = single-layer for RouteTransition. */
  size?: "full" | "mini";
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MachineryMarquee({
  variant,
  size = "full",
  className = "",
}: Props) {
  const fgColor  = variant === "site" ? "#F59E0B" : "#94A3B8";
  const bgColor  = variant === "site" ? "#F59E0B" : "#64748B";

  // Foreground = fast; Background = slow
  const fgDur    = variant === "site" ? "13s"  : "11s";
  const bgDur    = variant === "site" ? "28s"  : "22s";
  const miniDur  = variant === "site" ? "8s"   : "6s";

  // Icon heights via className
  const fgCls    = size === "mini"
    ? "h-8 w-auto"
    : variant === "site" ? "h-14 w-auto" : "h-12 w-auto";
  const bgCls    = variant === "site" ? "h-9 w-auto" : "h-8 w-auto";

  // ── Mini (RouteTransition) ─────────────────────────────
  if (size === "mini") {
    return (
      <div className={`marquee-wrapper ${className}`} aria-hidden="true">
        <div className="marquee-inner" style={{ animationDuration: miniDur }}>
          {DOUBLED.map(({ Component, label }, i) => (
            <div key={i} className="marquee-item" title={label}>
              <Component className={fgCls} style={{ color: fgColor }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Full (two-layer splash) ────────────────────────────
  return (
    <div
      className={`marquee-layers ${className}`}
      aria-hidden="true"
      data-variant={variant}
    >
      {/* Background layer: slow, blurred, low opacity */}
      <div className="marquee-layer marquee-layer--bg">
        <div className="marquee-inner" style={{ animationDuration: bgDur }}>
          {DOUBLED.map(({ Component, label }, i) => (
            <div key={i} className="marquee-item" title={label}>
              <Component className={bgCls} style={{ color: bgColor }} />
            </div>
          ))}
        </div>
      </div>

      {/* Foreground layer: fast, sharp, glow */}
      <div className="marquee-layer marquee-layer--fg">
        <div className="marquee-inner" style={{ animationDuration: fgDur }}>
          {DOUBLED.map(({ Component, label }, i) => (
            <div key={i} className="marquee-item" title={label}>
              <Component className={fgCls} style={{ color: fgColor }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
