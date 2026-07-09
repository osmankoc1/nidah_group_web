import type { Metadata } from "next";
import { LocaleTagHub, getLocaleTagData } from "@/components/blog/LocaleTagHub";
import { buildTagHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const resolved = await getLocaleTagData("ru", slug);
  if (!resolved) return { title: "Блог | NİDAH GROUP" };
  return {
    title: `#${resolved.localeName} | Блог | NİDAH GROUP`,
    description: `NİDAH GROUP — статьи с тегом "${resolved.localeName}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ru/tag/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ru/tag/${slug}`,
      languages: buildTagHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RuTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleTagHub locale="ru" tagSlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
