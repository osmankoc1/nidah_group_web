import { test, expect } from "@playwright/test";
import {
  buildProductHreflangs,
  isProductTranslationLocale,
  publishedProductLocales,
  resolveProductContent,
  type ProductTranslationRow,
} from "@/lib/product-i18n";
import { productUrl } from "@/lib/product-url";

/**
 * Talimat: mevcut manuel TR/EN/RU/AR davranışı korunacak, doğrulanmamış çeviri
 * OTOMATİK YAYINLANMAYACAK. `published` varsayılanı false.
 */

const base = {
  name: "Hidrolik Ana Pompa",
  shortDescription: "Kısa TR açıklama",
  longDescription: "Uzun TR açıklama",
  metaTitle: "TR meta başlık",
  metaDescription: "TR meta açıklama",
};

const publishedEn: ProductTranslationRow = {
  locale: "en",
  published: true,
  name: "Main Hydraulic Pump",
  shortDescription: "Short EN copy",
  longDescription: "Long EN copy",
  metaTitle: "EN meta title",
  metaDescription: "EN meta description",
};

const draftRu: ProductTranslationRow = {
  locale: "ru",
  published: false,
  name: "Гидравлический насос",
  shortDescription: "RU kisa",
  longDescription: "RU uzun",
  metaTitle: null,
  metaDescription: null,
};

test.describe("içerik çözümü", () => {
  test("tr her zaman temel içeriği döner", () => {
    const r = resolveProductContent(base, [publishedEn], "tr");
    expect(r.locale).toBe("tr");
    expect(r.fallback).toBe(false);
    expect(r.name).toBe(base.name);
  });

  test("YAYINDA OLMAYAN çeviri KULLANILMAZ — TR'ye düşer", () => {
    const r = resolveProductContent(base, [draftRu], "ru");
    expect(r.locale).toBe("tr");
    expect(r.fallback).toBe(true);
    expect(r.name).toBe(base.name);
    expect(r.name).not.toBe(draftRu.name);
  });

  test("yayında çeviri varsa o kullanılır", () => {
    const r = resolveProductContent(base, [publishedEn, draftRu], "en");
    expect(r.locale).toBe("en");
    expect(r.fallback).toBe(false);
    expect(r.name).toBe("Main Hydraulic Pump");
    expect(r.metaTitle).toBe("EN meta title");
  });

  test("çeviri hiç yoksa TR'ye düşer", () => {
    const r = resolveProductContent(base, [], "ar");
    expect(r.locale).toBe("tr");
    expect(r.fallback).toBe(true);
  });

  test("YARI çeviride boş alanlar TR değerine düşer", () => {
    const halfEn: ProductTranslationRow = {
      locale: "en",
      published: true,
      name: "Main Hydraulic Pump",
      shortDescription: "   ",
      longDescription: null,
      metaTitle: undefined,
      metaDescription: "",
    };
    const r = resolveProductContent(base, [halfEn], "en");
    expect(r.locale).toBe("en");
    expect(r.name).toBe("Main Hydraulic Pump");
    expect(r.shortDescription).toBe(base.shortDescription);
    expect(r.longDescription).toBe(base.longDescription);
    expect(r.metaTitle).toBe(base.metaTitle);
    expect(r.metaDescription).toBe(base.metaDescription);
  });

  test("çeviri adı boşsa TR adı kullanılır — boş başlık üretilmez", () => {
    const r = resolveProductContent(
      base,
      [{ ...publishedEn, name: "   " }],
      "en"
    );
    expect(r.name).toBe(base.name);
  });
});

test.describe("yayında olan diller", () => {
  test("yalnızca published = true olanlar sayılır", () => {
    expect(publishedProductLocales([publishedEn, draftRu])).toEqual(["en"]);
    expect(publishedProductLocales([])).toEqual([]);
    expect(publishedProductLocales([draftRu])).toEqual([]);
  });

  test("sıra sabittir (en, ru, ar)", () => {
    const all: ProductTranslationRow[] = [
      { ...draftRu, locale: "ar", published: true },
      { ...draftRu, locale: "ru", published: true },
      publishedEn,
    ];
    expect(publishedProductLocales(all)).toEqual(["en", "ru", "ar"]);
  });

  test("locale doğrulaması", () => {
    expect(isProductTranslationLocale("en")).toBe(true);
    expect(isProductTranslationLocale("ar")).toBe(true);
    expect(isProductTranslationLocale("tr")).toBe(false); // temel dil, ceviri degil
    expect(isProductTranslationLocale("de")).toBe(false);
  });
});

test.describe("hreflang", () => {
  test("yayınlanmış çeviri yoksa hreflang HİÇ üretilmez", () => {
    expect(buildProductHreflangs("CH 76281", [])).toBeNull();
    expect(buildProductHreflangs("CH 76281", [draftRu])).toBeNull();
  });

  test("yalnızca yayında olan diller + tr + x-default yazılır", () => {
    const map = buildProductHreflangs("CH 76281", [publishedEn, draftRu]);
    expect(map).not.toBeNull();
    expect(Object.keys(map!).sort()).toEqual(["en", "tr", "x-default"]);
    expect(map!.ru).toBeUndefined();
  });

  test("tüm diller kanonik ürün URL'ini paylaşır", () => {
    const map = buildProductHreflangs("CH 76281", [publishedEn]);
    const url = productUrl("CH 76281");
    expect(map!.tr).toBe(url);
    expect(map!.en).toBe(url);
    expect(map!["x-default"]).toBe(url);
    expect(url).toBe("https://www.nidahgroup.com.tr/parca-katalog/ch-76281");
  });
});
