import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Clock, Tag, ArrowRight } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Blog | NİDAH GROUP — İş Makinası Teknik Rehber",
  description:
    "İş makinası bakımı, yedek parça rehberleri, teknik servis ipuçları ve sektör haberleri. NİDAH GROUP uzman blog içerikleri.",
  alternates: { canonical: "https://www.nidahgroup.com.tr/blog" },
};

export const revalidate = 60;

export default async function BlogPage() {
  const posts = db
    ? await db
        .select({
          id:          blogPosts.id,
          title:       blogPosts.title,
          slug:        blogPosts.slug,
          excerpt:     blogPosts.excerpt,
          coverImageUrl: blogPosts.coverImageUrl,
          publishedAt: blogPosts.publishedAt,
          authorName:  blogPosts.authorName,
          categoryName: blogCategories.name,
          categorySlug: blogCategories.slug,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
    : [];

  return (
    <main>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Tag className="size-3.5 text-nidah-yellow" />
            <span>Teknik Rehber & Sektör İçerikleri</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Blog</h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            İş makinası bakımı, yedek parça seçimi ve teknik servis hakkında uzman içerikler.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Blog" }]} />

      {/* Posts */}
      <section className="bg-nidah-light py-16 min-h-[400px]">
        <div className="max-w-6xl mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>Henüz yayınlanmış yazı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-nidah-yellow/30 transition-all duration-200"
                >
                  {/* Cover */}
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
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
                        <span>{post.readingTimeMinutes} dk</span>
                      </div>
                      {post.publishedAt && (
                        <span>{new Date(post.publishedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-cta py-14">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">
            Parça veya Servis İhtiyacınız mı Var?
          </h2>
          <p className="text-nidah-dark/70 mb-6 max-w-lg mx-auto">
            Teknik ekibimiz sorularınızı yanıtlamak için hazır.
          </p>
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
