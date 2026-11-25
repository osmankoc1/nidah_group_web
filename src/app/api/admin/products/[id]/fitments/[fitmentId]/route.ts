import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { fitments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseVerificationSource, parseVerifiedFlag } from "@/lib/verification";
import { FIELD_LIMITS } from "@/lib/product-fields";

type Params = { params: Promise<{ id: string; fitmentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, fitmentId } = await params;

  const [deleted] = await db
    .delete(fitments)
    .where(and(eq(fitments.id, fitmentId), eq(fitments.productId, id)))
    .returning({ id: fitments.id });

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ success: true });
}

/**
 * Uyumlulugun DOGRULAMA durumunu gunceller.
 *
 * Yalnizca `verified`, `source` ve `notes` degistirilebilir; hangi makineye
 * baglandigi (machineId/machineVariantId) burada DEGISTIRILMEZ — yanlis
 * eslesme silinip yeniden eklenir, boylece dogrulama gecmisi yaniltici olmaz.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, fitmentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Gecersiz govde." }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if ("verified" in body) {
    const verified = parseVerifiedFlag(body.verified);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

    // Kaynak kontrolu: govdede yeni kaynak varsa o, yoksa mevcut kayittaki.
    let effectiveSource: unknown = body.source;
    if (!("source" in body)) {
      const [current] = await db
        .select({ source: fitments.source })
        .from(fitments)
        .where(and(eq(fitments.id, fitmentId), eq(fitments.productId, id)))
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

  // Not duzenleme (bulgu P12). Kayit silip yeniden eklemeye gerek kalmasin
  // diye satir ici duzenlemeye acildi; MAKINE ESLESMESI yine degistirilemez.
  // Notu degistirmek DOGRULAMA durumuna DOKUNMAZ: kanit `source` alanidir.
  if ("notes" in body) {
    if (typeof body.notes === "string" && body.notes.trim().length > FIELD_LIMITS.fitmentNotes) {
      return NextResponse.json(
        {
          error:
            `Not en fazla ${FIELD_LIMITS.fitmentNotes} karakter olabilir ` +
            `(girilen: ${body.notes.trim().length}). Deger kirpilmaz, kayit reddedilir.`,
        },
        { status: 400 }
      );
    }
    updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Guncellenecek alan yok." }, { status: 400 });
  }

  const [updated] = await db
    .update(fitments)
    .set(updates)
    .where(and(eq(fitments.id, fitmentId), eq(fitments.productId, id)))
    .returning({
      id: fitments.id,
      verified: fitments.verified,
      verifiedAt: fitments.verifiedAt,
      source: fitments.source,
      notes: fitments.notes,
    });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ data: updated });
}
