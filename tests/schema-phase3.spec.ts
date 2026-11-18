import { test, expect } from "@playwright/test";
import { getTableColumns } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import { PRODUCT_COLUMNS_V1, PRODUCT_COLUMNS_V2 } from "@/lib/db/columns";
import { normalizePartNumber } from "@/lib/part-number";

/**
 * Faz 3 şema değişmezleri — `drizzle/0010_internal_stock_code.sql` sözleşmesi.
 *
 * K1 kararı: `part_number` doğrulanmış KATALOG numarasını tutar. Logo
 * İşbaşı'ndaki orijinal stok kodu ayrı bir alanda, bir numara iddiası
 * üretmeden saklanır.
 *
 * Buradaki testler üç şeyi kilitler:
 *   1. Kolonlar var ve veritabanındaki tiple aynı sınırda.
 *   2. Orijinal stok kodu PUBLIC sorgu kolonlarına SIZMAZ — public yüzeyde
 *      gösterilmesi, `oem_numbers`'a kopyalanması veya OEM gibi sunulması
 *      kullanıcı kararıyla yasak.
 *   3. Normalize kuralı `part_number` ile BİREBİR aynı fonksiyondan gelir;
 *      iki ayrı kural olursa eşleştirme sessizce bozulur.
 */

test.describe("products — Faz 3 (0010) kolonları", () => {
  const columns = getTableColumns(products);

  test("internal_stock_code kolonları tanımlı", () => {
    expect(columns).toHaveProperty("internalStockCode");
    expect(columns).toHaveProperty("internalStockCodeNormalized");
  });

  test("veritabanı kolon adları migration ile aynı", () => {
    expect(columns.internalStockCode.name).toBe("internal_stock_code");
    expect(columns.internalStockCodeNormalized.name).toBe(
      "internal_stock_code_normalized"
    );
  });

  test("SQL tipi varchar(100) — migration ile aynı", () => {
    // 0010'da varchar(100). V8 verisindeki en uzun stok kodu 22 karakter,
    // yani sınır bol; ama şema ile SQL ayrışırsa sessiz kesme riski doğar.
    expect(columns.internalStockCode.getSQLType()).toBe("varchar(100)");
    expect(columns.internalStockCodeNormalized.getSQLType()).toBe("varchar(100)");
  });

  test("NULLABLE ve varsayılansız — hiçbir mevcut kayıt iddia üretmez", () => {
    expect(columns.internalStockCode.notNull).toBe(false);
    expect(columns.internalStockCode.hasDefault).toBe(false);
    expect(columns.internalStockCodeNormalized.notNull).toBe(false);
    expect(columns.internalStockCodeNormalized.hasDefault).toBe(false);
  });
});

test.describe("orijinal stok kodu public yüzeye sızmaz", () => {
  test("PRODUCT_COLUMNS_V1 iç stok kodunu seçmez", () => {
    expect(Object.keys(PRODUCT_COLUMNS_V1)).not.toContain("internalStockCode");
    expect(Object.keys(PRODUCT_COLUMNS_V1)).not.toContain(
      "internalStockCodeNormalized"
    );
  });

  test("PRODUCT_COLUMNS_V2 iç stok kodunu seçmez", () => {
    expect(Object.keys(PRODUCT_COLUMNS_V2)).not.toContain("internalStockCode");
    expect(Object.keys(PRODUCT_COLUMNS_V2)).not.toContain(
      "internalStockCodeNormalized"
    );
  });
});

test.describe("normalize kuralı tek kaynaktan gelir", () => {
  test("stok kodu normalizasyonu part_number ile aynı kuralı kullanır", () => {
    // Kural: once [^A-Za-z0-9] sil, SONRA buyuk harfe cevir.
    // SQL tarafi: upper(regexp_replace(kod, '[^A-Za-z0-9]', '', 'g'))
    const ornekler: ReadonlyArray<readonly [string, string]> = [
      ["002 236 11 10", "0022361110"],
      ["0022361110", "0022361110"],
      ["VOE 12727728", "VOE12727728"],
      ["23A-43-13330", "23A4313330"],
      ["714-11- 16840", "7141116840"],
      ["ch 76281", "CH76281"],
    ];
    for (const [ham, beklenen] of ornekler) {
      expect(normalizePartNumber(ham), ham).toBe(beklenen);
    }
  });

  test("baştaki sıfırlar normalize sırasında KAYBOLMAZ", () => {
    // Logo kodlarinin bir kismi "0012345" gibi; sayiya cevrilirse sifirlar
    // kaybolur. Normalize metin uzerinde calismali.
    expect(normalizePartNumber("0012345")).toBe("0012345");
    expect(normalizePartNumber("000-123")).toBe("000123");
  });

  test("normalize çakışması GERÇEKTİR — benzersiz kısıt konmama gerekçesi", () => {
    // V8'de 5.688 stok kodunun 126'si normalize edildiginde cakisiyor.
    // Bu kayitlar otomatik birlestirilmez; kisit yerine rapor edilir.
    expect(normalizePartNumber("002 236 11 10")).toBe(
      normalizePartNumber("0022361110")
    );
  });
});
