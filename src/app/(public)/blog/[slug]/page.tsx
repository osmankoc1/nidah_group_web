import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTags, blogTags } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Clock, ArrowLeft, Tag, User, Calendar } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { MDXRemote } from "next-mdx-remote/rsc";

interface PageProps { params: Promise<{ slug: string }> }

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!db) return { title: "Blog | NİDAH GROUP" };
  const { slug } = await params;

  const [post] = await db
    .select({ title: blogPosts.title, metaTitle: blogPosts.metaTitle, metaDescription: blogPosts.metaDescription, excerpt: blogPosts.excerpt, coverImageUrl: blogPosts.coverImageUrl })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));

  if (!post) return { title: "Blog | NİDAH GROUP" };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || "";

  return {
    title: `${title} | NİDAH GROUP`,
    description,
    alternates: { canonical: `https://www.nidahgroup.com.tr/blog/${slug}` },
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

  const [post] = await db
    .select({
      id:            blogPosts.id,
      title:         blogPosts.title,
      slug:          blogPosts.slug,
      content:       blogPosts.content,
      excerpt:       blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt:   blogPosts.publishedAt,
      authorName:    blogPosts.authorName,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
      categoryName:  blogCategories.name,
      categorySlug:  blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));

  if (!post) notFound();

  const postTags = await db
    .select({ name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, post.id));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? "",
    author: { "@type": "Organization", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: "NİDAH GROUP",
      url: "https://www.nidahgroup.com.tr",
    },
    datePublished: post.publishedAt?.toISOString(),
    image: post.coverImageUrl ?? undefined,
    url: `https://www.nidahgroup.com.tr/blog/${post.slug}`,
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      {/* Hero */}
      {post.coverImageUrl ? (
        <div className="relative h-72 md:h-96 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl mx-auto">
            {post.categoryName && (
              <span className="text-nidah-yellow text-xs font-bold uppercase tracking-wider mb-2 block">
                {post.categoryName}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{post.title}</h1>
          </div>
        </div>
      ) : (
        <section className="gradient-hero py-16 md:py-20">
          <div className="container mx-auto px-4">
            {post.categoryName && (
              <span className="text-nidah-yellow text-xs font-bold uppercase tracking-wider mb-3 block text-center">
                {post.categoryName}
              </span>
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
                <span key={tag.slug} className="text-xs bg-nidah-light border border-gray-200 text-nidah-dark rounded-full px-3 py-1">
                  {tag.name}
                </span>
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
