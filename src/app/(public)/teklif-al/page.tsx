import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageEnabled, metadataForPage } from "@/lib/site-settings";
import TeklifAlClient from "@/components/layout/TeklifAlClient";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_teklif_al", {
    title: "Teklif Al | İş Makinası Yedek Parça & Servis | NİDAH GROUP",
    description:
      "İş makinası yedek parça veya teknik servis için ücretsiz teklif alın. VOLVO, KOMATSU, CAT ve daha fazlası için hızlı parça talebi. Türkiye merkezli, dünya geneline.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/teklif-al",
    },
    twitter: {
      card: "summary_large_image",
      title: "Teklif Al | İş Makinası Yedek Parça & Servis | NİDAH GROUP",
      description:
        "İş makinası yedek parça veya teknik servis için ücretsiz teklif alın. VOLVO, KOMATSU, CAT ve daha fazlası için hızlı parça talebi. Türkiye merkezli, dünya geneline.",
    },
  });
}

export default async function TeklifAlPage() {
  if (!await isPageEnabled("page_teklif_al")) notFound();
  return <TeklifAlClient />;
}
