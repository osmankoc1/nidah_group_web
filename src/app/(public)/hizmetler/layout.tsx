import { requirePageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Hizmetler" toggle'ı tek otoritedir.
 * Bu layout /hizmetler altındaki TÜM alt sayfaları (revizyon, bakım, ECU vb.)
 * tek noktadan kapatır; toggle açılınca otomatik yayına girer.
 */
export default async function HizmetlerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageEnabled("page_hizmetler");
  return <>{children}</>;
}
