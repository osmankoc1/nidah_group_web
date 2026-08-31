import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "VOLVO Yedek Parça | İş Makinası Parçaları",
    description:
      "VOLVO iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/volvo",
    },
    twitter: {
      card: "summary_large_image",
      title: "VOLVO Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "VOLVO iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default function VolvoPage() {
  return (
    <BrandCatalogPage
      brandSlug="volvo"
      brandDisplayName="VOLVO"
      brandDescription="İsveç menşeli VOLVO Construction Equipment iş makinaları"
      brandMachineTypes={["Ekskavatör", "Kaya Kamyonu", "Eklemli Kamyon", "Lastikli Yükleyici", "Kompakt Ekipman"]}
    />
  );
}
