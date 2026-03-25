import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nidahgroup.com.tr"),
  title: "NİDAH GROUP | İş Makinası Servisi & Yedek Parça",
  description:
    "NİDAH GROUP — İş makinası yedek parça tedariği, hidrolik şanzıman ve pompa revizyonu, ECU onarımı. Türkiye merkezli, 3 kıtada 13+ ülkeye DHL ile ihracat. Volvo, Komatsu, CAT, Hidromek, BOMAG, HAMM ve daha fazlası.",
  keywords: [
    "iş makinası yedek parça",
    "hidrolik pompa revizyonu",
    "hidrolik şanzıman revizyonu",
    "ECU onarımı iş makinası",
    "Volvo yedek parça",
    "Komatsu yedek parça",
    "CAT yedek parça",
    "Hidromek yedek parça",
    "BOMAG yedek parça",
    "HAMM yedek parça",
    "iş makinası servisi Ankara",
    "yedek parça ihracat",
    "NİDAH GROUP",
    "global parts heavy equipment",
  ],
  openGraph: {
    locale: "tr_TR",
    siteName: "NİDAH GROUP",
    type: "website",
    url: "https://www.nidahgroup.com.tr",
    title: "NİDAH GROUP | İş Makinası Servisi & Yedek Parça",
    description:
      "İş makinası yedek parça tedariği, teknik revizyon ve ECU onarımı. Türkiye merkezli, 3 kıtada 13+ ülkeye ihracat.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NİDAH GROUP | İş Makinası Servisi & Yedek Parça",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NİDAH GROUP | İş Makinası Yedek Parça & Teknik Servis",
    description:
      "İş makinası yedek parça tedariği, teknik revizyon ve ECU onarımı. Türkiye merkezli, 3 kıtada 13+ ülkeye ihracat.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NİDAH GROUP",
  url: "https://www.nidahgroup.com.tr",
  description:
    "İş makinası yedek parça tedariği, hidrolik revizyon ve ECU onarımı. Türkiye merkezli, 3 kıtada 13+ ülkeye ihracat.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ankara",
    addressCountry: "TR",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+90-530-884-59-79",
      contactType: "sales",
    },
    {
      "@type": "ContactPoint",
      telephone: "+90-555-182-86-29",
      contactType: "customer service",
    },
  ],
};

// ── Blocking splash script ────────────────────────────────────────────────────
// Runs synchronously during HTML parsing — before React hydration.
// On first visit, injects a <style> tag that hides <body> (FOUC prevention).
// SplashOverlay removes that style tag via document.getElementById once the
// overlay is painted.
//
// IMPORTANT: never mutate <html> or <body> attributes here — doing so creates
// a server/client mismatch and triggers a React hydration error.
const splashBlockScript = `(function(){try{var p=location.pathname;if(p==='/admin/login')return;var k=p.startsWith('/admin')?'nidah_admin_splash_seen':'nidah_site_splash_seen';if(!sessionStorage.getItem(k)){var s=document.createElement('style');s.id='nidah-splash-block';s.textContent='body{visibility:hidden!important}';document.head.appendChild(s);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Blocking splash script: runs before body paints */}
        <script dangerouslySetInnerHTML={{ __html: splashBlockScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
        {/* Google Analytics 4 — only loads when GA_ID env var is set */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{page_path:window.location.pathname});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
