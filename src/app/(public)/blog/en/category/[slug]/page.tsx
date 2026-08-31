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
  const resolved = await getLocaleCategoryData("en", slug);
  if (!resolved) return { title: "Blog" };
  return {
    title: `${resolved.localeName} | Blog`,
    description: resolved.localeDescription ?? `NİDAH GROUP — articles in the "${resolved.localeName}" category.`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/en/category/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/en/category/${slug}`,
      languages: buildCategoryHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EnCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleCategoryHub locale="en" categorySlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
