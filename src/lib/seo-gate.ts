/**
 * Yayın kapısı — `products.seo_ready` için makine-okunur ölçüt kümesi.
 *
 * NEDEN (denetim C11): binlerce sayfayı yalnızca parça numarası + ad ile
 * üretmek Google'ın "thin/duplicate" sınıflamasına girer ve geri alınması
 * haftalar sürer. `seo_ready` bu yüzden varsayılan `false`'tur ve YALNIZCA
 * bir insan onayıyla `true` olur.
 *
 * Bu modül "o onay verilebilir mi?" sorusunu koda döker: admin panelinde
 * eksik ölçütler listelenebilir, toplu bir denetim raporu üretilebilir.
 * Eşikler karar D6'ya tabidir; onay gelince yalnızca aşağıdaki sabitler
 * değişir, mantık değişmez.
 *
 * ÖNEMLİ: bu modül `seo_ready` DEĞERİNİ KENDİ BAŞINA BELİRLEMEZ. Yalnızca
 * ölçütlerin karşılandığını söyler. Yazma kararı insana aittir.
 *
 * KAPSAM: saf. DB, ağ, React yok.
 */

/** Uzun açıklama için en az karakter sayısı (karar D6 önerisi). */
export const MIN_LONG_DESCRIPTION_CHARS = 300;

/**
 * En az DOĞRULANMIŞ gerçek görsel sayısı (karar K2).
 *
 * "Doğrulanmış" = `product_images.verified = true`. Bu bayrak yalnızca
 * zaman damgası + ALT metni + kaynak birlikte varsa yazılabilir; kural
 * veritabanı katmanında `ck_product_images_verified_evidence` ile de
 * uygulanır (drizzle/0011), yani uygulama kodundaki bir hata dayanaksız
 * bir "doğrulandı" üretemez.
 *
 * TEMSİLÎ (placeholder) GÖRSEL BU SAYIYA GİRMEZ. Placeholder bir React
 * bileşenidir; `product_images` tablosunda satırı yoktur, dolayısıyla
 * sayılacak bir kaydı da yoktur. Kullanıcı şartı: "Placeholder gerçek görsel
 * sayılmasın."
 */
export const MIN_VERIFIED_IMAGES = 1;

/**
 * @deprecated `MIN_VERIFIED_IMAGES` kullanılır. Eski ad, yalnızca sayı artık
 * DOĞRULANMIŞ görselleri saydığı için yanıltıcıydı.
 */
export const MIN_REAL_IMAGES = MIN_VERIFIED_IMAGES;

/** En az DOĞRULANMIŞ makine uyumu sayısı. */
export const MIN_VERIFIED_FITMENTS = 1;

export type SeoCriterion =
  | "inactive"
  | "part_number_missing"
  | "name_missing"
  | "no_verified_image"
  | "long_description_too_short"
  | "no_verified_fitment";

export interface SeoReadinessInput {
  isActive: boolean;
  partNumber: string | null | undefined;
  name: string | null | undefined;
  /**
   * Yalnızca DOĞRULANMIŞ görsellerin sayısı (`product_images.verified = true`).
   * Yüklenmiş ama doğrulanmamış dosya BURAYA SAYILMAZ; temsilî görsel de
   * sayılmaz (veritabanında kaydı yoktur).
   */
  verifiedImageCount: number;
  longDescription: string | null | undefined;
  /** `fitments.verified = true` olan kayıt sayısı. */
  verifiedFitmentCount: number;
}

export interface SeoReadinessResult {
  /** Tüm ölçütler karşılandı mı? */
  eligible: boolean;
  /** Karşılanmayan ölçüt kodları. */
  unmet: SeoCriterion[];
  /** Operatöre gösterilecek Türkçe açıklamalar (unmet ile aynı sırada). */
  reasons: string[];
}

