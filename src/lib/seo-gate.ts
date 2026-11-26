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

/**
 * Uzun açıklama için ÖNERİLEN karakter hedefi.
 *
 * ── BU BİR YAYIN ŞARTI DEĞİLDİR (2026-11-20 kullanıcı kararı) ─────────────
 * Önceden 300 karakter zorunluydu ve altındaki her ürün yayın kapısından
 * geri çevriliyordu. Kural kaldırıldı: uzunluk artık yalnızca arayüzde
 * gösterilen bir KALİTE HEDEFİDİR. Yayını engelleyen tek içerik şartı,
 * açıklamanın tamamen boş olmamasıdır (`long_description_missing`).
 *
 * Neden: parçaya göre doğru ve özgün bir açıklama 150 karakterde de
 * yazılabilir; eşiği tutturmak için metin uzatmak içeriği iyileştirmez,
 * kötüleştirir.
 */
export const ONERILEN_ACIKLAMA_KARAKTERI = 300;

// Eski ad `MIN_LONG_DESCRIPTION_CHARS` idi ve BİLEREK geri bırakılmadı:
// "MIN_" öneki artık bir alt sınır olmadığı için yanıltıcıdır ve geriye
// dönük bir çağıran yoktur (tüm kullanımlar bu commit'te güncellendi).

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

/**
 * FOTOĞRAF, YAYININ ZORUNLU ŞARTI MI?
 *
 * ── KULLANICI KARARI 2026-11-26: HAYIR ──────────────────────────────────────
 * Ölçüm: aktarılan 154 ürünün **154'ünde** doğrulanmış fotoğraf yoktu, diğer
 * dört içerik ölçütü ise %100 karşılanıyordu. Yani fotoğraf şartı tek başına
 * tüm kataloğu yayından alıkoyuyordu (gerekçe ve etki analizi:
 * `docs/admin-master-plan/32-FOTOGRAFSIZ-YAYIN-KRITERLERI.md`).
 *
 * Şart kaldırıldı ama ÖLÇÜT SİLİNMEDİ: fotoğraf eksikliği artık
 * `SeoReadinessResult.gorselBekliyor` ile raporlanır, böylece admin panelinde
 * "fotoğrafı eksik ürünler" listesi üretilebilir ve ürün sayfası "Ürün
 * görseli henüz eklenmemiştir" uyarısını gösterebilir.
 *
 * KORUNAN ŞARTLAR (kullanıcı listesi): parça numarası, YETERLİ ürün adı,
 * boş olmayan açıklama, doğrulanmış makine uyumu. Marka iddiası ayrıca
 * `brandClaimAllowed()` ile korunur — doğrulanmamış marka SAYFADA GÖSTERİLMEZ.
 *
 * Bu sabiti `true` yapmak eski davranışı birebir geri getirir.
 */
export const GORSEL_YAYIN_SARTI = false;

/**
 * Tek kelimelik bir ürün adının yeterli sayılması için en az karakter sayısı.
 *
 * NEDEN (ölçüm 2026-11-26): fotoğraf yoksa sayfanın tüm ayırt ediciliği ada,
 * açıklamaya ve uyumluluğa kalır. 154 üründe 12'sinin adı tek kelime ve 10
 * karakterden kısaydı ("O-ring" ×7, "Hat", "Far", "Somun", "Cıvata",
 * "Rotor"); canlıdaki iki eski kayıt ise "KIT" ve "GAUDE".
 */
export const AD_EN_AZ_KARAKTER = 10;

/**
 * Ürün adı fotoğrafsız bir sayfayı taşıyacak kadar ayırt edici mi?
 *
 * ÜÇ kural (hepsi ölçülen gerçek kayıtlardan çıktı):
 *   1. En az iki kelime VEYA en az `AD_EN_AZ_KARAKTER` karakter.
 *   2. Ad, parça numarasının kendisi olmamalı.
 *   3. Tamamı büyük harf olmamalı — ham stok kodu artığı göstergesi
 *      ("KIT", "GAUDE", "DESWFSEDF"). Rakam/noktalama içeren adlarda da
 *      harflerin tamamı büyükse aynı kural işler.
 *
 * KAPSAM: saf.
 */
