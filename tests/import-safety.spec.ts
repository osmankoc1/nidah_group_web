import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  IMPORT_FORBIDDEN_COLUMNS,
  IMPORT_NEW_PRODUCT_NOTICE,
  IMPORT_NEW_PRODUCT_STATE,
  IMPORT_UPDATE_PROTECTED_COLUMNS,
  OPTIONAL_PRODUCT_COLUMNS,
  productConflictPlan,
  updatableColumns,
} from "@/lib/import-validation";
import { buildProductConflictSet } from "@/lib/import-conflict";
import { evaluateSeoReadiness } from "@/lib/seo-gate";

/**
 * TOPLU AKTARIM GÜVENLİĞİ (kullanıcı kararı 2026-11-26).
 *
 * Ölçülen kök neden: `products.is_active` şema varsayılanı `true` ve import
 * ucu bu alanı yazmıyordu — yani toplu aktarımla gelen her ürün AKTİF
 * giriyordu. Katalog toggle'ı açıkken bu, içerik denetiminden geçmemiş
 * yüzlerce sayfayı public yüzeye çıkarır.
 *
 * Bu dosya altı davranışı kilitler:
 *   1. Yeni ürün PASİF ve yayın onaysız oluşur.
 *   2. Mevcut ürünün aktiflik/yayın durumu güncellemede DEĞİŞMEZ.
 *   3. Aktarım ile yayınlama AYRI işlemlerdir (`seoReady` import yüzeyinde yok).
 *   4. Aktarılan ürün içerik denetiminden geçmeden yayın kapısını geçemez.
 *   5. Mevcut veriye zarar verilmez (dosyada olmayan kolon korunur).
 *   6. Operatöre politika AÇIKÇA bildirilir.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const ROTA = "src/app/api/admin/import/products/route.ts";

/**
 * Rotanın YALNIZCA INSERT gövdesi.
 *
 * Tüm dosyada arama yapmak yetersizdi: özette operatöre dönen
 * `newProductState` bloğu da `isActive: IMPORT_NEW_PRODUCT_STATE.isActive`
 * metnini içeriyor, yani INSERT'ten satır silinse bile dosya genelindeki
 * arama hâlâ eşleşiyordu (mutasyon testiyle ölçüldü). Kontrol bu yüzden
 * `.insert(products)` ile `.onConflictDoUpdate` arasına daraltılır.
 */
function insertGovdesi(kod: string): string {
  const bas = kod.indexOf(".insert(products)");
  const son = kod.indexOf(".onConflictDoUpdate", bas);
  expect(bas, "INSERT gövdesi bulunamadı").toBeGreaterThan(-1);
  expect(son, "onConflictDoUpdate bulunamadı").toBeGreaterThan(bas);
  return kod.slice(bas, son);
}

test.describe("1 — yeni ürün pasif ve yayın onaysız girer", () => {
  test("politika sabiti: isActive false, seoReady false", () => {
    expect(IMPORT_NEW_PRODUCT_STATE.isActive).toBe(false);
    expect(IMPORT_NEW_PRODUCT_STATE.seoReady).toBe(false);
  });

  test("şema varsayılanına GÜVENİLMEZ: değer açıkça yazılmalı", () => {
    // `is_active` şema varsayılanı true'dur; politika bunun tersi olduğu için
    // INSERT'in alanı açıkça yazması ZORUNLU. Sabit true'ya dönerse bu test
    // kırılır ve kök neden geri gelmiş olur.
    expect(IMPORT_NEW_PRODUCT_STATE.isActive).not.toBe(true);
  });

  /**
   * KAYNAK ÜZERİNDEN KİLİT.
   *
   * Yukarıdaki testler politikayı ölçer; bu test politikanın gerçekten
   * UYGULANDIĞINI ölçer. Satır rotadan silinirse sabit hâlâ `false` kalır ve
   * saf testler geçer — ama ürünler yine AKTİF girer. Kök neden tam buydu.
   */
  test("INSERT gövdesi isActive alanını AÇIKÇA yazıyor", () => {
    const govde = insertGovdesi(yorumsuz(oku(ROTA)));
    expect(govde).toContain("isActive: IMPORT_NEW_PRODUCT_STATE.isActive");
    expect(govde).not.toContain("isActive: true");
  });

  test("INSERT gövdesi seoReady yazmıyor", () => {
    const govde = insertGovdesi(yorumsuz(oku(ROTA)));
    expect(govde).not.toMatch(/seoReady\s*:/);
    expect(govde).not.toMatch(/seoReadyAt\s*:/);
  });

  test("politika operatöre dönen özette bildiriliyor", () => {
    const kod = yorumsuz(oku(ROTA));
    expect(kod).toContain("newProductState");
    expect(kod).toContain("IMPORT_NEW_PRODUCT_NOTICE");
  });

  test("geri dönüş listesi: yalnızca YENİ oluşan parça numaraları", () => {
    const kod = yorumsuz(oku(ROTA));
    expect(kod).toContain("createdPartNumbers");
    expect(kod).toMatch(/action === "insert"/);
  });
});