const REASON: Record<SeoCriterion, string> = {
  inactive: "Ürün pasif (is_active = false).",
  part_number_missing: "Parça numarası boş.",
  name_missing: "Ürün adı boş.",
  no_verified_image:
    `En az ${MIN_VERIFIED_IMAGES} DOĞRULANMIŞ gerçek ürün fotoğrafı gerekiyor ` +
    `(product_images.verified = true). Yüklenmiş ama doğrulanmamış fotoğraf ` +
    `sayılmaz; temsilî görsel de sayılmaz.`,
  long_description_too_short:
    `Uzun açıklama en az ${MIN_LONG_DESCRIPTION_CHARS} karakter olmalı ` +
    `(benzersiz, Türkçe, parça numarasını tekrar etmeyen metin).`,
  no_verified_fitment:
    `En az ${MIN_VERIFIED_FITMENTS} DOĞRULANMIŞ makine uyumu gerekiyor ` +
    `(fitments.verified = true).`,
};

/**
 * Ürünün yayın ölçütlerini değerlendirir.
 * Ölçütler sabit sırada döner, böylece arayüz çıktısı kararlıdır.
 */
export function evaluateSeoReadiness(
  input: SeoReadinessInput
): SeoReadinessResult {
  const unmet: SeoCriterion[] = [];

  if (!input.isActive) unmet.push("inactive");
  if (!input.partNumber?.trim()) unmet.push("part_number_missing");
  if (!input.name?.trim()) unmet.push("name_missing");
  if (
    !Number.isFinite(input.verifiedImageCount) ||
    input.verifiedImageCount < MIN_VERIFIED_IMAGES
  ) {
    unmet.push("no_verified_image");
  }
  if ((input.longDescription?.trim().length ?? 0) < MIN_LONG_DESCRIPTION_CHARS) {
    unmet.push("long_description_too_short");
  }
  if (
    !Number.isFinite(input.verifiedFitmentCount) ||
    input.verifiedFitmentCount < MIN_VERIFIED_FITMENTS
  ) {
    unmet.push("no_verified_fitment");
  }

  return {
    eligible: unmet.length === 0,
    unmet,
    reasons: unmet.map((code) => REASON[code]),
  };
}

/**
 * Ürün public olarak indekslenebilir mi?
 *
 * İKİ koşul birlikte gerekir: aktif OLMALI ve insan onayı VERİLMİŞ olmalı.
 * `sitemap` ve `generateStaticParams` yalnızca bu koşulu geçen ürünleri alır
 * (Faz 4 bağlantısı).
 */
export function isProductIndexable(input: {
  isActive: boolean;
  seoReady: boolean;
}): boolean {
  return input.isActive === true && input.seoReady === true;
}

// ── Yayın onayının GERİ ALINMASI (kullanıcı onayı 2026-11-17) ────────────────

/**
 * Yayın onayı dayanaksız mı kaldı?
 *
 * KURAL: yayındaki her ürünün EN AZ BİR doğrulanmış gerçek fotoğrafı olmak
 * zorundadır (karar K2). Son doğrulanmış fotoğraf silinir veya doğrulaması
 * geri alınırsa bu değişmez bozulur ve `seo_ready` geri alınır.
 *
 * YÖN TEK TARAFLIDIR. Bu fonksiyon ASLA `true` → "yayına al" demez; yalnızca
 * "yayından çıkar" der. Fotoğraf yeniden doğrulandığında ürün KENDİLİĞİNDEN
 * yayına dönmez — yeniden yönetici onayı gerekir (kullanıcı şartı 3).
 * Bu yüzden girdi olarak yalnızca "şu an yayında mı" ve "doğrulanmış fotoğraf
 * sayısı" alınır; dönüş `true` ise tek yapılacak iş `seo_ready = false`'tur.
 *
 * Yayında OLMAYAN ürün için her zaman `false` döner: geri alınacak bir onay
 * yoktur ve gereksiz yazma yapılmaz.
 *
 * KAPSAM: saf. DB, ağ, React yok — bu yüzden tek başına test edilebilir.
 */
export function shouldRevokeSeoReady(input: {
  seoReady: boolean;
  verifiedImageCount: number;
}): boolean {
  if (input.seoReady !== true) return false;
  if (!Number.isFinite(input.verifiedImageCount)) return true;
  return input.verifiedImageCount < MIN_VERIFIED_IMAGES;
}
