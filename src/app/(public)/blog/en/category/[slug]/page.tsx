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
  const cat = await getLocaleCategoryData("en", slug);
  if (!cat) return { title: "Blog | NİDAH GROUP" };
  return {
    title: `${cat.name} | Blog | NİDAH GROUP`,
    description: cat.description ?? `NİDAH GROUP — articles in the "${cat.name}" category.`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/en/category/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/en/category/${slug}`,
      languages: buildCategoryHreflangs(slug),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EnCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  return <LocaleCategoryHub locale="en" categorySlug={slug} page={Math.max(1, Number(pageParam) || 1)} />;
}
