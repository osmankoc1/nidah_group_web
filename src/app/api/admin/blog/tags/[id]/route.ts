import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogTags, blogPostTags } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function slugifyTag(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  if (!isUUID(id)) return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "name zorunlu" }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "name max 100 karakter" }, { status: 400 });

  const [current] = await db
    .select({ id: blogTags.id })
    .from(blogTags)
    .where(eq(blogTags.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Etiket bulunamadı" }, { status: 404 });

  // Check for name collision via generated slug (with other records only)
  const newSlug = slugifyTag(name);
  const [collision] = await db
    .select({ id: blogTags.id })
    .from(blogTags)
    .where(and(eq(blogTags.slug, newSlug), ne(blogTags.id, id)))
    .limit(1);

  if (collision) {
    return NextResponse.json({ error: "Bu ad başka bir etikette kullanılıyor" }, { status: 409 });
  }

  // Only update name — slug stays unchanged (Sprint 4: slug is readonly)
  const [updated] = await db
    .update(blogTags)
    .set({ name })
    .where(eq(blogTags.id, id))
    .returning();

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

  // Count posts before deletion for informative toast message
  const result = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(blogPostTags)
    .where(eq(blogPostTags.tagId, id));
  const removedFromPosts = result[0]?.count ?? 0;

  // Tags can always be deleted — blog_post_tags rows cascade automatically
  await db.delete(blogTags).where(eq(blogTags.id, id));
  return NextResponse.json({ deletedId: id, removedFromPosts });
}
