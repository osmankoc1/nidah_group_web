"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MachineryMarquee from "./MachineryMarquee";

// ── Timing constants ──────────────────────────────────────────────────────────
const PROGRESS_MS = { site: 1800, admin: 1300 } as const;
const FADE_MS     = 380;   // must match CSS splash-out duration
const MAX_GUARD   = 4500;  // failsafe: force-close if rAF stalls

// ── Session keys ──────────────────────────────────────────────────────────────
function sessionKey(variant: "site" | "admin") {
  return variant === "site" ? "nidah_site_splash_seen" : "nidah_admin_splash_seen";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function trySessionGet(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function trySessionSet(key: string) {
  try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
}

/**
 * Removes the <style id="nidah-splash-block"> tag injected by the blocking
 * script in layout.tsx <head>. This reveals <body> content.
 *
 * Also removes the legacy html.splash-pending class for compatibility with
 * any stale cached pages still using the old mechanism.
 */
function removeSplashBlock() {
  document.getElementById("nidah-splash-block")?.remove();
  document.documentElement.classList.remove("splash-pending"); // legacy safety
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { variant: "site" | "admin"; }

export default function SplashOverlay({ variant }: Props) {
  // Initial state always false — blocking script in <head> hides body content
  // so there's no visible flash before the effect runs.
  const [show,   setShow]   = useState(false);
  const [fading, setFading] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // ── Effect 1: decide whether to show splash (runs once after hydration) ───
  useEffect(() => {
    const key = sessionKey(variant);
    const firstVisit = !trySessionGet(key);

    if (!firstVisit) {
      // Already seen — remove the blocking CSS class immediately
      removeSplashBlock();
      return;
    }

    // Mark as seen, then show splash
    trySessionSet(key);
    setShow(true);
    document.body.classList.add("splash-open");
    // nidah-splash-block style tag is removed by the layout-effect below
  }, [variant]);

  // ── Layout effect: remove blocking class once splash is painted ───────────
  // useLayoutEffect runs after DOM write but before the browser paints,
  // so the splash is already covering the page when body becomes visible.
  useLayoutEffect(() => {
    if (show) removeSplashBlock();
  }, [show]);

  // ── Effect 2: rAF progress loop (only when showing) ─────────────────────
  useEffect(() => {
    if (!show) return;

    const duration = PROGRESS_MS[variant];
    let rafId     = 0;
    let startTime = 0;
    let done      = false;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    function startFade() {
      if (done) return;
      done = true;
      cancelAnimationFrame(rafId);
      setFading(true);
      fadeTimer = setTimeout(() => {
        setShow(false);
        setFading(false);
        document.body.classList.remove("splash-open");
        removeSplashBlock(); // safety cleanup
      }, FADE_MS);
    }

    function tick(now: number) {
      if (!startTime) startTime = now;
      const pct = Math.min(((now - startTime) / duration) * 100, 100);
      // Direct DOM write — avoids a re-render every frame
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      pct >= 100 ? startFade() : (rafId = requestAnimationFrame(tick));
    }

    rafId = requestAnimationFrame(tick);
    const guard = setTimeout(startFade, MAX_GUARD);

    return () => {
      done = true;
      cancelAnimationFrame(rafId);
      clearTimeout(guard);
      if (fadeTimer) clearTimeout(fadeTimer);
      document.body.classList.remove("splash-open");
      removeSplashBlock();
    };
  }, [show, variant]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!show) return null;

  const isAdmin = variant === "admin";

  return (
    <div
      className={[
        "splash-overlay",
        isAdmin ? "splash-admin" : "splash-site",
        fading   ? "splash-fading" : "",
      ].filter(Boolean).join(" ")}
      style={{ pointerEvents: fading ? "none" : undefined }}
      role="status"
      aria-live="polite"
      aria-label="Yükleniyor"
    >
      {/* Radial vignette */}
      <div className="splash-vignette" aria-hidden="true" />

      {/* Admin: machines at TOP */}
      {isAdmin && (
        <div className="splash-machines splash-machines--top" aria-hidden="true">
          <MachineryMarquee variant="admin" />
        </div>
      )}

      {/* Center branding */}
      <div className="splash-brand">
        {isAdmin ? (
          <>
            <p className="splash-eyebrow">NİDAH GROUP</p>
            <h1 className="splash-title splash-title--admin">ADMİN PANELİ</h1>
            <p className="splash-sub">Yönetim Arayüzü</p>
          </>
        ) : (
          <>
            <p className="splash-eyebrow splash-eyebrow--site">
              İş Makinası Servisi &amp; Yedek Parça
            </p>
            <h1 className="splash-title splash-title--site">NİDAH GROUP</h1>
            <p className="splash-sub">Türkiye Genelinde 81 İlde Hizmet</p>
          </>
        )}
      </div>

      {/* Site: machines at BOTTOM */}
      {!isAdmin && (
        <div className="splash-machines splash-machines--bottom" aria-hidden="true">
          <MachineryMarquee variant="site" />
        </div>
      )}

      {/* rAF-driven progress bar — width set via barRef.style.width */}
      <div className="splash-progress-track" aria-hidden="true">
        <div ref={barRef} className="splash-progress-bar" style={{ width: "0%" }} />
      </div>
    </div>
  );
}
