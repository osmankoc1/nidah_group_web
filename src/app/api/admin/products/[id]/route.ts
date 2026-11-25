import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import {
  products, productImages, fitments, oemNumbers, productConditionEnum, categories,
} from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { destroyFromCloudinary } from "@/lib/cloudinary";
import { normalizePartNumber } from "@/lib/part-number";
import {
  FITMENT_COLUMNS_V2,
  OEM_NUMBER_COLUMNS_V2,
  PRODUCT_COLUMNS_V3,
  PRODUCT_IMAGE_COLUMNS_V2,
} from "@/lib/db/columns";
import { evaluatePublishEligibility } from "@/lib/seo-gate-server";
import {
  FIELD_LIMITS,
  parseInternalStockCode,
  parseOptionalText,
  parseSeoReady,
  parseSourcingType,
  parseStockStatus,
} from "@/lib/product-fields";
import { isUniqueViolation } from "@/lib/db/errors";
import { parseProductCategoryId } from "@/lib/category-tree";

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
  // Drizzle sürücü hatasını sarar; constraint adı `err.cause` zincirindedir,
  // dış hatanın mesajında DEĞİL. Eski `err.message.includes(...)` kontrolü bu
  // yüzden hiç eşleşmiyordu ve 409 yerine 500 dönüyordu. (src/lib/db/errors.ts)
  return isUniqueViolation(err, [
    "uq_products_part_number",
    "uq_products_pn_norm",
    // Dev veritabanı `drizzle-kit push` ile kurulduğu için ad farklı.
    "products_part_number_unique",
  ]);
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
    // Acik kolon listesi: schema.ts'e Faz 2 kolonlari eklendiginde bu sorgu
    // migration'dan once de calismaya devam eder (src/lib/db/columns.ts).
    const [product] = await db
      .select(PRODUCT_COLUMNS_V3)
      .from(products)
      .where(eq(products.id, id));
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [images, fitmentsRows, oems] = await Promise.all([
      db.select(PRODUCT_IMAGE_COLUMNS_V2).from(productImages).where(eq(productImages.productId, id)),
      db.select(FITMENT_COLUMNS_V2).from(fitments).where(eq(fitments.productId, id)),
      db.select(OEM_NUMBER_COLUMNS_V2).from(oemNumbers).where(eq(oemNumbers.productId, id)),
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
    // `categoryId` bu listede DEĞİL: aşağıda ayrıca doğrulanır. Ham geçerse
    // geçersiz bir uuid doğrudan sürücüye gider ve 400 yerine 500 döner.
    const allowedFields = ["name", "description", "condition", "weight", "notes", "isActive", "inStock", "partNumber"];
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // ── Faz 2 alanlari ──────────────────────────────────────────────────────
    // Her alan YALNIZCA govdede varsa guncellenir; boylece kismi PATCH mevcut
    // degerleri sifirlamaz.

    if ("stockStatus" in body) {
      const stock = parseStockStatus(body.stockStatus);
      if (!stock.ok) return NextResponse.json({ error: stock.error }, { status: 400 });
      updates.stockStatus = stock.value;
      // 'unknown' bir insan karari DEGILDIR; damga yalnizca teyitli
      // durumlarda yazilir, 'unknown'a donuste temizlenir.
      updates.stockStatusUpdatedAt = stock.value === "unknown" ? null : new Date();
    }

    if ("sourcingType" in body) {
      const sourcing = parseSourcingType(body.sourcingType);
      if (!sourcing.ok) return NextResponse.json({ error: sourcing.error }, { status: 400 });
      updates.sourcingType = sourcing.value;
    }

    const textFields: Array<[string, number | undefined]> = [
      ["partManufacturer", FIELD_LIMITS.partManufacturer],
      ["shortDescription", FIELD_LIMITS.shortDescription],
      ["longDescription", undefined],
      ["metaTitle", FIELD_LIMITS.metaTitle],
      ["metaDescription", undefined],
    ];
    for (const [field, limit] of textFields) {
      if (!(field in body)) continue;
      const parsed = parseOptionalText(body[field], field, limit);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      updates[field] = parsed.value;
    }

    // ── Faz 3: orijinal Logo stok kodu ──────────────────────────────────────
    // Alan istekte YOKSA dokunulmaz (mevcut deger korunur). Bos string
    // gonderilirse kod temizlenir ve normalize kolon da birlikte temizlenir —
    // ikisi asla ayrisik kalmaz.
    if ("internalStockCode" in body) {
      const parsed = parseInternalStockCode(body.internalStockCode);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      updates.internalStockCode = parsed.value?.code ?? null;
      updates.internalStockCodeNormalized = parsed.value?.normalized ?? null;
    }

    // YAYIN ONAYI — yalnizca acik boolean ile degisir. `true` yapildiginda
    // zaman damgasi yazilir, `false`a donuste temizlenir.
    //
    // DIKKAT: `true` degeri burada SADECE AYRISTIRILIR; yazilabilirligi
    // asagidaki SUNUCU TARAFI KAPI karara baglar (K3). Kapi eskiden YOKTU:
    // bu uc, olcutlere hic bakmadan `seo_ready = true` yaziyordu.
    if ("seoReady" in body) {
      const seo = parseSeoReady(body.seoReady);
      if (!seo.ok) return NextResponse.json({ error: seo.error }, { status: 400 });
      updates.seoReady = seo.value;
      updates.seoReadyAt = seo.value ? new Date() : null;
    }

    // ── Kategori ataması (bulgu P6) ─────────────────────────────────────────
    // `null` "kategori yok" demektir ve geçerli bir seçimdir. Var olmayan
    // kimlik 400 ile reddedilir: yabancı anahtar ihlali 500 üretirdi ve
    // operatör nedenini göremezdi.
    if ("categoryId" in body) {
      const kategori = parseProductCategoryId(body.categoryId);
      if (!kategori.ok) return NextResponse.json({ error: kategori.error }, { status: 400 });
      if (kategori.value) {
        const [varMi] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, kategori.value))
          .limit(1);
        if (!varMi) {
          return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 400 });
        }
      }
      updates.categoryId = kategori.value;
    }

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

    // ── SUNUCU TARAFI YAYIN KAPISI (K3) ────────────────────────────────────
    // `seo_ready = true` yalnizca olcutler karsilandiginda yazilabilir.
    // Olcutler PATCH SONRASI olusacak duruma gore degerlendirilir: ayni
    // istekte `isActive` veya `longDescription` da degisiyorsa YENI degerler
    // kullanilir. Ucun kendisi hic yayina ACMAZ — yalnizca uygun olmayan bir
    // yayin onayini REDDEDER.
    if (updates.seoReady === true) {
      const [mevcut] = await db
        .select({
          isActive: products.isActive,
          partNumber: products.partNumber,
          name: products.name,
          longDescription: products.longDescription,
        })
        .from(products)
        .where(eq(products.id, id));

      if (!mevcut) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const readiness = await evaluatePublishEligibility({
        productId: id,
        isActive:
          updates.isActive !== undefined ? updates.isActive === true : mevcut.isActive,
        partNumber:
          typeof updates.partNumber === "string" ? updates.partNumber : mevcut.partNumber,
        name: typeof updates.name === "string" ? updates.name : mevcut.name,
        longDescription:
          "longDescription" in updates
            ? (updates.longDescription as string | null)
            : mevcut.longDescription,
      });

      if (!readiness.eligible) {
        return NextResponse.json(
          {
            error:
              "Yayin onayi verilemez: yayin olcutleri karsilanmiyor. " +
              "Eksikler giderildikten sonra tekrar deneyin.",
            unmet: readiness.unmet,
            reasons: readiness.reasons,
          },
          { status: 422 }
        );
      }
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning(PRODUCT_COLUMNS_V3);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
    // panelde gorunen veri ile sitede gorunen veri ayrisir.
    revalidateProducts([updated.partNumber]);
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
    // Parça numarası SİLMEDEN ÖNCE okunur: silindikten sonra okunamaz ve o
    // ürünün detay sayfası yolu ayrıca düşürülemez (2026-11-25).
    const [product] = await db
      .select({ id: products.id, partNumber: products.partNumber })
      .from(products)
      .where(eq(products.id, id));
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

    // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
    // panelde gorunen veri ile sitede gorunen veri ayrisir.
    revalidateProducts([product.partNumber]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
