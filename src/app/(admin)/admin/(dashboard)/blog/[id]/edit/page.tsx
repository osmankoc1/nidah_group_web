import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts, blogPostTags, blogTags, blogPostTranslations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BlogEditor from "@/components/admin/BlogEditor";

interface PageProps { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: PageProps) {
  if (!db) return notFound();

  const { id } = await params;

  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) notFound();

  const [tagRows, translationRows] = await Promise.all([
    db
      .select({ id: blogTags.id })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, id)),
    db
      .select()
      .from(blogPostTranslations)
      .where(eq(blogPostTranslations.postId, id)),
  ]);

  const byLocale = Object.fromEntries(translationRows.map(t => [t.locale, t]));

  const emptyLang = { title: "", slug: "", content: "", excerpt: "", seoTitle: "", seoDescription: "", keywords: "" };

  const makeLang = (locale: string) => {
    const t = byLocale[locale];
    if (!t) return { ...emptyLang };
    return {
      title:          t.title,
      slug:           t.slug,
      content:        t.content,
      excerpt:        t.excerpt          ?? "",
      seoTitle:       t.seoTitle         ?? "",
      seoDescription: t.seoDescription   ?? "",
      keywords:       t.keywords         ?? "",
    };
  };

  const initialData = {
    id: post.id,
    tr: {
      title:          post.title,
      slug:           post.slug,
      content:        post.content,
      excerpt:        post.excerpt         ?? "",
      seoTitle:       post.metaTitle       ?? "",
      seoDescription: post.metaDescription ?? "",
      keywords:       post.keywords        ?? "",
    },
    en: makeLang("en"),
    ru: makeLang("ru"),
    ar: makeLang("ar"),
    coverImageUrl:      post.coverImageUrl      ?? "",
    status:             post.status,
    publishedAt:        post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : "",
    authorName:         post.authorName,
    categoryId:         post.categoryId         ?? "",
    readingTimeMinutes: post.readingTimeMinutes,
    tagIds:             tagRows.map(t => t.id),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Yazıyı Düzenle</h1>
      <BlogEditor initialData={initialData} />
    </div>
  );
}
