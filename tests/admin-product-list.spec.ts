import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateSeoReadiness } from "@/lib/seo-gate";
import { PRODUCT_COLUMNS_V1 } from "@/lib/db/columns";

/**
 * Faz 2 / P13 — yönetim listesi yayın hazırlığı özeti.
 *
 * Liste ucu `long_description` alanını taşımıyordu; bu yüzden "açıklaması
 * eksik ürünler" listede gösterilemiyor ve filtrelenemiyordu. Tam metin
 * yerine TÜRETİLMİŞ alanlar döndürülüyor.
 *
 * Kilitlenen sözleşme:
 *   · Uzun açıklamanın KENDİSİ listeye taşınmaz (yük),
 *   · Sayımlar TOPLU sorgularla gelir (N+1 yok),
 *   · Yayın hazırlığı AYNI kapıdan hesaplanır (eşik kopyası yok),
 *   · Bu alanlar hiçbir ürünü yayına ALMAZ.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const ROTA = "src/app/api/admin/products/route.ts";

test.describe("P13 — liste ucu yayın hazırlığı alanları", () => {
  const kaynak = oku(ROTA);

  test("uzun açıklamanın KENDİSİ listeye taşınmaz", () => {
    // `longDescription: products.longDescription` biçiminde bir seçim
    // olmamalı; yalnızca uzunluğu alınır.
    expect(kaynak).not.toMatch(/longDescription:\s*products\.longDescription/);
    expect(kaynak).toContain("longDescriptionLength");
    expect(kaynak).toContain("length(coalesce(");
  });

  test("sayımlar TOPLU sorgularla gelir — N+1 yok", () => {
    // Üç sorgu tek `Promise.all` içinde, `inArray` + `groupBy` ile.
    expect(kaynak).toContain("Promise.all");
    expect(kaynak).toContain("groupBy(productImages.productId)");
    expect(kaynak).toContain("groupBy(fitments.productId)");
    expect(kaynak).toContain("inArray(productImages.productId, ids)");
    expect(kaynak).toContain("inArray(fitments.productId, ids)");
  });

  test("yalnızca DOĞRULANMIŞ görsel ve uyumluluk sayılır", () => {
    expect(kaynak).toContain("filter (where ${productImages.verified})");
    expect(kaynak).toContain("eq(fitments.verified, true)");
  });

  test("yayın hazırlığı AYNI kapıdan hesaplanır — eşik kopyası yok", () => {
    expect(kaynak).toContain("evaluateSeoReadiness");
    // Elle yazılmış bir eşik sayısı olmamalı.
    expect(kaynak).not.toMatch(/longDescriptionLength\s*[<>]=?\s*300/);
  });

  test("döndürülen özet alanları eksiksiz", () => {
    for (const alan of [
      "imageCount",
      "verifiedImageCount",
      "verifiedFitmentCount",
      "publishEligible",
      "unmetCount",
    ]) {
      expect(kaynak, `${alan} döndürülmeli`).toContain(alan);
    }
  });

  test("liste ucu `seo_ready` YAZMAZ — yalnızca okur", () => {
    // Kritik güvenlik: bu uç bilgi verir, yayın kararı vermez.
    const get = kaynak.slice(kaynak.indexOf("export async function GET"), kaynak.indexOf("export async function POST"));
    expect(get).not.toContain("seoReady: true");
    expect(get).not.toContain("db.update(products)");
  });
});

test.describe("P13 — özet alanları kapının kendisiyle tutarlı", () => {
  test("fotoğrafsız ürün yayına UYGUN ama 'görsel bekliyor' (2026-11-26)", () => {
    const r = evaluateSeoReadiness({
      isActive: true,
      partNumber: "L77AB04",
      name: "Örnek parça",
      longDescription: "x".repeat(320),
      verifiedImageCount: 0,
      verifiedFitmentCount: 1,
    });
    expect(r.eligible).toBe(true);
    expect(r.unmet).toEqual([]);
    expect(r.gorselBekliyor).toBe(true);
  });

  test("uzunluk yer tutucusu kapıyla aynı sonucu verir", () => {
    // Liste ucu tam metin yerine aynı UZUNLUKTA yer tutucu veriyor; kapı
    // yalnızca uzunluğa baktığı için sonuç değişmez.
    const gercekMetin = "Gerçek açıklama metni. ".repeat(20);
        const yerTutucu = "x".repeat(gercekMetin.trim().length);

    const girdi = {
      isActive: true,
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      verifiedImageCount: 1,
      verifiedFitmentCount: 1,
    };
    const a = evaluateSeoReadiness({ ...girdi, longDescription: gercekMetin });
    const b = evaluateSeoReadiness({ ...girdi, longDescription: yerTutucu });
    expect(a.eligible).toBe(b.eligible);
    expect(a.unmet).toEqual(b.unmet);
  });
});

test.describe("P13 — public yüzeye sızma yok", () => {
  test("özet alanları PUBLIC kolon kümesinde YOK", () => {
    // Yayın hazırlığı yalnızca yönetim bilgisidir; public ürün API'sine
    // veya sayfasına girmez.
    const anahtarlar = Object.keys(PRODUCT_COLUMNS_V1);
    for (const alan of ["publishEligible", "unmetCount", "verifiedImageCount"]) {
      expect(anahtarlar).not.toContain(alan);
    }
  });

  test("public ürün ucu bu alanları döndürmez", () => {
    const publicRota = oku("src/app/api/products/route.ts");
    expect(publicRota).not.toContain("publishEligible");
    expect(publicRota).not.toContain("unmetCount");
    expect(publicRota).not.toContain("longDescriptionLength");
  });
});
