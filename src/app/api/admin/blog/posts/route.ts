import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTags, blogPostTranslations, blogTags } from "@/lib/db/schema";
import { eq, desc, ilike, and, or } from "drizzle-orm";
import { TRANSLATION_LOCALES, type TranslationLocale } from "@/lib/blog-locales";

function slugifyTag(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

async function upsertKeywordTags(postId: string, keywordsStr: string): Promise<void> {
  if (!db || !keywordsStr?.trim()) return;
  const terms = keywordsStr.split(",").map(s => s.trim()).filter(Boolean);
  for (const name of terms) {
    const slug = slugifyTag(name);
    if (!slug) continue;
    await db.insert(blogTags).values({ name, slug }).onConflictDoNothing();
    const [tag] = await db.select({ id: blogTags.id }).from(blogTags).where(eq(blogTags.slug, slug)).limit(1);
    if (!tag) continue;
    await db.insert(blogPostTags).values({ postId, tagId: tag.id }).onConflictDoNothing();
  }
}

// GET /api/admin/blog/posts?status=&search=&page=&pageSize=
export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") || "";
  const search   = searchParams.get("search") || "";
  const page     = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") || "20"));

  const conditions = [];
  if (status) conditions.push(eq(blogPosts.status, status as "draft" | "published" | "archived"));
  if (search) conditions.push(or(ilike(blogPosts.title, `%${search}%`), ilike(blogPosts.slug, `%${search}%`)));

  const rows = await db
    .select({
      id:             blogPosts.id,
      title:          blogPosts.title,
      slug:           blogPosts.slug,
      status:         blogPosts.status,
      publishedAt:    blogPosts.publishedAt,
      authorName:     blogPosts.authorName,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
      categoryName:   blogCategories.name,
      createdAt:      blogPosts.createdAt,
      updatedAt:      blogPosts.updatedAt,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(blogPosts.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({ data: rows, page, pageSize });
}

// POST /api/admin/blog/posts
// Body: { tr, en, ru, ar: LangData, coverImageUrl, status, publishedAt, authorName, categoryId, readingTimeMinutes, tagIds }
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });

  const tr = body.tr ?? {};
  if (!tr.title?.trim() || !tr.slug?.trim()) {
    return NextResponse.json({ error: "Türkçe başlık ve slug zorunlu" }, { status: 400 });
  }

  const now = new Date();
  const publishedAt = body.status === "published"
    ? (body.publishedAt ? new Date(body.publishedAt) : now)
    : null;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title:              tr.title,
      slug:               tr.slug,
      content:            tr.content ?? "",
      excerpt:            tr.excerpt ?? null,
      coverImageUrl:      body.coverImageUrl ?? null,
      metaTitle:          tr.seoTitle ?? null,
      metaDescription:    tr.seoDescription ?? null,
      keywords:           tr.keywords ?? null,
      status:             body.status ?? "draft",
      publishedAt,
      authorName:         body.authorName ?? "NİDAH GROUP",
      categoryId:         body.categoryId ?? null,
      readingTimeMinutes: body.readingTimeMinutes ?? 3,
    })
    .returning();

  // Save non-TR translations (en, ru, ar)
  const translationInserts = [];
  for (const locale of TRANSLATION_LOCALES) {
    const lang: Record<string, string> = body[locale] ?? {};
    if (lang.title?.trim() && lang.slug?.trim()) {
      translationInserts.push({
        postId:         post.id,
        locale:         locale as TranslationLocale,
        title:          lang.title,
        slug:           lang.slug,
        content:        lang.content ?? "",
        excerpt:        lang.excerpt ?? null,
        seoTitle:       lang.seoTitle ?? null,
        seoDescription: lang.seoDescription ?? null,
        keywords:       lang.keywords ?? null,
      });
    }
  }
  if (translationInserts.length > 0) {
    await db.insert(blogPostTranslations).values(translationInserts);
  }

  // Insert explicit tags
  if (Array.isArray(body.tagIds) && body.tagIds.length > 0) {
    await db.insert(blogPostTags).values(
      body.tagIds.map((tagId: string) => ({ postId: post.id, tagId }))
    );
  }

  // Auto-create tags from TR keywords (comma-separated)
  await upsertKeywordTags(post.id, tr.keywords ?? "");

  return NextResponse.json({ data: post }, { status: 201 });
}
