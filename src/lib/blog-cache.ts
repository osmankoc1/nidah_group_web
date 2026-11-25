import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Blog okumalarının ETİKET TABANLI önbelleği.
 *
 * ── NEDEN ────────────────────────────────────────────────────────────────────
 * Blog rotaları 2026-11-24 denetimine kadar `force-dynamic` (liste/taksonomi)
 * ve `revalidate = 60` (yazı sayfaları) ile çalışıyordu. Sitemap'teki 63
 * adresin 48'i bu yüzden HER istekte Neon'a iniyordu; Neon'da compute 5 dakika
 * hareketsizlikte uyuduğu için her tarama isteği yeni bir uyanıklık penceresi
 * açıyor ve CU-saat sayacını döndürüyordu (bkz.
 * `docs/admin-master-plan/24-NEON-TUKETIM-DENETIMI.md`, bulgu B1).
 *
 * ── KURAL ────────────────────────────────────────────────────────────────────
 * `unstable_cache`'e **SAYISAL `revalidate` VERİLMEZ.** Next 16 bu değeri
 * yalnızca veri önbelleğine uygulamaz; onu çağıran rotanın revalidate süresine
 * de taşır ve site zaman tabanlı ISR'ye döner (`site-settings.ts` ile aynı
 * tuzak — proje CLAUDE.md "Önbellek mimarisi"). Bu yüzden tek seçenek kaynağı
 * aşağıdaki `BLOG_CACHE_OPTIONS`'tır ve `revalidate: false` taşır.
 *
 * Geçersiz kılma OLAY TABANLIDIR: `/api/admin/blog/**` yazma yolları
 * `revalidateTag(BLOG_CACHE_TAG, { expire: 0 })` + `revalidatePath("/blog",
 * "layout")` çağırır (bkz. `src/lib/blog-revalidate.ts`). İkinci argüman Next
 * 16'da zorunludur; `"max"` gibi bir profil verilirse değişiklik ilk istekte
 * görünmez.
 *
 * ── TARİHLER ─────────────────────────────────────────────────────────────────
 * Veri önbelleği değerleri serileştirerek saklar: önbellekten dönen bir
 * `Date` artık **string**'tir. Bu yüzden önbelleğe giren her fonksiyon tarih
 * alanlarını BİLİNÇLİ olarak ISO string'e çevirir (`isoOrNull`); böylece tip
 * imzası gerçeği söyler ve `tsc` `.toISOString()` gibi hatalı kullanımları
 * derleme zamanında yakalar. Render tarafı zaten `new Date(x)` ile biçimliyor.
 */

/** `blog_*` tablolarından okuyan tüm önbellek kayıtlarının etiketi. */
export const BLOG_CACHE_TAG = "blog";

/** TEK seçenek kaynağı. Sayısal `revalidate` eklenmez. */
const BLOG_CACHE_OPTIONS: { tags: string[]; revalidate: false } = {
  tags: [BLOG_CACHE_TAG],
  revalidate: false,
};

/**
 * Bir blog sorgusunu etiket tabanlı veri önbelleğine alır.
 *
 * `keyParts` önbellek anahtarının sabit ön ekidir; fonksiyon argümanları
 * (locale, slug, sayfa) Next tarafından anahtara otomatik eklenir.
 */
export function blogCache<A extends unknown[], R>(
  keyParts: string[],
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return unstable_cache(fn, keyParts, BLOG_CACHE_OPTIONS);
}

/** `Date | null` → `string | null`. Önbellek sınırını geçen tek tarih biçimi. */
export function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/** JSON-LD `datePublished` / `dateModified` için: yoksa alan hiç yazılmaz. */
export function isoOrUndefined(
  value: Date | string | null | undefined
): string | undefined {
  return isoOrNull(value) ?? undefined;
}
