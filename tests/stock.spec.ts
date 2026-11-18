import { test, expect } from "@playwright/test";
import { isStockVerified, stockPresentation } from "@/lib/stock";

/**
 * Denetim C10 / talimat #7: BİLİNMEYEN stok ne ekranda "stokta" olarak
 * gösterilir ne de JSON-LD'de `InStock` olarak işaretlenir.
 *
 * `products.in_stock` şemada `DEFAULT TRUE` olduğu için `true` değeri
 * "bir insan teyit etti" anlamına GELMEZ.
 */

test.describe("stok sunumu", () => {
  test("schema.org availability HİÇBİR durumda üretilmez", () => {
    for (const value of [true, false, null, undefined]) {
      expect(stockPresentation(value).schemaAvailability).toBeNull();
    }
  });

  test('hiçbir etiket "Stokta" iddiası içermez', () => {
    for (const value of [true, false, null, undefined]) {
      const label = stockPresentation(value).label;
      expect(label.toLowerCase()).not.toContain("stokta mevcut");
      expect(label).not.toBe("Stokta");
    }
  });

  test("in_stock = true teyit beklemede olarak sunulur", () => {
    const p = stockPresentation(true);
    expect(p.tone).toBe("pending");
    expect(p.label).toBe("Stok Durumu Teyit Ediliyor");
  });

  test("in_stock = false / null / undefined sipariş üzerine olarak sunulur", () => {
    for (const value of [false, null, undefined]) {
      const p = stockPresentation(value);
      expect(p.tone).toBe("backorder");
      expect(p.label).toBe("Sipariş Üzerine");
    }
  });

  test("Faz 1'de stok teyidi şemada temsil edilemez", () => {
    // Faz 2'de products.stock_status eklendiğinde bu test bilinçli olarak
    // güncellenir; o ana kadar "teyitli" diye bir durum YOKTUR.
    expect(isStockVerified()).toBe(false);
  });
});
