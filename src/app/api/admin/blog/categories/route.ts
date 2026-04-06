import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogCategories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const rows = await db.select().from(blogCategories).orderBy(asc(blogCategories.name));
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "name ve slug zorunlu" }, { status: 400 });
  }
  const [cat] = await db
    .insert(blogCategories)
    .values({ name: body.name, slug: body.slug, description: body.description ?? null })
    .returning();
  return NextResponse.json({ data: cat }, { status: 201 });
}
