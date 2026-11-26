import { requirePageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Parça Kataloğu" toggle'ı tek otoritedir.
 * Bu layout /parca-katalog altındaki TÜM rotaları (marka sayfaları ve ürün
 * detayları dahil) tek noktadan kapatır; toggle açılınca otomatik yayına girer.
 * (Sayfa içi gate'ler savunma katmanı olarak ayrıca durur.)
 */
export default async function ParcaKatalogSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageEnabled("page_parca_katalog");
  return <>{children}</>;
}
