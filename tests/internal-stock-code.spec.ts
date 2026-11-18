import { test, expect } from "@playwright/test";
import {
  FIELD_LIMITS,
  parseInternalStockCode,
} from "@/lib/product-fields";
import {
  OPTIONAL_PRODUCT_COLUMNS,
  IMPORT_FORBIDDEN_COLUMNS,
  IMPORT_TEXT_LIMITS,
  findInternalStockCodeDuplicates,
  parseImportInternalStockCode,
  updatableColumns,
  productConflictPlan,
  isIssue,
} from "@/lib/import-validation";
import {
  PRODUCT_COLUMNS_V1,
  PRODUCT_COLUMNS_V2,
  PRODUCT_COLUMNS_V3,
} from "@/lib/db/columns";
import { normalizePartNumber } from "@/lib/part-number";

/**
 * Faz 3 / K3 — orijinal Logo stok kodunun sözleşmesi.
 *
 * Kullanıcı kararları burada kilitleniyor:
 *   · Ham değer AYNEN korunur (baştaki sıfır, tire, iç boşluk).
 *   · Normalizasyon YALNIZCA arama ve eşleştirme içindir.
 *   · Aynı/benzer stok kodu OTOMATİK BİRLEŞTİRİLMEZ, üzerine YAZILMAZ.
 *   · Public yüzeyde, SEO verisinde veya OEM numarası olarak GÖSTERİLMEZ.
 */

test.describe("ham değerin korunması", () => {
  test("baştaki sıfırlar kaybolmaz", () => {
    const r = parseInternalStockCode("0012345");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value?.code).toBe("0012345");
  });

  test("iç boşluklar ve tireler AYNEN korunur", () => {
    for (const ham of ["002 236 11 10", "23A-43-13330", "714-11- 16840", "61725--13200"]) {
      const r = parseInternalStockCode(ham);
      expect(r.ok, ham).toBe(true);
      if (!r.ok) continue;
      expect(r.value?.code, ham).toBe(ham);
    }
  });

  test("küçük harf BÜYÜTÜLMEZ — görünen değer değiştirilmez", () => {
    const r = parseInternalStockCode("ndg15189");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Parca numarasindan FARKLI davranis: partNumber uppercase edilir,
    // Logo stok kodu KAYNAKTAKI gibi kalir.
    expect(r.value?.code).toBe("ndg15189");
    expect(r.value?.normalized).toBe("NDG15189");
  });

  test("yalnızca baştaki/sondaki boşluk kırpılır", () => {
    const r = parseInternalStockCode("  002 236 11 10  ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value?.code).toBe("002 236 11 10");
  });

  test("boş değer null olur, hata değil", () => {
    for (const bos of ["", "   ", undefined, null]) {
      const r = parseInternalStockCode(bos);
      expect(r.ok, String(bos)).toBe(true);
      if (!r.ok) continue;
      expect(r.value, String(bos)).toBeNull();
    }
  });
});

test.describe("normalizasyon yalnızca eşleştirme içindir", () => {
  test("normalize değer part_number ile aynı kuraldan gelir", () => {
    const r = parseInternalStockCode("002 236 11 10");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value?.normalized).toBe(normalizePartNumber("002 236 11 10"));
    expect(r.value?.normalized).toBe("0022361110");
  });

  test("normalize değer HAM değeri değiştirmez", () => {
    const r = parseInternalStockCode("23A-43-13330");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value?.code).toBe("23A-43-13330");
    expect(r.value?.normalized).toBe("23A4313330");
    expect(r.value?.code).not.toBe(r.value?.normalized);
  });
});

test.describe("sınırlar ve reddetme", () => {
  test("100 karakter sınırı — aşan değer KIRPILMAZ, reddedilir", () => {
    const uzun = "A".repeat(FIELD_LIMITS.internalStockCode + 1);
    const r = parseInternalStockCode(uzun);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("kırpılmaz");
  });

  test("tam sınırda kabul edilir", () => {
    const r = parseInternalStockCode("A".repeat(FIELD_LIMITS.internalStockCode));
    expect(r.ok).toBe(true);
  });

  test("harf/rakam içermeyen değer reddedilir", () => {
    const r = parseInternalStockCode("---  ---");
    expect(r.ok).toBe(false);
  });

  test("metin olmayan değer reddedilir", () => {
    expect(parseInternalStockCode(12345).ok).toBe(false);
  });
});

