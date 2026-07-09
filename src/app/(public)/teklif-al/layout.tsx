import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Teklif Al" toggle'ı tek otoritedir.
 * /teklif-al ve /teklif-al/basarili tek noktadan kapatılır.
 */
export default async function TeklifAlSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!await isPageEnabled("page_teklif_al")) notFound();
  return <>{children}</>;
}
