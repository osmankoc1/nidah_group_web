import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fitments, machines, machineVariants, manufacturers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseVerificationSource, parseVerifiedFlag } from "@/lib/verification";
import { isUniqueViolation } from "@/lib/db/errors";

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
      // Faz 2 — uyumluluk dogrulama durumu (drizzle/0008)
      verified:          fitments.verified,
      verifiedAt:        fitments.verifiedAt,
      source:            fitments.source,
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

  // Yeni uyumluluk VARSAYILAN OLARAK dogrulanmamis eklenir; "verified: true"
  // gonderilirse kaynak zorunludur (src/lib/verification.ts).
  const verified = parseVerifiedFlag(body.verified ?? false);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

  const source = parseVerificationSource(body.source, verified.value);
  if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 });

  try {
    const [row] = await db
      .insert(fitments)
      .values({
        productId:        id,
        machineId,
        machineVariantId: machineVariantId || null,
        notes:            notes?.trim() || null,
        verified:         verified.value,
        verifiedAt:       verified.value ? new Date() : null,
        source:           source.value,
      })
      .returning();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: unknown) {
    // Constraint adi `cause` zincirinde (src/lib/db/errors.ts).
    if (isUniqueViolation(err, ["uq_fitment_no_variant", "uq_fitment_with_variant"])) {
      return NextResponse.json({ error: "Fitment already exists" }, { status: 409 });
    }
    console.error("[POST fitments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
