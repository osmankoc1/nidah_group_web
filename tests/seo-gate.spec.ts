import { test, expect } from "@playwright/test";
import {
  MIN_LONG_DESCRIPTION_CHARS,
  MIN_VERIFIED_IMAGES,
  evaluateSeoReadiness,
  isProductIndexable,
  type SeoReadinessInput,
} from "@/lib/seo-gate";

/**
 * Yayın kapısı (denetim C11). `seo_ready` varsayılanı false; bu testler
 * "varsayılan durumda hiçbir ürün yayına girmez" güvencesini kilitler.
 */

const goodLongDescription = "x".repeat(MIN_LONG_DESCRIPTION_CHARS);

const eligible: SeoReadinessInput = {
  isActive: true,
  partNumber: "CH 76281",
  name: "Hidrolik Ana Pompa",
  verifiedImageCount: 2,
  longDescription: goodLongDescription,
  verifiedFitmentCount: 1,
};

test.describe("evaluateSeoReadiness", () => {
  test("tüm ölçütler karşılanınca uygun", () => {
    const r = evaluateSeoReadiness(eligible);
    expect(r.eligible).toBe(true);
    expect(r.unmet).toEqual([]);
    expect(r.reasons).toEqual([]);
  });

  test("migration sonrası TİPİK satır uygun DEĞİL", () => {
    // 0008 sonrasi: long_description NULL, dogrulanmis uyumluluk 0,
    // dogrulanmis gorsel 0.
    const r = evaluateSeoReadiness({
      isActive: true,
      partNumber: "CH 76281",
      name: "TEST",
      verifiedImageCount: 0,
      longDescription: null,
      verifiedFitmentCount: 0,
    });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toEqual([
      "no_verified_image",
      "long_description_too_short",
      "no_verified_fitment",
    ]);
    expect(r.reasons).toHaveLength(3);
  });

  test("pasif ürün asla uygun değil", () => {
    const r = evaluateSeoReadiness({ ...eligible, isActive: false });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("inactive");
  });

  test("DOĞRULANMIŞ görsel yoksa uygun değil", () => {
    expect(evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 }).unmet).toContain(
      "no_verified_image"
    );
  });

  test("kısa açıklama eşiğin ALTINDA kalırsa uygun değil", () => {
    const short = "x".repeat(MIN_LONG_DESCRIPTION_CHARS - 1);
    expect(evaluateSeoReadiness({ ...eligible, longDescription: short }).unmet).toContain(
      "long_description_too_short"
    );
    // Esik DEGERI tam olarak yeterlidir.
    expect(evaluateSeoReadiness({ ...eligible, longDescription: goodLongDescription }).eligible).toBe(true);
  });

  test("whitespace açıklama sayılmaz", () => {
    const padded = "   " + "x".repeat(MIN_LONG_DESCRIPTION_CHARS - 1) + "   ";
    expect(evaluateSeoReadiness({ ...eligible, longDescription: padded }).unmet).toContain(
      "long_description_too_short"
    );
  });

  test("DOĞRULANMAMIŞ uyumluluk sayılmaz", () => {
    // verifiedFitmentCount YALNIZCA fitments.verified = true kayitlari sayar.
    expect(
      evaluateSeoReadiness({ ...eligible, verifiedFitmentCount: 0 }).unmet
    ).toContain("no_verified_fitment");
  });

  test("boş parça numarası ve ad yakalanır", () => {
    const r = evaluateSeoReadiness({ ...eligible, partNumber: "  ", name: "" });
    expect(r.unmet).toContain("part_number_missing");
    expect(r.unmet).toContain("name_missing");
  });

  test("bozuk sayısal girdiler çökmez", () => {
    const r = evaluateSeoReadiness({
      ...eligible,
      verifiedImageCount: NaN,
      verifiedFitmentCount: Number.POSITIVE_INFINITY,
    });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("no_verified_image");
    expect(r.unmet).toContain("no_verified_fitment");
  });
});

test.describe("K2 — yalnizca DOGRULANMIS gorsel sayilir", () => {
  test("yuklenmis ama dogrulanmamis fotograf yayin kapisini GECMEZ", () => {
    // Senaryo: operator 3 fotograf yukledi, hicbirini dogrulamadi.
    // `verifiedImageCount` bu yuzden 0'dir ve urun yayina ACILAMAZ.
    const r = evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("no_verified_image");
  });

  test("temsili gorsel sayiyi ARTIRMAZ", () => {
    // Placeholder bir React bileseni; `product_images` tablosunda satiri
    // yoktur, dolayisiyla sayilabilecek bir kaydi da yoktur. Bu test
    // "placeholder gercek gorsel sayilmasin" sartini kilitler: kapiya
    // gecilen tek sayi DOGRULANMIS satir sayisidir.
    expect(evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 }).eligible).toBe(false);
    expect(evaluateSeoReadiness({ ...eligible, verifiedImageCount: 1 }).eligible).toBe(true);
  });

  test("esik tam olarak MIN_VERIFIED_IMAGES", () => {
    expect(
      evaluateSeoReadiness({ ...eligible, verifiedImageCount: MIN_VERIFIED_IMAGES }).eligible
    ).toBe(true);
    expect(
      evaluateSeoReadiness({ ...eligible, verifiedImageCount: MIN_VERIFIED_IMAGES - 1 }).unmet
    ).toContain("no_verified_image");
  });
});

test.describe("isProductIndexable", () => {
  test("iki koşul birlikte gerekir", () => {
    expect(isProductIndexable({ isActive: true, seoReady: true })).toBe(true);
    expect(isProductIndexable({ isActive: true, seoReady: false })).toBe(false);
    expect(isProductIndexable({ isActive: false, seoReady: true })).toBe(false);
    expect(isProductIndexable({ isActive: false, seoReady: false })).toBe(false);
  });

  test("migration sonrası varsayılan: indekslenemez", () => {
    // seo_ready DEFAULT false → tum satirlar.
    expect(isProductIndexable({ isActive: true, seoReady: false })).toBe(false);
  });
});
