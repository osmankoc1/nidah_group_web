import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Public ürün okumalarının ETİKET TABANLI önbelleği.
 *
 * ── NEDEN ────────────────────────────────────────────────────────────────────
 * `/api/products` ve `/api/products/[partNumber]` yanıtlarında yalnızca CDN
 * başlığı (`s-maxage`) vardı. CDN'de olmayan her filtre/arama/sayfa
 * kombinasyonu doğrudan Neon'a iniyordu. Katalog 5.000–50.000 ürünle
 * açıldığında bu, iş saatleri boyunca compute'u uyanık tutan bir kaynağa
 * dönüşür (bkz. `docs/admin-master-plan/24-NEON-TUKETIM-DENETIMI.md`, B9).
 *
 * İki katman birlikte çalışır:
 *  1. CDN (`s-maxage`) → aynı sorguyu tekrar eden ziyaretçiler sunucuya hiç
 *     gelmez.
 *  2. Veri önbelleği (bu modül) → CDN'de olmayan bir kombinasyon sunucuya
 *     gelse bile Neon'a inmez; kayıt süreyle eskimez, yalnızca admin yazma
 *     yolları düşürür.
 *
 * ── KURAL ────────────────────────────────────────────────────────────────────
 * `unstable_cache`'e **SAYISAL `revalidate` VERİLMEZ** — Next 16 bu değeri
 * çağıran rotaya taşır ve zaman tabanlı ISR geri gelir (proje CLAUDE.md
 * "Önbellek mimarisi"). Geçersiz kılma `src/lib/revalidate-public.ts`
 * üzerinden olay tabanlıdır.
 *
 * ── TARİHLER ─────────────────────────────────────────────────────────────────
 * Veri önbelleği değerleri serileştirir: önbellekten dönen `Date` artık
 * string'tir. Önbelleğe giren fonksiyonlar tarih alanlarını bilinçli olarak
 * ISO string'e çevirir, böylece tip imzası gerçeği söyler.
 */

/** `products` ve ilişkili tablolardan okuyan önbellek kayıtlarının etiketi. */
export const PRODUCTS_CACHE_TAG = "products";

const PRODUCTS_CACHE_OPTIONS: { tags: string[]; revalidate: false } = {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: false,
};

/**
 * Bir ürün sorgusunu etiket tabanlı veri önbelleğine alır.
 *
 * `keyParts` sabit ön ektir; fonksiyon argümanları (arama, marka, sayfa)
 * Next tarafından anahtara otomatik eklenir.
 */
export function productCache<A extends unknown[], R>(
  keyParts: string[],
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return unstable_cache(fn, keyParts, PRODUCTS_CACHE_OPTIONS);
}
