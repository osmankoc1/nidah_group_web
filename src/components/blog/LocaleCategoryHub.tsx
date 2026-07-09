// Shared server component — renders a locale-specific category hub for EN / RU / AR
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts, blogPostTranslations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Clock, Tag, ArrowRight } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import {
  type TranslationLocale,
  LOCALE_CONFIG,
  blogListHref,
  blogPostHref,
} from "@/lib/blog-locales";
import { resolveCategory, type ResolvedCategory } from "@/lib/blog-taxonomy";

const PAGE_SIZE = 12;

const STRINGS: Record<TranslationLocale, {
  categoryLabel: string;
  noPostsText: string;
  prevLabel: string;
  nextLabel: string;
  pageLabel: string;
}> = {
  en: { categoryLabel: "Category", noPostsText: "No articles in this category yet.", prevLabel: "← Previous", nextLabel: "Next →", pageLabel: "Page" },
  ru: { categoryLabel: "Категория", noPostsText: "Статей в этой категории пока нет.", prevLabel: "← Назад", nextLabel: "Вперёд →", pageLabel: "Страница" },
  ar: { categoryLabel: "الفئة", noPostsText: "لا توجد مقالات في هذه الفئة حتى الآن.", prevLabel: "→ السابق", nextLabel: "التالي ←", pageLabel: "الصفحة" },
};

interface Props {
  locale: TranslationLocale;
  categorySlug: string;
  page?: number;
}

export async function getLocaleCategoryData(
  locale: TranslationLocale,
  categorySlug: string,
): Promise<ResolvedCategory | null> {
  return resolveCategory(locale, categorySlug);
}

export async function LocaleCategoryHub({ locale, categorySlug, page = 1 }: Props) {
  if (!db) notFound();

  const resolved = await resolveCategory(locale, categorySlug);
  if (!resolved) notFound();

  const cfg = LOCALE_CONFIG[locale];
  const s   = STRINGS[locale];

  const rows = await db
    .select({
      postId:             blogPosts.id,
      title:              blogPostTranslations.title,
      slug:               blogPostTranslations.slug,
      excerpt:            blogPostTranslations.excerpt,
      coverImageUrl:      blogPosts.coverImageUrl,
      publishedAt:        blogPosts.publishedAt,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
    })
    .from(blogPosts)
    .innerJoin(
      blogPostTranslations,
      and(
        eq(blogPostTranslations.postId, blogPosts.id),
        eq(blogPostTranslations.locale, locale),
      ),
    )
    .where(and(
      eq(blogPosts.status, "published"),
      eq(blogPosts.categoryId, resolved.id),
    ))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  const posts   = rows.slice(0, PAGE_SIZE);

  return (
    <main dir={cfg.dir} lang={cfg.lang}>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Tag className="size-3.5 text-nidah-yellow" />
            <span>{s.categoryLabel}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{resolved.localeName}</h1>
          {resolved.localeDescription && (
            <p className="text-lg text-white/70 max-w-xl mx-auto">{resolved.localeDescription}</p>
          )}
        </div>
      </section>

      <PageBreadcrumb
        items={[{ label: `Blog (${cfg.label})`, href: blogListHref(locale) }, { label: resolved.localeName }]}
      />

      {/* Posts */}
      <section className="bg-nidah-light py-16 min-h-[400px]">
        <div className="max-w-6xl mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>{s.noPostsText}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link
                  key={post.postId}
                  href={blogPostHref(locale, post.slug)}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-nidah-yellow/30 transition-all duration-200"
                >
                  {post.coverImageUrl ? (
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 gradient-hero flex items-center justify-center">
                      <span className="text-white/30 text-4xl font-bold">NİDAH</span>
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="font-bold text-nidah-dark text-base leading-snug mb-2 line-clamp-2 group-hover:text-nidah-steel transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-nidah-gray line-clamp-3 mb-4">{post.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-nidah-gray mt-auto">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{post.readingTimeMinutes} {cfg.readSuffix}</span>
                      </div>
                      {post.publishedAt && (
                        <span>
                          {new Date(post.publishedAt).toLocaleDateString(cfg.dateLocale, {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-center gap-3 mt-10" dir="ltr">
              {page > 1 && (
                <Link
                  href={`/blog/${locale}/category/${categorySlug}?page=${page - 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark"
                >
                  {s.prevLabel}
                </Link>
              )}
              <span className="text-sm text-gray-500">{s.pageLabel} {page}</span>
              {hasMore && (
                <Link
                  href={`/blog/${locale}/category/${categorySlug}?page=${page + 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark"
                >
                  {s.nextLabel}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-cta py-14">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">{cfg.ctaTitle}</h2>
          <p className="text-nidah-dark/70 mb-6 max-w-lg mx-auto">{cfg.ctaBody}</p>
          <Link
            href="/teklif-al"
            className="inline-flex items-center gap-2 bg-nidah-dark hover:bg-nidah-navy text-white font-bold px-6 py-3 rounded-xl transition-colors"
            dir="ltr"
          >
            {cfg.ctaButton} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
