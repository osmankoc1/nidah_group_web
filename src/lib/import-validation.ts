/**
 * Toplu import doğrulaması — saf, test edilebilir.
 *
 * Denetimde bulunan iki BLOKER burada kapatılır:
 *
 *  E-1  Ürün import'u `part_number_normalized` yazmıyordu. Kolon nullable ve
 *       unique index çok sayıda NULL'a izin verdiği için hata vermiyor,
 *       sessizce bozuk kimlik üretiyordu.
 *  E-2  Excel'de sayı olarak saklanan parça numaralarında baştaki sıfırlar
 *       kayboluyor (`0012345` → `12345`), uzun numaralar bilimsel gösterime
 *       düşüyor (`1.23457E+11`).
 *
 * TEMEL İLKE: belirsiz veya hasarlı kimlik ASLA tahmin edilmez — satır
 * reddedilir ve manuel incelemeye gönderilir.
 */
import { normalizePartNumber } from "@/lib/part-number";
import {
  FIELD_LIMITS,
  parseInternalStockCode,
  parseSourcingType,
  parseStockStatus,
  type SourcingTypeValue,
  type StockStatusValue,
} from "@/lib/product-fields";

// ── Sorun kodları ─────────────────────────────────────────────────────────────

export type ImportIssueCode =
  | "identifier_missing"
  | "identifier_numeric_cell"
  | "identifier_scientific_notation"
  | "identifier_not_alphanumeric"
  | "name_missing"
  | "condition_invalid"
  | "weight_invalid"
  | "stock_unrecognized"
  | "duplicate_in_file"
  | "normalized_clash"
  | "stock_status_invalid"
  | "sourcing_type_invalid"
  | "text_too_long"
  | "internal_stock_code_invalid";

export interface ImportIssue {
  code: ImportIssueCode;
  /** Operatöre gösterilen Türkçe açıklama. */
  message: string;
}

const issue = (code: ImportIssueCode, message: string): ImportIssue => ({ code, message });

// ── Parça numarası (kimlik) doğrulaması ───────────────────────────────────────

/** Bilimsel gösterime düşmüş sayı metni: 1.23457E+11, 2e-5 … */
const SCIENTIFIC_NOTATION = /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/;

export interface IdentifierCheckInput {
  /** Hücrenin metin hâli (XLSX'te biçimlenmiş değer, CSV'de ham metin). */
  value: string | undefined;
  /**
   * Hücre kaynakta SAYI veya TARİH tipinde miydi?
   * XLSX için `parseUploadedFile().numericCells` doldurur; CSV'de daima false.
   */
  wasTypedCell: boolean;
  /** Hata mesajında geçecek kolon adı. */
  columnLabel?: string;
}

/**
 * Parça numarası hücresini doğrular. Sorun yoksa `null` döner.
 *
 * Sayı tipli hücre KOŞULSUZ reddedilir: `0012345` ile `12345` ayırt edilemez,
 * dolayısıyla "düzeltmek" tahmin yürütmek olur.
 */
export function checkIdentifierCell(input: IdentifierCheckInput): ImportIssue | null {
  const col = input.columnLabel ?? "partNumber";
  const value = (input.value ?? "").trim();

  if (!value) {
    return issue("identifier_missing", `${col} zorunlu.`);
  }

  if (input.wasTypedCell) {
    return issue(
      "identifier_numeric_cell",
      `${col} ("${value}") Excel'de sayı/tarih olarak saklanmış. Baştaki sıfırlar ` +
        `silinmiş veya numara kısaltılmış olabilir; değer tahmin edilmez. ` +
        `Hücreyi "Metin" biçimine alın ya da CSV (UTF-8) kullanın.`
    );
  }

  if (SCIENTIFIC_NOTATION.test(value)) {
    return issue(
      "identifier_scientific_notation",
      `${col} ("${value}") bilimsel gösterime dönüşmüş. Gerçek numara geri ` +
        `getirilemez; hücreyi "Metin" biçiminde yeniden girin.`
    );
  }

  if (!normalizePartNumber(value)) {
    return issue(
      "identifier_not_alphanumeric",
      `${col} ("${value}") en az bir harf veya rakam içermeli.`
    );
  }

  return null;
}

// ── Stok ──────────────────────────────────────────────────────────────────────

