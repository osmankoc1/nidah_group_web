import { test, expect } from "@playwright/test";
import {
  IMPORT_FORBIDDEN_COLUMNS,
  IMPORT_TEXT_LIMITS,
  OPTIONAL_PRODUCT_COLUMNS,
  isIssue,
  parseImportSourcingType,
  parseImportStockStatus,
  parseImportText,
  productConflictPlan,
  updatableColumns,
} from "@/lib/import-validation";

/**
 * Faz 2 alanlarının toplu import uyumu.
 *
 * İKİ GÜVENCE:
 *   1. `seoReady` ve `verified` toplu import ile ASLA yazılamaz — yayın onayı
 *      ve doğrulama tek tek, insan kararıyla verilir.
 *   2. Dosyada bulunmayan kolon KORUNUR — kısmi dosya mevcut kayıtları silmez.
 */

test.describe("yasaklı kolonlar", () => {
  test("seoReady ve verified import yüzeyinde YOK", () => {
    expect([...OPTIONAL_PRODUCT_COLUMNS]).not.toContain("seoReady");
    expect([...OPTIONAL_PRODUCT_COLUMNS]).not.toContain("seo_ready");
    expect([...OPTIONAL_PRODUCT_COLUMNS]).not.toContain("verified");
  });

  test("yasaklı kolon listesi bu adları kapsar", () => {
    expect([...IMPORT_FORBIDDEN_COLUMNS]).toEqual(["seoReady", "seo_ready", "verified"]);
  });

  test("dosyada seoReady olsa bile güncellenebilir kolon sayılmaz", () => {
    const updatable = updatableColumns([
      "partNumber", "name", "seoReady", "seo_ready", "verified", "weight",
    ]);
    expect([...updatable]).toEqual(["weight"]);
  });
});

test.describe("Faz 2 kolonları güncellenebilir", () => {
  test("yeni alanlar opsiyonel kolon listesinde", () => {
    for (const column of [
      "partManufacturer", "sourcingType", "stockStatus",
      "shortDescription", "longDescription", "metaTitle", "metaDescription",
    ]) {
      expect([...OPTIONAL_PRODUCT_COLUMNS], column).toContain(column);
    }
  });

  test("dosyada OLMAYAN Faz 2 kolonu KORUNUR", () => {
    const plan = productConflictPlan(["partNumber", "name"]);
    expect(plan.partManufacturer).toBe("preserve");
    expect(plan.sourcingType).toBe("preserve");
    expect(plan.stockStatus).toBe("preserve");
    expect(plan.shortDescription).toBe("preserve");
    expect(plan.longDescription).toBe("preserve");
    expect(plan.metaTitle).toBe("preserve");
    expect(plan.metaDescription).toBe("preserve");
  });

  test("dosyada BULUNAN Faz 2 kolonu üzerine yazılır", () => {
    const plan = productConflictPlan(["partNumber", "name", "stockStatus", "partManufacturer"]);
    expect(plan.stockStatus).toBe("overwrite");
    expect(plan.partManufacturer).toBe("overwrite");
    expect(plan.longDescription).toBe("preserve");
  });

  test("tam şablon tüm opsiyonel kolonları yazılabilir yapar", () => {
    const headers = ["partNumber", "name", ...OPTIONAL_PRODUCT_COLUMNS];
    const plan = productConflictPlan(headers);
    expect(Object.values(plan).every((v) => v === "overwrite")).toBe(true);
  });
});

test.describe("import stok durumu", () => {
  test("boş hücre 'unknown' olur", () => {
    const r = parseImportStockStatus("");
    expect(isIssue(r)).toBe(false);
    expect(r).toEqual({ value: "unknown" });
  });

  test("'on_request' kabul edilir ve 'on_order'a çevrilir", () => {
    expect(parseImportStockStatus("on_request")).toEqual({ value: "on_order" });
  });

  test("'in_stock' kabul edilir", () => {
    expect(parseImportStockStatus("in_stock")).toEqual({ value: "in_stock" });
  });

  test("tanınmayan değer ImportIssue döner", () => {
    const r = parseImportStockStatus("belki");
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) expect(r.code).toBe("stock_status_invalid");
  });
});

test.describe("import temin niteliği", () => {
  test("boş hücre 'unknown' olur", () => {
    expect(parseImportSourcingType("")).toEqual({ value: "unknown" });
  });

  test("geçersiz değer ImportIssue döner", () => {
    const r = parseImportSourcingType("orijinal");
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) expect(r.code).toBe("sourcing_type_invalid");
  });
});

test.describe("import metin alanları", () => {
  test("boş hücre null olur", () => {
    expect(parseImportText("", "partManufacturer")).toEqual({ value: null });
    expect(parseImportText("   ", "shortDescription")).toEqual({ value: null });
    expect(parseImportText(undefined, "metaTitle")).toEqual({ value: null });
  });

  test("değer trim'lenir", () => {
    expect(parseImportText("  TEST  ", "partManufacturer")).toEqual({ value: "TEST" });
  });

  test("sınırı aşan değer KIRPILMAZ, satır reddedilir", () => {
    const limit = IMPORT_TEXT_LIMITS.shortDescription!;
    const r = parseImportText("x".repeat(limit + 1), "shortDescription");
    expect(isIssue(r)).toBe(true);
    if (isIssue(r)) {
      expect(r.code).toBe("text_too_long");
      expect(r.message).toContain("kırpılmaz");
    }
  });

  test("sınırsız alanlar uzun metni kabul eder", () => {
    expect(IMPORT_TEXT_LIMITS.longDescription).toBeUndefined();
    const long = "x".repeat(5000);
    expect(parseImportText(long, "longDescription")).toEqual({ value: long });
  });
});
