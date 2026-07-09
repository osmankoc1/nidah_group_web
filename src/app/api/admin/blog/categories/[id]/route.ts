import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogCategories, blogCategoryTranslations, blogPosts } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { slugifyTaxonomy } from "@/lib/blog-taxonomy";

type Params = { params: Promise<{ id: string }> };

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

const VALID_LOCALES = ["en", "ru", "ar"] as const;
type TransLocale = (typeof VALID_LOCALES)[number];

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const name         = body?.name?.trim();
  const translations = Array.isArray(body?.translations) ? body.translations : [];

  if (!name && translations.length === 0) {
    return NextResponse.json({ error: "name veya translations zorunlu" }, { status: 400 });
  }

  const [current] = await db
    .select({ id: blogCategories.id, name: blogCategories.name })
    .from(blogCategories)
    .where(eq(blogCategories.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });

  // Update TR name if provided
  let updated = current;
  if (name) {
    if (name.length > 255) return NextResponse.json({ error: "name max 255 karakter" }, { status: 400 });

    const newSlug = slugifyTaxonomy(name);
    const [collision] = await db
      .select({ id: blogCategories.id })
      .from(blogCategories)
      .where(and(eq(blogCategories.slug, newSlug), ne(blogCategories.id, id)))
      .limit(1);

    if (collision) {
      return NextResponse.json({ error: "Bu ad başka bir kategoride kullanılıyor" }, { status: 409 });
    }

    const [u] = await db
      .update(blogCategories)
      .set({ name })
      .where(eq(blogCategories.id, id))
      .returning();
    if (u) updated = u;
  }

  // Upsert translations
  for (const t of translations) {
    const tLocale = t.locale?.trim() as TransLocale;
    if (!VALID_LOCALES.includes(tLocale)) continue;

    const tName = typeof t.name === "string" ? t.name.trim() : "";

    if (!tName) {
      // Empty name → delete this locale's translation
      await db
        .delete(blogCategoryTranslations)
        .where(
          and(
            eq(blogCategoryTranslations.categoryId, id),
            eq(blogCategoryTranslations.locale, tLocale),
          ),
        );
      continue;
    }

    if (tName.length > 255) {
      return NextResponse.json({ error: `${tLocale} çeviri adı max 255 karakter` }, { status: 400 });
    }

    const tSlug = slugifyTaxonomy(tName);
    const tDesc = typeof t.description === "string" ? t.description.trim() || null : null;

    // Collision check: same locale+slug, different category
    const [col] = await db
      .select({ id: blogCategoryTranslations.id })
      .from(blogCategoryTranslations)
      .where(
        and(
          eq(blogCategoryTranslations.locale, tLocale),
          eq(blogCategoryTranslations.slug, tSlug),
          ne(blogCategoryTranslations.categoryId, id),
        ),
      )
      .limit(1);

    if (col) {
      return NextResponse.json(
        { error: `Bu ${tLocale.toUpperCase()} slug'ı başka bir kategoride kullanılıyor: "${tSlug}"` },
        { status: 409 },
      );
    }

    await db
      .insert(blogCategoryTranslations)
      .values({
        categoryId:  id,
        locale:      tLocale,
        name:        tName,
        slug:        tSlug,
        description: tDesc,
      })
      .onConflictDoUpdate({
        target: [blogCategoryTranslations.categoryId, blogCategoryTranslations.locale],
        set: { name: tName, slug: tSlug, description: tDesc, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });

  const [current] = await db
    .select({ id: blogCategories.id })
    .from(blogCategories)
    .where(eq(blogCategories.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });

  const result = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(blogPosts)
    .where(eq(blogPosts.categoryId, id));
  const count = result[0]?.count ?? 0;

  if (count > 0) {
    return NextResponse.json(
      {
        error: `Bu kategori ${count} blog yazısında kullanılıyor. Silmeden önce yazıları yeniden kategorize edin.`,
        postCount: count,
      },
      { status: 409 },
    );
  }

  // Translations cascade-deleted via FK ON DELETE CASCADE
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
  return NextResponse.json({ deletedId: id });
}
