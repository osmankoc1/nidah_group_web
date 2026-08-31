import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { LocaleTagHub, getLocaleTagData } from "@/components/blog/LocaleTagHub";
import { buildTagHreflangs } from "@/lib/blog-locales";

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
  const resolved = await getLocaleTagData("en", slug);
  if (!resolved) return { title: "Blog | NİDAH GROUP" };
  return {
    title: `#${resolved.localeName} | Blog | NİDAH GROUP`,
    description: `NİDAH GROUP — articles tagged "${resolved.localeName}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/en/tag/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/en/tag/${slug}`,
      languages: buildTagHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EnTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleTagHub locale="en" tagSlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
