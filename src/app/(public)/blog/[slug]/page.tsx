import type { Metadata } from "next";
import { JsonLd } from "@/lib/json-ld";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTags, blogTags, blogPostTranslations } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { Clock, ArrowLeft, Tag, User, Calendar } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { LanguageSwitcher } from "@/components/blog/LanguageSwitcher";
import { type Locale, buildPostHreflangs } from "@/lib/blog-locales";
import { MDXRemote } from "next-mdx-remote/rsc";
import { parseFaqFromMarkdown } from "@/lib/blog-faq";

const FALLBACK_IMAGE = "https://www.nidahgroup.com.tr/opengraph-image";

interface PageProps { params: Promise<{ slug: string }> }

export const revalidate = 60;

async function getTrPost(slug: string) {
  if (!db) return null;

  const [post] = await db
    .select({
      id:                 blogPosts.id,
      title:              blogPosts.title,
      slug:               blogPosts.slug,
      content:            blogPosts.content,
      excerpt:            blogPosts.excerpt,
      coverImageUrl:      blogPosts.coverImageUrl,
      publishedAt:        blogPosts.publishedAt,
      updatedAt:          blogPosts.updatedAt,
      authorName:         blogPosts.authorName,
      categoryId:         blogPosts.categoryId,
      categoryName:       blogCategories.name,
      categorySlug:       blogCategories.slug,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
      metaTitle:          blogPosts.metaTitle,
      metaDescription:    blogPosts.metaDescription,
      keywords:           blogPosts.keywords,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));

  if (!post) return null;

  const translations = await db
    .select({ locale: blogPostTranslations.locale, slug: blogPostTranslations.slug })
    .from(blogPostTranslations)
    .where(eq(blogPostTranslations.postId, post.id));

  const slugsByLocale: Partial<Record<Locale, string>> = { tr: post.slug };
  for (const t of translations) slugsByLocale[t.locale as Locale] = t.slug;

  return { ...post, slugsByLocale };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { slug } = await params;
  const post = await getTrPost(slug);
  if (!post) return { title: "Blog" };

  const title       = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || "";

  return {
    title: `${title}`,
    description,
    keywords: post.keywords ?? undefined,
    alternates: {
      canonical: `https://www.nidahgroup.com.tr/blog/${slug}`,
      languages: buildPostHreflangs(post.slugsByLocale),
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.nidahgroup.com.tr/blog/${slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  if (!db) notFound();

  const { slug } = await params;
  const post = await getTrPost(slug);
  if (!post) notFound();

  const postTags = await db!
    .select({ name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, post.id));

  const catId = post.categoryId;
  const relatedPosts = catId
    ? await db!
        .select({
          id:                 blogPosts.id,
          title:              blogPosts.title,
          slug:               blogPosts.slug,
          coverImageUrl:      blogPosts.coverImageUrl,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPosts)
        .where(and(
          eq(blogPosts.status, "published"),
          eq(blogPosts.categoryId, catId),
          ne(blogPosts.id, post.id),
        ))
        .limit(3)
    : [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? "",
    author: { "@type": "Organization", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: "NİDAH GROUP",
      url: "https://www.nidahgroup.com.tr",
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified:  post.updatedAt?.toISOString(),
    image: post.coverImageUrl ?? FALLBACK_IMAGE,
    url: `https://www.nidahgroup.com.tr/blog/${post.slug}`,
    inLanguage: "tr",
  };

  const faqItems = parseFaqFromMarkdown(post.content);
  const faqJsonLd = faqItems ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null;

  return (
    <main>
      <JsonLd data={articleJsonLd} />
      {faqJsonLd && (
        <JsonLd data={faqJsonLd} />
      )}

      {/* Hero */}
      {post.coverImageUrl ? (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <Image src={post.coverImageUrl} alt={post.title} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl mx-auto">
            {post.categoryName && post.categorySlug && (
              <Link
                href={`/blog/kategori/${post.categorySlug}`}
                className="text-nidah-yellow text-xs font-bold uppercase tracking-wider mb-2 block hover:underline"
              >
                {post.categoryName}
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{post.title}</h1>
          </div>
        </div>
      ) : (
        <section className="gradient-hero py-16 md:py-20">
          <div className="container mx-auto px-4">
            {post.categoryName && post.categorySlug && (
              <Link
                href={`/blog/kategori/${post.categorySlug}`}
                className="text-nidah-yellow text-xs font-bold uppercase tracking-wider mb-3 block text-center hover:underline"
              >
                {post.categoryName}
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center leading-tight max-w-3xl mx-auto">
              {post.title}
            </h1>
          </div>
        </section>
      )}

      <PageBreadcrumb items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

      {/* Meta bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center text-sm text-nidah-gray">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {new Date(post.publishedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {post.readingTimeMinutes} dk okuma
          </span>
          <div className="ml-auto">
            <LanguageSwitcher currentLocale="tr" slugsByLocale={post.slugsByLocale} />
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          {post.excerpt && (
            <p className="text-lg text-nidah-gray leading-relaxed mb-8 border-l-4 border-nidah-yellow pl-4 italic">
              {post.excerpt}
            </p>
          )}
          <div className="prose prose-lg prose-headings:text-nidah-dark prose-a:text-nidah-steel max-w-none">
            <MDXRemote source={post.content} />
          </div>

          {/* Tags */}
          {postTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t">
              <span className="text-xs text-nidah-gray flex items-center gap-1"><Tag className="size-3" /> Etiketler:</span>
              {postTags.map(tag => (
                <Link
                  key={tag.slug}
                  href={`/blog/etiket/${tag.slug}`}
                  className="text-xs bg-nidah-light border border-gray-200 text-nidah-dark rounded-full px-3 py-1 hover:bg-nidah-yellow/10 hover:border-nidah-yellow/40 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="mt-10 pt-8 border-t">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-nidah-gray hover:text-nidah-dark transition-colors">
              <ArrowLeft className="size-4" />
              Tüm Blog Yazıları
            </Link>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-nidah-light py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-bold text-nidah-dark mb-6">Benzer Yazılar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map(related => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-nidah-yellow/30 transition-all duration-200"
                >
                  {related.coverImageUrl ? (
                    <div className="relative w-full h-36 overflow-hidden">
                      <Image
                        src={related.coverImageUrl}
                        alt={related.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-36 gradient-hero flex items-center justify-center">
                      <span className="text-white/20 text-2xl font-bold">NİDAH</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-nidah-dark text-sm leading-snug line-clamp-2 group-hover:text-nidah-steel transition-colors">
                      {related.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-nidah-gray">
                      <Clock className="size-3" />
                      <span>{related.readingTimeMinutes} dk</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="gradient-cta py-14">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">Parça veya Servis İhtiyacınız mı Var?</h2>
          <p className="text-nidah-dark/70 mb-6">Teknik ekibimiz sorularınızı yanıtlamak için hazır.</p>
          <Link href="/teklif-al" className="inline-flex items-center gap-2 bg-nidah-dark hover:bg-nidah-navy text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Teklif Al
          </Link>
        </div>
      </section>
    </main>
  );
}
