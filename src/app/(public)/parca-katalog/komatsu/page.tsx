import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "KOMATSU Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
  description:
    "KOMATSU iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/parca-katalog/komatsu",
  },
  twitter: {
    card: "summary_large_image",
    title: "KOMATSU Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
    description:
      "KOMATSU iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  },
};

export default function KomatsuPage() {
  return (
    <BrandCatalogPage
      brandSlug="komatsu"
      brandDisplayName="KOMATSU"
      brandDescription="Japon KOMATSU iş makinaları"
      brandMachineTypes={["Ekskavatör", "Buldozer", "Yükleyici", "Greyder", "Damperli Kamyon"]}
    />
  );
}
