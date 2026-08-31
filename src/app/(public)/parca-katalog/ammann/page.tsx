import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "AMMANN Yedek Parça | İş Makinası Parçaları",
    description:
      "AMMANN kompaksiyon ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/ammann",
    },
    twitter: {
      card: "summary_large_image",
      title: "AMMANN Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "AMMANN kompaksiyon ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default function AmmannPage() {
  return (
    <BrandCatalogPage
      brandSlug="ammann"
      brandDisplayName="AMMANN"
      brandDescription="İsviçre AMMANN kompaksiyon ekipmanları"
      brandMachineTypes={["Yol Silindiri", "Toprak Sıkıştırma", "Teker Silindiri"]}
    />
  );
}
