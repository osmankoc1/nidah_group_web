import { requirePageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Teklif Al" toggle'ı tek otoritedir.
 * /teklif-al ve /teklif-al/basarili tek noktadan kapatılır.
 */
export default async function TeklifAlSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageEnabled("page_teklif_al");
  return <>{children}</>;
}
