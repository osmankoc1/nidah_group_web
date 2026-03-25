import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "CHAMPION Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
  description:
    "CHAMPION motorlu greyder ve yol yapım ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/parca-katalog/champion",
  },
  twitter: {
    card: "summary_large_image",
    title: "CHAMPION Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
    description:
      "CHAMPION motorlu greyder ve yol yapım ekipmanları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  },
};

export default function ChampionPage() {
  return (
    <BrandCatalogPage
      brandSlug="champion"
      brandDisplayName="CHAMPION"
      brandDescription="CHAMPION motorlu greyder ve yol yapım ekipmanları"
      brandMachineTypes={["Motorlu Greyder"]}
    />
  );
}
