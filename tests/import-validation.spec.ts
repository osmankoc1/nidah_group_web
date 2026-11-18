import { test, expect } from "@playwright/test";
import {
  checkIdentifierCell,
  findNormalizedDuplicates,
  isIssue,
  OPTIONAL_PRODUCT_COLUMNS,
  parseCondition,
  parseStockFlag,
  parseWeight,
  productConflictPlan,
  updatableColumns,
} from "@/lib/import-validation";

/**
 * Toplu import bloker'ları:
 *   E-1  normalize kimlik yazılmıyordu  → product-upsert planı testleri
 *   E-2  Excel baştaki sıfırı siliyor   → kimlik hücresi testleri
 *   E-4  normalize duplicate / kazara üzerine yazma
 *   C10  yanlış stok varsayılanı
 */

test.describe("kimlik hücresi — hasarlı numara ASLA tahmin edilmez", () => {
  test("Excel'de SAYI tipinde gelen parça numarası reddedilir", () => {
    // Gerçek senaryo: "0012345" Excel'e sayı olarak girilmiş, biçimlenmiş metin
    // "12345" geliyor. Metne bakarak kaybı anlamak imkânsız → tip reddedilir.
    const problem = checkIdentifierCell({ value: "12345", wasTypedCell: true });
    expect(isIssue(problem)).toBe(true);
    expect(problem?.code).toBe("identifier_numeric_cell");
    expect(problem?.message).toContain("CSV");
  });

  test("tip bilgisi olmayan (CSV) baştaki sıfırlı numara KABUL edilir", () => {
    expect(checkIdentifierCell({ value: "0012345", wasTypedCell: false })).toBeNull();
    expect(checkIdentifierCell({ value: "714-07-20701", wasTypedCell: false })).toBeNull();
    expect(checkIdentifierCell({ value: "CH 76281", wasTypedCell: false })).toBeNull();
  });

  test("bilimsel gösterime düşmüş değer reddedilir", () => {
    for (const value of ["1.23457E+11", "2e-5", "9.9E+15"]) {
      const problem = checkIdentifierCell({ value, wasTypedCell: false });
      expect(problem?.code, value).toBe("identifier_scientific_notation");
    }
  });

  test("normal parça numaraları bilimsel gösterim sanılmaz", () => {
    for (const value of ["E100", "1E", "VOE15172797", "295-9663", "12345"]) {
      expect(checkIdentifierCell({ value, wasTypedCell: false }), value).toBeNull();
    }
  });

  test("boş ve alfanümerik olmayan değerler reddedilir", () => {
    expect(checkIdentifierCell({ value: "", wasTypedCell: false })?.code).toBe(
      "identifier_missing"
    );
    expect(checkIdentifierCell({ value: "   ", wasTypedCell: false })?.code).toBe(
      "identifier_missing"
    );
    expect(checkIdentifierCell({ value: undefined, wasTypedCell: false })?.code).toBe(
      "identifier_missing"
    );
    expect(checkIdentifierCell({ value: "---", wasTypedCell: false })?.code).toBe(
      "identifier_not_alphanumeric"
    );
  });
});

test.describe("stok bayrağı — bilinmeyen stok asla 'stokta' sayılmaz", () => {
  test("BOŞ hücre stokta DEĞİL (eski davranışın tersi)", () => {
    const result = parseStockFlag("");
    expect(isIssue(result)).toBe(false);
    expect(result).toEqual({ value: false, explicit: false });

    expect(parseStockFlag(undefined)).toEqual({ value: false, explicit: false });
    expect(parseStockFlag("   ")).toEqual({ value: false, explicit: false });
  });

  test("açık pozitif değerler", () => {
    for (const token of ["true", "TRUE", "1", "evet", "Evet", "yes", "var", "stokta"]) {
      expect(parseStockFlag(token), token).toEqual({ value: true, explicit: true });
    }
  });

  test("açık negatif değerler", () => {
    for (const token of ["false", "0", "hayir", "hayır", "no", "yok", "sipariş"]) {
      expect(parseStockFlag(token), token).toEqual({ value: false, explicit: true });
    }
  });

  test("tanınmayan değer sessizce yorumlanmaz", () => {
    const result = parseStockFlag("belki");
    expect(isIssue(result)).toBe(true);
    if (isIssue(result)) expect(result.code).toBe("stock_unrecognized");
  });
});

