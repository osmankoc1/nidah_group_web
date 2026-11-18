import { cache } from "react";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers, machineVariants, oemNumbers,
  productTranslations,
} from "@/lib/db/schema";
import { eq, and, asc, isNull, sql } from "drizzle-orm";
import { normalizePartNumber } from "@/lib/part-number";
import { productLookupKey } from "@/lib/product-url";
import type { ProductTranslationRow } from "@/lib/product-i18n";
import type { PartNumberType } from "@/lib/verification";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  cloudinaryUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  /**
   * Operatorun yazdigi ALT metni (`drizzle/0011`). Google Images belgesi ALT'i
   * "en onemli ozellik" olarak tanimlar. Dogrulanmis gorselde bu alan NULL
   * OLAMAZ (DB kisiti), bu yuzden public yuzeyde her zaman doludur.
   */
  altText: string | null;
}

export interface FitmentRow {
  id: string;
  manufacturerName: string;
  machineModel: string;
  machineType: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  variantName: string | null;
  notes: string | null;
  /** Faz 2: uyumluluk bir insan tarafindan dogrulandi mi? */
  verified: boolean;
  /** Dogrulamanin dayanagi. */
  source: string | null;
}

export interface OemRow {
  oemNumber: string;
  manufacturer: string | null;
  /** Numaranin urunle iliskisinin cinsi (oem / cross_ref / ...). */
  type: PartNumberType;
  /** Faz 2: numara dogrulandi mi? */
  verified: boolean;
  note: string | null;
}

export interface ProductDetail {
  id: string;
  /** Görünen kanonik değer — "CH 76281". Asla değiştirilmez. */
  partNumber: string;
  name: string;
  description: string | null;
  condition: "new" | "used" | "remanufactured";
  inStock: boolean;
  weight: number | null;
  categoryName: string | null;

  // ── Faz 2 (drizzle/0008) ───────────────────────────────────────────────────
  /** PARCANIN KENDI ureticisi. Uyumlu makine markasindan BAGIMSIZ. */
  partManufacturer: string | null;
  sourcingType: "unknown" | "oem" | "oem_equivalent" | "aftermarket";
  /** Stok OTORITESI. `in_stock` boolean'i legacy'dir. */
  stockStatus: "unknown" | "in_stock" | "on_order";
  shortDescription: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  /** Yayin kapisi — false iken sayfa noindex alir ve sitemap'e girmez. */
  seoReady: boolean;

  images: ProductImage[];
  fitments: FitmentRow[];
  oemNumbers: OemRow[];
  /** Yalnizca var olan ceviri satirlari; yayin kontrolu product-i18n'de. */
  translations: ProductTranslationRow[];
}

// ── Kimlik araması ────────────────────────────────────────────────────────────
//
// Denetim C3: eski kod yalnızca `part_number` üzerinde TAM EŞİTLİK arıyordu
// (`rawPartNumber.toUpperCase()`), bu yüzden `/parca-katalog/ch-76281` ürün
// veritabanında olsa bile 404 dönüyordu. Artık arama `uq_products_pn_norm`
// index'li `part_number_normalized` kolonu üzerinden yapılır.
//
// İKİ AŞAMALI: 0006 backfill'i öncesinden ya da `part_number_normalized`
// yazmayan eski import'lardan kalan NULL satırlar da bulunur. Geri dönüş
// sorgusu `IS NULL` ile SINIRLIDIR — index'li yol her zaman önce denenir,
// tam tarama yalnızca eski artıklar için ve yalnızca gerektiğinde çalışır.
//
// SQL normalizasyonu TS ile birebir aynı olmalıdır: ÖNCE alfanümerik olmayanı
// sil, SONRA büyük harfe çevir (drizzle/0006, src/lib/part-number.ts).

const PRODUCT_COLUMNS = {
  id:           products.id,
  partNumber:   products.partNumber,
  name:         products.name,
  description:  products.description,
  condition:    products.condition,
  inStock:      products.inStock,
  weight:       products.weight,
  categoryName: categories.name,
  // Faz 2
  partManufacturer: products.partManufacturer,
  sourcingType:     products.sourcingType,
  stockStatus:      products.stockStatus,
  shortDescription: products.shortDescription,
  longDescription:  products.longDescription,
  metaTitle:        products.metaTitle,
  metaDescription:  products.metaDescription,
  seoReady:         products.seoReady,
} as const;

