import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "BOMAG Yedek Parça | İş Makinası Parçaları",
    description:
      "BOMAG kompaksiyon ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/bomag",
    },
    twitter: {
      card: "summary_large_image",
      title: "BOMAG Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "BOMAG kompaksiyon ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default async function BomagPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[] }>;
}) {
  const { sayfa } = await searchParams;
  return (
    <BrandCatalogPage
      page={sayfa}
      brandSlug="bomag"
      brandDisplayName="BOMAG"
      brandDescription="Alman BOMAG kompaksiyon ekipmanları"
      brandMachineTypes={["Yol Silindiri", "Toprak Kompaktörü", "Trench Kompaktör", "Stabilizatör"]}
    />
  );
}
