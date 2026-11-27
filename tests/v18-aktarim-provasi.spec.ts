import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  IMPORT_NEW_PRODUCT_STATE,
  IMPORT_TEXT_LIMITS,
  checkIdentifierCell,
  findNormalizedDuplicates,
  isIssue,
} from "@/lib/import-validation";
import { normalizePartNumber } from "@/lib/part-number";
import { adYeterli, evaluateSeoReadiness } from "@/lib/seo-gate";

/**
 * v18 TOPLU AKTARIM PROVASI (dry-run) — gerçek doğrulama koduyla.
 *
 * Panelin `mode=dry-run` ucu bu makineden çağrılamıyor (admin API kimliği
 * yok), ama aktarımı reddedecek/geçirecek mantık saf fonksiyonlarda duruyor.
 * Bu dosya hazırlanmış aktarım kümesini TAM O fonksiyonlardan geçirir:
 * kimlik hücresi kontrolü, normalize mükerrer taraması, metin sınırları ve
 * yayın kapısı.
 *
 * Dosya yoksa testler atlanır — hazırlık betiği çalıştırılmadan paket
 * kırılmaz (`node scripts/v18-aktarim-aday.mjs && node scripts/v18-aktarim-hazirla.mjs`).
 */

const DOSYA = join(process.cwd(), "scripts/veri/v18-aktarim-284.json");
const CAKISMA = join(process.cwd(), "scripts/veri/v18-cakisma-raporu.json");
const varMi = existsSync(DOSYA);

interface AktarimSatiri {
  partNumber: string;
  adTR: string;
  logoKodu: string;
  seviye: string;
  markaIpucu: string;
  taslak: string;
}

const satirlar: AktarimSatiri[] = varMi
  ? (JSON.parse(readFileSync(DOSYA, "utf-8")) as AktarimSatiri[])
  : [];

test.describe("aktarım kümesi", () => {
  test.skip(!varMi, "aktarım dosyası hazırlanmamış");

  test("284 ürün, hepsinde parça numarası ve ad var", () => {
    expect(satirlar).toHaveLength(284);
    for (const s of satirlar) {
      expect(s.partNumber.trim(), s.partNumber).not.toBe("");
      expect(s.adTR.trim(), s.partNumber).not.toBe("");
    }
  });

  test("kimlik hücresi kontrolü: TEK satır bile reddedilmiyor", () => {
    const sorunlu = satirlar
      .map((s) => ({
        pn: s.partNumber,
        sorun: checkIdentifierCell({ value: s.partNumber, wasTypedCell: false }),
      }))
      .filter((x) => isIssue(x.sorun));
    expect(sorunlu.map((x) => x.pn)).toEqual([]);
  });

  test("normalize parça numarası mükerreri YOK", () => {
    const mukerrer = findNormalizedDuplicates(
      satirlar.map((s, i) => ({ rowNum: i + 2, partNumber: s.partNumber }))
    );
    expect([...mukerrer.keys()]).toEqual([]);
  });

  test("normalizasyon kuralı: tire ve boşluk eriyor, baştaki sıfır KORUNUYOR", () => {
    for (const s of satirlar) {
      const norm = normalizePartNumber(s.partNumber);
      expect(norm, s.partNumber).not.toBe("");
      // Normalize değer yalnızca A-Z0-9 içerir ve ham değerin harf/rakamlarını
      // sırasıyla korur — baştaki sıfır dahil.
      expect(norm).toMatch(/^[A-Z0-9]+$/);
      expect(norm).toBe(s.partNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase());
    }
  });

  test("ad ve stok kodu metin sınırlarını aşmıyor", () => {
    const sinir = IMPORT_TEXT_LIMITS.internalStockCode;
    for (const s of satirlar) {
      expect(s.adTR.length, s.partNumber).toBeLessThanOrEqual(255);
      if (sinir && s.logoKodu) {
        expect(s.logoKodu.length, s.partNumber).toBeLessThanOrEqual(sinir);
      }
    }
  });
});

test.describe("aktarım YAYIN DEĞİLDİR", () => {
  test.skip(!varMi, "aktarım dosyası hazırlanmamış");

  test("aktarılan hiçbir ürün yayın kapısını geçemez", () => {
    const gecen = satirlar.filter(
      (s) =>
        evaluateSeoReadiness({
          isActive: IMPORT_NEW_PRODUCT_STATE.isActive,
          partNumber: s.partNumber,
          name: s.adTR,
          verifiedImageCount: 0,
          // Aktarım dosyası açıklama kolonu TAŞIMIYOR.
          longDescription: null,
          // Uyumluluk ayrı bir aktarımla ve kaynakla gelir.
          verifiedFitmentCount: 0,
        }).eligible
    );
    expect(gecen.map((s) => s.partNumber)).toEqual([]);
  });

  test("dosya yayın/aktiflik/doğrulama alanı taşımıyor", () => {
    const anahtarlar = new Set(satirlar.flatMap((s) => Object.keys(s)));
    for (const yasak of ["isActive", "is_active", "seoReady", "seo_ready", "verified"]) {
      expect([...anahtarlar], yasak).not.toContain(yasak);
    }
  });

  test("onaylanmamış taslak açıklama aktarıma GİRMİYOR", () => {
    // Seviye 1 satırlarında v18'in taslak metni var; aktarım dosyasına
    // konmadı. Burada yalnızca kaynak JSON'da durduğu doğrulanır: panel
    // dosyası (xlsx) üç kolonludur.
    const taslagiOlan = satirlar.filter((s) => s.taslak);
    expect(taslagiOlan.length).toBeGreaterThan(0);
    expect(satirlar.every((s) => !("longDescription" in s))).toBe(true);
  });
});

test.describe("çakışma raporu", () => {
  test.skip(!existsSync(CAKISMA), "çakışma raporu yok");

  test("19 küme elle incelemeye bırakıldı ve aktarımda yok", () => {
    const rapor = JSON.parse(readFileSync(CAKISMA, "utf-8")) as Array<{
      normalizeNumara: string;
      satirSayisi: number;
    }>;
    expect(rapor).toHaveLength(19);
    for (const k of rapor) expect(k.satirSayisi).toBeGreaterThan(1);

    const aktarimNorm = new Set(satirlar.map((s) => normalizePartNumber(s.partNumber)));
    for (const k of rapor) {
      expect(aktarimNorm.has(k.normalizeNumara), k.normalizeNumara).toBe(false);
    }
  });
});

test.describe("ad kalitesi — yayın öncesi iş yükü", () => {
  test.skip(!varMi, "aktarım dosyası hazırlanmamış");

  test("zayıf adlar ölçülüyor (yayını engeller, aktarımı engellemez)", () => {
    const zayif = satirlar.filter((s) => !adYeterli(s.adTR, s.partNumber));
    // Sayı bir iddia değil, ölçüm: raporda bu sayı kullanılır.
    console.log("zayıf ad: " + zayif.length + " / " + satirlar.length);
    expect(zayif.length).toBeLessThan(satirlar.length);
  });
});
