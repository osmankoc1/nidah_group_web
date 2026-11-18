import { test, expect } from "@playwright/test";
import { getTableColumns } from "drizzle-orm";
import {
  fitments,
  oemNumbers,
  productTranslations,
  products,
} from "@/lib/db/schema";

/**
 * Faz 2 şema değişmezleri.
 *
 * Bu testler `schema.ts` ile `drizzle/0008_product_catalog_phase2.sql`
 * arasındaki SÖZLEŞMEYİ kilitler. Varsayılanlar güvenlik gereğidir:
 *   stock_status = 'unknown'  → teyitsiz stok iddiası yapılamaz
 *   seo_ready    = false      → hiçbir ürün otomatik yayına girmez
 *   verified     = false      → hiçbir OEM/uyumluluk doğrulanmış sayılmaz
 * Biri değişirse sessizce teyitsiz iddia yayınlanır; bu yüzden test var.
 */

test.describe("products — Faz 2 kolonları", () => {
  const columns = getTableColumns(products);

  test("yeni kolonlar tanımlı", () => {
    for (const name of [
      "partManufacturer",
      "sourcingType",
      "stockStatus",
      "stockStatusUpdatedAt",
      "shortDescription",
      "longDescription",
      "metaTitle",
      "metaDescription",
      "seoReady",
      "seoReadyAt",
    ]) {
      expect(columns, name).toHaveProperty(name);
    }
  });

  test("SQL kolon adları migration ile aynı", () => {
    expect(columns.partManufacturer.name).toBe("part_manufacturer");
    expect(columns.sourcingType.name).toBe("sourcing_type");
    expect(columns.stockStatus.name).toBe("stock_status");
    expect(columns.seoReady.name).toBe("seo_ready");
    expect(columns.seoReadyAt.name).toBe("seo_ready_at");
  });

  test("stock_status VARSAYILANI 'unknown' ve NOT NULL", () => {
    expect(columns.stockStatus.default).toBe("unknown");
    expect(columns.stockStatus.notNull).toBe(true);
  });

  test("sourcing_type VARSAYILANI 'unknown' ve NOT NULL", () => {
    expect(columns.sourcingType.default).toBe("unknown");
    expect(columns.sourcingType.notNull).toBe(true);
  });

  test("seo_ready VARSAYILANI false ve NOT NULL", () => {
    expect(columns.seoReady.default).toBe(false);
    expect(columns.seoReady.notNull).toBe(true);
  });

  test("içerik kolonları NULL kabul eder — eski INSERT'ler kırılmaz", () => {
    for (const name of [
      "partManufacturer",
      "shortDescription",
      "longDescription",
      "metaTitle",
      "metaDescription",
      "stockStatusUpdatedAt",
      "seoReadyAt",
    ] as const) {
      expect(columns[name].notNull, name).toBe(false);
    }
  });

  test("LEGACY in_stock kolonu KALDIRILMADI (geriye uyumluluk)", () => {
    expect(columns).toHaveProperty("inStock");
    expect(columns.inStock.name).toBe("in_stock");
    expect(columns.inStock.default).toBe(true);
  });

  test("Faz 1 kimlik kolonları değişmedi", () => {
    expect(columns.partNumber.notNull).toBe(true);
    expect(columns.partNumberNormalized.name).toBe("part_number_normalized");
    // 0006 gerekçesi: migration kod deploy'undan once calistigi icin nullable.
    expect(columns.partNumberNormalized.notNull).toBe(false);
  });
});

test.describe("doğrulama kolonları", () => {
  test("oem_numbers.verified varsayılanı false", () => {
    const columns = getTableColumns(oemNumbers);
    expect(columns.verified.name).toBe("verified");
    expect(columns.verified.default).toBe(false);
    expect(columns.verified.notNull).toBe(true);
    expect(columns).toHaveProperty("source");
    expect(columns).toHaveProperty("verifiedAt");
  });

  test("fitments.verified varsayılanı false", () => {
    const columns = getTableColumns(fitments);
    expect(columns.verified.name).toBe("verified");
    expect(columns.verified.default).toBe(false);
    expect(columns.verified.notNull).toBe(true);
    expect(columns).toHaveProperty("source");
    expect(columns).toHaveProperty("verifiedAt");
  });
});

test.describe("product_translations", () => {
  const columns = getTableColumns(productTranslations);

  test("dil başına yayın kapısı varsayılanı false", () => {
    expect(columns.published.name).toBe("published");
    expect(columns.published.default).toBe(false);
    expect(columns.published.notNull).toBe(true);
  });

  test("SLUG KOLONU YOK — ürün URL'i dilden bağımsızdır", () => {
    expect(columns).not.toHaveProperty("slug");
  });

  test("zorunlu alanlar", () => {
    expect(columns.productId.notNull).toBe(true);
    expect(columns.locale.notNull).toBe(true);
    expect(columns.name.notNull).toBe(true);
  });

  test("çeviri metinleri NULL kabul eder — yarı çeviri mümkün", () => {
    for (const name of [
      "shortDescription",
      "longDescription",
      "metaTitle",
      "metaDescription",
      "publishedAt",
    ] as const) {
      expect(columns[name].notNull, name).toBe(false);
    }
  });
});
