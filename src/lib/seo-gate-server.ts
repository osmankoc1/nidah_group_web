/**
 * Yayın kapısının SUNUCU TARAFI uygulaması (karar K3).
 *
 * ── KAPATILAN AÇIK ─────────────────────────────────────────────────────────
 * `seo-gate.ts` saf ve doğruydu ama BAĞLAYICI DEĞİLDİ: tek çağıranı admin
 * düzenleme ekranıydı (bilgilendirme amaçlı). `seo_ready`'yi yazan
 * `PATCH /api/admin/products/[id]` kapıyı HİÇ ÇAĞIRMIYORDU. Yani
 *
 *     curl -X PATCH .../api/admin/products/<id> -d '{"seoReady":true}'
 *
 * fotoğrafı, açıklaması ve doğrulanmış uyumluluğu olmayan bir ürünü yayına
 * açabiliyordu — arayüzdeki uyarı listesi yalnızca bir TAVSİYEYDİ. Bu modül
 * kararı sunucuya taşır: ölçütler karşılanmadan `seo_ready = true` YAZILAMAZ.
 *
 * ── NE DEĞİŞMEZ ────────────────────────────────────────────────────────────
 * Kapı yalnızca "olabilir mi?" sorusunu yanıtlar. Ölçütler karşılandığında
 * ürün KENDİLİĞİNDEN yayına girmez; `seo_ready` hâlâ açık bir insan kararıyla
 * yazılır (kullanıcı şartı: "Hiçbir ürünü otomatik yayımlama").
 */
import { db } from "@/lib/db";
import { fitments, productImages, products } from "@/lib/db/schema";
import { and, count, eq, notExists, sql } from "drizzle-orm";
import {
  evaluateSeoReadiness,
  type SeoReadinessResult,
} from "@/lib/seo-gate";

/** Ürünün DOĞRULANMIŞ fotoğraf sayısı (`product_images.verified = true`). */
export async function countVerifiedImages(productId: string): Promise<number> {
  if (!db) return 0;
  const [row] = await db
    .select({ total: count() })
    .from(productImages)
    .where(
      and(eq(productImages.productId, productId), eq(productImages.verified, true))
    );
  return Number(row?.total ?? 0);
}

/** Ürünün DOĞRULANMIŞ makine uyumu sayısı (`fitments.verified = true`). */
export async function countVerifiedFitments(productId: string): Promise<number> {
  if (!db) return 0;
  const [row] = await db
    .select({ total: count() })
    .from(fitments)
    .where(and(eq(fitments.productId, productId), eq(fitments.verified, true)));
  return Number(row?.total ?? 0);
}

/**
 * `seo_ready = true` yazılabilir mi?
 *
 * Ölçütler, PATCH sonrası OLUŞACAK duruma göre değerlendirilir: aynı istekte
 * `isActive` veya `longDescription` da değişiyorsa yeni değerler kullanılır.
 * Böylece "aynı istekte aktifleştir + yayına al" doğru çalışır ve
 * "aynı istekte pasifleştir + yayına al" reddedilir.
 */
export async function evaluatePublishEligibility(input: {
  productId: string;
  isActive: boolean;
  partNumber: string | null | undefined;
  name: string | null | undefined;
  longDescription: string | null | undefined;
}): Promise<SeoReadinessResult> {
  const [verifiedImageCount, verifiedFitmentCount] = await Promise.all([
    countVerifiedImages(input.productId),
    countVerifiedFitments(input.productId),
  ]);

  return evaluateSeoReadiness({
    isActive: input.isActive,
    partNumber: input.partNumber,
    name: input.name,
    longDescription: input.longDescription,
    verifiedImageCount,
    verifiedFitmentCount,
  });
}

// ── Dayanaksız yayın onayının GERİ ALINMASI ──────────────────────────────────

