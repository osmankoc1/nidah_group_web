import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Sayfalarda kullanılan quality değerleri (hero: 85, ecu/global: 80, varsayılan: 75)
    qualities: [75, 80, 85],
    // Allow Cloudinary-delivered images
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // ── Legacy URL yönlendirmeleri ─────────────────────────────────────────────
  // Sayfa içi redirect() streaming nedeniyle gerçek HTTP redirect üretmiyordu
  // (/blog/tr → 200, /en/blog → 307). next.config redirects() filesystem
  // routing'den ÖNCE çalışır: tek hop, kalıcı 308, link equity aktarılır.
  async redirects() {
    return [
      { source: "/en/blog",        destination: "/blog/en",        permanent: true },
      { source: "/en/blog/:slug",  destination: "/blog/en/:slug",  permanent: true },
      { source: "/blog/tr",        destination: "/blog",           permanent: true },
      { source: "/blog/tr/:slug",  destination: "/blog/:slug",     permanent: true },
    ];
  },
  experimental: {
    // Raise the proxy body size limit so large product photo uploads (up to 50 MB) pass through
    // the Next.js middleware layer to the route handler.
    // (renamed from middlewareClientMaxBodySize in Next.js 15.3+)
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
  // Allow local network IPs during dev (fixes cross-origin HMR warnings on Windows/WSL)
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: [
      "localhost",
      "127.0.0.1",
      "172.16.0.0/12",
      "192.168.0.0/16",
    ],
  }),
};

// withSentryConfig is a no-op at runtime if NEXT_PUBLIC_SENTRY_DSN is absent.
// Source maps are only uploaded when SENTRY_AUTH_TOKEN is set (CI builds).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
