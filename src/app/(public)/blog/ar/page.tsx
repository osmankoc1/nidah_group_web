import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ page?: string }> }
): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  return {
    title: { absolute: "المدونة | NİDAH GROUP — دليل المعدات الثقيلة" },
    description:
      "أدلة تقنية لصيانة معدات البناء واختيار قطع الغيار وأنظمة الهيدروليك. محتوى متخصص من NİDAH GROUP.",
    alternates: {
      canonical: pageNum > 1 ? `${BASE_URL}/blog/ar?page=${pageNum}` : `${BASE_URL}/blog/ar`,
      languages: buildListHreflangs(),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ArBlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <LocaleBlogList locale="ar" page={Math.max(1, Number(page) || 1)} />;
}
