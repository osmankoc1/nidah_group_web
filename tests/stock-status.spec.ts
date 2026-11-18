import { test, expect } from "@playwright/test";
import {
  isStockStatusVerified,
  stockPresentationFromStatus,
  type StockStatus,
} from "@/lib/stock";

/**
 * Faz 2 stok otoritesi — `products.stock_status`.
 *
 * Talimat #7: bilinmeyen stok ne ekranda "stokta" gösterilir ne de JSON-LD'de
 * `InStock` olarak işaretlenir. 'unknown' VARSAYILAN olduğu için migration'dan
 * hemen sonra TÜM satırlar bu durumdadır.
 */

test.describe("stockPresentationFromStatus", () => {
  test("'unknown' iddia ÜRETMEZ", () => {
    const p = stockPresentationFromStatus("unknown");
    expect(p.schemaAvailability).toBeNull();
    expect(p.tone).toBe("pending");
    expect(p.label).toBe("Stok Durumu Teyit Ediliyor");
  });

  test("null / undefined / tanınmayan değer 'unknown' gibi davranır", () => {
    for (const value of [null, undefined, "garbage" as unknown as StockStatus]) {
      const p = stockPresentationFromStatus(value);
      expect(p.schemaAvailability, String(value)).toBeNull();
      expect(p.tone, String(value)).toBe("pending");
    }
  });

  test("'in_stock' YALNIZCA insan teyidiyle gelir ve InStock yazar", () => {
    const p = stockPresentationFromStatus("in_stock");
    expect(p.label).toBe("Stokta Mevcut");
    expect(p.tone).toBe("positive");
    expect(p.schemaAvailability).toBe("https://schema.org/InStock");
  });

  test("'on_order' BackOrder yazar", () => {
    const p = stockPresentationFromStatus("on_order");
    expect(p.label).toBe("Sipariş Üzerine");
    expect(p.tone).toBe("backorder");
    expect(p.schemaAvailability).toBe("https://schema.org/BackOrder");
  });

  test("availability YALNIZCA teyitli durumlarda doludur", () => {
    const statuses: StockStatus[] = ["unknown", "in_stock", "on_order"];
    for (const status of statuses) {
      const hasAvailability = stockPresentationFromStatus(status).schemaAvailability !== null;
      expect(hasAvailability, status).toBe(isStockStatusVerified(status));
    }
  });
});

test.describe("isStockStatusVerified", () => {
  test("yalnızca açıkça işaretlenmiş durumlar teyitlidir", () => {
    expect(isStockStatusVerified("in_stock")).toBe(true);
    expect(isStockStatusVerified("on_order")).toBe(true);
    expect(isStockStatusVerified("unknown")).toBe(false);
    expect(isStockStatusVerified(null)).toBe(false);
    expect(isStockStatusVerified(undefined)).toBe(false);
  });
});
