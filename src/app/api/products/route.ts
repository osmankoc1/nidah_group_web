import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, categories, fitments, machines, manufacturers } from "@/lib/db/schema";
import { eq, and, ilike, like, isNull, or, desc, count, inArray, sql } from "drizzle-orm";
import { productCache } from "@/lib/product-cache";
import { normalizePartNumber } from "@/lib/part-number";
import { aramaKapisi } from "@/lib/search-gate";

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
async function urunListesiSorgusu(
  search: string | null,
  condition: string | null,
  brand: string | null,
  page: number,
  limit: number
) {
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

/**
 * Aynı sorgunun ÖNBELLEKLİ hâli. Yalnızca `aramaKapisi()` "onbellekli" dediği
 * durumlarda çağrılır; aksi hâlde `urunListesiSorgusu` doğrudan çalıştırılır ve
 * KALICI KAYIT OLUŞMAZ. Gerekçe `src/lib/search-gate.ts` başında.
 */
const getProductList = productCache(["public-product-list"], urunListesiSorgusu);

/**
 * ── ONBELLEK ANAHTAR UZAYINI SINIRLA (2026-11-25, Aşama 3) ──────────────────
 * `getProductList` bir `unstable_cache` sarmalayıcısıdır ve anahtarı
 * ARGÜMANLARINDAN üretilir. Argümanlar doğrudan sorgu dizesinden gelirse
 * anahtar uzayı SINIRSIZ olur: `?search=<rastgele>` veya `?page=999999` ile
 * bir bot sınırsız sayıda önbellek kaydı (Vercel Data Cache yazması) ve
 * derin `OFFSET` taraması üretebilir. Aşağıdaki sınırlar bunu kapatır:
 *
 *  • `search`  — baştaki/sondaki boşluk atılır, içteki boşluklar tek boşluğa
 *    indirilir, 32 karakterle kesilir. Harf/rakam içermiyorsa arama YOK
 *    sayılır (çöp sorgu veritabanına inmez). BÜYÜK/küçük harf DEĞİŞTİRİLMEZ:
 *    Türkçe'de `I/ı` eşlemesi `ILIKE` sonucunu bozabilirdi.
 *  • `condition` — önbelleğe gitmeden doğrulanır, geçersizse `null`. Böylece
 *    bu eksen yalnızca 4 değer alır (eskiden serbest metindi).
 *  • `brand` — 40 karakterle kesilir.
 *  • `page` — 1..500 arasına sıkıştırılır. 24'lük sayfalarla bu 12.000.
 *    ürüne kadar erişimdir; daha derin sayfalama `OFFSET` taraması olduğu
 *    için zaten verimsizdir (ölçeklenebilir çözüm: keyset sayfalama).
 *  • `limit` — 1..48 (değişmedi).
 */
const SAYFA_UST_SINIRI = 500;
const ARAMA_UZUNLUK_SINIRI = 32;
const MARKA_UZUNLUK_SINIRI = 40;
const GECERLI_DURUMLAR = ["new", "used", "remanufactured"] as const;

function aramaNormalize(ham: string | null): string | null {
  if (!ham) return null;
  const sade = ham.trim().replace(/\s+/g, " ").slice(0, ARAMA_UZUNLUK_SINIRI);
  if (sade.length < 2) return null;
  // Hiç harf/rakam yoksa anlamlı bir arama değildir.
  if (!/[\p{L}\p{N}]/u.test(sade)) return null;
  return sade;
}

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const search    = aramaNormalize(searchParams.get("search"));
  const hamDurum  = searchParams.get("condition");
  const condition = hamDurum && (GECERLI_DURUMLAR as readonly string[]).includes(hamDurum)
    ? hamDurum
    : null;
  const brand     = searchParams.get("brand")?.trim().toUpperCase().slice(0, MARKA_UZUNLUK_SINIRI) || null;
  const page      = Math.min(SAYFA_UST_SINIRI, Math.max(1, Number(searchParams.get("page")) || 1));
  const limit     = Math.min(48, Math.max(1, Number(searchParams.get("limit")) || 24));

  try {
    // ── ARAMA KAPISI (2026-11-26) ──────────────────────────────────────────
    // Yukarıdaki sınırlar anahtar BOYUTUNU kıstırır, SAYISINI kıstırmaz:
    // ölçümde 600 farklı bot sorgusu 604 KALICI önbellek kaydı üretti. Kapı
    // her aramayı üç kademeye ayırır (gerekçe: src/lib/search-gate.ts).
    const karar = await aramaKapisi(search);

    if (karar.tur === "bos") {
      // Eşleşme KANITLI olarak imkânsız: Neon'a inilmez, kayıt yazılmaz.
      return NextResponse.json(
        { data: [], meta: { page: 1, limit, total: 0, pages: 0 } },
        { headers: { "Cache-Control": CDN_CACHE, "X-Arama-Kapi": `bos:${karar.neden}` } }
      );
    }

    const result = karar.tur === "onbellekli"
      ? await getProductList(search, condition, brand, page, limit)
      : await urunListesiSorgusu(search, condition, brand, page, limit);

    if (!result) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": CDN_CACHE,
        "X-Arama-Kapi": `${karar.tur}:${karar.neden}`,
      },
    });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
