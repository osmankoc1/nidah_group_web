import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  PUBLIC_VISIBILITY_COLUMNS,
  publicProductConditions,
  publicProductWhere,
} from "@/lib/public-visibility";

/**
 * PUBLIC GÖRÜNÜRLÜK = `is_active` VE `seo_ready` (kullanıcı şartı 2026-11-26).
 *
 * Ölçülen eski davranış: public sorgular yalnızca `is_active` koşulu
 * taşıyordu; `seo_ready` sadece `sitemap.xml` ve `robots` etiketinde
 * uygulanıyordu. Yani yayın onayı olmayan bir ürün aktifleştirildiği anda
 * katalog listesinde ve ürün sayfasında ERİŞİLEBİLİR oluyordu (200 +
 * noindex). Sitemap'te olmamak indekslenmeyi zorlaştırır, erişimi
 * engellemez.
 *
 * Bu dosya iki şeyi kilitler:
 *   1. Koşulun kendisi — İKİ kolon, ikisi birlikte.
 *   2. Her public sorgu dosyasının bu tek kaynağı kullandığı.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** Public ürün sorgusu YAZAN her dosya. Yeni bir tanesi eklenirse buraya da. */
const PUBLIC_SORGU_DOSYALARI = [
  "src/app/api/products/route.ts",
  "src/app/api/products/[partNumber]/route.ts",
  "src/lib/queries/product.ts",
  "src/lib/search-gate.ts",
  "src/lib/catalog.ts",
  // 2026-11-27 — ölçülen iki ek yüzey:
  //   · marka sayfası YALNIZCA `is_active` süzüyordu (gerçek açık),
  //   · sitemap iki koşulu ELLE yazıyordu (tek kaynak dışı).
  "src/components/catalog/BrandCatalogPage.tsx",
  "src/app/sitemap.ts",
];

test.describe("koşulun kendisi", () => {
  test("iki koşul döner ve kolonlar sabittir", () => {
    expect(publicProductConditions()).toHaveLength(2);
    expect([...PUBLIC_VISIBILITY_COLUMNS]).toEqual(["isActive", "seoReady"]);
  });

  test("üretilen SQL her iki kolonu da içerir", () => {
    const { sql } = new PgDialect().sqlToQuery(publicProductWhere());
    expect(sql).toContain('"is_active"');
    expect(sql).toContain('"seo_ready"');
    // İki koşul VE ile birleşir; biri düşerse metin de değişir.
    expect(sql.toLowerCase()).toContain("and");
  });

  test("tek bir koşula indirgenemez", () => {
    const { sql } = new PgDialect().sqlToQuery(publicProductWhere());
    // Yalnızca aktiflik yazan eski hâl bu testi geçemez.
    expect(sql.includes('"is_active"') && sql.includes('"seo_ready"')).toBe(true);
  });
});

test.describe("tek kaynak kullanımı", () => {
  for (const yol of PUBLIC_SORGU_DOSYALARI) {
    test(`${yol} public-visibility modülünü kullanıyor`, () => {
      const kod = yorumsuz(oku(yol));
      expect(kod).toContain("@/lib/public-visibility");
      expect(kod).toMatch(/publicProduct(Conditions|Where)\(/);
    });

    test(`${yol} aktifliği ELLE yazmıyor`, () => {
      const kod = yorumsuz(oku(yol));
      // `eq(products.isActive, true)` elle yazıldığında yayın onayı şartı
      // sessizce atlanır — kök neden tam buydu.
      expect(kod).not.toContain("eq(products.isActive, true)");
    });
  }
});

test.describe("sitemap ve ürün sayfası ile tutarlılık", () => {
  test("sitemap ürün ve görsel sorguları tek kaynaktan süzüyor", () => {
    const kod = yorumsuz(oku("src/app/sitemap.ts"));
    // Ürün URL'leri + ürün görselleri: iki ayrı sorgu, ikisi de helper'dan.
    const kez = kod.split("...publicProductConditions()").length - 1;
    expect(kez).toBeGreaterThanOrEqual(2);
  });

  test("marka sayfası yayın onayını da süzüyor", () => {
    // Ölçülen eski hâl: `eq(products.isActive, true)` tek başına. Onaysız
    // bir ürün aktifleştirildiği an marka sayfasında LİSTELENİYORDU.
    const kod = yorumsuz(oku("src/components/catalog/BrandCatalogPage.tsx"));
    expect(kod).toContain("...publicProductConditions()");
  });

  test("ürün sayfası onaysız ürün için noindex katmanını koruyor", () => {
    // Artık erişilemez (sorgu süzüyor), ama ikinci katman bilinçli duruyor:
    // sorgu tarafında bir gerileme olursa sayfa yine indekslenmez.
    const kod = yorumsuz(oku("src/app/(public)/parca-katalog/[slug]/page.tsx"));
    expect(kod).toContain("if (!product.seoReady)");
    expect(kod).toContain("index: false");
  });
});