test.describe("2 — mevcut ürünün aktiflik ve yayın durumu korunur", () => {
  const TUM_KOLONLAR = [
    "partNumber",
    "name",
    ...OPTIONAL_PRODUCT_COLUMNS,
    // Saldırı yüzeyi: dosya bu adları da taşısa bile yazılmamalı.
    "isActive",
    "is_active",
    "seoReady",
    "seo_ready",
    "seoReadyAt",
    "verified",
  ];

  test("ON CONFLICT gövdesi korunan kolonlardan HİÇBİRİNİ içermez", () => {
    // En geniş hâl: dosyada her kolon var.
    const set = buildProductConflictSet(updatableColumns(TUM_KOLONLAR));
    const yazilan = Object.keys(set);
    for (const kolon of IMPORT_UPDATE_PROTECTED_COLUMNS) {
      expect(yazilan, kolon).not.toContain(kolon);
    }
    expect(yazilan).not.toContain("is_active");
    expect(yazilan).not.toContain("seo_ready");
  });

  test("korunan kolon listesi aktiflik ve yayın alanlarını kapsar", () => {
    expect([...IMPORT_UPDATE_PROTECTED_COLUMNS]).toEqual([
      "isActive",
      "seoReady",
      "seoReadyAt",
    ]);
  });

  test("gövde, güncellemesi GEREKEN kolonları yazmaya devam eder", () => {
    const set = buildProductConflictSet(updatableColumns(TUM_KOLONLAR));
    const yazilan = Object.keys(set);
    // Kimlik anahtarı ve ad her zaman yenilenir; zaman damgası atılır.
    expect(yazilan).toContain("name");
    expect(yazilan).toContain("partNumberNormalized");
    expect(yazilan).toContain("updatedAt");
    // Faz 2/3 alanları dosyada olduğu için yazılabilir durumda.
    expect(yazilan).toContain("longDescription");
    expect(yazilan).toContain("internalStockCodeNormalized");
  });

  test("aktiflik kolonu OPSİYONEL kolon listesinde de yok", () => {
    expect([...OPTIONAL_PRODUCT_COLUMNS]).not.toContain("isActive");
    expect([...OPTIONAL_PRODUCT_COLUMNS]).not.toContain("is_active");
  });
});

test.describe("3 — aktarım ile yayınlama ayrı işlemler", () => {
  test("seoReady ve verified import yüzeyinde yok", () => {
    expect([...IMPORT_FORBIDDEN_COLUMNS]).toContain("seoReady");
    expect([...IMPORT_FORBIDDEN_COLUMNS]).toContain("seo_ready");
    expect([...IMPORT_FORBIDDEN_COLUMNS]).toContain("verified");
  });

  test("dosya seoReady taşısa bile güncellenebilir sayılmaz", () => {
    expect([...updatableColumns(["partNumber", "name", "seoReady", "seo_ready"])]).toEqual([]);
  });
});

test.describe("4 — aktarılan ürün denetimden geçmeden yayın kapısını geçemez", () => {
  /** Aktarımdan hemen sonraki tipik hâl: pasif, açıklama yok, uyum yok. */
  const AKTARIM_SONRASI = {
    isActive: IMPORT_NEW_PRODUCT_STATE.isActive,
    partNumber: "60525-06300",
    name: "Şanzıman D-ring contası",
    verifiedImageCount: 0,
    longDescription: null,
    verifiedFitmentCount: 0,
  };

  test("yeni aktarılan ürün yayın kapısını GEÇEMEZ", () => {
    const sonuc = evaluateSeoReadiness(AKTARIM_SONRASI);
    expect(sonuc.eligible).toBe(false);
    expect(sonuc.unmet).toContain("inactive");
  });

  test("pasiflik tek başına bile yayını engeller", () => {
    // İçeriği tam, ama pasif: yine geçmez.
    const sonuc = evaluateSeoReadiness({
      ...AKTARIM_SONRASI,
      longDescription: "Doğrulanmış kaynaktan yazılmış, boş olmayan açıklama.",
      verifiedFitmentCount: 1,
    });
    expect(sonuc.eligible).toBe(false);
    expect(sonuc.unmet).toEqual(["inactive"]);
  });

  test("aktiflik verilse bile içerik eksikse geçmez", () => {
    const sonuc = evaluateSeoReadiness({ ...AKTARIM_SONRASI, isActive: true });
    expect(sonuc.eligible).toBe(false);
    expect(sonuc.unmet).toContain("long_description_missing");
    expect(sonuc.unmet).toContain("no_verified_fitment");
  });
});

test.describe("5 — mevcut veriye ve SEO alanlarına zarar verilmez", () => {
  test("dosyada OLMAYAN kolon korunur (kısmi dosya veri silmez)", () => {
    const plan = productConflictPlan(["partNumber", "name"]);
    for (const kolon of OPTIONAL_PRODUCT_COLUMNS) {
      expect(plan[kolon], kolon).toBe("preserve");
    }
  });

  test("SEO metin alanları yalnızca dosyada varsa yazılır", () => {
    const plan = productConflictPlan(["partNumber", "name", "metaTitle"]);
    expect(plan.metaTitle).toBe("overwrite");
    expect(plan.metaDescription).toBe("preserve");
    expect(plan.longDescription).toBe("preserve");
  });
});

test.describe("6 — politika operatöre bildirilir", () => {
  test("bildirim metni pasif ve yayın onaysız olduğunu söyler", () => {
    expect(IMPORT_NEW_PRODUCT_NOTICE).toContain("PASİF");
    expect(IMPORT_NEW_PRODUCT_NOTICE).toContain("is_active = false");
    expect(IMPORT_NEW_PRODUCT_NOTICE).toContain("seo_ready = false");
  });

  test("bildirim, aktarımın yayın olmadığını açıkça yazar", () => {
    expect(IMPORT_NEW_PRODUCT_NOTICE).toContain("Aktarım yayın demek değildir");
  });
});
