import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "HAMM Yedek Parça | İş Makinası Parçaları",
    description:
      "HAMM sıkıştırma ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/hamm",
    },
    twitter: {
      card: "summary_large_image",
      title: "HAMM Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "HAMM sıkıştırma ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default function HammPage() {
  return (
    <BrandCatalogPage
      brandSlug="hamm"
      brandDisplayName="HAMM"
      brandDescription="Alman HAMM sıkıştırma ekipmanları"
      brandMachineTypes={["Tamburlu Silindir", "Lastikli Silindir", "Titreşimli Kompaktör"]}
    />
  );
}
