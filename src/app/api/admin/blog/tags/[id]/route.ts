import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogTags, blogTagTranslations, blogPostTags } from "@/lib/db/schema";
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
    .select({ id: blogTags.id, name: blogTags.name })
    .from(blogTags)
    .where(eq(blogTags.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Etiket bulunamadı" }, { status: 404 });

  let updated = current;
  if (name) {
    if (name.length > 100) return NextResponse.json({ error: "name max 100 karakter" }, { status: 400 });

    const newSlug = slugifyTaxonomy(name);
    const [collision] = await db
      .select({ id: blogTags.id })
      .from(blogTags)
      .where(and(eq(blogTags.slug, newSlug), ne(blogTags.id, id)))
      .limit(1);

    if (collision) {
      return NextResponse.json({ error: "Bu ad başka bir etikette kullanılıyor" }, { status: 409 });
    }

    const [u] = await db
      .update(blogTags)
      .set({ name })
      .where(eq(blogTags.id, id))
      .returning();
    if (u) updated = u;
  }

  for (const t of translations) {
    const tLocale = t.locale?.trim() as TransLocale;
    if (!VALID_LOCALES.includes(tLocale)) continue;

    const tName = typeof t.name === "string" ? t.name.trim() : "";

    if (!tName) {
      await db
        .delete(blogTagTranslations)
        .where(
          and(
            eq(blogTagTranslations.tagId, id),
            eq(blogTagTranslations.locale, tLocale),
          ),
        );
      continue;
    }

    if (tName.length > 100) {
      return NextResponse.json({ error: `${tLocale} çeviri adı max 100 karakter` }, { status: 400 });
    }

    const tSlug = slugifyTaxonomy(tName);

    const [col] = await db
      .select({ id: blogTagTranslations.id })
      .from(blogTagTranslations)
      .where(
        and(
          eq(blogTagTranslations.locale, tLocale),
          eq(blogTagTranslations.slug, tSlug),
          ne(blogTagTranslations.tagId, id),
        ),
      )
      .limit(1);

    if (col) {
      return NextResponse.json(
        { error: `Bu ${tLocale.toUpperCase()} slug'ı başka bir etikette kullanılıyor: "${tSlug}"` },
        { status: 409 },
      );
    }

    await db
      .insert(blogTagTranslations)
      .values({ tagId: id, locale: tLocale, name: tName, slug: tSlug })
      .onConflictDoUpdate({
        target: [blogTagTranslations.tagId, blogTagTranslations.locale],
        set: { name: tName, slug: tSlug, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });

  const [current] = await db
    .select({ id: blogTags.id })
    .from(blogTags)
    .where(eq(blogTags.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Etiket bulunamadı" }, { status: 404 });

  const result = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(blogPostTags)
    .where(eq(blogPostTags.tagId, id));
  const removedFromPosts = result[0]?.count ?? 0;

  // Tag translations cascade-deleted via FK ON DELETE CASCADE
  await db.delete(blogTags).where(eq(blogTags.id, id));
  return NextResponse.json({ deletedId: id, removedFromPosts });
}