const STOCK_TRUE = new Set(["true", "1", "evet", "yes", "var", "stokta"]);
const STOCK_FALSE = new Set([
  "false", "0", "hayir", "hayır", "no", "yok", "siparis", "sipariş",
]);

export interface StockParseResult {
  /** DB'ye yazılacak değer. */
  value: boolean;
  /** Dosyada AÇIKÇA belirtildi mi? false ise güncellemede dokunulmaz. */
  explicit: boolean;
}

/**
 * Stok hücresini çözer.
 *
 * Denetim C10/#7: BİLİNMEYEN stok asla "stokta" sayılmaz. Eski davranış boş
 * hücreyi `true` kabul ediyordu (`inStockRaw === "" → true`); bu, teyit
 * edilmemiş stok iddiası üretiyordu. Yeni varsayılan `false` ("Sipariş Üzerine")
 * — az iddia eden taraf.
 *
 * Tanınmayan değer sessizce yorumlanmaz, reddedilir.
 */
export function parseStockFlag(
  raw: string | undefined
): StockParseResult | ImportIssue {
  const token = (raw ?? "").trim().toLowerCase();
  if (!token) return { value: false, explicit: false };
  if (STOCK_TRUE.has(token)) return { value: true, explicit: true };
  if (STOCK_FALSE.has(token)) return { value: false, explicit: true };
  return issue(
    "stock_unrecognized",
    `inStock ("${raw}") anlaşılamadı. Kullanılabilir değerler: ` +
      `true/1/evet/var/stokta veya false/0/hayır/yok/sipariş. Boş bırakılırsa ` +
      `"Sipariş Üzerine" kabul edilir.`
  );
}

// ── Durum (condition) ─────────────────────────────────────────────────────────

export const VALID_CONDITIONS = ["new", "used", "remanufactured"] as const;
export type ProductCondition = (typeof VALID_CONDITIONS)[number];

export function parseCondition(
  raw: string | undefined
): { value: ProductCondition } | ImportIssue {
  const token = (raw ?? "").trim().toLowerCase();
  if (!token) return { value: "new" };
  if ((VALID_CONDITIONS as readonly string[]).includes(token)) {
    return { value: token as ProductCondition };
  }
  return issue(
    "condition_invalid",
    `Geçersiz condition: "${raw}" (new / used / remanufactured olmalı).`
  );
}

// ── Ağırlık ───────────────────────────────────────────────────────────────────

export function parseWeight(
  raw: string | undefined
): { value: number | null } | ImportIssue {
  const token = (raw ?? "").trim();
  if (!token) return { value: null };
  // Türkçe ondalık ayırıcı virgül olabilir; yalnızca TEK virgül nokta sayılır.
  const normalized = token.includes(",") && !token.includes(".")
    ? token.replace(",", ".")
    : token;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) {
    return issue("weight_invalid", `Geçersiz weight: "${raw}" (0 veya pozitif sayı olmalı).`);
  }
  return { value: num };
}

// ── Dosya içi normalize çakışması ─────────────────────────────────────────────

export interface FileRowIdentity {
  rowNum: number;
  partNumber: string;
}

/**
 * Aynı dosyada normalize değeri çakışan satırları bulur.
 * "CH 76281" ve "CH-76281" AYNI üründür; eski kod bunları iki ayrı insert
 * sayıyor, `apply` sırasında `uq_products_pn_norm` index'ine çarpıp
 * transaction'ı yarıda düşürüyordu (E-4).
 *
 * Dönen Map yalnızca ÇAKIŞAN anahtarları içerir (>= 2 satır).
 */
export function findNormalizedDuplicates(
  rows: readonly FileRowIdentity[]
): Map<string, number[]> {
  const byKey = new Map<string, number[]>();
  for (const row of rows) {
    const key = normalizePartNumber(row.partNumber);
    if (!key) continue;
    const list = byKey.get(key);
    if (list) list.push(row.rowNum);
    else byKey.set(key, [row.rowNum]);
  }
  for (const [key, list] of byKey) {
    if (list.length < 2) byKey.delete(key);
  }
  return byKey;
}

/** `findNormalizedDuplicates` sonucundan satır başına sorun üretir. */
export function duplicateIssue(rowNums: readonly number[], canonical: string): ImportIssue {
  return issue(
    "duplicate_in_file",
    `Aynı dosyada "${canonical}" ile aynı kimliğe sahip birden fazla satır var ` +
      `(satır ${rowNums.join(", ")}). Hangisinin doğru olduğu tahmin edilmez; ` +
      `fazlalıkları kaldırın.`
  );
}

