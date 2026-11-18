/**
 * Ürün çok dilliliği — saf yardımcılar.
 *
 * MEVCUT DAVRANIŞ KORUNUR: blog TR/EN/RU/AR çevirileri `blogPostTranslations`
 * üzerinden MANUEL yürütülüyor; ürünlerde de aynı ilke uygulanır.
 *
 * TEMEL KURAL: `published = false` olan bir çeviri YOK SAYILIR. Satırın var
 * olması onu yayına sokmaz; doğrulanmamış çeviri otomatik yayınlanmaz.
 * Yayında çevirisi olmayan dil için TR temel içeriğe düşülür ve o dil için
 * hreflang ÜRETİLMEZ (var olmayan bir sayfayı Google'a bildirmemek için).
 *
 * URL NOTU: ürün URL'i parça numarasından türetilir ve parça numaraları
 * çevrilmez; bu yüzden `product_translations` tablosunda slug kolonu YOKTUR
 * ve tüm diller AYNI URL'i paylaşır. (Dil başına ayrı URL gerekirse bu bir
 * Faz 5 kararıdır ve ayrı migration ister.)
 */
import { productUrl } from "@/lib/product-url";

/** Sitede desteklenen diller. TR temel dildir. */
export const PRODUCT_LOCALES = ["tr", "en", "ru", "ar"] as const;
export type ProductLocale = (typeof PRODUCT_LOCALES)[number];

/** `product_translations` tablosunda tutulan diller (TR temel satırdadır). */
export const PRODUCT_TRANSLATION_LOCALES = ["en", "ru", "ar"] as const;
export type ProductTranslationLocale = (typeof PRODUCT_TRANSLATION_LOCALES)[number];

export function isProductTranslationLocale(
  value: string
): value is ProductTranslationLocale {
  return (PRODUCT_TRANSLATION_LOCALES as readonly string[]).includes(value);
}

/** `products` tablosundaki TR temel içerik. */
export interface ProductBaseContent {
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** `product_translations` satırı. */
export interface ProductTranslationRow extends ProductBaseContent {
  locale: string;
  published: boolean;
}

export interface ResolvedProductContent extends ProductBaseContent {
  /** İçeriğin GERÇEKTEN geldiği dil. */
  locale: ProductLocale;
  /** İstenen dil yerine TR temel içerik mi kullanıldı? */
  fallback: boolean;
}

/**
 * İstenen dil için gösterilecek içeriği çözer.
 *
 * - `tr` → her zaman temel içerik.
 * - Yayında çevirisi olan dil → o çeviri.
 * - Yayında çevirisi OLMAYAN dil → TR temel içerik, `fallback: true`.
 *
 * Çeviride boş bırakılan alanlar TR değerine düşer; böylece yarı çevrilmiş bir
 * kayıt boş başlık/açıklama üretmez.
 */
export function resolveProductContent(
  base: ProductBaseContent,
  translations: ReadonlyArray<ProductTranslationRow>,
  locale: ProductLocale
): ResolvedProductContent {
  if (locale === "tr") {
    return { ...base, locale: "tr", fallback: false };
  }

  const match = translations.find((t) => t.locale === locale && t.published);
  if (!match) {
    return { ...base, locale: "tr", fallback: true };
  }

  const pick = (
    translated: string | null | undefined,
    fallbackValue: string | null | undefined
  ) => {
    const value = translated?.trim();
    return value ? value : (fallbackValue ?? null);
  };

  return {
    locale,
    fallback: false,
    name: match.name.trim() || base.name,
    shortDescription: pick(match.shortDescription, base.shortDescription),
    longDescription: pick(match.longDescription, base.longDescription),
    metaTitle: pick(match.metaTitle, base.metaTitle),
    metaDescription: pick(match.metaDescription, base.metaDescription),
  };
}

/** Yayında olan çeviri dilleri (sırası `PRODUCT_TRANSLATION_LOCALES` ile aynı). */
export function publishedProductLocales(
  translations: ReadonlyArray<ProductTranslationRow>
): ProductTranslationLocale[] {
  return PRODUCT_TRANSLATION_LOCALES.filter((locale) =>
    translations.some((t) => t.locale === locale && t.published)
  );
}

/**
 * `alternates.languages` haritası.
 *
 * YALNIZCA yayında olan diller yazılır; TR her zaman vardır ve `x-default`
 * olarak da bildirilir. Tüm diller aynı URL'i paylaştığı için harita, var
 * olmayan bir sayfaya işaret ETMEZ.
 *
 * Hiç yayınlanmış çeviri yoksa `null` döner — tek dilli bir sayfada hreflang
 * eklemek gereksiz sinyal üretir.
 */
export function buildProductHreflangs(
  partNumber: string,
  translations: ReadonlyArray<ProductTranslationRow>
): Record<string, string> | null {
  const published = publishedProductLocales(translations);
  if (published.length === 0) return null;

  const url = productUrl(partNumber);
  const map: Record<string, string> = { tr: url, "x-default": url };
  for (const locale of published) map[locale] = url;
  return map;
}
