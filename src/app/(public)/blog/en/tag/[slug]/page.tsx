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
  const tag = await getLocaleTagData("en", slug);
  if (!tag) return { title: "Blog | NİDAH GROUP" };
  return {
    title: `#${tag.name} | Blog | NİDAH GROUP`,
    description: `NİDAH GROUP — articles tagged "${tag.name}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/en/tag/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/en/tag/${slug}`,
      languages: buildTagHreflangs(slug),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EnTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleTagHub locale="en" tagSlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
