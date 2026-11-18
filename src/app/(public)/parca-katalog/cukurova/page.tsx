import type { Metadata } from "next";
import BrandCatalogPage from "@/components/catalog/BrandCatalogPage";
import { metadataForPage } from "@/lib/site-settings";

export function generateMetadata(): Promise<Metadata> {
  return metadataForPage("page_parca_katalog", {
    title: "ÇUKUROVA Yedek Parça | İş Makinası Parçaları",
    description:
      "ÇUKUROVA iş makinaları için OEM ve muadil yedek parça. Fren grubu parçaları, motor ve egzoz bileşenleri, elektrik ve sensör parçaları. Stok ve sipariş üzeri tedarik.",
    alternates: {
      canonical: "https://www.nidahgroup.com.tr/parca-katalog/cukurova",
    },
    twitter: {
      card: "summary_large_image",
      title: "ÇUKUROVA Yedek Parça | İş Makinası Parçaları | NİDAH GROUP",
      description:
        "ÇUKUROVA iş makinaları için OEM ve muadil yedek parça. Fren grubu parçaları, motor ve egzoz bileşenleri, elektrik ve sensör parçaları. Stok ve sipariş üzeri tedarik.",
    },
  });
}

export default async function CukurovaPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[] }>;
}) {
  const { sayfa } = await searchParams;
  return (
    <BrandCatalogPage
      page={sayfa}
      brandSlug="cukurova"
      // `manufacturers.name` içe aktarımda büyük harfe çevrilerek yazılır;
      // eşleşme `upper(name)` üzerinden yapıldığı için burada da Türkçe
      // büyük harf biçimi ("ÇUKUROVA") kullanılır.
      brandDisplayName="ÇUKUROVA"
      // Doğrulanmış kaynak: "940 Yedek Parça Kitabı". Kaynak belge makine
      // TİPİNİ belirtmediği için tip iddiası yazılmamıştır; rozet olarak
      // yalnızca doğrulanmış model gösterilir.
      brandDescription="ÇUKUROVA 940 serisi iş makinaları"
      brandMachineTypes={["940"]}
    />
  );
}
