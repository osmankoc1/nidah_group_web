import type { Metadata } from "next";
import { LocaleCategoryHub, getLocaleCategoryData } from "@/components/blog/LocaleCategoryHub";
import { buildCategoryHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const cat = await getLocaleCategoryData("ru", slug);
  if (!cat) return { title: "Блог | NİDAH GROUP" };
  return {
    title: `${cat.name} | Блог | NİDAH GROUP`,
    description: cat.description ?? `NİDAH GROUP — статьи в категории "${cat.name}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ru/category/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ru/category/${slug}`,
      languages: buildCategoryHreflangs(slug),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RuCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleCategoryHub locale="ru" categorySlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
