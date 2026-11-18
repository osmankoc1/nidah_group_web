import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { oemNumbers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { parseVerificationSource, parseVerifiedFlag } from "@/lib/verification";

type Params = { params: Promise<{ id: string; oemId: string }> };

/**
 * Numaranın DOĞRULAMA durumunu ve serbest alanlarını günceller.
 *
 * `oemNumber` ve `type` burada DEĞİŞTİRİLMEZ: ikisi birlikte kimliği
 * (`uq_oem_product_number_type`) oluşturur ve `number_normalized` ile tutarlı
 * kalmak zorundadır. Yanlış girilen bir numara silinip yeniden eklenir —
 * böylece doğrulama geçmişi yanıltıcı olmaz.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, oemId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz gövde." }, { status: 400 });

  const scope = and(eq(oemNumbers.id, oemId), eq(oemNumbers.productId, id));
  const updates: Record<string, unknown> = {};

  if ("verified" in body) {
    const verified = parseVerifiedFlag(body.verified);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

    // Kaynak gövdede yoksa mevcut kayıttaki kullanılır: "doğrulandı" işareti
    // hiçbir durumda kaynaksız kalmaz.
    let effectiveSource: unknown = body.source;
    if (!("source" in body)) {
      const [current] = await db
        .select({ source: oemNumbers.source })
        .from(oemNumbers)
        .where(scope)
        .limit(1);
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      effectiveSource = current.source;
    }

    const source = parseVerificationSource(effectiveSource, verified.value);
    if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 });

    updates.verified = verified.value;
    updates.verifiedAt = verified.value ? new Date() : null;
    updates.source = source.value;
  } else if ("source" in body) {
    const source = parseVerificationSource(body.source, false);
    if (!source.ok) return NextResponse.json({ error: source.error }, { status: 400 });
    updates.source = source.value;
  }

  if ("manufacturer" in body) {
    updates.manufacturer =
      typeof body.manufacturer === "string" ? body.manufacturer.trim() || null : null;
  }
  if ("note" in body) {
    updates.note = typeof body.note === "string" ? body.note.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  const [updated] = await db
    .update(oemNumbers)
    .set(updates)
    .where(scope)
    .returning({
      id: oemNumbers.id,
      oemNumber: oemNumbers.oemNumber,
      type: oemNumbers.type,
      verified: oemNumbers.verified,
      verifiedAt: oemNumbers.verifiedAt,
      source: oemNumbers.source,
      manufacturer: oemNumbers.manufacturer,
      note: oemNumbers.note,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, oemId } = await params;

  const [deleted] = await db
    .delete(oemNumbers)
    .where(and(eq(oemNumbers.id, oemId), eq(oemNumbers.productId, id)))
    .returning({ id: oemNumbers.id });

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
