import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "MITSUBISHI Yedek Parça | İş Makinası Parçaları",
    description:
      "MITSUBISHI iş makinaları için OEM ve muadil yedek parça. Şanzıman parçaları, dingil ve daire döndürme grubu bileşenleri, bıçak kavrama parçaları. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/mitsubishi",
    },
    twitter: {
      card: "summary_large_image",
      title: "MITSUBISHI Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "MITSUBISHI iş makinaları için OEM ve muadil yedek parça. Şanzıman parçaları, dingil ve daire döndürme grubu bileşenleri, bıçak kavrama parçaları. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default async function MitsubishiPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[] }>;
}) {
  const { sayfa } = await searchParams;
  return (
    <BrandCatalogPage
      page={sayfa}
      brandSlug="mitsubishi"
      brandDisplayName="MITSUBISHI"
      // Doğrulanmış kaynak: MG430 / MG460 / MG530 / MG560 yedek parça katalogları.
      // Makine tipi iddiası bu kataloglardaki parça gruplarına dayanır
      // ("Greyder bıçak ve daire grubu"); uydurulmamıştır.
      brandDescription="MITSUBISHI MG serisi motor greyder iş makinaları"
      brandMachineTypes={["Motor Greyder", "MG430", "MG460", "MG530", "MG560"]}
    />
  );
}
