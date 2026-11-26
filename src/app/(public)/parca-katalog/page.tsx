import type { Metadata } from "next";
import { requirePageEnabled, metadataForPage } from "@/lib/site-settings";
import ParcaKatalogClient from "@/components/catalog/ParcaKatalogClient";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "Parça Kataloğu | İş Makinası Yedek Parça",
    description:
      "VOLVO, KOMATSU, CAT, HİDROMEK, HAMM, BOMAG yedek parça kataloğu. Parça numarasıyla arama, stok durumu ve anlık teklif. Türkiye merkezli, dünya geneline teslimat.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog",
    },
    twitter: {
      card: "summary_large_image",
      title: "Parça Kataloğu | İş Makinası Yedek Parça | NİDAH GROUP",
      description:
        "VOLVO, KOMATSU, CAT, HİDROMEK, HAMM, BOMAG yedek parça kataloğu. Parça numarasıyla arama, stok durumu ve anlık teklif. Türkiye merkezli, dünya geneline teslimat.",
    },
  });
}

export default async function ParcaKatalogPage() {
  await requirePageEnabled("page_parca_katalog");
  return <ParcaKatalogClient />;
}
