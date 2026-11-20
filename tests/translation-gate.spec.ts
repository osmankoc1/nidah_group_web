import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MIN_TRANSLATION_BODY_CHARS,
  evaluateTranslationReadiness,
} from "@/lib/translation-gate";
import { ONERILEN_ACIKLAMA_KARAKTERI } from "@/lib/seo-gate";
import { IMAGE_ALT_TEXT_MIN } from "@/lib/product-fields";

/**
 * Faz 3 — P11 (çeviri kapısı) ve P10 (fotoğraf şartlarının önden gösterimi).
 *
 * Kilitlenen sözleşme:
 *   · Yarı çevrilmiş kayıt YAYINLANAMAZ, ama TASLAK olarak kaydedilebilir,
 *   · Çeviri kapısı ÜRÜN yayın kapısından AYRI ve daha hafiftir,
 *   · Çeviri yayınlamak `products.seo_ready` alanına DOKUNMAZ,
 *   · Fotoğraf şartları fotoğraf YÜKLENMEDEN önce görünür.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");

const govde = "x".repeat(MIN_TRANSLATION_BODY_CHARS);

test.describe("P11 — çeviri yayın kapısı", () => {
  test("ad + yeterli gövde varsa yayınlanabilir", () => {
    const r = evaluateTranslationReadiness({
      name: "Transmission mating plate",
      shortDescription: null,
      longDescription: govde,
    });
    expect(r.eligible).toBe(true);
    expect(r.unmet).toEqual([]);
  });

  test("YALNIZCA ürün adı dolu kayıt yayınlanamaz", () => {
    // Gerçek durum: dev'deki EN çevirileri yalnızca ad + meta başlık taşıyor.
    // Yayınlanırsa gövde Türkçe kalır — yarı çevrilmiş sayfa.
    const r = evaluateTranslationReadiness({
      name: "Transmission mating plate",
      shortDescription: "",
      longDescription: "",
    });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("body_missing");
  });

  test("ad boşsa yayınlanamaz", () => {
    const r = evaluateTranslationReadiness({
      name: "   ",
      shortDescription: null,
      longDescription: govde,
    });
    expect(r.eligible).toBe(false);
    expect(r.unmet).toContain("name_missing");
  });

  test("kısa gövde reddedilir, eşik DEĞERİ kabul edilir", () => {
    const kisa = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: "x".repeat(MIN_TRANSLATION_BODY_CHARS - 1),
      longDescription: null,
    });
    expect(kisa.unmet).toContain("body_too_short");

    const tam = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: "x".repeat(MIN_TRANSLATION_BODY_CHARS),
      longDescription: null,
    });
    expect(tam.eligible).toBe(true);
  });

  test("kısa VEYA uzun açıklamadan biri yeterli", () => {
    const yalnizKisa = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: govde,
      longDescription: null,
    });
    const yalnizUzun = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: null,
      longDescription: govde,
    });
    expect(yalnizKisa.eligible).toBe(true);
    expect(yalnizUzun.eligible).toBe(true);
  });

  test("boşluk gövde sayılmaz", () => {
    const r = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: "   ",
      longDescription: "  \n  ",
    });
    expect(r.unmet).toContain("body_missing");
  });

  test("çeviri eşiği ÜRÜN kapısından BAĞIMSIZ ve değişmedi", () => {
    // 2026-11-20'de ürün açıklamasının 300 karakter şartı kaldırıldı.
    // Çeviri kapısının 120 karakterlik gövde şartı BUNDAN ETKİLENMEZ:
    // yarı çevrilmiş sayfa yayınlanmamalı.
    expect(MIN_TRANSLATION_BODY_CHARS).toBe(120);
    expect(MIN_TRANSLATION_BODY_CHARS).toBeLessThan(ONERILEN_ACIKLAMA_KARAKTERI);

    // Ürün kapısı kısa açıklamayı artık geçiriyor; çeviri kapısı GEÇİRMİYOR.
    const kisa = evaluateTranslationReadiness({
      name: "Pump",
      shortDescription: "x".repeat(MIN_TRANSLATION_BODY_CHARS - 1),
      longDescription: null,
    });
    expect(kisa.eligible).toBe(false);
  });

  test("her eksik ölçüt Türkçe gerekçe taşır", () => {
    const r = evaluateTranslationReadiness({
      name: "",
      shortDescription: "",
      longDescription: "",
    });
    expect(r.reasons).toHaveLength(r.unmet.length);
    for (const gerekce of r.reasons) expect(gerekce.length).toBeGreaterThan(10);
  });
});

test.describe("P11 — çeviri kapısı ÜRÜN yayın kapısına dokunmaz", () => {
  const kaynak = oku("src/lib/translation-gate.ts");

  test("modül `seo_ready` yazmaz, DB'ye dokunmaz", () => {
    // Yorumlar ayıklanır: açıklama blokunda `products.seo_ready` geçebilir,
    // önemli olan KODUN ona dokunmaması.
    const kod = kaynak
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(kod).not.toContain("seoReady");
    expect(kod).not.toContain("@/lib/db");
    expect(kod).not.toContain("products");
    expect(kod).not.toContain("fetch(");
  });

  test("arayüz yalnızca YAYINLA düğmesini kapıya bağlar", () => {
    const ui = oku("src/components/admin/TranslationsManager.tsx");
    // Taslak kaydetme HER ZAMAN serbest: yalnızca ad şartı.
    expect(ui).toContain("disabled={busy || !draft.name.trim()}");
    // Yayınlama kapıya bağlı.
    expect(ui).toContain("disabled={busy || !ceviriKapisi.eligible}");
  });

  test("eksikler operatöre listelenir", () => {
    const ui = oku("src/components/admin/TranslationsManager.tsx");
    expect(ui).toContain("ceviriKapisi.reasons");
    expect(ui).toContain("Taslak olarak kaydedebilirsiniz");
  });
});

test.describe("P10 — fotoğraf şartları YÜKLEMEDEN ÖNCE görünür", () => {
  const ui = oku("src/components/admin/ImagesManager.tsx");

  test("şartlar koşulsuz render edilir — fotoğraf olmasa da görünür", () => {
    // Blok `images.length === 0` koşulunun DIŞINDA olmalı.
    const bilgiKutusu = ui.indexOf("Fotoğraf çekmeden önce");
    const bosDurum = ui.indexOf("Henüz fotoğraf eklenmedi");
    expect(bilgiKutusu).toBeGreaterThan(-1);
    expect(bilgiKutusu).toBeLessThan(bosDurum);
  });

  test("ALT metni eşiği SABİTTEN okunur", () => {
    expect(ui).toContain("IMAGE_ALT_TEXT_MIN");
    // Eşik sayısı metne gömülmemeli.
    expect(ui).not.toContain("en az 15 karakter");
    expect(IMAGE_ALT_TEXT_MIN).toBe(15);
  });

  test("iki şart da adıyla anılır", () => {
    expect(ui).toContain("ALT metni");
    expect(ui).toContain("Kaynak");
  });

  test("sonucu açıkça yazar: doğrulanmazsa yayına giremez", () => {
    expect(ui).toContain("doğrulanamaz");
    expect(ui).toContain("yayına");
  });
});
