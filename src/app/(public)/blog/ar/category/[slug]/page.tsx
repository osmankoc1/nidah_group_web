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
  const cat = await getLocaleCategoryData("ar", slug);
  if (!cat) return { title: "المدونة | NİDAH GROUP" };
  return {
    title: `${cat.name} | المدونة | NİDAH GROUP`,
    description: cat.description ?? `NİDAH GROUP — مقالات في فئة "${cat.name}".`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/ar/category/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/ar/category/${slug}`,
      languages: buildCategoryHreflangs(slug),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleCategoryHub locale="ar" categorySlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
