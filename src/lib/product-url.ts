/**
 * Ürün URL'lerinin TEK KAYNAĞI.
 *
 * Denetimde (C2) aynı ürün için üç ayrı yazım bulundu: `href` yüzde-kodlu,
 * `canonical` kodlanmamış (boşluk içeren), `sitemap` yüzde-kodlu. Bu modül
 * canonical, JSON-LD, sitemap ve tüm iç linkleri tek bir fonksiyona bağlar;
 * böylece yazım drift'i yapısal olarak imkânsız hâle gelir.
 *
 * Üç temsil (bkz. src/lib/part-number.ts):
 *   partNumber  "CH 76281"   görünen kanonik değer — DEĞİŞTİRİLMEZ
 *   normalized  "CH76281"    eşleştirme anahtarı — DB araması
 *   segment     "ch-76281"   kanonik URL parçası — bu modül
 *
 * KAPSAM: saf dize dönüşümü. DB, ağ, React yok.
 */
import { SITE_CONFIG } from "@/lib/constants";
import { normalizePartNumber, toPartNumberUrlSegment } from "@/lib/part-number";

/** Ürün detay rotalarının kökü. */
export const PRODUCT_PATH_PREFIX = "/parca-katalog";

/**
 * Kanonik URL segmenti. Tireler ve baştaki sıfırlar KORUNUR:
 *   "CH 76281"     → "ch-76281"
 *   "714-07-20701" → "714-07-20701"
 *   "0012345"      → "0012345"
 */
export function productSegment(partNumber: string | null | undefined): string {
  return toPartNumberUrlSegment(partNumber);
}

/**
 * Site-içi kanonik yol. Segment üretilemiyorsa (girdi yalnızca noktalama ise)
 * katalog köküne düşer — asla `/parca-katalog/` gibi bozuk bir yol üretmez.
 */
export function productPath(partNumber: string | null | undefined): string {
  const segment = productSegment(partNumber);
  return segment ? `${PRODUCT_PATH_PREFIX}/${segment}` : PRODUCT_PATH_PREFIX;
}

/** Mutlak kanonik URL — canonical, JSON-LD `url` ve sitemap aynı değeri alır. */
export function productUrl(partNumber: string | null | undefined): string {
  return `${SITE_CONFIG.url}${productPath(partNumber)}`;
}

/**
 * Rota parametresini güvenle çözer.
 *
 * Next.js dinamik segmentleri zaten çözer; ancak eski `%20` biçimli linkler ve
 * elle yazılan adresler için ikinci bir çözme denemesi yapılır. Bozuk yüzde
 * dizileri (`%zz`) `decodeURIComponent`'i fırlatır — o durumda ham değer
 * kullanılır, istek 500 ile düşmez.
 */
export function decodeRouteSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Rota parametresinden DB eşleştirme anahtarı üretir.
 * Boş dize dönerse istek geçersiz bir kimliktir → çağıran taraf 404 vermelidir.
 */
export function productLookupKey(rawSegment: string): string {
  return normalizePartNumber(decodeRouteSegment(rawSegment));
}

/**
 * İstenen segment, ürünün kanonik segmenti mi?
 * `false` ise çağıran taraf kanonik yola kalıcı yönlendirme yapar.
 *
 * Karşılaştırma Next.js'in verdiği ham parametre ile yapılır: `/CH%2076281`
 * Next tarafından `"CH 76281"` olarak verilir ve kanonik `"ch-76281"`'den
 * farklıdır → yönlendirme tetiklenir.
 */
export function isCanonicalProductSegment(
  rawSegment: string,
  canonicalPartNumber: string
): boolean {
  return rawSegment === productSegment(canonicalPartNumber);
}
