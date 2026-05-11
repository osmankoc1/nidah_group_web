// Shared server component — renders a blog post for EN / RU / AR
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTags, blogTags, blogPostTranslations } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { Clock, ArrowLeft, Tag, User, Calendar } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { LanguageSwitcher } from "@/components/blog/LanguageSwitcher";
import { MDXRemote } from "next-mdx-remote/rsc";
import { parseFaqFromMarkdown } from "@/lib/blog-faq";
import {
  type TranslationLocale,
  type Locale,
  LOCALE_CONFIG,
  blogListHref,
  blogPostHref,
  localeCategoryHref,
  localeTagHref,
} from "@/lib/blog-locales";

const FALLBACK_IMAGE = "https://www.nidahgroup.com.tr/opengraph-image";

interface Props {
  locale: TranslationLocale;
  slug: string;
}

/** Fetches full post data for a given non-TR locale + slug. Returns null if not found. */
export async function getLocaleBlogPostData(locale: TranslationLocale, slug: string) {
  if (!db) return null;

  const [post] = await db
    .select({
      id:                 blogPosts.id,
      trSlug:             blogPosts.slug,
      title:              blogPostTranslations.title,
      slug:               blogPostTranslations.slug,
      content:            blogPostTranslations.content,
      excerpt:            blogPostTranslations.excerpt,
      seoTitle:           blogPostTranslations.seoTitle,
      seoDescription:     blogPostTranslations.seoDescription,
      keywords:           blogPostTranslations.keywords,
      coverImageUrl:      blogPosts.coverImageUrl,
      publishedAt:        blogPosts.publishedAt,
      updatedAt:          blogPosts.updatedAt,
      authorName:         blogPosts.authorName,
      categoryId:         blogPosts.categoryId,
      categoryName:       blogCategories.name,
      categorySlug:       blogCategories.slug,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
    })
    .from(blogPostTranslations)
    .innerJoin(blogPosts, eq(blogPostTranslations.postId, blogPosts.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(
      and(
        eq(blogPostTranslations.locale, locale),
        eq(blogPostTranslations.slug, slug),
        eq(blogPosts.status, "published"),
      ),
    );

  if (!post) return null;

  const otherTranslations = await db
    .select({ locale: blogPostTranslations.locale, slug: blogPostTranslations.slug })
    .from(blogPostTranslations)
    .where(eq(blogPostTranslations.postId, post.id));

  const slugsByLocale: Partial<Record<Locale, string>> = { tr: post.trSlug };
  for (const t of otherTranslations) {
    slugsByLocale[t.locale as Locale] = t.slug;
  }

  return { ...post, slugsByLocale };
}

export async function LocaleBlogPost({ locale, slug }: Props) {
  if (!db) notFound();

  const post = await getLocaleBlogPostData(locale, slug);
  if (!post) notFound();

  const cfg = LOCALE_CONFIG[locale];
  const isRTL = cfg.dir === "rtl";

  const postTags = await db!
    .select({ name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, post.id));

  const catId = post.categoryId;
  const relatedPosts = catId
    ? await db!
        .select({
          postId:             blogPosts.id,
          title:              blogPostTranslations.title,
          slug:               blogPostTranslations.slug,
          coverImageUrl:      blogPosts.coverImageUrl,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPostTranslations)
        .innerJoin(blogPosts, eq(blogPostTranslations.postId, blogPosts.id))
        .where(and(
          eq(blogPostTranslations.locale, locale),
          eq(blogPosts.categoryId, catId),
          ne(blogPosts.id, post.id),
          eq(blogPosts.status, "published"),
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
    url: `https://www.nidahgroup.com.tr${blogPostHref(locale, post.slug)}`,
    inLanguage: cfg.lang,
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
    <main dir={cfg.dir} lang={cfg.lang}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Hero */}
      {post.coverImageUrl ? (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl mx-auto">
            {post.categoryName && post.categorySlug && (
              <Link
                href={localeCategoryHref(locale, post.categorySlug)}
                className="text-nidah-yellow text-xs font-bold uppercase tracking-wider mb-2 block hover:underline"
              >
                {post.categoryName}
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {post.title}
            </h1>
          </div>
        </div>
      ) : (
        <section className="gradient-hero py-16 md:py-20">
          <div className="container mx-auto px-4">
            {post.categoryName && post.categorySlug && (
              <Link
                href={localeCategoryHref(locale, post.categorySlug)}
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

      <PageBreadcrumb
        items={[{ label: `Blog (${cfg.label})`, href: blogListHref(locale) }, { label: post.title }]}
      />

      {/* Meta bar — always LTR for UI consistency */}
      <div className="bg-white border-b">
        <div
          className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center text-sm text-nidah-gray"
          dir="ltr"
        >
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {new Date(post.publishedAt).toLocaleDateString(cfg.dateLocale, {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {post.readingTimeMinutes} {cfg.readSuffix}
          </span>
          <div className="ml-auto">
            <LanguageSwitcher
              currentLocale={locale}
              slugsByLocale={post.slugsByLocale}
            />
          </div>
        </div>
      </div>

      {/* Article content */}
      <article className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          {post.excerpt && (
            <p
              className="text-lg text-nidah-gray leading-relaxed mb-8 border-l-4 border-nidah-yellow pl-4 italic"
              style={isRTL ? { borderLeft: "none", borderRight: "4px solid #F59E0B", paddingLeft: 0, paddingRight: "1rem" } : {}}
            >
              {post.excerpt}
            </p>
          )}

          <div className={`prose prose-lg prose-headings:text-nidah-dark prose-a:text-nidah-steel max-w-none${isRTL ? " text-right" : ""}`}>
            <MDXRemote source={post.content} />
          </div>

          {/* Tags */}
          {postTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t" dir="ltr">
              <span className="text-xs text-nidah-gray flex items-center gap-1">
                <Tag className="size-3" /> {cfg.tagsLabel}:
              </span>
              {postTags.map(tag => (
                <Link
                  key={tag.slug}
                  href={localeTagHref(locale, tag.slug)}
                  className="text-xs bg-nidah-light border border-gray-200 text-nidah-dark rounded-full px-3 py-1 hover:bg-nidah-yellow/10 hover:border-nidah-yellow/40 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* TR version cross-link */}
          {post.slugsByLocale.tr && cfg.trVersionLabel && (
            <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4" dir="ltr">
              <p className="text-sm text-amber-700">{cfg.trVersionLabel}</p>
              <Link
                href={blogPostHref("tr", post.slugsByLocale.tr)}
                className="text-sm font-semibold text-amber-600 hover:text-amber-800 underline shrink-0"
              >
                {cfg.trReadLabel}
              </Link>
            </div>
          )}

          {/* Back link */}
          <div className="mt-10 pt-8 border-t" dir="ltr">
            <Link
              href={blogListHref(locale)}
              className="inline-flex items-center gap-2 text-sm text-nidah-gray hover:text-nidah-dark transition-colors"
            >
              <ArrowLeft className="size-4" />
              {cfg.allPostsLabel}
            </Link>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-nidah-light py-12" dir="ltr">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-bold text-nidah-dark mb-6">{cfg.relatedPostsLabel}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map(related => (
                <Link
                  key={related.postId}
                  href={blogPostHref(locale, related.slug)}
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
                      <span>{related.readingTimeMinutes} {cfg.readSuffix}</span>
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
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">{cfg.ctaTitle}</h2>
          <p className="text-nidah-dark/70 mb-6">{cfg.ctaBody}</p>
          <Link
            href="/teklif-al"
            className="inline-flex items-center gap-2 bg-nidah-dark hover:bg-nidah-navy text-white font-bold px-6 py-3 rounded-xl transition-colors"
            dir="ltr"
          >
            {cfg.ctaButton}
          </Link>
        </div>
      </section>
    </main>
  );
}
