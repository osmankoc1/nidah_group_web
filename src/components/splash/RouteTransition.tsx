"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import MachineryMarquee from "./MachineryMarquee";

type Phase = "hidden" | "visible" | "fading";

export default function RouteTransition() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [phase, setPhase] = useState<Phase>("hidden");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Skip on initial mount — prevPath starts equal to pathname
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    // Cancel any in-flight timers from rapid navigation
    timers.current.forEach(clearTimeout);

    setPhase("visible");

    // visible for 320ms, then fade-out (CSS 180ms), then unmount
    const t1 = setTimeout(() => setPhase("fading"), 320);
    const t2 = setTimeout(() => setPhase("hidden"), 500);

    timers.current = [t1, t2];

    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  if (phase === "hidden") return null;

  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const variant = isAdmin ? "admin" : "site";

  return (
    <div
      className={[
        "route-transition",
        isAdmin ? "rt-admin" : "rt-site",
        phase === "fading" ? "rt-fading" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ pointerEvents: phase === "fading" ? "none" : undefined }}
      aria-hidden="true"
    >
      {/* Layer 1: thin animated progress line at very top */}
      <div className="rt-progress-line" />

      {/* Layer 2: mini machinery marquee band */}
      <div className="rt-marquee-band">
        <MachineryMarquee variant={variant} size="mini" />
      </div>
    </div>
  );
}
