import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-settings";

/**
 * Admin > Sayfalar > "Blog" toggle'ı tek otoritedir.
 * /en/blog altındaki tüm rotaları tek noktadan kapatır.
 */
export default async function EnBlogSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!await isPageEnabled("page_blog")) notFound();
  return <>{children}</>;
}
