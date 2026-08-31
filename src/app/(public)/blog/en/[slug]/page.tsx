import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { LocaleBlogPost, getLocaleBlogPostData } from "@/components/blog/LocaleBlogPost";
import { buildPostHreflangs } from "@/lib/blog-locales";

interface PageProps { params: Promise<{ slug: string }> }

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { slug } = await params;
  const post = await getLocaleBlogPostData("en", slug);
  if (!post) return { title: "Blog" };

  const title       = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || "";

  return {
    title: `${title}`,
    description,
    keywords: post.keywords ?? undefined,
    alternates: {
      canonical: `https://www.nidahgroup.com.tr/blog/en/${slug}`,
      languages: buildPostHreflangs(post.slugsByLocale),
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.nidahgroup.com.tr/blog/en/${slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
    },
  };
}

export default async function EnBlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  return <LocaleBlogPost locale="en" slug={slug} />;
}
