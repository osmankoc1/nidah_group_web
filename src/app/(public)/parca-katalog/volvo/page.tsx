import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "VOLVO Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
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
};

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
