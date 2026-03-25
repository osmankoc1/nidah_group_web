import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "BOMAG Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
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
};

export default function BomagPage() {
  return (
    <BrandCatalogPage
      brandSlug="bomag"
      brandDisplayName="BOMAG"
      brandDescription="Alman BOMAG kompaksiyon ekipmanları"
      brandMachineTypes={["Yol Silindiri", "Toprak Kompaktörü", "Trench Kompaktör", "Stabilizatör"]}
    />
  );
}
