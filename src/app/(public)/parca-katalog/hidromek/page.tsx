import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";

export const metadata: Metadata = {
  title: "HİDROMEK Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
  description:
    "HİDROMEK iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/parca-katalog/hidromek",
  },
  twitter: {
    card: "summary_large_image",
    title: "HİDROMEK Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
    description:
      "HİDROMEK iş makinaları için OEM ve muadil yedek parça. Hidrolik pompalar, şanzıman parçaları, motor parçaları ve daha fazlası. Stok ve sipariş üzeri tedarik.",
  },
};

export default function HidromekPage() {
  return (
    <BrandCatalogPage
      brandSlug="hidromek"
      brandDisplayName="HİDROMEK"
      brandDescription="Türk HİDROMEK iş makinaları"
      brandMachineTypes={["Ekskavatör", "Lastikli Yükleyici", "Backhoe Loader"]}
    />
  );
}
