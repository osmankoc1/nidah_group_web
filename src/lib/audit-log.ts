/**
 * Yönetim paneli işlem kaydı — karar K9.
 *
 * ── K9'UN ŞARTI ────────────────────────────────────────────────────────────
 * "Hassas bilgiler, şifreler, tokenlar ve gizli anahtarlar loglanmasın."
 *
 * Bu modül şartı İKİ KATMANDA uygular:
 *   1. BEYAZ LİSTE — kayda yalnızca aşağıdaki `IZINLI_ALANLAR` kümesindeki
 *      alanlar yazılır. Kara liste yaklaşımı (yasaklı adları ayıklamak)
 *      bilinçli olarak SEÇİLMEDİ: yeni bir gizli alan eklendiğinde kara
 *      liste sessizce geçirir, beyaz liste ise sessizce dışarıda bırakır.
 *      Yanlış tarafa düşen hatayı seçiyoruz.
 *   2. VERİTABANI KISITI — `ck_admin_audit_no_secrets` (drizzle/0013) üst
 *      düzey anahtarlarda parola/token adlarını reddeder. Bu, beyaz listenin
 *      YERİNE GEÇMEZ; onu destekler.
 *
 * ── KAYIT YAZIMI İŞLEMİ DÜŞÜRMEZ ───────────────────────────────────────────
 * `recordAdminAudit` hata yutar. Denetim kaydı yazılamadığı için geçerli bir
 * yönetim işlemi başarısız olmamalıdır (aynı ilke `admin-identity.ts`'te de
 * uygulanıyor). Tablo henüz yoksa (kod migration'dan önce deploy edilirse)
 * işlem yine çalışır, kayıt sessizce atlanır.
 */
import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";

/** Beyaz listelenmiş eylem adları — serbest metin kabul edilmez. */
export const AUDIT_ACTIONS = [
  "bulk_activate",
  "bulk_deactivate",
  "bulk_stock_status",
  "bulk_publish",
  "bulk_unpublish",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_OUTCOMES = ["ok", "rejected", "error"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

/**
 * Kayda yazılmasına İZİN VERİLEN ürün alanları.
 *
 * Hepsi yönetim panelinde zaten görünen, gizli olmayan durum alanlarıdır.
 * Listede metin gövdeleri (açıklama, meta) YOK: işlem kaydı "ne değişti"
 * sorusunu yanıtlar, içerik arşivi değildir.
 */
export const IZINLI_ALANLAR = [
  "isActive",
  "seoReady",
  "stockStatus",
] as const;

export type IzinliAlan = (typeof IZINLI_ALANLAR)[number];

const IZINLI = new Set<string>(IZINLI_ALANLAR);

/**
 * Durum nesnesini beyaz listeye göre süzer.
 *
 * Listede olmayan her alan DÜŞÜRÜLÜR. Değerler yalnızca `string`, `number`,
 * `boolean` veya `null` olabilir; nesne/dizi değerler düşürülür, çünkü iç
 * içe bir nesne gizli bir alanı kısıtın görmediği bir derinlikte taşıyabilir
 * (`?|` yalnızca üst düzeye bakar).
 */
export function sanitizeAuditState(
  state: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean | null> | null {
  if (!state || typeof state !== "object") return null;

  const sonuc: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(state)) {
    if (!IZINLI.has(key)) continue;
    if (value === null) {
      sonuc[key] = null;
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sonuc[key] = value;
    }
    // Nesne, dizi, fonksiyon, undefined → DÜŞÜRÜLÜR.
  }

  return Object.keys(sonuc).length > 0 ? sonuc : null;
}

/** Gerekçe metni — uzunluk sınırı ve boşluk temizliği. */
const REASON_MAX = 500;

function sanitizeReason(reason: string | null | undefined): string | null {
  if (typeof reason !== "string") return null;
  const t = reason.trim();
  return t ? t.slice(0, REASON_MAX) : null;
}

export interface AuditEntry {
  actor: string | null;
  action: AuditAction;
  productId: string | null;
  outcome: AuditOutcome;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Birden fazla kaydı TEK insert ile yazar.
 *
 * `neon-http` sürücüsünde `db.transaction()` yoktur; tek `insert … values`
 * ifadesi zaten atomiktir. Toplu işlem 100 kayda kadar çıkabildiği için
 * kayıt başına ayrı istek atılmaz.
 *
 * Hata DURUMUNDA İŞLEM DÜŞMEZ: `false` döner ve çağıran devam eder.
 */
export async function recordAdminAudit(entries: AuditEntry[]): Promise<boolean> {
  if (!db || entries.length === 0) return false;

  try {
    await db.insert(adminAuditLog).values(
      entries.map((e) => ({
        actor: e.actor,
        action: e.action,
        entity: "product",
        productId: e.productId,
        beforeState: sanitizeAuditState(e.before),
        afterState: sanitizeAuditState(e.after),
        outcome: e.outcome,
        reason: sanitizeReason(e.reason),
      }))
    );
    return true;
  } catch (err) {
    // Tablo yok (migration'dan önce) veya yazma hatası. İşlem DÜŞMEZ.
    console.warn("[audit] islem kaydi yazilamadi", err);
    return false;
  }
}
