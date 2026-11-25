import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, categories, fitments, machines, manufacturers } from "@/lib/db/schema";
import { eq, and, ilike, like, isNull, or, desc, count, inArray, sql } from "drizzle-orm";
import { productCache } from "@/lib/product-cache";
import { normalizePartNumber } from "@/lib/part-number";

/**
 * Public ürün listesi.
 *
 * ── ÖNBELLEK (2026-11-24, bulgu B9) ──────────────────────────────────────────
 * İki katman:
 *  1. CDN — aşağıdaki `Cache-Control`. 60 sn → 600 sn'ye çıkarıldı: ürün
 *     verisi dakikalar içinde değişmiyor ve değiştiğinde admin yazma yolu
 *     `revalidateProducts()` çağırarak ikinci katmanı düşürüyor.
 *  2. Veri önbelleği — `productCache`. CDN'de olmayan bir filtre/arama/sayfa
 *     kombinasyonu sunucuya gelse bile Neon'a İNMEZ. Kayıt süreyle eskimez
 *     (`revalidate: false`); tek tazeleme yolu `PRODUCTS_CACHE_TAG`'dir.
 *
 * Bu ikinci katman 5.000–50.000 ürünlük katalogda belirleyicidir: arama
 * trafiği aksi hâlde compute'u iş saatleri boyunca uyanık tutar.
 */

const CDN_CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

/** Tek round-trip grubu: liste + toplam + görseller + markalar. */
const getProductList = productCache(
  ["public-product-list"],
  async (
    search: string | null,
    condition: string | null,
    brand: string | null,
    page: number,
    limit: number
  ) => {
    if (!db) return null;

    const offset = (page - 1) * limit;
    const conditions = [eq(products.isActive, true)];

    if (search) {
      // ── ARAMA (2026-11-24, bulgu B7) ────────────────────────────────────
      // Parça numarası artık NORMALİZE kolon üzerinden aranır:
      //  • "76281", "ch 76281", "CH-76281" → hepsi "CH76281" ile eşleşir
      //    (eskiden ham kolonda arandığı için "ch76281" eşleşmiyordu).
      //  • `drizzle/0014` trigram indeksi bu deseni indeksle karşılar;
      //    o migration uygulanmadan da sonuç DOĞRUdur, yalnızca yavaştır.
      // Normalize değeri NULL olan 0006 öncesi satırlar için ham kolona
      // düşülür (kısmi trigram indeksi aynı migration'da).
      const normalizedSearch = normalizePartNumber(search);
      const partNumberMatches = normalizedSearch
        ? [
            like(products.partNumberNormalized, `%${normalizedSearch}%`),
            and(
              isNull(products.partNumberNormalized),
              ilike(products.partNumber, `%${search}%`)
            )!,
          ]
        : [ilike(products.partNumber, `%${search}%`)];

      conditions.push(
        or(...partNumberMatches, ilike(products.name, `%${search}%`))!
      );
    }
    if (condition && ["new", "used", "remanufactured"].includes(condition)) {
      conditions.push(eq(products.condition, condition as "new" | "used" | "remanufactured"));
    }

    // Brand filter: products that have fitments linked to a manufacturer matching the brand name
    if (brand) {
      const brandProductIds = await db
        .selectDistinct({ productId: fitments.productId })
        .from(fitments)
        .innerJoin(machines,      eq(fitments.machineId,      machines.id))
        .innerJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
        .where(sql`UPPER(${manufacturers.name}) = ${brand}`);
      const brandIds = brandProductIds.map((r) => r.productId);
      if (brandIds.length === 0) {
        return { data: [], meta: { page: 1, limit, total: 0, pages: 0 } };
      }
      conditions.push(inArray(products.id, brandIds));
    }

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:           products.id,
          partNumber:   products.partNumber,
          name:         products.name,
          description:  products.description,
          condition:    products.condition,
          // Stok OTORITESI. `in_stock` geriye uyumluluk icin de dondurulur.
          stockStatus:  products.stockStatus,
          inStock:      products.inStock,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    const ids = rows.map((r) => r.id);

    // Batch 1 — primary images
    const imageMap: Record<string, string> = {};
    // Batch 2 — unique brand names per product (via fitments → machines → manufacturers)
    const brandMap: Record<string, string[]> = {};

    if (ids.length > 0) {
      const [imgs, brandRows] = await Promise.all([
        db
          .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
          .from(productImages)
        // YALNIZCA DOGRULANMIS GORSELLER (karar K2). Yuklenmis ama bu parcayi
        // gosterdigi teyit edilmemis bir dosya public yuzeye CIKMAZ: Google
        // merchant listing kurali "Images must represent the marked up
        // content." Dogrulanmamis fotograf yalnizca yonetim panelinde gorunur.
          .where(
            and(
              eq(productImages.isPrimary, true),
              eq(productImages.verified, true),
              inArray(productImages.productId, ids)
            )
          ),
        db
          .select({ productId: fitments.productId, brandName: manufacturers.name })
          .from(fitments)
          .innerJoin(machines,      eq(fitments.machineId,      machines.id))
          .innerJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
          .where(inArray(fitments.productId, ids)),
      ]);

      for (const img of imgs) imageMap[img.productId] = img.url;

      for (const row of brandRows) {
        if (!brandMap[row.productId]) brandMap[row.productId] = [];
        if (!brandMap[row.productId].includes(row.brandName)) {
          brandMap[row.productId].push(row.brandName);
        }
      }
    }

    const data = rows.map((r) => ({
      id:           r.id,
      partNumber:   r.partNumber,
      name:         r.name,
      description:  r.description,
      condition:    r.condition,
      stockStatus:  r.stockStatus,
      inStock:      r.inStock,
      categoryName: r.categoryName ?? null,
      imageUrl:     imageMap[r.id] ?? null,
      brands:       brandMap[r.id] ?? [],
    }));

    const totalNum = Number(total);
    return {
      data,
      meta: { page, limit, total: totalNum, pages: Math.ceil(totalNum / limit) },
    };
  }
);

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const search    = searchParams.get("search")?.trim() || null;
  const condition = searchParams.get("condition");
  const brand     = searchParams.get("brand")?.trim().toUpperCase() || null;
  const page      = Math.max(1, Number(searchParams.get("page"))  || 1);
  const limit     = Math.min(48, Math.max(1, Number(searchParams.get("limit")) || 24));

  try {
    const result = await getProductList(search, condition, brand, page, limit);
    if (!result) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": CDN_CACHE } });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
