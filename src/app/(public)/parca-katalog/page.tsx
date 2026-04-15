import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-settings";
import ParcaKatalogClient from "@/components/catalog/ParcaKatalogClient";

export const metadata: Metadata = {
  title: "Parça Kataloğu | İş Makinası Yedek Parça | NİDAH GROUP",
  description:
    "VOLVO, KOMATSU, CAT, HİDROMEK, HAMM, BOMAG yedek parça kataloğu. Parça numarasıyla arama, stok durumu ve anlık teklif. Türkiye merkezli, dünya geneline teslimat.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/parca-katalog",
  },
  robots: "index, follow",
  twitter: {
    card: "summary_large_image",
    title: "Parça Kataloğu | İş Makinası Yedek Parça | NİDAH GROUP",
    description:
      "VOLVO, KOMATSU, CAT, HİDROMEK, HAMM, BOMAG yedek parça kataloğu. Parça numarasıyla arama, stok durumu ve anlık teklif. Türkiye merkezli, dünya geneline teslimat.",
  },
};

export default async function ParcaKatalogPage() {
  if (!await isPageEnabled("page_parca_katalog")) notFound();
  return <ParcaKatalogClient />;
}
