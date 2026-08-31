import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { LocaleCategoryHub, getLocaleCategoryData } from "@/components/blog/LocaleCategoryHub";
import { buildCategoryHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const resolved = await getLocaleCategoryData("ru", slug);
  if (!resolved) return { title: "Блог | NİDAH GROUP" };
  return {
    title: `${resolved.localeName} | Блог | NİDAH GROUP`,
    description: resolved.localeDescription ?? `NİDAH GROUP — статьи в категории "${resolved.localeName}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ru/category/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ru/category/${slug}`,
      languages: buildCategoryHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RuCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleCategoryHub locale="ru" categorySlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
