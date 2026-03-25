import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manufacturers } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const rows = await db.select().from(manufacturers).orderBy(asc(manufacturers.name));
  return NextResponse.json({ data: rows }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json();
  const { name, logoUrl } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  try {
    const [row] = await db.insert(manufacturers).values({ name: name.trim(), slug, logoUrl: logoUrl || null }).returning();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("uq_manufacturers_slug")) {
      return NextResponse.json({ error: "Manufacturer already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
