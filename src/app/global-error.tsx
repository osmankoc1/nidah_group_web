"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary for the App Router root layout.
 * Catches unhandled render errors (including RSC errors) and reports to Sentry.
 * Must use a minimal HTML structure — the root layout is not available here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#1A1A2E",
          color: "#fff",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Bir hata oluştu
          </h1>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Beklenmedik bir hata meydana geldi. Lütfen sayfayı yenilemeyi deneyin.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "1rem" }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#F59E0B",
              color: "#fff",
              border: "none",
              padding: "0.625rem 1.5rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
