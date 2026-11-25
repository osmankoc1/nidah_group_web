import "server-only";
import { blogCache } from "@/lib/blog-cache";
import { resolveCategory, resolveTag } from "@/lib/blog-taxonomy";

/**
 * `resolveCategory` / `resolveTag`'in PUBLIC yüzey için önbellekli biçimleri.
 *
 * Her çözümleme en çok 4 sorgu çalıştırır ve taksonomi sayfalarında İKİ KEZ
 * çağrılır (`generateMetadata` + sayfa gövdesi) — yani sayfa görüntülemesi
 * başına 8 sorguya kadar. Etiket tabanlı önbellekle bu, admin panelinden bir
 * değişiklik yapılana kadar SIFIR sorguya iner.
 *
 * ── NEDEN AYRI MODÜL ─────────────────────────────────────────────────────────
 * `blog-taxonomy.ts` aynı zamanda `slugifyTaxonomy`'yi barındırıyor ve
 * `slugify.ts` üzerinden istemci tarafına da sızabiliyor. `next/cache`'i o
 * modüle koymak istemci paketini kırabilir; bu yüzden önbellek sarmalayıcıları
 * `server-only` olan bu modülde durur.
 *
 * Admin API rotaları BİLİNÇLİ olarak önbelleksiz `resolveCategory` /
 * `resolveTag` kullanmaya devam eder: panel her zaman taze veriyi görmelidir.
 */

export const resolveCategoryCached = blogCache(
  ["blog-category-resolve"],
  resolveCategory
);

export const resolveTagCached = blogCache(["blog-tag-resolve"], resolveTag);
