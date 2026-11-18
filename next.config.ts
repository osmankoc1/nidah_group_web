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
  // ── Temsilî ürün görseli: indekslenmesi ENGELLENİR ────────────────────────
  //
  // `/placeholder/*` altındaki dosya GERÇEK BİR ÜRÜN FOTOĞRAFI DEĞİLDİR;
  // fotoğrafı henüz çekilmemiş ürünlerde gösterilen KURUMSAL karttır. Tek bir
  // jenerik görselin 154 ürün sayfasının önizlemesi olarak indekslenmesi,
  // Google Images belgesinin "avoid generic images like logos" uyarısının
  // tam karşılığıdır.
  //
  // ── NEDEN robots.txt DEĞİL ────────────────────────────────────────────────
  // `Disallow` TARAMAYI engeller; Google o zaman `noindex` başlığını HİÇ
  // GÖREMEZ ve URL yine de sonuçlarda çıkabilir. Doğru mekanizma, dosyanın
  // taranmasına izin verip yanıt başlığında `noindex` göndermektir — HTML
  // olmayan kaynaklar için Google'ın belgelediği yöntem budur.
  //
  // ── NEDEN `unoptimized` ───────────────────────────────────────────────────
  // Bileşen `next/image`'ı `unoptimized` ile çağırır; böylece tarayıcıya
  // giden adres TAM OLARAK aşağıdaki kuralın eşleştiği yoldur. Optimize
  // edilseydi adres `/_next/image?url=…` olurdu ve bu başlığı TAŞIMAZDI;
  // o yola başlık eklemek ise ileride yüklenecek GERÇEK ürün fotoğraflarını
  // da noindex yapardı.
  async headers() {
    return [
      {
        source: "/placeholder/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, noimageindex" },
          // İçerik dosya adıyla sabit; uzun süreli önbellek güvenli.
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
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
