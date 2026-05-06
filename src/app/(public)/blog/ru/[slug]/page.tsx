import type { Metadata } from "next";
import { LocaleBlogPost, getLocaleBlogPostData } from "@/components/blog/LocaleBlogPost";
import { buildPostHreflangs } from "@/lib/blog-locales";

interface PageProps { params: Promise<{ slug: string }> }

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getLocaleBlogPostData("ru", slug);
  if (!post) return { title: "Блог | NİDAH GROUP" };

  const title       = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || "";

  return {
    title: `${title} | NİDAH GROUP`,
    description,
    keywords: post.keywords ?? undefined,
    alternates: {
      canonical: `https://www.nidahgroup.com.tr/blog/ru/${slug}`,
      languages: buildPostHreflangs(post.slugsByLocale),
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.nidahgroup.com.tr/blog/ru/${slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
    },
  };
}

export default async function RuBlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  return <LocaleBlogPost locale="ru" slug={slug} />;
}
