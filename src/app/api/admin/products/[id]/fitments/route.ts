import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fitments, machines, machineVariants, manufacturers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  const rows = await db
    .select({
      id:                fitments.id,
      productId:         fitments.productId,
      machineId:         fitments.machineId,
      machineVariantId:  fitments.machineVariantId,
      notes:             fitments.notes,
      createdAt:         fitments.createdAt,
      manufacturerName:  manufacturers.name,
      machineModel:      machines.model,
      machineType:       machines.type,
      variantName:       machineVariants.variantName,
    })
    .from(fitments)
    .leftJoin(machines,        eq(fitments.machineId,        machines.id))
    .leftJoin(manufacturers,   eq(machines.manufacturerId,   manufacturers.id))
    .leftJoin(machineVariants, eq(fitments.machineVariantId, machineVariants.id))
    .where(eq(fitments.productId, id));

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();
  const { machineId, machineVariantId, notes } = body;

  if (!machineId) {
    return NextResponse.json({ error: "machineId is required" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(fitments)
      .values({
        productId:        id,
        machineId,
        machineVariantId: machineVariantId || null,
        notes:            notes?.trim() || null,
      })
      .returning();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes("uq_fitment_no_variant") || err.message.includes("uq_fitment_with_variant"))) {
      return NextResponse.json({ error: "Fitment already exists" }, { status: 409 });
    }
    console.error("[POST fitments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