/**
 * Veritabanında aynı normalize kimliğe sahip FARKLI yazımlı bir ürün varsa
 * satır reddedilir. Üzerine yazmak, operatörün görmediği bir kaydı sessizce
 * değiştirmek olurdu.
 */
export function clashIssue(fileSpelling: string, dbSpelling: string): ImportIssue {
  return issue(
    "normalized_clash",
    `"${fileSpelling}" veritabanındaki "${dbSpelling}" kaydıyla aynı kimliğe ` +
      `sahip ancak yazımı farklı. Hangi yazımın doğru olduğu tahmin edilmez; ` +
      `manuel inceleme gerekir.`
  );
}

// ── Kazara üzerine yazmayı önleme ─────────────────────────────────────────────

/**
 * Güncellemede ÜZERİNE YAZILABİLİR opsiyonel kolonlar.
 * `partNumber` ve `name` kimlik/zorunlu olduğu için listede yok.
 */
export const OPTIONAL_PRODUCT_COLUMNS = [
  "description",
  "condition",
  "inStock",
  "weight",
  "category",
  "notes",
  // ── Faz 2 (drizzle/0008) ──────────────────────────────────────────────────
  "partManufacturer",
  "sourcingType",
  "stockStatus",
  "shortDescription",
  "longDescription",
  "metaTitle",
  "metaDescription",
  // ── Faz 3 (drizzle/0010) ──────────────────────────────────────────────────
  // Orijinal Logo stok kodu. İÇ KULLANIM: public yüzeye çıkmaz, OEM/muadil
  // numarası olarak etiketlenmez. Eşleştirme anahtarı DEĞİLDİR — upsert hâlâ
  // yalnızca `partNumber` üzerinden yapılır (bkz. productConflictPlan).
  "internalStockCode",
] as const;

/**
 * TOPLU IMPORT İLE ASLA YAZILAMAYAN alanlar.
 *
 * `seoReady` — yayın onayı tek tek, insan kararıyla verilir. Bir dosyayla
 *   yüzlerce ürünü aynı anda Google'a açmak denetimdeki C11 riskinin ta
 *   kendisidir; bu yüzden alan import yüzeyinde HİÇ YOK.
 * `verified` — OEM numarası ve makine uyumluluğu doğrulaması da tek tek
 *   yapılır ve kaynak ister (src/lib/verification.ts).
 *
 * Bu adlar dosyada bulunsa bile yok sayılır.
 */
export const IMPORT_FORBIDDEN_COLUMNS = ["seoReady", "seo_ready", "verified"] as const;

export type OptionalProductColumn = (typeof OPTIONAL_PRODUCT_COLUMNS)[number];

/**
 * Yalnızca dosyada GERÇEKTEN bulunan kolonlar güncellenebilir.
 *
 * Eski davranış (E-4 / #4 "accidental overwrites"): yalnızca `partNumber` ve
 * `name` içeren bir dosya yüklendiğinde upsert `description`, `weight`,
 * `category_id` ve `notes` alanlarını mevcut tüm kayıtlarda NULL'a çekiyordu —
 * sessiz veri kaybı. Artık dosyada olmayan kolona dokunulmaz.
 */
export function updatableColumns(
  headers: readonly string[]
): Set<OptionalProductColumn> {
  const present = new Set(headers.map((h) => h.trim()));
  return new Set(
    OPTIONAL_PRODUCT_COLUMNS.filter((column) => present.has(column))
  );
}

// ── Faz 2 alanlarının import ayrıştırması ────────────────────────────────────

/** Stok durumu — `product-fields.ts` kuralını ImportIssue sözleşmesine çevirir. */
export function parseImportStockStatus(
  raw: string | undefined
): { value: StockStatusValue } | ImportIssue {
  const result = parseStockStatus(raw);
  if (!result.ok) return issue("stock_status_invalid", result.error);
  return { value: result.value };
}

/** Temin niteliği. */
export function parseImportSourcingType(
  raw: string | undefined
): { value: SourcingTypeValue } | ImportIssue {
  const result = parseSourcingType(raw);
  if (!result.ok) return issue("sourcing_type_invalid", result.error);
  return { value: result.value };
}

