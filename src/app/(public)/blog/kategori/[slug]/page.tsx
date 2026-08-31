import type { Metadata } from "next";
import { isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Clock, Tag, ArrowRight } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { buildCategoryHreflangs } from "@/lib/blog-locales";
import { resolveCategory } from "@/lib/blog-taxonomy";

const BASE_URL = "https://www.nidahgroup.com.tr";
const PAGE_SIZE = 12;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  if (!(await isPageEnabled("page_blog"))) return DISABLED_PAGE_METADATA;
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const resolved = await resolveCategory("tr", slug);
  if (!resolved) return { title: "Blog" };
  return {
    title: `${resolved.localeName} | Blog`,
    description: resolved.localeDescription ?? `NİDAH GROUP blog — ${resolved.localeName} kategorisindeki yazılar.`,
    alternates: {
      canonical: pageNum > 1
        ? `${BASE_URL}/blog/kategori/${slug}?page=${pageNum}`
        : `${BASE_URL}/blog/kategori/${slug}`,
      languages: buildCategoryHreflangs(resolved.allSlugs),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const resolved = await resolveCategory("tr", slug);
  if (!resolved) notFound();
  if (!db) notFound();

  const rows = await db
    .select({
      id:                 blogPosts.id,
      title:              blogPosts.title,
      slug:               blogPosts.slug,
      excerpt:            blogPosts.excerpt,
      coverImageUrl:      blogPosts.coverImageUrl,
      publishedAt:        blogPosts.publishedAt,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "published"), eq(blogPosts.categoryId, resolved.id)))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  const posts   = rows.slice(0, PAGE_SIZE);

  return (
    <main>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Tag className="size-3.5 text-nidah-yellow" />
            <span>Kategori</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{resolved.localeName}</h1>
          {resolved.localeDescription && (
            <p className="text-lg text-white/70 max-w-xl mx-auto">{resolved.localeDescription}</p>
          )}
        </div>
      </section>

      <PageBreadcrumb
        items={[{ label: "Blog", href: "/blog" }, { label: resolved.localeName }]}
      />

      {/* Posts */}
      <section className="bg-nidah-light py-16 min-h-[400px]">
        <div className="max-w-6xl mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>Bu kategoride henüz yayınlanmış yazı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
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
                        <span>{post.readingTimeMinutes} dk</span>
                      </div>
                      {post.publishedAt && (
                        <span>
                          {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
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
                <Link
                  href={`/blog/kategori/${slug}?page=${page - 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark"
                >
                  ← Önceki
                </Link>
              )}
              <span className="text-sm text-gray-500">Sayfa {page}</span>
              {hasMore && (
                <Link
                  href={`/blog/kategori/${slug}?page=${page + 1}`}
                  className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50 transition-colors text-nidah-dark"
                >
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
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">Parça veya Servis İhtiyacınız mı Var?</h2>
          <p className="text-nidah-dark/70 mb-6 max-w-lg mx-auto">Teknik ekibimiz sorularınızı yanıtlamak için hazır.</p>
          <Link
            href="/teklif-al"
            className="inline-flex items-center gap-2 bg-nidah-dark hover:bg-nidah-navy text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Teklif Al <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
