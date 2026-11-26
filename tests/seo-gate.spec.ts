import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AD_EN_AZ_KARAKTER,
  GORSEL_YAYIN_SARTI,
  MIN_VERIFIED_IMAGES,
  ONERILEN_ACIKLAMA_KARAKTERI,
  adYeterli,
  evaluateSeoReadiness,
  isProductIndexable,
  type SeoReadinessInput,
} from "@/lib/seo-gate";

/**
 * Yayın kapısı (denetim C11). `seo_ready` varsayılanı false; bu testler
 * "varsayılan durumda hiçbir ürün yayına girmez" güvencesini kilitler.
 */

const goodLongDescription = "x".repeat(ONERILEN_ACIKLAMA_KARAKTERI);

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
    // Fotograf artik yayin sarti DEGIL (2026-11-26): "no_verified_image"
    // unmet listesinde YOK — ama `gorselBekliyor` true.
    expect(r.unmet).toEqual([
      "name_too_weak",
      "long_description_missing",
      "no_verified_fitment",
    ]);
    expect(r.reasons).toHaveLength(3);
    expect(r.gorselBekliyor).toBe(true);
  });

  test("pasif ürün asla uygun değil", () => {
    const r = evaluateSeoReadiness({ ...eligible, isActive: false });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("inactive");
  });

  test("DOĞRULANMIŞ görsel yoksa yayın ENGELLENMEZ (2026-11-26 kararı)", () => {
    const r = evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 });
    expect(r.eligible).toBe(true);
    expect(r.unmet).not.toContain("no_verified_image");
    expect(r.gorselBekliyor).toBe(true);
  });

  test("görsel varsa gorselBekliyor false", () => {
    expect(evaluateSeoReadiness(eligible).gorselBekliyor).toBe(false);
  });

  test("KISA açıklama yayını ENGELLEMEZ (2026-11-20 kararı)", () => {
    // Eskiden 300 karakter altı yayın engeliydi. Artık değil: doğru ve
    // özgün bir açıklama 150 karakterde de yazılabilir.
    const kisa = "Kısa ama doğru bir açıklama.";
    const r = evaluateSeoReadiness({ ...eligible, longDescription: kisa });
    expect(r.eligible).toBe(true);
    expect(r.unmet).toEqual([]);

    // Tek karakterlik açıklama bile geçer — uzunluk sınırı YOKTUR.
    expect(evaluateSeoReadiness({ ...eligible, longDescription: "x" }).eligible).toBe(true);

    // Önerilen hedefin üstü de elbette geçer.
    expect(evaluateSeoReadiness({ ...eligible, longDescription: goodLongDescription }).eligible).toBe(true);
  });

  test("BOŞ açıklama yayını ENGELLER", () => {
    for (const bos of [null, undefined, ""]) {
      const r = evaluateSeoReadiness({ ...eligible, longDescription: bos });
      expect(r.eligible).toBe(false);
      expect(r.unmet).toContain("long_description_missing");
    }
  });

  test("yalnızca BOŞLUKtan oluşan açıklama boş sayılır", () => {
    for (const bosluk of ["   ", "\n\n", "  \t  \n "]) {
      expect(
        evaluateSeoReadiness({ ...eligible, longDescription: bosluk }).unmet
      ).toContain("long_description_missing");
    }
  });

  test("ölçüt listesinde uzunluk eşiği ARTIK YOK", () => {
    const kaynak = readFileSync(join(process.cwd(), "src/lib/seo-gate.ts"), "utf-8");
    const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(kod).not.toContain("long_description_too_short");
    // Sabit duruyor ama kapı kararında KULLANILMIYOR.
    expect(kod).toContain("ONERILEN_ACIKLAMA_KARAKTERI");
    const kapi = kod.slice(kod.indexOf("export function evaluateSeoReadiness"));
    expect(kapi).not.toContain("ONERILEN_ACIKLAMA_KARAKTERI");
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
    expect(r.unmet).toContain("no_verified_fitment");
    // NaN gorsel sayisi "gorsel bekliyor" sayilir ama yayini engellemez.
    expect(r.gorselBekliyor).toBe(true);
    expect(r.unmet).not.toContain("no_verified_image");
  });
});

