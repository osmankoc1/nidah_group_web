import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogCategories, blogPosts } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function slugifyCategory(text: string): string {
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
  if (name.length > 255) return NextResponse.json({ error: "name max 255 karakter" }, { status: 400 });

  const [current] = await db
    .select({ id: blogCategories.id, name: blogCategories.name })
    .from(blogCategories)
    .where(eq(blogCategories.id, id))
    .limit(1);
  if (!current) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });

  // Check for name collision via generated slug (with other records only)
  const newSlug = slugifyCategory(name);
  const [collision] = await db
    .select({ id: blogCategories.id })
    .from(blogCategories)
    .where(and(eq(blogCategories.slug, newSlug), ne(blogCategories.id, id)))
    .limit(1);

  if (collision) {
    return NextResponse.json({ error: "Bu ad başka bir kategoride kullanılıyor" }, { status: 409 });
  }

  // Only update name — slug stays unchanged (Sprint 4: slug is readonly)
  const [updated] = await db
    .update(blogCategories)
    .set({ name })
    .where(eq(blogCategories.id, id))
    .returning();

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

  // Hard-block: never allow deletion if posts use this category
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

  await db.delete(blogCategories).where(eq(blogCategories.id, id));
  return NextResponse.json({ deletedId: id });
}
