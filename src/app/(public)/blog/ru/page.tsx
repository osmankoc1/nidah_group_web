import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ page?: string }> }
): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  return {
    title: "Блог | NİDAH GROUP — Техническое руководство по тяжёлой технике",
    description:
      "Технические руководства по обслуживанию строительной техники, выбору запасных частей и гидравлическим системам. Экспертные материалы от NİDAH GROUP.",
    alternates: {
      canonical: pageNum > 1 ? `${BASE_URL}/blog/ru?page=${pageNum}` : `${BASE_URL}/blog/ru`,
      languages: buildListHreflangs(),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RuBlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <LocaleBlogList locale="ru" page={Math.max(1, Number(page) || 1)} />;
}
