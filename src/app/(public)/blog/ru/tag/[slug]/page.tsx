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
  const tag = await getLocaleTagData("ru", slug);
  if (!tag) return { title: "Блог | NİDAH GROUP" };
  return {
    title: `#${tag.name} | Блог | NİDAH GROUP`,
    description: `NİDAH GROUP — статьи с тегом "${tag.name}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ru/tag/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ru/tag/${slug}`,
      languages: buildTagHreflangs(slug),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RuTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleTagHub locale="ru" tagSlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