test.describe("durum ve ağırlık", () => {
  test("condition varsayılanı new, geçersiz değer reddedilir", () => {
    expect(parseCondition("")).toEqual({ value: "new" });
    expect(parseCondition("USED")).toEqual({ value: "used" });
    expect(parseCondition("remanufactured")).toEqual({ value: "remanufactured" });
    const bad = parseCondition("yeni");
    expect(isIssue(bad)).toBe(true);
    if (isIssue(bad)) expect(bad.code).toBe("condition_invalid");
  });

  test("ağırlık: boş → null, Türkçe virgül kabul, negatif reddedilir", () => {
    expect(parseWeight("")).toEqual({ value: null });
    expect(parseWeight("12.5")).toEqual({ value: 12.5 });
    expect(parseWeight("12,5")).toEqual({ value: 12.5 });
    expect(parseWeight("0")).toEqual({ value: 0 });
    for (const bad of ["-1", "abc", "1,2,3"]) {
      const result = parseWeight(bad);
      expect(isIssue(result), bad).toBe(true);
    }
  });
});

test.describe("dosya içi normalize çakışması", () => {
  test("farklı yazımlı aynı numara çakışma olarak bulunur", () => {
    const duplicates = findNormalizedDuplicates([
      { rowNum: 2, partNumber: "CH 76281" },
      { rowNum: 3, partNumber: "CH-76281" },
      { rowNum: 4, partNumber: "VOE 15172797" },
    ]);
    expect([...duplicates.keys()]).toEqual(["CH76281"]);
    expect(duplicates.get("CH76281")).toEqual([2, 3]);
  });

  test("gerçekten farklı numaralar çakışma üretmez", () => {
    const duplicates = findNormalizedDuplicates([
      { rowNum: 2, partNumber: "CH 76281" },
      { rowNum: 3, partNumber: "CH 76282" },
      { rowNum: 4, partNumber: "0012345" },
      { rowNum: 5, partNumber: "12345" },
    ]);
    expect(duplicates.size).toBe(0);
  });

  test("baştaki sıfır farkı AYRI kimliktir", () => {
    // "0012345" ve "12345" aynı parça DEĞİLDİR; normalize onları birleştirmez.
    const duplicates = findNormalizedDuplicates([
      { rowNum: 2, partNumber: "0012345" },
      { rowNum: 3, partNumber: "12345" },
    ]);
    expect(duplicates.size).toBe(0);
  });
});

test.describe("kazara üzerine yazmayı önleme", () => {
  test("dosyada olmayan kolon KORUNUR", () => {
    // Yalnızca partNumber + name içeren dosya, mevcut kayıtların diğer
    // alanlarını NULL'a çekmemelidir (eski davranış sessiz veri kaybıydı).
    //
    // Kolon listesi Faz 2'de büyüdü; bu yüzden tek tek saymak yerine
    // DEĞİŞMEZ doğrulanır: hiçbir opsiyonel kolon üzerine yazılmaz.
    const plan = productConflictPlan(["partNumber", "name"]);
    expect(Object.keys(plan).length).toBe(OPTIONAL_PRODUCT_COLUMNS.length);
    expect(Object.values(plan).every((v) => v === "preserve")).toBe(true);
    // Faz 1 kolonları açıkça kontrol edilir.
    for (const column of ["description", "condition", "inStock", "weight", "category", "notes"] as const) {
      expect(plan[column], column).toBe("preserve");
    }
  });

  test("dosyada bulunan kolon ÜZERİNE YAZILIR", () => {
    const plan = productConflictPlan(["partNumber", "name", "weight", "notes"]);
    expect(plan.weight).toBe("overwrite");
    expect(plan.notes).toBe("overwrite");
    expect(plan.description).toBe("preserve");
    expect(plan.inStock).toBe("preserve");
  });

  test("tam şablon tüm opsiyonel kolonları yazılabilir yapar", () => {
    const headers = ["partNumber", "name", ...OPTIONAL_PRODUCT_COLUMNS];
    const plan = productConflictPlan(headers);
    expect(Object.values(plan).every((v) => v === "overwrite")).toBe(true);
    expect(updatableColumns(headers).size).toBe(OPTIONAL_PRODUCT_COLUMNS.length);
  });

  test("başlıklar trim'lenerek karşılaştırılır", () => {
    expect(updatableColumns([" weight ", "notes"]).has("weight")).toBe(true);
  });

  test("kimlik ve zorunlu kolonlar opsiyonel listede değildir", () => {
    const cols = updatableColumns([
      "partNumber", "name", "description", "condition",
      "inStock", "weight", "category", "notes",
    ]);
    expect([...cols]).not.toContain("partNumber");
    expect([...cols]).not.toContain("name");
  });
});