async function findProductRow(normalized: string) {
  if (!db || !normalized) return null;

  const [indexed] = await db
    .select(PRODUCT_COLUMNS)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.partNumberNormalized, normalized),
        eq(products.isActive, true)
      )
    )
    .limit(1);

  if (indexed) return indexed;

  const [legacy] = await db
    .select(PRODUCT_COLUMNS)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        isNull(products.partNumberNormalized),
        eq(products.isActive, true),
        sql`upper(regexp_replace(${products.partNumber}, '[^A-Za-z0-9]', '', 'g')) = ${normalized}`
      )
    )
    .limit(1);

  return legacy ?? null;
}

async function loadDetail(normalized: string): Promise<ProductDetail | null> {
  if (!db) return null;
  try {
    const product = await findProductRow(normalized);
    if (!product) return null;

    const [imageRows, fitmentsRows, oems, translationRows] = await Promise.all([
      db
        .select({
          id:            productImages.id,
          cloudinaryUrl: productImages.cloudinaryUrl,
          isPrimary:     productImages.isPrimary,
          sortOrder:     productImages.sortOrder,
          altText:       productImages.altText,
        })
        .from(productImages)
        // YALNIZCA DOGRULANMIS GORSELLER (karar K2). Yuklenmis ama bu parcayi
        // gosterdigi teyit edilmemis bir dosya public yuzeye CIKMAZ: Google
        // merchant listing kurali "Images must represent the marked up
        // content." Dogrulanmamis fotograf yalnizca yonetim panelinde gorunur.
        .where(
          and(
            eq(productImages.productId, product.id),
            eq(productImages.verified, true)
          )
        )
        .orderBy(asc(productImages.sortOrder)),
      db
        .select({
          id:              fitments.id,
          manufacturerName: manufacturers.name,
          machineModel:    machines.model,
          machineType:     machines.type,
          yearFrom:        machines.yearFrom,
          yearTo:          machines.yearTo,
          variantName:     machineVariants.variantName,
          notes:           fitments.notes,
          verified:        fitments.verified,
          source:          fitments.source,
        })
        .from(fitments)
        .innerJoin(machines,       eq(fitments.machineId,        machines.id))
        .innerJoin(manufacturers,  eq(machines.manufacturerId,   manufacturers.id))
        .leftJoin(machineVariants, eq(fitments.machineVariantId, machineVariants.id))
        .where(eq(fitments.productId, product.id))
        .orderBy(asc(manufacturers.name), asc(machines.model)),
      db
        .select({
          oemNumber:    oemNumbers.oemNumber,
          manufacturer: oemNumbers.manufacturer,
          type:         oemNumbers.type,
          verified:     oemNumbers.verified,
          note:         oemNumbers.note,
        })
        .from(oemNumbers)
        .where(eq(oemNumbers.productId, product.id)),
      db
        .select({
          locale:           productTranslations.locale,
          published:        productTranslations.published,
          name:             productTranslations.name,
          shortDescription: productTranslations.shortDescription,
          longDescription:  productTranslations.longDescription,
          metaTitle:        productTranslations.metaTitle,
          metaDescription:  productTranslations.metaDescription,
        })
        .from(productTranslations)
        .where(eq(productTranslations.productId, product.id)),
    ]);

    return {
      ...product,
      categoryName: product.categoryName ?? null,
      images:       imageRows,
      fitments:     fitmentsRows,
      oemNumbers:   oems,
      translations: translationRows,
    };
  } catch {
    return null;
  }
}

/**
 * URL segmentinden ürünü çözer — public rota için TEK giriş noktası.
 *
 *   "ch-76281"      → "CH 76281"
 *   "CH%2076281"    → "CH 76281"   (eski yüzde-kodlu linkler)
 *   "CH-76281"      → "CH 76281"
 *
 * Segment yalnızca noktalama içeriyorsa (`normalizePartNumber` boş döner)
 * sorgu HİÇ çalıştırılmaz ve `null` döner → çağıran taraf 404 verir.
 */
export const getProductBySegment = cache(
  async (rawSegment: string): Promise<ProductDetail | null> =>
    loadDetail(productLookupKey(rawSegment))
);

/**
 * Serbest biçimli bir parça numarasından ürünü çözer (API uçları için).
 * Artık `getProductBySegment` ile AYNI normalizasyonu kullanır.
 */
export const getProductByPartNumber = cache(
  async (rawPartNumber: string): Promise<ProductDetail | null> =>
    loadDetail(normalizePartNumber(rawPartNumber))
);
