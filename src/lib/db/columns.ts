/**
 * Açık kolon kümeleri — DEPLOY SIRASI BAĞIMLILIĞINI KIRAR.
 *
 * SORUN: Drizzle'ın `db.select().from(products)` ve `.returning()` çağrıları
 * yıldız (`*`) ÜRETMEZ; `schema.ts`'teki kolonları SQL'e tek tek yazar.
 * Dolayısıyla `schema.ts`'e yeni bir kolon eklendiği anda, o kolon henüz
 * veritabanında yoksa bu sorgular `column … does not exist` ile 500 döner.
 * Proje CLAUDE.md §5 bu yüzden "migration ÖNCE, kod SONRA" diyor ve o pencerede
 * admin ürün yazma işlemlerinin dondurulmasını istiyor.
 *
 * ÇÖZÜM: sorgular artık bu sabitlerdeki AÇIK listeyi kullanır. Faz 2 kolonları
 * `schema.ts`'e eklenince bu listeler DEĞİŞMEZ, dolayısıyla eski sorgular
 * migration'dan önce de sonra da çalışır. Böylece kod, migration'dan önce
 * deploy edilse bile kırılmaz (yine de doğru sıra migration ÖNCE'dir).
 *
 * KURAL: yeni bir kolonu buraya eklemek, o kolonun veritabanında bulunduğunu
 * garanti ettikten SONRA yapılır. Eklemek bilinçli bir karardır, varsayılan değil.
 */
import { fitments, oemNumbers, productImages, products } from "@/lib/db/schema";

/**
 * `products` tablosunun Faz 1 kolon kümesi.
 * Admin API yanıt sözleşmesi bire bir korunur — eskiden yıldız select bu
 * kolonları döndürüyordu.
 */
export const PRODUCT_COLUMNS_V1 = {
  id:                   products.id,
  partNumber:           products.partNumber,
  partNumberNormalized: products.partNumberNormalized,
  name:                 products.name,
  description:          products.description,
  condition:            products.condition,
  categoryId:           products.categoryId,
  weight:               products.weight,
  notes:                products.notes,
  isActive:             products.isActive,
  inStock:              products.inStock,
  createdAt:            products.createdAt,
  updatedAt:            products.updatedAt,
} as const;

/**
 * `products` tablosunun FAZ 2 kolon kümesi — V1 + `drizzle/0008` kolonları.
 *
 * Kullanılabilirlik koşulu: `0008` hedef veritabanında UYGULANMIŞ olmalı.
 * Production'da 2026-11-12'de uygulandı ve doğrulandı; bu yüzden admin
 * yolları artık bu kümeyi kullanır. Public okuma yolları `queries/product.ts`
 * içinde kendi daraltılmış kümesini kullanır.
 */
export const PRODUCT_COLUMNS_V2 = {
  ...PRODUCT_COLUMNS_V1,
  partManufacturer:     products.partManufacturer,
  sourcingType:         products.sourcingType,
  stockStatus:          products.stockStatus,
  stockStatusUpdatedAt: products.stockStatusUpdatedAt,
  shortDescription:     products.shortDescription,
  longDescription:      products.longDescription,
  metaTitle:            products.metaTitle,
  metaDescription:      products.metaDescription,
  seoReady:             products.seoReady,
  seoReadyAt:           products.seoReadyAt,
} as const;

/**
 * `products` tablosunun FAZ 3 kolon kümesi — V2 + `drizzle/0010` kolonları.
 *
 * YALNIZCA YÖNETİM PANELİ. `internal_stock_code` Logo İşbaşı'nın iç stok
 * kodudur; public ürün sayfalarında, SEO verisinde veya OEM numarası olarak
 * GÖSTERİLMEZ (kullanıcı kararı, Faz 3).
 *
 * Bu yüzden public okuma yolları V1'i veya `queries/product.ts` içindeki
 * daraltılmış kümeyi kullanmaya devam eder; bu küme oraya SIZMAMALIDIR.
 * `tests/schema-phase3.spec.ts` bunu kilitler.
 *
 * Kullanılabilirlik koşulu: `0010` hedef veritabanında UYGULANMIŞ olmalı.
 * Dev'de 2026-11-13'te uygulandı ve doğrulandı. Production'da HENÜZ YOK —
 * bu yüzden bu kümeyi kullanan yollar production'a deploy EDİLMEDEN ÖNCE
 * 0010 production'a uygulanmak zorundadır (proje CLAUDE.md §5: migration ÖNCE).
 */
