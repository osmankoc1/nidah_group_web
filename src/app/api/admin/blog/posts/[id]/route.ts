import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogPostTags, blogTags, blogPostTranslations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/blog/posts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;

  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [tags, translations] = await Promise.all([
    db
      .select({ id: blogTags.id, name: blogTags.name, slug: blogTags.slug })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, id)),
    db
      .select()
      .from(blogPostTranslations)
      .where(eq(blogPostTranslations.postId, id)),
  ]);

  const translationsByLocale = Object.fromEntries(
    translations.map(t => [t.locale, t])
  );

  return NextResponse.json({ data: { ...post, tags, translations: translationsByLocale } });
}

// PUT /api/admin/blog/posts/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const tr  = body.tr ?? {};
  const now = new Date();

  const publishedAt = body.status === "published"
    ? (body.publishedAt ? new Date(body.publishedAt) : now)
    : body.status === "draft" ? null : undefined;

  // Update main blog post (TR data)
  const updateData: Record<string, unknown> = { updatedAt: now };
  if (tr.title           !== undefined) updateData.title           = tr.title;
  if (tr.slug            !== undefined) updateData.slug            = tr.slug;
  if (tr.content         !== undefined) updateData.content         = tr.content;
  if (tr.excerpt         !== undefined) updateData.excerpt         = tr.excerpt;
  if (tr.seoTitle        !== undefined) updateData.metaTitle       = tr.seoTitle;
  if (tr.seoDescription  !== undefined) updateData.metaDescription = tr.seoDescription;
  if (tr.keywords        !== undefined) updateData.keywords        = tr.keywords;
  if (body.coverImageUrl !== undefined) updateData.coverImageUrl   = body.coverImageUrl;
  if (body.status        !== undefined) updateData.status          = body.status;
  if (publishedAt        !== undefined) updateData.publishedAt     = publishedAt;
  if (body.authorName    !== undefined) updateData.authorName      = body.authorName;
  if (body.categoryId    !== undefined) updateData.categoryId      = body.categoryId || null;
  if (body.readingTimeMinutes !== undefined) updateData.readingTimeMinutes = body.readingTimeMinutes;

  const [updated] = await db
    .update(blogPosts)
    .set(updateData)
    .where(eq(blogPosts.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Upsert / delete translations for en, ru, ar
  for (const locale of TRANSLATION_LOCALES) {
    const lang: Record<string, string> = body[locale] ?? {};
    await upsertOrDeleteTranslation(id, locale, lang, now);
  }

  // Sync explicit tags
  if (Array.isArray(body.tagIds)) {
    await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
    if (body.tagIds.length > 0) {
      await db.insert(blogPostTags).values(
        body.tagIds.map((tagId: string) => ({ postId: id, tagId }))
      );
    }
  }

  // Auto-create/link tags from TR keywords (comma-separated); idempotent via onConflictDoNothing
  await upsertKeywordTags(id, tr.keywords ?? "");

  return NextResponse.json({ data: updated });
}

async function upsertOrDeleteTranslation(
  postId: string,
  locale: TranslationLocale,
  lang: Record<string, string>,
  now: Date,
) {
  if (!db) return;

  const hasContent = lang.title?.trim() && lang.slug?.trim();
  const shouldDelete = lang.title === "" && lang.slug === "";

  if (!hasContent) {
    if (shouldDelete) {
      await db
        .delete(blogPostTranslations)
        .where(and(eq(blogPostTranslations.postId, postId), eq(blogPostTranslations.locale, locale)));
    }
    return;
  }

  const [existing] = await db
    .select({ id: blogPostTranslations.id })
    .from(blogPostTranslations)
    .where(and(eq(blogPostTranslations.postId, postId), eq(blogPostTranslations.locale, locale)))
    .limit(1);

  if (existing) {
    await db
      .update(blogPostTranslations)
      .set({
        title:          lang.title,
        slug:           lang.slug,
        content:        lang.content ?? "",
        excerpt:        lang.excerpt ?? null,
        seoTitle:       lang.seoTitle ?? null,
        seoDescription: lang.seoDescription ?? null,
        keywords:       lang.keywords ?? null,
        updatedAt:      now,
      })
      .where(and(eq(blogPostTranslations.postId, postId), eq(blogPostTranslations.locale, locale)));
  } else {
    await db.insert(blogPostTranslations).values({
      postId,
      locale,
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

// DELETE /api/admin/blog/posts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return NextResponse.json({ ok: true });
}
