import type { Metadata } from "next";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

export const metadata: Metadata = {
  title: "المدونة | NİDAH GROUP — دليل المعدات الثقيلة",
  description:
    "أدلة تقنية لصيانة معدات البناء واختيار قطع الغيار وأنظمة الهيدروليك. محتوى متخصص من NİDAH GROUP.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/blog/ar",
    languages: buildListHreflangs(),
  },
};

export const dynamic = "force-dynamic";

export default function ArBlogPage() {
  return <LocaleBlogList locale="ar" />;
}
