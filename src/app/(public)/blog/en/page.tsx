import type { Metadata } from "next";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ page?: string }> }
): Promise<Metadata> {
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  return {
    title: "Blog | NİDAH GROUP — Heavy Equipment Technical Guide",
    description:
      "Technical guides for construction machinery maintenance, spare parts selection, and hydraulic systems. Expert content by NİDAH GROUP.",
    alternates: {
      canonical: pageNum > 1 ? `${BASE_URL}/blog/en?page=${pageNum}` : `${BASE_URL}/blog/en`,
      languages: buildListHreflangs(),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EnBlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <LocaleBlogList locale="en" page={Math.max(1, Number(page) || 1)} />;
}
