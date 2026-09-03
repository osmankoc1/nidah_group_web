import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products, productImages, fitments, oemNumbers, productConditionEnum,
} from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { destroyFromCloudinary } from "@/lib/cloudinary";
import { normalizePartNumber } from "@/lib/part-number";

type Params = { params: Promise<{ id: string }> };

/** Şema enum'unun tek kaynağı — elle yazılmış bir kopya tutulmaz. */
const CONDITIONS = productConditionEnum.enumValues;

/**
 * Ucuz veri bütünlüğü doğrulamaları. SEO/hazırlık kontrolleri BURADA DEĞİL —
 * açıklama/kategori/görsel/uyumluluk eksikliği kaydetmeyi engellemez.
 */
function conditionError(value: unknown): string | null {
  if (typeof value === "string" && (CONDITIONS as readonly string[]).includes(value)) return null;
  return `Invalid condition. Allowed values: ${CONDITIONS.join(", ")}`;
}

function weightError(value: unknown): string | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return "Invalid weight. Must be a finite number greater than or equal to 0.";
  }
  return null;
}

/**
 * Parça numarası benzersizliğini koruyan İKİ index vardır:
 *   uq_products_part_number → ham kanonik değer
 *   uq_products_pn_norm     → normalize edilmiş kimlik
 */
function isPartNumberConflict(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes("uq_products_part_number") ||
    err.message.includes("uq_products_pn_norm")
  );
}

/** Admin'e gösterilen mesaj — constraint adı veya DB detayı SIZDIRILMAZ. */
function duplicateMessage(existingPartNumber?: string): string {
  return existingPartNumber
    ? `This part number is already registered as "${existingPartNumber}". ` +
      "Spacing and punctuation are ignored when comparing part numbers."
    : "This part number is already registered. " +
      "Spacing and punctuation are ignored when comparing part numbers.";
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [images, fitmentsRows, oems] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, id)),
      db.select().from(fitments).where(eq(fitments.productId, id)),
      db.select().from(oemNumbers).where(eq(oemNumbers.productId, id)),
    ]);

    return NextResponse.json({ data: { ...product, images, fitments: fitmentsRows, oemNumbers: oems } });
  } catch (err) {
    console.error("[GET /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const body = await request.json();
    const allowedFields = ["name", "description", "condition", "categoryId", "weight", "notes", "isActive", "inStock", "partNumber"];
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if ("condition" in body) {
      const err = conditionError(body.condition);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
    if ("weight" in body) {
      const err = weightError(body.weight);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "partNumber") {
          // Kanonik değer — mevcut davranış korunur (trim + uppercase).
          updates.partNumber = String(body[field]).trim().toUpperCase();
        } else if (field === "weight") {
          updates.weight = body[field] === null || body[field] === "" ? null : Number(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    // partNumber değiştiyse kimlik anahtarı AYNI update içinde, atomik yazılır.
    if ("partNumber" in body) {
      const normalized = normalizePartNumber(updates.partNumber as string);
      if (!normalized) {
        return NextResponse.json(
          { error: "Part number must contain at least one letter or digit." },
          { status: 400 }
        );
      }
      updates.partNumberNormalized = normalized;

      // Kimlik çakışması normalize değere göre; kendi kaydı hariç tutulur.
      // (Nihai garanti uq_products_pn_norm index'idir — aşağıdaki catch.)
      const [clash] = await db
        .select({ partNumber: products.partNumber })
        .from(products)
        .where(and(eq(products.partNumberNormalized, normalized), ne(products.id, id)))
        .limit(1);

      if (clash) {
        return NextResponse.json({ error: duplicateMessage(clash.partNumber) }, { status: 409 });
      }
    }

    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (isPartNumberConflict(err)) {
      return NextResponse.json({ error: duplicateMessage() }, { status: 409 });
    }
    console.error("[PATCH /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    // 1. Verify product exists
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. Fetch cloudinaryIds before cascade-delete wipes them
    const imgs = await db
      .select({ cloudinaryId: productImages.cloudinaryId })
      .from(productImages)
      .where(eq(productImages.productId, id));

    // 3. Hard delete — DB cascades to product_images, fitments, oem_numbers automatically
    await db.delete(products).where(eq(products.id, id));

    // 4. Delete Cloudinary assets (best-effort — don't fail the response if this errors)
    if (imgs.length > 0) {
      Promise.allSettled(imgs.map((img) => destroyFromCloudinary(img.cloudinaryId))).catch(
        (err) => console.warn("[DELETE products] Cloudinary cleanup partial failure", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
