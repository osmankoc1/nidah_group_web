/**
 * Toplu import yazma katmanı — ortak, test edilebilir.
 *
 * ── NEDEN `db.batch`, `db.transaction` DEĞİL ─────────────────────────────────
 *
 * `src/lib/db/index.ts` `neon-http` sürücüsünü kullanır. Bu sürücü durumsuz
 * HTTP üzerinden çalışır ve `db.transaction()` çağrısında
 * "No transactions support in neon-http driver" hatası fırlatır. Üç import
 * rotasının APPLY yolu da bu yüzden hiç çalışmıyordu; dry-run etkilenmiyordu,
 * bu yüzden uzun süre fark edilmedi.
 *
 * `db.batch([...])` tüm ifadeleri TEK HTTP isteğinde gönderir ve Neon bunları
 * sunucu tarafında TEK TRANSACTION içinde çalıştırır.
 *
 * Dayanılan üç davranış ÖLÇÜLDÜ, varsayılmadı — `scripts/batch-atomiklik-kaniti.mjs`:
 *   1. ATOMİK: bir ifade başarısız olursa hiçbiri yazılmaz.
 *   2. SIRA: ifadeler verilen sırada çalışır.
 *   3. GÖRÜNÜRLÜK: sonraki ifade, önceki ifadenin aynı transaction içinde
 *      yazdığı satırı görür (üretici INSERT → ona FK veren makine INSERT).
 */
import { db } from "@/lib/db";
import type { BatchItem } from "drizzle-orm/batch";

export interface ImportApplyResult {
  ok: boolean;
  /** Operatöre gösterilecek Türkçe açıklama. `ok` true ise boştur. */
  message: string;
  /** Teknik ayrıntı — loglama ve hata ayıklama için. */
  detail?: string;
}

/**
 * Hiçbir şey yazılmadığını AÇIKÇA söyleyen mesaj.
 *
 * Boş gövdeli bir 500, operatörü "acaba yarısı yazıldı mı?" sorusuyla bırakır.
 * Atomiklik güvencesi ancak operatöre söylendiğinde işe yarar.
 */
export const APPLY_ROLLBACK_MESSAGE =
  "Yazma sırasında veritabanı hatası oluştu. İşlem tek transaction içinde " +
  "çalıştığı için HİÇBİR KAYIT YAZILMADI; veritabanı işlem öncesindeki " +
  "durumundadır. Dosyayı düzeltip yeniden yükleyebilirsiniz.";

/**
 * Hazırlanmış ifadeleri tek transaction içinde çalıştırır.
 *
 * Boş dizi geçerlidir ve hiçbir şey yapmaz — çağıran tarafta ayrıca kontrol
 * gerekmez.
 */
export async function runImportBatch(
  statements: readonly BatchItem<"pg">[]
): Promise<ImportApplyResult> {
  if (statements.length === 0) return { ok: true, message: "" };
  if (!db) return { ok: false, message: "Veritabanı yapılandırılmamış." };

  try {
    await db.batch(statements as unknown as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    return { ok: true, message: "" };
  } catch (err: unknown) {
    const detail =
      err instanceof Error
        ? ((err as { cause?: { message?: string } }).cause?.message ?? err.message)
        : String(err);
    return { ok: false, message: APPLY_ROLLBACK_MESSAGE, detail };
  }
}
