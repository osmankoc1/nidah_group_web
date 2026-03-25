"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Re-mounts its children (via `key` change) on every route change,
 * triggering the CSS `.page-transition` fade-in animation.
 * Placed around `{children}` in public + admin layouts.
 */
export default function PageTransitionWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // When pathname changes React destroys this div and creates a fresh one,
  // which re-triggers the CSS animation on the new element.
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
