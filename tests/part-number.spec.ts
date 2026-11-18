import { test, expect } from "@playwright/test";
import { normalizePartNumber, toPartNumberUrlSegment } from "@/lib/part-number";

/**
 * Parça numarası kimliği — DEĞİŞMEZLER.
 *
 * Bu dosyadaki iddialar `drizzle/0006` ve `0007` migration'larındaki SQL
 * kuralıyla birebir aynı davranışı kilitler:
 *   ÖNCE [^A-Za-z0-9] sil, SONRA büyük harfe çevir.
 * Sıra değişirse migration backfill'i ile uygulamanın yazdığı değer ayrışır.
 */

test.describe("normalizePartNumber", () => {
  test("boşluk, tire ve alt çizgi eşleştirmede yok sayılır", () => {
    expect(normalizePartNumber("CH 76281")).toBe("CH76281");
    expect(normalizePartNumber("CH-76281")).toBe("CH76281");
    expect(normalizePartNumber("ch_76281")).toBe("CH76281");
    expect(normalizePartNumber("  CH 76281  ")).toBe("CH76281");
    expect(normalizePartNumber("VOE 15172797")).toBe("VOE15172797");
    expect(normalizePartNumber("714-07-20701")).toBe("7140720701");
  });

  test("BAŞTAKİ SIFIRLAR korunur", () => {
    expect(normalizePartNumber("0012345")).toBe("0012345");
    expect(normalizePartNumber("00-123-45")).toBe("0012345");
    expect(normalizePartNumber("0")).toBe("0");
  });

  test("geçersiz girdi boş dize döner — çağıran taraf 404 vermelidir", () => {
    expect(normalizePartNumber("")).toBe("");
    expect(normalizePartNumber("   ")).toBe("");
    expect(normalizePartNumber("---")).toBe("");
    expect(normalizePartNumber("-_. /")).toBe("");
    expect(normalizePartNumber(null)).toBe("");
    expect(normalizePartNumber(undefined)).toBe("");
  });

  test("yerelden bağımsızdır: Türkçe i/İ tuzağına düşmez", () => {
    // toLocaleUpperCase("i") Türkçe yerelde "İ" üretirdi ve SQL'in UPPER()
    // çıktısıyla ayrışırdı. ASCII dışı karakterler zaten silinir.
    expect(normalizePartNumber("i")).toBe("I");
    expect(normalizePartNumber("ıi")).toBe("I");
    expect(normalizePartNumber("şğüöç")).toBe("");
  });

  test("ÇAKIŞMA GÜVENLİĞİ: farklı yazımlar aynı kimliğe çözülür", () => {
    const spellings = ["CH 76281", "CH-76281", "ch76281", "  ch_76281 ", "C H 7 6 2 8 1"];
    const keys = new Set(spellings.map(normalizePartNumber));
    // Tek bir kimlik → uq_products_pn_norm bunların birlikte var olmasını engeller.
    expect([...keys]).toEqual(["CH76281"]);
  });
});

test.describe("toPartNumberUrlSegment", () => {
  test("temiz, küçük harfli segment üretir", () => {
    expect(toPartNumberUrlSegment("CH 76281")).toBe("ch-76281");
    expect(toPartNumberUrlSegment("VOE 15172797")).toBe("voe-15172797");
  });

  test("anlam taşıyan TİRELER korunur", () => {
    expect(toPartNumberUrlSegment("714-07-20701")).toBe("714-07-20701");
    expect(toPartNumberUrlSegment("295-9663")).toBe("295-9663");
  });

  test("BAŞTAKİ SIFIRLAR korunur", () => {
    expect(toPartNumberUrlSegment("0012345")).toBe("0012345");
  });

  test("alfanümerik olmayan kümeler tek tireye iner, baş/son tire atılır", () => {
    expect(toPartNumberUrlSegment(" --CH__76281-- ")).toBe("ch-76281");
    expect(toPartNumberUrlSegment("CH   76281")).toBe("ch-76281");
  });

  test("üretilemeyen segment boş dizedir", () => {
    expect(toPartNumberUrlSegment("---")).toBe("");
    expect(toPartNumberUrlSegment(null)).toBe("");
  });
});

test.describe("segment ↔ normalize değişmezi", () => {
  test("URL segmentinden normalize edilen değer, orijinalin normalizesine eşittir", () => {
    // Bu değişmez olmadan kanonik URL ile yapılan arama ürünü bulamaz.
    const samples = [
      "CH 76281",
      "VOE 15172797",
      "714-07-20701",
      "0012345",
      "295-9663",
      "KOM708-1W",
      "CAT1R-0749",
    ];
    for (const pn of samples) {
      const segment = toPartNumberUrlSegment(pn);
      expect(normalizePartNumber(segment), `segment=${segment}`).toBe(
        normalizePartNumber(pn)
      );
    }
  });
});
