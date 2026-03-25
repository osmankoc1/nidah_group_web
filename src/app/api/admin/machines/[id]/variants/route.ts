import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { machineVariants } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const rows = await db
    .select()
    .from(machineVariants)
    .where(eq(machineVariants.machineId, id))
    .orderBy(asc(machineVariants.variantName));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();
  const { variantName, engineModel, serialFrom, serialTo } = body;

  if (!variantName?.trim()) {
    return NextResponse.json({ error: "variantName is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(machineVariants)
    .values({
      machineId:   id,
      variantName: variantName.trim(),
      engineModel: engineModel?.trim() || null,
      serialFrom:  serialFrom?.trim()  || null,
      serialTo:    serialTo?.trim()    || null,
    })
    .returning();

  return NextResponse.json({ data: row }, { status: 201 });
}
