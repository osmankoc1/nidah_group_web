import type { Metadata } from "next";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

export const metadata: Metadata = {
  title: "Блог | NİDAH GROUP — Техническое руководство по тяжёлой технике",
  description:
    "Технические руководства по обслуживанию строительной техники, выбору запасных частей и гидравлическим системам. Экспертные материалы от NİDAH GROUP.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/blog/ru",
    languages: buildListHreflangs(),
  },
};

export const dynamic = "force-dynamic";

export default function RuBlogPage() {
  return <LocaleBlogList locale="ru" />;
}
