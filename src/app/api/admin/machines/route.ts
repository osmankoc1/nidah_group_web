import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { machines, manufacturers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const manufacturerId = request.nextUrl.searchParams.get("manufacturerId");

  const rows = await db
    .select({
      id:               machines.id,
      manufacturerId:   machines.manufacturerId,
      manufacturerName: manufacturers.name,
      model:            machines.model,
      type:             machines.type,
      yearFrom:         machines.yearFrom,
      yearTo:           machines.yearTo,
      createdAt:        machines.createdAt,
    })
    .from(machines)
    .leftJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
    .where(manufacturerId ? eq(machines.manufacturerId, manufacturerId) : undefined)
    .orderBy(asc(manufacturers.name), asc(machines.model));

  return NextResponse.json({ data: rows }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json();
  const { manufacturerId, model, type, yearFrom, yearTo } = body;

  if (!manufacturerId || !model?.trim()) {
    return NextResponse.json({ error: "manufacturerId and model are required" }, { status: 400 });
  }

  const [row] = await db
    .insert(machines)
    .values({
      manufacturerId,
      model: model.trim(),
      type:  type?.trim() || null,
      yearFrom: yearFrom ? Number(yearFrom) : null,
      yearTo:   yearTo   ? Number(yearTo)   : null,
    })
    .returning();

  return NextResponse.json({ data: row }, { status: 201 });
}
