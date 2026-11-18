import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import {
  PRODUCT_COLUMNS_V1,
  PRODUCT_COLUMNS_V2,
  PRODUCT_COLUMNS_V3,
  PRODUCT_COLUMNS_V4,
} from "@/lib/db/columns";

/**
 * Faz 2 şema değişmezleri — `drizzle/0012_product_synthetic_flag.sql`.
 *
 * Karar K8: sentetik (test) kayıtları KALICI bir kolonla işaretlenir,
 * desen tahminiyle değil.
 *
 * Buradaki testler üç şeyi kilitler:
 *   1. Kolon var, doğru tipte, NOT NULL ve varsayılanı `false`.
 *   2. `is_synthetic` PUBLIC yüzeye SIZMAZ — yalnızca yönetim kümesinde.
 *   3. Kolon, mevcut `is_active` korumasının YERİNE GEÇMEZ.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");

test.describe("products — Faz 2 (0012) kolonu", () => {
  const columns = getTableColumns(products);

  test("is_synthetic kolonu tanımlı", () => {
    expect(columns).toHaveProperty("isSynthetic");
  });

  test("veritabanı kolon adı migration ile aynı", () => {
    expect(columns.isSynthetic.name).toBe("is_synthetic");
  });

  test("boolean, NOT NULL ve varsayılanı false", () => {
    // Varsayılan `true` olsaydı GERÇEK ürünler sentetik sayılırdı.
    expect(columns.isSynthetic.getSQLType()).toBe("boolean");
    expect(columns.isSynthetic.notNull).toBe(true);
    expect(columns.isSynthetic.hasDefault).toBe(true);
    expect(columns.isSynthetic.default).toBe(false);
  });
});

test.describe("is_synthetic PUBLIC yüzeye sızmaz", () => {
  test("PUBLIC kolon kümelerinde YOK", () => {
    for (const [ad, kume] of [
      ["PRODUCT_COLUMNS_V1", PRODUCT_COLUMNS_V1],
      ["PRODUCT_COLUMNS_V2", PRODUCT_COLUMNS_V2],
      ["PRODUCT_COLUMNS_V3", PRODUCT_COLUMNS_V3],
    ] as const) {
      expect(Object.keys(kume), `${ad} is_synthetic içermemeli`).not.toContain(
        "isSynthetic"
      );
    }
  });

  test("YALNIZCA yönetim kümesi V4'te var", () => {
    expect(Object.keys(PRODUCT_COLUMNS_V4)).toContain("isSynthetic");
  });

  test("V4, V3'ün üstüne YALNIZCA bu kolonu ekler", () => {
    const fark = Object.keys(PRODUCT_COLUMNS_V4).filter(
      (k) => !(k in PRODUCT_COLUMNS_V3)
    );
    expect(fark).toEqual(["isSynthetic"]);
  });

  test("public okuma yolları bu kolonu SEÇMEZ", () => {
    for (const yol of [
      "src/lib/queries/product.ts",
      "src/app/api/products/route.ts",
      "src/app/api/products/[partNumber]/route.ts",
      "src/components/catalog/BrandCatalogPage.tsx",
      "src/app/sitemap.ts",
    ]) {
      expect(oku(yol), `${yol} is_synthetic okumamalı`).not.toContain("isSynthetic");
    }
  });

  test("ürün detay sayfası ve JSON-LD bu kolonu kullanmaz", () => {
    expect(oku("src/app/(public)/parca-katalog/[slug]/page.tsx")).not.toContain(
      "isSynthetic"
    );
    expect(oku("src/lib/product-jsonld.ts")).not.toContain("isSynthetic");
  });
});

test.describe("mevcut korumanın YERİNE GEÇMEZ", () => {
  test("migration sentetik kayıtları pasifleştirmeye GÜVENMEZ, onu DOĞRULAR", () => {
    const sql = oku("drizzle/0012_product_synthetic_flag.sql");
    // POST-CHECK aktif/yayında/stoklu sentetik kayıt olmadığını kanıtlar.
    expect(sql).toContain("isaretli_aktif");
    expect(sql).toContain("isaretli_yayin");
    expect(sql).toContain("isaretli_stok");
  });

  test("migration DESENLE değil KİMLİKLE işaretler", () => {
    const sql = oku("drizzle/0012_product_synthetic_flag.sql");
    const update = sql.slice(sql.indexOf("UPDATE products"), sql.indexOf("POST-CHECK"));
    // `WHERE id IN (...)` olmalı; desen eşleşmesi OLMAMALI.
    expect(update).toContain("WHERE id IN (");
    expect(update).not.toContain("~*");
  });

  test("migration yanlış sınıflandırmayı KANITLA engeller", () => {
    const sql = oku("drizzle/0012_product_synthetic_flag.sql");
    // İşaretlenen her kayıt test desenini de taşımalı; taşımayan varsa
    // migration HATA verir (gerçek ürün işaretlenmiş olabilir).
    expect(sql).toContain("desen_disi");
    expect(sql).toContain("GERCEK URUN olabilir");
  });

  test("liste ucu sentetikleri VARSAYILAN OLARAK gizler", () => {
    const rota = oku("src/app/api/admin/products/route.ts");
    expect(rota).toContain('filtre.synthetic === "hide"');
    expect(rota).toContain("eq(products.isSynthetic, false)");
  });
});
