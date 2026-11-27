/**
 * Toplu ürün import'unun ON CONFLICT gövdesi — AYRI MODÜL, çünkü test edilir.
 *
 * ── NEDEN BURADA ───────────────────────────────────────────────────────────
 * Bu gövde, mevcut bir ürünün HANGİ kolonlarının üzerine yazıldığını
 * belirler. `is_active` ve `seo_ready` buraya yanlışlıkla eklenirse bir
 * dosya yüklemesi yüzlerce ürünü yayına açabilir ya da yayından alabilir.
 * Rota dosyasından export edilemediği için (Next.js route modülleri yalnızca
 * HTTP metodları ve tanınmış yapılandırma alanlarını export edebilir) gövde
 * bu modülde tutulur ve `tests/import-safety.spec.ts` doğrudan ölçer.
 */
import { sql, type SQL } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import type { OptionalProductColumn } from "@/lib/import-validation";

/**
 * ON CONFLICT DO UPDATE SET gövdesi.
 *
 * Dosyada BULUNMAYAN kolona `products.<kolon>` yazılır — yani kendi mevcut
 * değeri, no-op. Eski davranış her kolona `excluded.<kolon>` yazıyordu; bu
 * yüzden yalnızca `partNumber` + `name` içeren bir dosya, mevcut kayıtların
 * `description` / `weight` / `category_id` / `notes` alanlarını NULL'a
 * çekiyordu (denetim E-4, sessiz veri kaybı).
 */
export function buildProductConflictSet(updatable: Set<OptionalProductColumn>) {
  const pick = (column: OptionalProductColumn, excluded: SQL, current: SQL) =>
    updatable.has(column) ? excluded : current;

  return {
    name: sql`excluded.name`,
    // Kimlik anahtarı HER ZAMAN yenilenir — denetim E-1'in kök nedeni buydu.
    partNumberNormalized: sql`excluded.part_number_normalized`,
    description: pick("description", sql`excluded.description`, sql`${products.description}`),
    condition: pick("condition", sql`excluded.condition`, sql`${products.condition}`),
    inStock: pick("inStock", sql`excluded.in_stock`, sql`${products.inStock}`),
    weight: pick("weight", sql`excluded.weight`, sql`${products.weight}`),
    categoryId: pick("category", sql`excluded.category_id`, sql`${products.categoryId}`),
    notes: pick("notes", sql`excluded.notes`, sql`${products.notes}`),
    // ── Faz 2 — aynı "dosyada yoksa dokunma" kuralı ────────────────────────
    partManufacturer: pick("partManufacturer", sql`excluded.part_manufacturer`, sql`${products.partManufacturer}`),
    sourcingType:     pick("sourcingType",     sql`excluded.sourcing_type`,     sql`${products.sourcingType}`),
    stockStatus:      pick("stockStatus",      sql`excluded.stock_status`,      sql`${products.stockStatus}`),
    shortDescription: pick("shortDescription", sql`excluded.short_description`, sql`${products.shortDescription}`),
    longDescription:  pick("longDescription",  sql`excluded.long_description`,  sql`${products.longDescription}`),
    metaTitle:        pick("metaTitle",        sql`excluded.meta_title`,        sql`${products.metaTitle}`),
    metaDescription:  pick("metaDescription",  sql`excluded.meta_description`,  sql`${products.metaDescription}`),
    // ── Faz 3 — ham kod ve normalize kolon BİRLİKTE güncellenir; biri
    // güncellenip diğeri eski kalırsa arama sessizce yanlış sonuç verir.
    internalStockCode:
      pick("internalStockCode", sql`excluded.internal_stock_code`, sql`${products.internalStockCode}`),
    internalStockCodeNormalized:
      pick("internalStockCode", sql`excluded.internal_stock_code_normalized`, sql`${products.internalStockCodeNormalized}`),
    // `seo_ready` ve `seo_ready_at` BILINCLI OLARAK YOK: yayin onayi toplu
    // import ile verilemez (IMPORT_FORBIDDEN_COLUMNS).
    updatedAt: sql`now()`,
  };
}
