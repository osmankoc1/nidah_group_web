import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "CAT Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
  description:
    "Caterpillar (CAT) iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/parca-katalog/cat",
  },
  twitter: {
    card: "summary_large_image",
    title: "CAT Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
    description:
      "Caterpillar (CAT) iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  },
};

export default function CatPage() {
  return (
    <BrandCatalogPage
      brandSlug="cat"
      brandDisplayName="CAT"
      brandDescription="Caterpillar (CAT) iş makinaları ve ağır ekipman"
      brandMachineTypes={["Ekskavatör", "Buldozer", "Greyder", "Yükleyici", "Kompaktör"]}
    />
  );
}
