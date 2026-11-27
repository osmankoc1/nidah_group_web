/**
 * PUBLIC GÖRÜNÜRLÜK — tek kaynak.
 *
 * ── NEDEN (kullanıcı şartı 2026-11-26) ────────────────────────────────────
 * "Yalnızca yayın onayı verilen ürünler erişilebilir olsun; onaysız veya
 * pasif ürünler yanlışlıkla yayınlanmasın."
 *
 * Ölçülen eski davranış: public sorguların tamamı YALNIZCA
 * `is_active = true` koşulu taşıyordu. `seo_ready` sinyali sadece iki yerde
 * uygulanıyordu — `sitemap.xml` ve ürün sayfasının `robots` etiketi. Yani
 * yayın onayı OLMAYAN bir ürün aktifleştirildiği anda:
 *   · `/api/products` listesinde görünüyordu (katalog listesi ve marka
 *     sayfaları bu uçtan besleniyor),
 *   · ürün detay sayfası 200 dönüyordu (yalnızca `noindex`),
 *   · parça numarası aramasında eşleşiyordu.
 * Sitemap'te olmamak indekslenmeyi zorlaştırır ama ERİŞİMİ engellemez.
 *
 * Bundan sonra yayın TEK bir şeydir: `is_active` VE `seo_ready`. İkisi
 * birlikte sağlanmadıkça ürün public yüzeyde YOKTUR (gerçek 404 / listede
 * yok / aramada yok). 322 ürünlük toplu aktarımın güvenliği de buna dayanır:
 * aktarım kayıt oluşturur, yayın ayrı bir insan kararıdır.
 *
 * KULLANIM: public bir sorgu YAZARKEN `eq(products.isActive, true)` ELLE
 * yazılmaz; bu modül çağrılır. `tests/public-visibility.spec.ts` her public
 * sorgu dosyasının bu modülü kullandığını ölçer.
 */
import { and, eq, type SQL } from "drizzle-orm";
import { products } from "@/lib/db/schema";

/** Public yüzeyde görünürlüğün İKİ koşulu — sırası sabittir. */
export function publicProductConditions(): SQL[] {
  return [eq(products.isActive, true), eq(products.seoReady, true)];
}

/** Tek `and(...)` hâli — `.where()` içine doğrudan verilebilir. */
export function publicProductWhere(): SQL {
  return and(...publicProductConditions())!;
}

/** Görünürlüğü belirleyen kolon adları — belge ve test için. */
export const PUBLIC_VISIBILITY_COLUMNS = ["isActive", "seoReady"] as const;