test.describe("toplu import sözleşmesi", () => {
  test("internalStockCode opsiyonel kolonlardadır", () => {
    expect(OPTIONAL_PRODUCT_COLUMNS).toContain("internalStockCode");
  });

  test("yasaklı kolon DEĞİLDİR (seoReady/verified'den farklı)", () => {
    expect(IMPORT_FORBIDDEN_COLUMNS).not.toContain("internalStockCode");
  });

  test("import uzunluk sınırı şema ile aynı", () => {
    expect(IMPORT_TEXT_LIMITS.internalStockCode).toBe(FIELD_LIMITS.internalStockCode);
  });

  test("dosyada YOKSA mevcut değere DOKUNULMAZ", () => {
    const plan = productConflictPlan(["partNumber", "name"]);
    expect(plan.internalStockCode).toBe("preserve");
  });

  test("dosyada VARSA güncellenir", () => {
    const plan = productConflictPlan(["partNumber", "name", "internalStockCode"]);
    expect(plan.internalStockCode).toBe("overwrite");
    expect(updatableColumns(["partNumber", "name", "internalStockCode"]).has("internalStockCode")).toBe(true);
  });

  test("import ayrıştırması ham değeri korur", () => {
    const r = parseImportInternalStockCode("002 236 11 10");
    expect(isIssue(r)).toBe(false);
    if (isIssue(r)) return;
    expect(r.value?.code).toBe("002 236 11 10");
    expect(r.value?.normalized).toBe("0022361110");
  });

  test("import ayrıştırması sınırı aşan değeri ImportIssue ile reddeder", () => {
    const r = parseImportInternalStockCode("A".repeat(101));
    expect(isIssue(r)).toBe(true);
    if (!isIssue(r)) return;
    expect(r.code).toBe("internal_stock_code_invalid");
  });
});

test.describe("mükerrer stok kodu — UYARI, otomatik birleştirme YOK", () => {
  test("aynı normalize anahtara düşen satırlar bulunur", () => {
    const d = findInternalStockCodeDuplicates([
      { rowNum: 2, internalStockCodeNormalized: "0022361110" },
      { rowNum: 7, internalStockCodeNormalized: "0022361110" },
      { rowNum: 9, internalStockCodeNormalized: "NDG15189" },
    ]);
    expect(d.size).toBe(1);
    expect(d.get("0022361110")).toEqual([2, 7]);
  });

  test("tek başına geçen kod uyarı üretmez", () => {
    const d = findInternalStockCodeDuplicates([
      { rowNum: 2, internalStockCodeNormalized: "NDG15189" },
    ]);
    expect(d.size).toBe(0);
  });

  test("kodu olmayan satırlar sayılmaz", () => {
    const d = findInternalStockCodeDuplicates([
      { rowNum: 2, internalStockCodeNormalized: null },
      { rowNum: 3, internalStockCodeNormalized: null },
    ]);
    expect(d.size).toBe(0);
  });

  test("biçim farkı olan GERÇEK mükerrer yakalanır", () => {
    // Logo verisindeki asil senaryo: ayni parca iki farkli bicimde girilmis.
    const a = parseInternalStockCode("002 236 11 10");
    const b = parseInternalStockCode("0022361110");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value?.normalized).toBe(b.value?.normalized);
    expect(a.value?.code).not.toBe(b.value?.code); // ham degerler AYRI kalir
  });
});

test.describe("public yüzeye sızmaz", () => {
  test("V1 ve V2 iç stok kodunu seçmez", () => {
    for (const set of [PRODUCT_COLUMNS_V1, PRODUCT_COLUMNS_V2]) {
      expect(Object.keys(set)).not.toContain("internalStockCode");
      expect(Object.keys(set)).not.toContain("internalStockCodeNormalized");
    }
  });

  test("V3 (yalnızca yönetim paneli) iç stok kodunu içerir", () => {
    expect(Object.keys(PRODUCT_COLUMNS_V3)).toContain("internalStockCode");
    expect(Object.keys(PRODUCT_COLUMNS_V3)).toContain("internalStockCodeNormalized");
  });

  test("V3, V2'nin üst kümesidir — hiçbir alan kaybolmaz", () => {
    for (const key of Object.keys(PRODUCT_COLUMNS_V2)) {
      expect(Object.keys(PRODUCT_COLUMNS_V3), key).toContain(key);
    }
  });
});
