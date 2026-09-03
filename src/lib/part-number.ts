/**
 * Parça numarası kimliği — saf yardımcılar.
 *
 * KAPSAM BİLİNÇLİ OLARAK DAR: yalnızca dize dönüşümü. DB, ağ, React, ortam
 * değişkeni yok; hiçbir şey import edilmez. Hem sunucu hem istemci tarafında
 * güvenle kullanılabilir.
 *
 * Üç temsil vardır:
 *
 *   partNumber           "CH 76281"   insan tarafından okunan kanonik değer.
 *                                     H1, <title>, Product.sku, breadcrumb.
 *   normalized           "CH76281"    eşleştirme/benzersizlik anahtarı.
 *                                     products.part_number_normalized
 *   url segment          "ch-76281"   kanonik URL parçası.
 *                                     (5.1a'da HENÜZ kullanılmıyor — bkz. not)
 *
 * KRİTİK — SQL ile birebir aynı olmalı:
 * drizzle/0006_part_number_identity.sql ve 0007_part_number_types.sql aynı
 * kuralı `UPPER(REGEXP_REPLACE(x,'[^A-Za-z0-9]','','g'))` ile uygular:
 * ÖNCE alfanümerik olmayanları sil, SONRA büyük harfe çevir. Buradaki sıra
 * değişirse migration backfill'i ile uygulamanın yazdığı değer ayrışır.
 */

/** Yalnızca ASCII harf ve rakam; SQL tarafındaki karakter sınıfının aynısı. */
const NON_ALNUM_G = /[^A-Za-z0-9]/g;

/** Alfanümerik olmayan KÜMELER — URL segmentinde tek tireye indirgenir. */
const NON_ALNUM_RUN_G = /[^A-Za-z0-9]+/g;

/** Baştaki/sondaki tireler. */
const EDGE_HYPHENS = /^-+|-+$/g;

/**
 * Eşleştirme anahtarını üretir: alfanümerik olmayan her karakter silinir,
 * kalan ASCII büyük harfe çevrilir.
 *
 *   "CH 76281"      → "CH76281"
 *   "ch-76281"      → "CH76281"
 *   " CH 76281 "    → "CH76281"
 *   "VOE 15172797"  → "VOE15172797"
 *
 * Sonuç boş dize olabilir (girdi yalnızca noktalama/boşluksa). Çağıran taraf
 * boş sonucu geçersiz kimlik olarak değerlendirmelidir.
 *
 * `toUpperCase()` — `toLocaleUpperCase()` DEĞİL: yerelden bağımsız olmalı.
 * (Türkçe yerelde "i" → "İ" olurdu; ayrıca ASCII dışı karakterler zaten bir
 * önceki adımda silindiği için sonuç her koşulda ASCII'dir.)
 */
export function normalizePartNumber(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.replace(NON_ALNUM_G, "").toUpperCase();
}

/**
 * Kanonik URL segmentini üretir: alfanümerik olmayan kümeler tek tireye
 * indirgenir, baş/son tireler atılır, sonuç küçük harfe çevrilir.
 *
 *   "CH 76281"      → "ch-76281"
 *   "VOE 15172797"  → "voe-15172797"
 *   "714-07-20701"  → "714-07-20701"
 *   "295-9663"      → "295-9663"
 *
 * Çakışma güvenliği: iki farklı parça numarası aynı segmenti üretiyorsa
 * (örn. "CH 76281" ve "CH-76281") normalize değerleri de aynıdır
 * ("CH76281") ve `uq_products_pn_norm` ikisinin birlikte var olmasını
 * engeller. Bu yüzden ayrı bir `url_slug` kolonu GEREKMEZ.
 *
 * NOT: 5.1a bu fonksiyonu hiçbir public rotada KULLANMAZ. Public katalog URL
 * davranışı bu fazda bilinçli olarak değiştirilmemiştir.
 */
export function toPartNumberUrlSegment(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.replace(NON_ALNUM_RUN_G, "-").replace(EDGE_HYPHENS, "").toLowerCase();
}

/*
 * parseBrandPrefix() — 5.1a'da BİLİNÇLİ OLARAK YOK.
 *
 * Repoda tek prefix bilgisi `src/app/(public)/catalog/CatalogClient.tsx`
 * içindeki BRAND_OPTIONS sabitidir (VOE / SA / RM / CH). Şu üç nedenle
 * buradan güvenle yeniden kullanılamaz:
 *
 *   1. `export` edilmemiş, modül-özel bir `const`.
 *   2. `"use client"` dosyasının içinde — paylaşılan bir lib'e taşımak istemci
 *      sınırını sunucu koduna sürükler.
 *   3. DB kataloğuna değil, Prosis connector'ına ait (o sistem şu an
 *      erişilemez durumda: /api/health → prosis: "error").
 *
 * Listeyi buraya kopyalamak, kaçınmamız istenen "ikinci ve çelişkili prefix
 * registry"sini yaratırdı. Tek çağıran taraf 5.1b'deki prefixless alias
 * üretimi olduğu için, prefix registry'si TEK kaynak olarak orada kurulmalı
 * ve CatalogClient o kaynaktan import etmelidir.
 */
