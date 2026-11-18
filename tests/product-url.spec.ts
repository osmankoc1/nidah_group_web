import { test, expect } from "@playwright/test";
import { SITE_CONFIG } from "@/lib/constants";
import {
  PRODUCT_PATH_PREFIX,
  decodeRouteSegment,
  isCanonicalProductSegment,
  productLookupKey,
  productPath,
  productSegment,
  productUrl,
} from "@/lib/product-url";

/**
 * Denetim C2: aynı ürün için üç ayrı URL yazımı vardı (href `%20`,
 * canonical kodlanmamış boşluk, sitemap `%20`). Bu testler tek kaynak
 * değişmezini kilitler.
 */

test.describe("kanonik ürün URL'i", () => {
  test("yol ve mutlak URL tek kaynaktan gelir", () => {
    expect(productPath("CH 76281")).toBe("/parca-katalog/ch-76281");
    expect(productUrl("CH 76281")).toBe(
      "https://www.nidahgroup.com.tr/parca-katalog/ch-76281"
    );
    // Mutlak URL = site kökü + yol. Drift imkânsız.
    expect(productUrl("CH 76281")).toBe(`${SITE_CONFIG.url}${productPath("CH 76281")}`);
  });

  test("URL'de yüzde kodlaması veya boşluk BULUNMAZ", () => {
    for (const pn of ["CH 76281", "VOE 15172797", "A B C 1"]) {
      const url = productUrl(pn);
      expect(url).not.toContain("%");
      expect(url).not.toContain(" ");
    }
  });

  test("tireler ve baştaki sıfırlar yolda korunur", () => {
    expect(productPath("714-07-20701")).toBe("/parca-katalog/714-07-20701");
    expect(productPath("0012345")).toBe("/parca-katalog/0012345");
  });

  test("segment üretilemiyorsa katalog köküne düşer, bozuk yol üretmez", () => {
    expect(productPath("---")).toBe(PRODUCT_PATH_PREFIX);
    expect(productPath("")).toBe(PRODUCT_PATH_PREFIX);
    expect(productPath(null)).toBe(PRODUCT_PATH_PREFIX);
    expect(productPath("---").endsWith("/")).toBe(false);
  });
});

test.describe("rota segmentinden arama anahtarı", () => {
  test("eski yüzde-kodlu, tireli ve küçük harfli linkler aynı anahtara çözülür", () => {
    expect(productLookupKey("ch-76281")).toBe("CH76281");
    expect(productLookupKey("CH%2076281")).toBe("CH76281");
    expect(productLookupKey("CH 76281")).toBe("CH76281");
    expect(productLookupKey("CH-76281")).toBe("CH76281");
  });

  test("bozuk yüzde dizisi istisna fırlatmaz", () => {
    expect(() => decodeRouteSegment("%zz")).not.toThrow();
    expect(decodeRouteSegment("%zz")).toBe("%zz");
    expect(productLookupKey("%zz")).toBe("ZZ");
  });

  test("anlamsız segment boş anahtar döner → sorgu hiç çalışmaz", () => {
    expect(productLookupKey("---")).toBe("");
    expect(productLookupKey("")).toBe("");
  });
});

test.describe("kanoniklik kontrolü (308 yönlendirme kararı)", () => {
  test("kanonik segment yönlendirme tetiklemez", () => {
    expect(isCanonicalProductSegment("ch-76281", "CH 76281")).toBe(true);
    expect(isCanonicalProductSegment("714-07-20701", "714-07-20701")).toBe(true);
    expect(isCanonicalProductSegment("0012345", "0012345")).toBe(true);
  });

  test("kanonik olmayan her yazım yönlendirme tetikler", () => {
    // Next.js `%20`'yi çözüp parametreyi boşluklu verir.
    expect(isCanonicalProductSegment("CH 76281", "CH 76281")).toBe(false);
    expect(isCanonicalProductSegment("CH-76281", "CH 76281")).toBe(false);
    expect(isCanonicalProductSegment("ch76281", "CH 76281")).toBe(false);
    expect(isCanonicalProductSegment("CH-76281", "CH-76281")).toBe(false);
  });

  test("segment üreticisi productSegment ile tutarlıdır", () => {
    expect(productSegment("CH 76281")).toBe("ch-76281");
    expect(isCanonicalProductSegment(productSegment("CH 76281"), "CH 76281")).toBe(true);
  });
});
