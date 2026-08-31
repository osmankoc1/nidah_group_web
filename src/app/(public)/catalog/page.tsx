import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import CatalogClient from "./CatalogClient";

export async function generateMetadata(): Promise<Metadata> {
  if (!await isPageEnabled("page_catalog")) return DISABLED_PAGE_METADATA;
  return {
    title: "Canlı Parça Kataloğu",
    description:
      "Parça numarası veya açıklama ile canlı katalog araması. Volvo, Champion ve daha fazlası için uygunluk, süpersesyon ve diyagram bilgisi.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/catalog",
    },
  };
}

export default async function CatalogPage() {
  // Admin > Sayfalar > "Canlı Katalog (Prosis)" toggle'ı tek otoritedir.
  if (!await isPageEnabled("page_catalog")) notFound();
  return <CatalogClient />;
}
