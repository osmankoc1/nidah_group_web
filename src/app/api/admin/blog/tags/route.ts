import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogTags } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const rows = await db.select().from(blogTags).orderBy(asc(blogTags.name));
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

  // Upsert: insert if slug is new, otherwise return existing tag
  await db
    .insert(blogTags)
    .values({ name, slug })
    .onConflictDoNothing();

  const [tag] = await db
    .select()
    .from(blogTags)
    .where(eq(blogTags.slug, slug))
    .limit(1);

  if (!tag) return NextResponse.json({ error: "Etiket oluşturulamadı" }, { status: 500 });

  return NextResponse.json({ data: tag });
}

function slugifyTag(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}