test.describe("K2 — yalnizca DOGRULANMIS gorsel sayilir", () => {
  test("yuklenmis ama dogrulanmamis fotograf GORSEL SAYILMAZ", () => {
    // Operator 3 fotograf yukledi, hicbirini dogrulamadi: sayim 0'dir.
    // Urun "gorsel bekliyor" durumundadir ve sayfada "Urun gorseli henuz
    // eklenmemistir" yazar. Yayini ENGELLEMEZ (2026-11-26) ama
    // dogrulanmamis dosya da public yuzeye CIKMAZ.
    const r = evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 });
    expect(r.gorselBekliyor).toBe(true);
    expect(r.eligible).toBe(true);
  });

  test("temsili gorsel sayiyi ARTIRMAZ", () => {
    expect(evaluateSeoReadiness({ ...eligible, verifiedImageCount: 0 }).gorselBekliyor).toBe(true);
    expect(evaluateSeoReadiness({ ...eligible, verifiedImageCount: 1 }).gorselBekliyor).toBe(false);
  });

  test("esik tam olarak MIN_VERIFIED_IMAGES", () => {
    expect(
      evaluateSeoReadiness({ ...eligible, verifiedImageCount: MIN_VERIFIED_IMAGES }).gorselBekliyor
    ).toBe(false);
    expect(
      evaluateSeoReadiness({ ...eligible, verifiedImageCount: MIN_VERIFIED_IMAGES - 1 }).gorselBekliyor
    ).toBe(true);
  });
});

// ── Seviye B: fotograf sarti kaldirildi, ad sarti eklendi ───────────────────

test.describe("GORSEL_YAYIN_SARTI", () => {
  test("politika sabiti false — fotograf yayin sarti DEGIL", () => {
    expect(GORSEL_YAYIN_SARTI).toBe(false);
  });

  test("fotografsiz ama tam kayit yayina UYGUN", () => {
    const r = evaluateSeoReadiness({
      isActive: true,
      partNumber: "714-12-19320",
      name: "Şanzıman ara dişli yatağı",
      verifiedImageCount: 0,
      longDescription: "Komatsu WA320-3MC güç aktarımı grubundaki yatak.",
      verifiedFitmentCount: 1,
    });
    expect(r.eligible).toBe(true);
    expect(r.gorselBekliyor).toBe(true);
  });
});

test.describe("adYeterli — fotografsiz sayfanin ad sarti", () => {
  test("gerçek katalog adları geçer", () => {
    for (const ad of [
      "Şanzıman ara dişli yatağı",
      "Daire ayar pulu",
      "Hidrolik Ana Pompa",
      "Bıçak kaydırma elemanı",
      "Yağ Filtresi",
    ]) {
      expect(adYeterli(ad, "CH 76281"), ad).toBe(true);
    }
  });

  test("ölçülen ZAYIF adlar düşer", () => {
    // 154 urunde olculen 12 zayif ad + canlidaki uc eski kayit.
    for (const ad of ["O-ring", "Hat", "Far", "Somun", "Cıvata", "Rotor", "KIT", "GAUDE", "DESWFSEDF"]) {
      expect(adYeterli(ad, "CH 76281"), ad).toBe(false);
    }
  });

  test("ad = parça numarası ise düşer", () => {
    expect(adYeterli("CH 76281", "CH-76281")).toBe(false);
    expect(adYeterli("ch76281", "CH 76281")).toBe(false);
  });

  test("tamamı büyük harf düşer, karışık geçer", () => {
    expect(adYeterli("HIDROLIK POMPA MILI", "X")).toBe(false);
    expect(adYeterli("Hidrolik pompa mili", "X")).toBe(true);
  });

  test("tek kelime ama uzun ad geçer", () => {
    expect("Sızdırmazlık".length).toBeGreaterThanOrEqual(AD_EN_AZ_KARAKTER);
    expect(adYeterli("Sızdırmazlık", "X")).toBe(true);
  });

  test("boş ad düşer", () => {
    for (const ad of [null, undefined, "", "   "]) expect(adYeterli(ad, "X")).toBe(false);
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
