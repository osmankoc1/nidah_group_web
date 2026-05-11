// Shared server component — renders blog list for EN / RU / AR
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTranslations } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { Clock, Tag, ArrowRight, Folder } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import {
  type TranslationLocale,
  LOCALE_CONFIG,
  blogListHref,
  blogPostHref,
  localeCategoryHref,
  LOCALES,
} from "@/lib/blog-locales";
import { FlagIcon } from "@/components/blog/FlagIcon";

const PAGE_SIZE = 12;

interface Props { locale: TranslationLocale; page?: number }

export async function LocaleBlogList({ locale, page = 1 }: Props) {
  const cfg = LOCALE_CONFIG[locale];

  const rows = db
    ? await db
        .select({
          id:                 blogPosts.id,
          title:              blogPostTranslations.title,
          slug:               blogPostTranslations.slug,
          excerpt:            blogPostTranslations.excerpt,
          coverImageUrl:      blogPosts.coverImageUrl,
          publishedAt:        blogPosts.publishedAt,
          categoryName:       blogCategories.name,
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
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(PAGE_SIZE + 1)
        .offset((page - 1) * PAGE_SIZE)
    : [];

  const hasMore = rows.length > PAGE_SIZE;
  const posts   = rows.slice(0, PAGE_SIZE);

  const categories = db
    ? await db
        .selectDistinct({ id: blogCategories.id, name: blogCategories.name, slug: blogCategories.slug })
        .from(blogCategories)
        .innerJoin(blogPosts, eq(blogPosts.categoryId, blogCategories.id))
        .innerJoin(
          blogPostTranslations,
          and(
            eq(blogPostTranslations.postId, blogPosts.id),
            eq(blogPostTranslations.locale, locale),
          ),
        )
        .where(eq(blogPosts.status, "published"))
        .orderBy(blogCategories.name)
    : [];

  // Language nav pills for the hero
  const otherLocales = LOCALES.filter(l => l !== locale);

  return (
    <main dir={cfg.dir} lang={cfg.lang}>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Tag className="size-3.5 text-nidah-yellow" />
            <span>{cfg.heroTag}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{cfg.heroTitle}</h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto">{cfg.heroBody}</p>

          {/* Language switcher pills */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {otherLocales.map(l => {
              const lc = LOCALE_CONFIG[l];
              return (
                <Link
                  key={l}
                  href={blogListHref(l)}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                >
                  <FlagIcon locale={l} className="inline-block w-4 h-3 rounded-[2px] shadow-sm" /> {lc.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: `Blog (${cfg.label})` }]} />

      {/* Posts grid */}
      <section className="bg-nidah-light py-16 min-h-[400px]">
        <div className="max-w-6xl mx-auto px-4">
          {categories.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-2 mb-1">
                <Folder className="size-4 text-nidah-yellow shrink-0" />
                <h2 className="text-sm font-bold text-nidah-dark">{cfg.categoryNavTitle}</h2>
              </div>
              <p className="text-xs text-nidah-gray mb-4">{cfg.categoryNavSubtitle}</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Link
                    key={cat.slug}
                    href={localeCategoryHref(locale, cat.slug)}
                    className="inline-flex items-center text-xs font-medium bg-nidah-light border border-gray-200 text-nidah-dark px-3 py-1.5 rounded-full hover:bg-nidah-yellow/10 hover:border-nidah-yellow/40 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="mb-2">{cfg.noPostsText}</p>
              {cfg.browseTrText && (
                <p className="text-sm">
                  <Link href="/blog" className="text-nidah-steel hover:underline">
                    {cfg.browseTrText}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link
                  key={post.id}
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
                    {post.categoryName && (
                      <span className="text-xs font-semibold text-nidah-yellow-dark uppercase tracking-wide mb-2 block">
                        {post.categoryName}
                      </span>
                    )}
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
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && (
                <Link href={`${blogListHref(locale)}?page=${page - 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark">
                  ← Önceki
                </Link>
              )}
              <span className="text-sm text-gray-500">Sayfa {page}</span>
              {hasMore && (
                <Link href={`${blogListHref(locale)}?page=${page + 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark">
                  Sonraki →
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
          >
            {cfg.ctaButton} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