export function adYeterli(
  name: string | null | undefined,
  partNumber?: string | null
): boolean {
  const ad = name?.trim() ?? "";
  if (!ad) return false;

  const sadeAd = ad.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const sadePn = (partNumber ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (sadePn && sadeAd === sadePn) return false;

  const harfler = ad.replace(/[^A-Za-zÇĞİIÖŞÜçğıiöşü]/g, "");
  if (harfler && harfler === harfler.toLocaleUpperCase("tr-TR")) return false;

  const kelime = ad.split(/\s+/).filter(Boolean).length;
  return kelime >= 2 || ad.length >= AD_EN_AZ_KARAKTER;
}

export type SeoCriterion =
  | "inactive"
  | "part_number_missing"
  | "name_missing"
  | "name_too_weak"
  | "no_verified_image"
  | "long_description_missing"
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
  /**
   * Doğrulanmış fotoğraf YOK mu? Yayını engellemez (`GORSEL_YAYIN_SARTI`
   * false), ama ürün sayfasında "Ürün görseli henüz eklenmemiştir" uyarısı
   * gösterilir ve panelde fotoğraf bekleyen ürünler listelenebilir.
   */
  gorselBekliyor: boolean;
}

const REASON: Record<SeoCriterion, string> = {
  inactive: "Ürün pasif (is_active = false).",
  part_number_missing: "Parça numarası boş.",
  name_missing: "Ürün adı boş.",
  name_too_weak:
    "Ürün adı fotoğrafsız bir sayfayı taşıyacak kadar ayırt edici değil: " +
    `en az iki kelime veya ${AD_EN_AZ_KARAKTER} karakter olmalı, parça ` +
    "numarasının kendisi olmamalı ve tamamı büyük harf olmamalı.",
  no_verified_image:
    `En az ${MIN_VERIFIED_IMAGES} DOĞRULANMIŞ gerçek ürün fotoğrafı gerekiyor ` +
    `(product_images.verified = true). Yüklenmiş ama doğrulanmamış fotoğraf ` +
    `sayılmaz; temsilî görsel de sayılmaz.`,
  long_description_missing:
    "Uzun açıklama boş. Sayfanın gövdesi için en az birkaç cümlelik " +
    "benzersiz, Türkçe bir metin gerekir. Uzunluk sınırı yoktur; " +
    `${ONERILEN_ACIKLAMA_KARAKTERI} karakter yalnızca önerilen hedeftir.`,
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
  else if (!adYeterli(input.name, input.partNumber)) unmet.push("name_too_weak");

  // FOTOĞRAF: ölçüt KORUNUR, yayın şartı OLMAKTAN ÇIKTI (GORSEL_YAYIN_SARTI).
  const gorselBekliyor =
    !Number.isFinite(input.verifiedImageCount) ||
    input.verifiedImageCount < MIN_VERIFIED_IMAGES;
  if (gorselBekliyor && GORSEL_YAYIN_SARTI) unmet.push("no_verified_image");
  // İÇERİK ŞARTI: yalnızca BOŞLUK kontrolü. Uzunluk eşiği 2026-11-20'de
  // kaldırıldı; kısa ama doğru bir açıklama yayına engel değildir.
  if ((input.longDescription?.trim().length ?? 0) === 0) {
    unmet.push("long_description_missing");
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
    gorselBekliyor,
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
  // Fotoğraf yayın şartı değilse, fotoğrafın KAYBI da yayını geri almaz:
  // ürün yalnızca "görsel bekliyor" durumuna döner (kullanıcı kararı
  // 2026-11-26). `GORSEL_YAYIN_SARTI` true yapılırsa eski davranış geri gelir.
  if (!GORSEL_YAYIN_SARTI) return false;
  if (!Number.isFinite(input.verifiedImageCount)) return true;
  return input.verifiedImageCount < MIN_VERIFIED_IMAGES;
}
