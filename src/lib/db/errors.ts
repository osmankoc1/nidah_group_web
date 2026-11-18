/**
 * Veritabanı hatalarının güvenilir sınıflandırılması.
 *
 * SORUN (Faz 2b doğrulamasında ölçüldü): Drizzle, sürücü hatasını kendi
 * `Error`'una SARAR. Dış hatanın mesajı şudur:
 *
 *     Failed query: insert into "oem_numbers" (...) values (...)
 *
 * Constraint adı ve PostgreSQL hata kodu bu mesajda YOKTUR; `error.cause`
 * zincirindeki `NeonDbError` nesnesinde durur:
 *
 *     cause.code       = '23505'
 *     cause.constraint = 'uq_oem_product_number_type'
 *     cause.detail     = 'Key (product_id, number_normalized, type)=(…) already exists.'
 *
 * Bu yüzden `err.message.includes("uq_…")` biçimindeki kontroller HİÇ
 * eşleşmez ve kullanıcıya 409 yerine 500 döner. Ölçülen örnek:
 * aynı OEM numarasının farklı yazımı eklenmeye çalışıldığında 500.
 *
 * Aşağıdaki yardımcılar `cause` zincirini gezerek gerçek sürücü hatasını
 * bulur. Mesaj metnine değil, PostgreSQL hata KODUNA bakar.
 *
 * KAPSAM: saf. DB bağlantısı yok, test edilebilir.
 */

/** PostgreSQL: unique constraint ihlali. */
export const PG_UNIQUE_VIOLATION = "23505";
/** PostgreSQL: foreign key ihlali. */
export const PG_FOREIGN_KEY_VIOLATION = "23503";
/** PostgreSQL: kolon yok (şema drift'i / migration eksik). */
export const PG_UNDEFINED_COLUMN = "42703";

export interface DbErrorInfo {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

/** `cause` zincirinde en fazla bu kadar derine inilir. */
const MAX_DEPTH = 6;

/**
 * Hata zincirinde PostgreSQL hata kodu taşıyan ilk nesneyi döner.
 * Hiçbiri yoksa `null`.
 */
export function findDbError(err: unknown): DbErrorInfo | null {
  let current: unknown = err;
  for (let depth = 0; depth < MAX_DEPTH && current; depth++) {
    if (typeof current === "object") {
      const candidate = current as Record<string, unknown>;
      if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
        return {
          code: candidate.code,
          constraint:
            typeof candidate.constraint === "string" ? candidate.constraint : undefined,
          detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
          table: typeof candidate.table === "string" ? candidate.table : undefined,
        };
      }
      current = candidate.cause;
      continue;
    }
    break;
  }
  return null;
}

/**
 * Unique constraint ihlali mi?
 *
 * `constraints` verilirse yalnızca o adlardan biri ihlal edildiğinde `true`
 * döner. Böylece "bu parça numarası zaten kayıtlı" ile ilgisiz bir unique
 * ihlali birbirine karışmaz.
 *
 * Constraint adı sürücü tarafından verilmemişse (bazı sarmalayıcılar bırakır),
 * geri dönüş olarak hata ayrıntısında ad aranır.
 */
export function isUniqueViolation(err: unknown, constraints?: readonly string[]): boolean {
  const info = findDbError(err);
  if (!info || info.code !== PG_UNIQUE_VIOLATION) return false;
  if (!constraints || constraints.length === 0) return true;
  if (info.constraint && constraints.includes(info.constraint)) return true;
  // Geri dönüş: constraint adı yok ama ayrıntı metninde geçiyor olabilir.
  if (info.detail) {
    return constraints.some((name) => info.detail!.includes(name));
  }
  return false;
}

/** Şema drift'i: kod, veritabanında olmayan bir kolonu okuyor. */
export function isUndefinedColumn(err: unknown): boolean {
  return findDbError(err)?.code === PG_UNDEFINED_COLUMN;
}
