import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogTags } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const rows = await db.select().from(blogTags).orderBy(asc(blogTags.name));
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "name ve slug zorunlu" }, { status: 400 });
  }
  const [tag] = await db
    .insert(blogTags)
    .values({ name: body.name, slug: body.slug })
    .returning();
  return NextResponse.json({ data: tag }, { status: 201 });
}