/** Faz 2 metin alanlarının uzunluk sınırları. */
export const IMPORT_TEXT_LIMITS: Record<string, number | undefined> = {
  partManufacturer: FIELD_LIMITS.partManufacturer,
  shortDescription: FIELD_LIMITS.shortDescription,
  longDescription: undefined,
  metaTitle: FIELD_LIMITS.metaTitle,
  metaDescription: undefined,
  internalStockCode: FIELD_LIMITS.internalStockCode,
};

/** Boş değer `null` olur; sınırı aşan değer reddedilir (kırpılmaz). */
export function parseImportText(
  raw: string | undefined,
  column: string
): { value: string | null } | ImportIssue {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: null };
  const limit = IMPORT_TEXT_LIMITS[column];
  if (limit && trimmed.length > limit) {
    return issue(
      "text_too_long",
      `${column} en fazla ${limit} karakter olabilir (girilen: ${trimmed.length}). ` +
        `Değer kırpılmaz, satır reddedilir.`
    );
  }
  return { value: trimmed };
}

/**
 * Upsert'te her opsiyonel kolona ne yapılacağının planı.
 *
 * `overwrite` → dosyadaki değer yazılır (`excluded.<kolon>`)
 * `preserve`  → mevcut değer korunur (`products.<kolon>`), dosyada kolon yok
 *
 * SQL'den ayrı tutulur ki karar mantığı veritabanı olmadan test edilebilsin.
 */
export function productConflictPlan(
  headers: readonly string[]
): Record<OptionalProductColumn, "overwrite" | "preserve"> {
  const updatable = updatableColumns(headers);
  const plan = {} as Record<OptionalProductColumn, "overwrite" | "preserve">;
  for (const column of OPTIONAL_PRODUCT_COLUMNS) {
    plan[column] = updatable.has(column) ? "overwrite" : "preserve";
  }
  return plan;
}

/** Bir değerin `ImportIssue` olup olmadığını daraltır. */
export function isIssue(value: unknown): value is ImportIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}


// ── Orijinal Logo stok kodu (Faz 3 / drizzle/0010) ───────────────────────────

/**
 * Import tarafı sarmalayıcı — `parseInternalStockCode` sözleşmesini
 * `ImportIssue` biçimine çevirir.
 *
 * Ham değer AYNEN korunur; normalize değer YALNIZCA eşleştirme/arama için
 * ayrı kolona yazılır ve upsert anahtarı olarak KULLANILMAZ.
 */
export function parseImportInternalStockCode(
  raw: string | undefined
): { value: { code: string; normalized: string } | null } | ImportIssue {
  const result = parseInternalStockCode(raw);
  if (!result.ok) return issue("internal_stock_code_invalid", result.error);
  return { value: result.value };
}

/** Dosya içinde aynı normalize stok koduna düşen satırlar. */
export interface InternalStockCodeRow {
  rowNum: number;
  internalStockCodeNormalized: string | null;
}

/**
 * Mükerrer Logo stok kodlarını bulur.
 *
 * ÖNEMLİ — bu bir HATA DEĞİL, UYARIDIR:
 *   · Logo verisinde normalize edildiğinde çakışan GERÇEK mükerrer kodlar var
 *     ("002 236 11 10" ↔ "0022361110"). `drizzle/0010` bu yüzden benzersiz
 *     kısıt KOYMAZ.
 *   · Kullanıcı kararı: aynı veya benzer stok koduna sahip ürünler OTOMATİK
 *     BİRLEŞTİRİLMEZ ve üzerine yazılmaz. Kayıtlar ayrı kalır, operatöre
 *     bildirilir, karar insana aittir.
 *
 * Bu yüzden fonksiyon satırı reddetmez; yalnızca hangi satırların aynı
 * anahtara düştüğünü döndürür.
 */
export function findInternalStockCodeDuplicates(
  rows: readonly InternalStockCodeRow[]
): Map<string, number[]> {
  const byKey = new Map<string, number[]>();
  for (const row of rows) {
    const key = row.internalStockCodeNormalized;
    if (!key) continue;
    const list = byKey.get(key);
    if (list) list.push(row.rowNum);
    else byKey.set(key, [row.rowNum]);
  }
  for (const [key, list] of byKey) {
    if (list.length < 2) byKey.delete(key);
  }
  return byKey;
}
