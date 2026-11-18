import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "HITACHI Yedek Parça | İş Makinası Parçaları",
    description:
      "HITACHI iş makinaları için OEM ve muadil yedek parça. Hidrolik bileşenler, fren grubu parçaları, şanzıman ve motor parçaları. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/hitachi",
    },
    twitter: {
      card: "summary_large_image",
      title: "HITACHI Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "HITACHI iş makinaları için OEM ve muadil yedek parça. Hidrolik bileşenler, fren grubu parçaları, şanzıman ve motor parçaları. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default async function HitachiPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[] }>;
}) {
  const { sayfa } = await searchParams;
  return (
    <BrandCatalogPage
      page={sayfa}
      brandSlug="hitachi"
      brandDisplayName="HITACHI"
      // Doğrulanmış kaynak: ZW220 ve ZW310 yedek parça katalogları.
      // "Lastikli yükleyici" ifadesi kaynak belgenin kendi başlığına dayanır
      // ("ZW220 LOADER"); uydurulmamıştır.
      brandDescription="HITACHI ZW serisi lastikli yükleyici iş makinaları"
      brandMachineTypes={["Lastikli Yükleyici", "ZW220", "ZW310"]}
    />
  );
}
