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
  const resolved = await getLocaleTagData("ar", slug);
  if (!resolved) return { title: "المدونة | NİDAH GROUP" };
  return {
    title: `#${resolved.localeName} | المدونة | NİDAH GROUP`,
    description: `NİDAH GROUP — مقالات بوسم "${resolved.localeName}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ar/tag/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ar/tag/${slug}`,
      languages: buildTagHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleTagHub locale="ar" tagSlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
