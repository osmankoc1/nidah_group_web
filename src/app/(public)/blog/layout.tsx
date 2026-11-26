import { requirePageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Blog" toggle'ı tek otoritedir.
 * Bu layout /blog altındaki TÜM rotaları (diller, yazılar, kategori/etiket
 * sayfaları dahil) tek noktadan kapatır; toggle açılınca otomatik yayına girer.
 */
export default async function BlogSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageEnabled("page_blog");
  return <>{children}</>;
}
