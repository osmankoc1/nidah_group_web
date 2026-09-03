import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, productConditionEnum } from "@/lib/db/schema";
import { eq, desc, ilike, or, and, inArray, count } from "drizzle-orm";
import { normalizePartNumber } from "@/lib/part-number";

/** Şema enum'unun tek kaynağı — elle yazılmış bir kopya tutulmaz. */
const CONDITIONS = productConditionEnum.enumValues;
type Condition = (typeof CONDITIONS)[number];

/**
 * Ucuz veri bütünlüğü doğrulamaları. SEO/hazırlık kontrolleri BURADA DEĞİL —
 * açıklama/kategori/görsel/uyumluluk eksikliği kaydetmeyi engellemez.
 */
function validateCondition(value: unknown): { ok: true; value: Condition } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: "new" };
  if (typeof value === "string" && (CONDITIONS as readonly string[]).includes(value)) {
    return { ok: true, value: value as Condition };
  }
  return { ok: false, error: `Invalid condition. Allowed values: ${CONDITIONS.join(", ")}` };
}

function validateWeight(value: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Invalid weight. Must be a finite number greater than or equal to 0." };
  }
  return { ok: true, value: n };
}

/**
 * Parça numarası benzersizliğini koruyan İKİ index vardır:
 *   uq_products_part_number → ham kanonik değer
 *   uq_products_pn_norm     → normalize edilmiş kimlik
 * İkisi de aynı kullanıcı hatasını temsil eder.
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

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(products.partNumber, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )
      );
    }
    if (active === "true")  conditions.push(eq(products.isActive, true));
    if (active === "false") conditions.push(eq(products.isActive, false));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:         products.id,
          partNumber: products.partNumber,
          name:       products.name,
          condition:  products.condition,
          isActive:   products.isActive,
          inStock:    products.inStock,
          categoryId: products.categoryId,
          createdAt:  products.createdAt,
        })
        .from(products)
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    // Batch-fetch primary images for this page — single query, no N+1
    const ids = rows.map((r) => r.id);
    const imageMap: Record<string, string> = {};
    if (ids.length > 0) {
      const imgs = await db
        .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
        .from(productImages)
        .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, ids)));
      for (const img of imgs) imageMap[img.productId] = img.url;
    }

    const data = rows.map((r) => ({ ...r, primaryImageUrl: imageMap[r.id] ?? null }));

    return NextResponse.json({
      data,
      meta: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { partNumber, name, description, condition, categoryId, weight, notes } = body;

    if (!partNumber?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "partNumber and name are required" }, { status: 400 });
    }

    // Kanonik değer — mevcut davranış korunur (trim + uppercase).
    const canonicalPartNumber = String(partNumber).trim().toUpperCase();
    // Kimlik anahtarı — kanonik değerle AYNI istekte, atomik olarak yazılır.
    const normalized = normalizePartNumber(canonicalPartNumber);

    if (!normalized) {
      return NextResponse.json(
        { error: "Part number must contain at least one letter or digit." },
        { status: 400 }
      );
    }

    const cond = validateCondition(condition);
    if (!cond.ok) return NextResponse.json({ error: cond.error }, { status: 400 });

    const w = validateWeight(weight);
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 });

    // Kimlik çakışması normalize değere göre belirlenir:
    // "CH 76281", "CH-76281" ve "ch76281" AYNI üründür.
    // (Bu ön kontrol kullanıcıya net mesaj vermek içindir; yarış koşullarına
    //  karşı nihai garanti uq_products_pn_norm index'idir — aşağıdaki catch.)
    const [clash] = await db
      .select({ partNumber: products.partNumber })
      .from(products)
      .where(eq(products.partNumberNormalized, normalized))
      .limit(1);

    if (clash) {
      return NextResponse.json({ error: duplicateMessage(clash.partNumber) }, { status: 409 });
    }

    const [product] = await db
      .insert(products)
      .values({
        partNumber: canonicalPartNumber,
        partNumberNormalized: normalized,
        name: name.trim(),
        description: description?.trim() || null,
        condition: cond.value,
        categoryId: categoryId || null,
        weight: w.value,
        notes: notes?.trim() || null,
      })
      .returning();

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err: unknown) {
    if (isPartNumberConflict(err)) {
      return NextResponse.json({ error: duplicateMessage() }, { status: 409 });
    }
    console.error("[POST /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
