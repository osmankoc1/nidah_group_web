import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageEnabled, metadataForPage } from "@/lib/site-settings";
import IletisimClient from "@/components/layout/IletisimClient";
import { JsonLd } from "@/lib/json-ld";
import { ORGANIZATION_REF } from "@/lib/constants";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_iletisim", {
    title: { absolute: "İletişim | NİDAH GROUP — Global Yedek Parça & Teknik Servis" },
    description:
      "NİDAH GROUP ile iletişime geçin. Yedek parça, teknik servis veya ihracat talepleriniz için Ankara merkezli ekibimiz hazır. WhatsApp, telefon veya e-posta.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/iletisim",
    },
    twitter: {
      card: "summary_large_image",
      title: "İletişim | NİDAH GROUP — Global Yedek Parça & Teknik Servis",
      description:
        "NİDAH GROUP ile iletişime geçin. Yedek parça, teknik servis veya ihracat talepleriniz için Ankara merkezli ekibimiz hazır. WhatsApp, telefon veya e-posta.",
    },
  });
}

// ── ContactPage ──────────────────────────────────────────────────────────────
// Telefon / e-posta / adres BURADA TEKRAR EDİLMEZ. Bu veriler root layout'taki
// Organization + LocalBusiness düğümlerinde zaten var; mainEntity @id ile
// oraya bağlanır. Tek kaynak = tek doğruluk, drift riski yok.
const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://www.nidahgroup.com.tr/iletisim#webpage",
  url: "https://www.nidahgroup.com.tr/iletisim",
  name: "İletişim | NİDAH GROUP",
  description:
    "NİDAH GROUP ile iletişime geçin. Yedek parça, teknik servis veya ihracat talepleriniz için Ankara merkezli ekibimiz hazır.",
  inLanguage: "tr-TR",
  about: ORGANIZATION_REF,
  mainEntity: ORGANIZATION_REF,
};

export default async function IletisimPage() {
  if (!await isPageEnabled("page_iletisim")) notFound();
  return (
    <>
      <JsonLd data={contactPageJsonLd} />
      <IletisimClient />
    </>
  );
}