/**
 * Dayanağı kalmayan yayın onayını geri alan TEK ve ATOMİK ifade.
 *
 * ── NEDEN TEK İFADE ────────────────────────────────────────────────────────
 * İlk uygulama "önce oku, sonra yaz" biçimindeydi:
 *     SELECT seo_ready …  →  SELECT count(*) … verified  →  UPDATE …
 * `neon-http` sürücüsü `db.transaction()` desteklemediği için bu üç adımın
 * arasında gerçek bir yarış penceresi vardı. Koşul artık `UPDATE`'in kendi
 * `WHERE`'ine taşındı:
 *
 *     UPDATE products
 *        SET seo_ready = false, seo_ready_at = NULL, updated_at = now()
 *      WHERE id = $1
 *        AND seo_ready = true
 *        AND NOT EXISTS (SELECT 1 FROM product_images
 *                         WHERE product_id = $1 AND verified)
 *
 * PostgreSQL bu ifadeyi tek bir atomik deyim olarak değerlendirir: koşul,
 * satır kilitlendikten sonraki GERÇEK duruma göre test edilir. Okuma ile
 * yazma arasına başka bir istek giremez.
 *
 * ── EŞZAMANLILIK ÇÖZÜMLEMESİ ───────────────────────────────────────────────
 * Senaryo: A isteği son doğrulanmış fotoğrafı siliyor, B isteği aynı anda
 * başka bir fotoğrafı doğruluyor.
 *   · B önce biterse → NOT EXISTS yanlış → geri alma YAPILMAZ. Ürün yayında
 *     kalır ve doğrulanmış fotoğrafı VARDIR. Değişmez korunur.
 *   · A önce biterse → geri alma yapılır. B'nin doğrulaması ürünü yayına
 *     DÖNDÜRMEZ (kullanıcı şartı 3) — yönetici yeniden onaylamalıdır.
 * Her iki sıralamada da "yayındaki ürünün doğrulanmış fotoğrafı vardır"
 * değişmezi bozulmaz; tek fark hangisinin daha muhafazakâr olduğudur.
 *
 * ── NE DEĞİŞTİRİR ──────────────────────────────────────────────────────────
 * YALNIZCA üç kolon: `seo_ready`, `seo_ready_at`, `updated_at`.
 * Ürün adı, açıklamalar, parça numarası, kategori, ağırlık, notlar,
 * `stock_status`, `in_stock`, `is_active`, `part_manufacturer`,
 * `sourcing_type`, iç stok kodu ve bunlara bağlı `fitments`, `oem_numbers`,
 * `product_translations`, `product_images` kayıtları DEĞİŞMEZ
 * (kullanıcı şartı 2). `tests/seo-ready-revoke.spec.ts` bu listeyi kilitler.
 *
 * `database` parametresi YALNIZCA test içindir: üretimde modül düzeyindeki
 * `db` kullanılır. Testler bağlanmayan bir Drizzle örneği verip üretilen SQL'i
 * inceleyebilir — böylece "hangi kolonlara dokunuluyor" iddiası ölçülür,
 * varsayılmaz (`tests/seo-ready-revoke.spec.ts`).
 */
export function revokeSeoReadyStatement(
  productId: string,
  database: NonNullable<typeof db> | null = db
) {
  if (!database) throw new Error("Database not configured");

  return database
    .update(products)
    .set({ seoReady: false, seoReadyAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(products.id, productId),
        // Yayında DEĞİLSE geri alınacak onay yoktur — gereksiz yazma olmaz.
        eq(products.seoReady, true),
        // Doğrulanmış fotoğraf KALMADIYSA. Koşul UPDATE anında değerlendirilir.
        notExists(
          database
            .select({ bir: sql`1` })
            .from(productImages)
            .where(
              and(
                eq(productImages.productId, productId),
                eq(productImages.verified, true)
              )
            )
        )
      )
    )
    .returning({ id: products.id });
}

/**
 * Yukarıdaki ifadeyi tek başına çalıştırır.
 *
 * Fotoğraf silme / doğrulama geri alma yollarında bu fonksiyon DEĞİL,
 * `revokeSeoReadyStatement()` kullanılır: orada ifade, değişikliği yapan
 * ifadeyle AYNI `db.batch()` içine konur ve ikisi birlikte ya yazılır ya da
 * hiç yazılmaz. Bu fonksiyon, batch'e girmeyen çağrılar için durur.
 *
 * @returns yayın onayı geri alındıysa `true`
 */
export async function revokeSeoReadyIfUnsupported(
  productId: string
): Promise<boolean> {
  if (!db) return false;
  const rows = await revokeSeoReadyStatement(productId);
  return rows.length > 0;
}
