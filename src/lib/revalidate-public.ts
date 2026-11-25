import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { BLOG_CACHE_TAG } from "@/lib/blog-cache";
import { PRODUCTS_CACHE_TAG } from "@/lib/product-cache";
import { productPath } from "@/lib/product-url";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

/**
 * Public yüzeyin önbelleğini OLAY TABANLI geçersiz kılma — TEK OTORİTE.
 *
 * Blog ve ürün okumaları artık süreyle eskimiyor (`revalidate: false`), bu
 * yüzden admin panelinden yapılan bir değişikliğin canlıya yansımasının TEK
 * yolu burasıdır. Her yazma yolu (`POST` / `PATCH` / `PUT` / `DELETE`) işini
 * bitirdikten sonra ilgili fonksiyonu çağırmak ZORUNDADIR; atlanırsa panelde
 * görünen veri ile sitede görünen veri kalıcı olarak ayrışır.
 *
 * İki katman birlikte düşürülür — biri eksikse değişiklik görünmez:
 *  1. `revalidateTag(...)` → `unstable_cache` VERİ kayıtları.
 *  2. `revalidatePath(...)` → ÜRETİLMİŞ sayfa çıktıları (full route cache).
 *
 * `{ expire: 0 }` = anında düşür. Next 16'da ikinci argüman zorunludur;
 * `"max"` gibi bir profil verilirse Next bunu stale-while-revalidate sayar ve
 * değişiklik ilk istekte GÖRÜNMEZ (bkz. `/api/admin/settings` notu).
 */

/** Sitemap içeriği yayın durumuna bağlıdır: `status`, `is_active`, `seo_ready`. */
function revalidateSitemap(): void {
  revalidatePath("/sitemap.xml");
}

/**
 * Blog yazısı / kategori / etiket / çeviri yazıldığında çağrılır.
 *
 * `revalidatePath("/blog", "layout")` tek çağrıda `/blog`, `/blog/[slug]`,
 * `/blog/kategori/*`, `/blog/etiket/*` ve `/blog/{en,ru,ar}/**` dahil bütün
 * alt ağacı düşürür — çok dilli sayfalar için ayrı çağrı gerekmez.
 */
export function revalidateBlog(): void {
  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  revalidatePath("/blog", "layout");
  revalidateSitemap();
}

/**
 * Ürün / görsel / uyumluluk / OEM numarası / çeviri yazıldığında çağrılır.
 *
 * @param partNumbers Etkilenen ürünlerin GÖRÜNEN parça numaraları. Ürün
 *   detay sayfaları on-demand ISR ile süresiz önbellekte durduğu için
 *   her birinin yolu ayrıca düşürülür. Numara bilinmiyorsa (toplu işlem)
 *   boş geçilebilir; liste, katalog ve sitemap yine tazelenir.
 */
export function revalidateProducts(partNumbers: (string | null | undefined)[] = []): void {
  revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });

  const seen = new Set<string>();
  for (const pn of partNumbers) {
    if (!pn) continue;
    const path = productPath(pn);
    if (seen.has(path)) continue;
    seen.add(path);
    revalidatePath(path);
  }

  // Marka sayfaları, katalog listesi VE ürün detay sayfaları aynı layout
  // altındadır: `"layout"` tipi bu yolun altındaki bütün rotaları düşürür,
  // dinamik olanlar dahil. Bu yüzden parça numarası bilinmeyen durumlarda
  // (toplu içe aktarma, silme) tek başına yeterlidir; yukarıdaki yol bazlı
  // düşürme kesinlik için eklenmiştir.
  revalidatePath("/parca-katalog", "layout");
  revalidateSitemap();
}

/**
 * Yalnızca ürün KİMLİĞİ bilinen yazma yolları için: parça numaralarını okuyup
 * `revalidateProducts`'a devreder.
 *
 * Ürün silindiyse numara artık okunamaz; bu durumda yol bazlı düşürme atlanır
 * ve layout düşürmesi devreye girer — sonuç yine doğrudur.
 */
export async function revalidateProductsById(
  productIds: (string | null | undefined)[]
): Promise<void> {
  const ids = [...new Set(productIds.filter((x): x is string => !!x))];

  let partNumbers: (string | null)[] = [];
  if (db && ids.length > 0 && ids.length <= 500) {
    try {
      const rows = await db
        .select({ partNumber: products.partNumber })
        .from(products)
        .where(inArray(products.id, ids));
      partNumbers = rows.map((r) => r.partNumber);
    } catch (err) {
      // Önbellek düşürme bir yazma işlemini DÜŞÜRMEMELİ. Hata adı dışında
      // ayrıntı loglanmaz (bağlantı hataları uç nokta adresi taşıyabilir).
      console.error(
        `[revalidate] parça numaraları okunamadı (${err instanceof Error ? err.name : "UnknownError"}) — layout düşürmesiyle devam ediliyor`
      );
    }
  }

  revalidateProducts(partNumbers);
}
