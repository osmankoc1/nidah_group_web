import { test, expect } from "@playwright/test";
import {
  FIELD_LIMITS,
  SOURCING_TYPES,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  parseOptionalText,
  parseSeoReady,
  parseSourcingType,
  parseStockStatus,
} from "@/lib/product-fields";

/**
 * Faz 2b ürün alanları.
 *
 * ADLANDIRMA NOTU: istenen sözlükte stok durumları
 * `unknown` / `in_stock` / `on_request`. Veritabanındaki enum (drizzle/0008,
 * production'da uygulanmış) üçüncü değeri `on_order` olarak taşır; enum
 * değerinin adını değiştirmek yeni migration gerektirdiği için `on_request`
 * bir EŞ AD olarak kabul edilir ve `on_order`'a çevrilir.
 */

test.describe("stok durumu", () => {
  test("enum değerleri şemadan gelir", () => {
    expect([...STOCK_STATUSES]).toEqual(["unknown", "in_stock", "on_order"]);
  });

  test("BOŞ değer 'unknown' olur — teyitsiz stok iddia edilmez", () => {
    for (const value of [undefined, null, ""]) {
      const r = parseStockStatus(value);
      expect(r.ok, String(value)).toBe(true);
      if (r.ok) expect(r.value).toBe("unknown");
    }
  });

  test("'on_request' EŞ ADI 'on_order'a çevrilir", () => {
    for (const alias of ["on_request", "onrequest", "ON_REQUEST", "on request", "on-request"]) {
      const r = parseStockStatus(alias);
      expect(r.ok, alias).toBe(true);
      if (r.ok) expect(r.value, alias).toBe("on_order");
    }
  });

  test("Türkçe eş adlar kabul edilir", () => {
    const cases: Array<[string, string]> = [
      ["stokta", "in_stock"],
      ["sipariş", "on_order"],
      ["siparis", "on_order"],
      ["bilinmiyor", "unknown"],
    ];
    for (const [input, expected] of cases) {
      const r = parseStockStatus(input);
      expect(r.ok, input).toBe(true);
      if (r.ok) expect(r.value, input).toBe(expected);
    }
  });

  test("tanınmayan değer sessizce yorumlanmaz", () => {
    const r = parseStockStatus("belki");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("on_request");
  });

  test("metin olmayan değer reddedilir", () => {
    expect(parseStockStatus(42).ok).toBe(false);
    expect(parseStockStatus({}).ok).toBe(false);
  });

  test("her durum için admin etiketi vardır", () => {
    for (const status of STOCK_STATUSES) {
      expect(STOCK_STATUS_LABELS[status], status).toBeTruthy();
    }
    // 'unknown' etiketi stok iddiasi icermez.
    expect(STOCK_STATUS_LABELS.unknown).not.toContain("Stokta mevcut");
  });
});

test.describe("temin niteliği", () => {
  test("enum değerleri şemadan gelir", () => {
    expect([...SOURCING_TYPES]).toEqual([
      "unknown", "oem", "oem_equivalent", "aftermarket",
    ]);
  });

  test("boş değer 'unknown' olur — OEM iddiası yapılmaz", () => {
    const r = parseSourcingType("");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("unknown");
  });

  test("geçerli değerler kabul edilir", () => {
    for (const value of SOURCING_TYPES) {
      const r = parseSourcingType(value);
      expect(r.ok, value).toBe(true);
    }
    expect(parseSourcingType("OEM_EQUIVALENT").ok).toBe(true);
  });

  test("geçersiz değer reddedilir", () => {
    expect(parseSourcingType("orijinal").ok).toBe(false);
  });
});

test.describe("opsiyonel metin alanları", () => {
  test("boş ve whitespace değerler null olur", () => {
    for (const value of [undefined, null, "", "   "]) {
      const r = parseOptionalText(value, "alan");
      expect(r.ok, String(value)).toBe(true);
      if (r.ok) expect(r.value, String(value)).toBeNull();
    }
  });

  test("değer trim'lenir", () => {
    const r = parseOptionalText("  TEST Üretici  ", "partManufacturer");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("TEST Üretici");
  });

  test("sınırı aşan değer KIRPILMAZ, reddedilir", () => {
    const tooLong = "x".repeat(FIELD_LIMITS.partManufacturer + 1);
    const r = parseOptionalText(tooLong, "partManufacturer", FIELD_LIMITS.partManufacturer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(FIELD_LIMITS.partManufacturer));
  });

  test("sınır değeri tam olarak kabul edilir", () => {
    const exact = "x".repeat(FIELD_LIMITS.shortDescription);
    const r = parseOptionalText(exact, "shortDescription", FIELD_LIMITS.shortDescription);
    expect(r.ok).toBe(true);
  });

  test("metin olmayan değer reddedilir", () => {
    expect(parseOptionalText(123, "alan").ok).toBe(false);
  });
});

test.describe("yayın onayı (seoReady)", () => {
  test("yalnızca açık boolean kabul edilir", () => {
    expect(parseSeoReady(true)).toEqual({ ok: true, value: true });
    expect(parseSeoReady(false)).toEqual({ ok: true, value: false });
    expect(parseSeoReady("true")).toEqual({ ok: true, value: true });
    expect(parseSeoReady("false")).toEqual({ ok: true, value: false });
  });

  test("belirsiz değerler reddedilir — kazara yayına alma olmaz", () => {
    for (const value of [undefined, null, "", "1", 1, "yes", "evet", {}]) {
      expect(parseSeoReady(value).ok, String(value)).toBe(false);
    }
  });
});
