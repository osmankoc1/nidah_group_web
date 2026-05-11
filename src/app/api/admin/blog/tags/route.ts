import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogTags, blogPostTags } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const rows = await db
    .select({
      id:        blogTags.id,
      name:      blogTags.name,
      slug:      blogTags.slug,
      createdAt: blogTags.createdAt,
      postCount: sql<number>`count(${blogPostTags.postId})`.mapWith(Number),
    })
    .from(blogTags)
    .leftJoin(blogPostTags, eq(blogPostTags.tagId, blogTags.id))
    .groupBy(blogTags.id, blogTags.name, blogTags.slug, blogTags.createdAt)
    .orderBy(asc(blogTags.name));
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name zorunlu" }, { status: 400 });
  }

  const name = body.name.trim();
  const slug = body.slug?.trim() || slugifyTag(name);

  // Explicit duplicate check — return existing so callers can auto-select
  const [existing] = await db
    .select()
    .from(blogTags)
    .where(eq(blogTags.slug, slug))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Bu isimde bir etiket zaten mevcut", existing },
      { status: 409 },
    );
  }

  const [tag] = await db
    .insert(blogTags)
    .values({ name, slug })
    .returning();

  if (!tag) return NextResponse.json({ error: "Etiket oluşturulamadı" }, { status: 500 });

  return NextResponse.json({ data: tag }, { status: 201 });
}

function slugifyTag(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}
