import type { Metadata } from "next";
import { LocaleBlogList } from "@/components/blog/LocaleBlogList";
import { buildListHreflangs } from "@/lib/blog-locales";

export const metadata: Metadata = {
  title: "Blog | NİDAH GROUP — Heavy Equipment Technical Guide",
  description:
    "Technical guides for construction machinery maintenance, spare parts selection, and hydraulic systems. Expert content by NİDAH GROUP.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/blog/en",
    languages: buildListHreflangs(),
  },
};

export const dynamic = "force-dynamic";

export default function EnBlogPage() {
  return <LocaleBlogList locale="en" />;
}