export const PRODUCT_COLUMNS_V3 = {
  ...PRODUCT_COLUMNS_V2,
  internalStockCode:           products.internalStockCode,
  internalStockCodeNormalized: products.internalStockCodeNormalized,
} as const;

/**
 * `products` tablosunun FAZ 2 (admin) kolon kümesi — V3 + `drizzle/0012`.
 *
 * YALNIZCA YÖNETİM PANELİ. `is_synthetic` bir iç ayrımdır: public ürün
 * sayfasında, public API'de, SEO verisinde veya sitemap'te GÖSTERİLMEZ.
 * Bu yüzden public okuma yolları V1'i ya da `queries/product.ts` içindeki
 * daraltılmış kümeyi kullanmaya devam eder; bu küme oraya SIZMAMALIDIR.
 * `tests/schema-phase4.spec.ts` bunu kilitler.
 *
 * Kullanılabilirlik koşulu: `0012` hedef veritabanında UYGULANMIŞ olmalı.
 * Dev'de 2026-11-17'de uygulandı. Production'da HENÜZ YOK.
 */
export const PRODUCT_COLUMNS_V4 = {
  ...PRODUCT_COLUMNS_V3,
  isSynthetic: products.isSynthetic,
} as const;

/** `fitments` tablosunun Faz 1 kolon kümesi. */
export const FITMENT_COLUMNS_V1 = {
  id:               fitments.id,
  productId:        fitments.productId,
  machineId:        fitments.machineId,
  machineVariantId: fitments.machineVariantId,
  notes:            fitments.notes,
  createdAt:        fitments.createdAt,
} as const;

/** `oem_numbers` tablosunun Faz 1 kolon kümesi. */
export const OEM_NUMBER_COLUMNS_V1 = {
  id:               oemNumbers.id,
  productId:        oemNumbers.productId,
  oemNumber:        oemNumbers.oemNumber,
  numberNormalized: oemNumbers.numberNormalized,
  type:             oemNumbers.type,
  manufacturer:     oemNumbers.manufacturer,
  note:             oemNumbers.note,
  createdAt:        oemNumbers.createdAt,
} as const;

/** `fitments` + `drizzle/0008` dogrulama kolonlari. */
export const FITMENT_COLUMNS_V2 = {
  ...FITMENT_COLUMNS_V1,
  verified:   fitments.verified,
  verifiedAt: fitments.verifiedAt,
  source:     fitments.source,
} as const;

/** `oem_numbers` + `drizzle/0008` dogrulama kolonlari. */
export const OEM_NUMBER_COLUMNS_V2 = {
  ...OEM_NUMBER_COLUMNS_V1,
  verified:   oemNumbers.verified,
  verifiedAt: oemNumbers.verifiedAt,
  source:     oemNumbers.source,
} as const;

/**
 * `product_images` tablosunun 0011 ÖNCESİ kolon kümesi.
 *
 * Eskiden bu tablonun sorguları `db.select().from(productImages)` ile yıldız
 * gibi görünüyordu; aslında Drizzle kolonları tek tek yazıyordu. `schema.ts`'e
 * 0011 kolonları eklendiği an bu sorgular 0011 uygulanmamış bir veritabanında
 * `column … does not exist` ile 500 dönerdi. Bu küme o bağımlılığı kırar.
 */
export const PRODUCT_IMAGE_COLUMNS_V1 = {
  id:            productImages.id,
  productId:     productImages.productId,
  cloudinaryId:  productImages.cloudinaryId,
  cloudinaryUrl: productImages.cloudinaryUrl,
  sortOrder:     productImages.sortOrder,
  isPrimary:     productImages.isPrimary,
  createdAt:     productImages.createdAt,
} as const;

/**
 * `product_images` + `drizzle/0011` doğrulama / ALT / kaynak kolonları.
 *
 * Kullanılabilirlik koşulu: `0011` hedef veritabanında UYGULANMIŞ olmalı.
 * Dev'de 2026-11-17'de uygulandı ve doğrulandı. Production'da HENÜZ YOK —
 * bu kümeyi kullanan yollar production'a deploy EDİLMEDEN ÖNCE 0011
 * production'a uygulanmak zorundadır (proje CLAUDE.md §5).
 */
export const PRODUCT_IMAGE_COLUMNS_V2 = {
  ...PRODUCT_IMAGE_COLUMNS_V1,
  verified:   productImages.verified,
  verifiedAt: productImages.verifiedAt,
  verifiedBy: productImages.verifiedBy,
  altText:    productImages.altText,
  sourceNote: productImages.sourceNote,
} as const;
