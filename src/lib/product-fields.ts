/**
 * Faz 2 ürün alanlarının doğrulanması ve etiketlenmesi — saf, test edilebilir.
 *
 * TEK KAYNAK: enum değerleri `schema.ts`'ten okunur, elle kopyalanmaz.
 *
 * ── STOK DURUMU ADLANDIRMASI ───────────────────────────────────────────────
 * Veritabanındaki enum değerleri (drizzle/0008, production'da UYGULANMIŞ):
 *     'unknown' · 'in_stock' · 'on_order'
 * İstenen sözlükte üçüncü değer `on_request` olarak geçiyor. Enum değerinin
 * ADINI değiştirmek yeni bir migration gerektirdiği için DB değeri `on_order`
 * olarak kaldı; `on_request` bir EŞ AD olarak kabul edilir ve `on_order`'a
 * çevrilir. İkisi aynı durumu anlatır: "sipariş üzerine tedarik".
 * (Yeniden adlandırma önerisi onay bekliyor — bkz. drizzle/0010_*.sql.optional)
 */
import {
  productSourcingTypeEnum,
  productStockStatusEnum,
} from "@/lib/db/schema";
import { normalizePartNumber } from "@/lib/part-number";

// ── Stok durumu ──────────────────────────────────────────────────────────────

export const STOCK_STATUSES = productStockStatusEnum.enumValues;
export type StockStatusValue = (typeof STOCK_STATUSES)[number];

/** Kullanıcı sözlüğünden DB değerine eş ad haritası. */
const STOCK_ALIASES: Record<string, StockStatusValue> = {
  unknown: "unknown",
  bilinmiyor: "unknown",
  in_stock: "in_stock",
  instock: "in_stock",
  stokta: "in_stock",
  on_order: "on_order",
  on_request: "on_order",   // istenen ad — DB'de on_order
  onrequest: "on_order",
  siparis: "on_order",
  "sipariş": "on_order",
  "siparis_uzerine": "on_order",
};

/** Admin arayüzü etiketleri. */
export const STOCK_STATUS_LABELS: Record<StockStatusValue, string> = {
  unknown: "Bilinmiyor (teyit edilmedi)",
  in_stock: "Stokta mevcut (teyitli)",
  on_order: "Sipariş üzerine (teyitli)",
};

/**
 * Stok durumunu çözer. Boş/verilmemiş değer **'unknown'** olur — teyitsiz stok
 * asla "mevcut" sayılmaz. Tanınmayan değer sessizce yorumlanmaz, hata döner.
 */
export function parseStockStatus(
  value: unknown
): { ok: true; value: StockStatusValue } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "unknown" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "stockStatus metin olmalı." };
  }
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const mapped = STOCK_ALIASES[key];
  if (!mapped) {
    return {
      ok: false,
      error:
        `Geçersiz stockStatus: "${value}". ` +
        `Kullanılabilir: unknown · in_stock · on_order (eş ad: on_request).`,
    };
  }
  return { ok: true, value: mapped };
}

// ── Temin niteliği (parçanın kendi kimliği) ──────────────────────────────────

export const SOURCING_TYPES = productSourcingTypeEnum.enumValues;
export type SourcingTypeValue = (typeof SOURCING_TYPES)[number];

export const SOURCING_TYPE_LABELS: Record<SourcingTypeValue, string> = {
  unknown: "Bilinmiyor (teyit edilmedi)",
  oem: "OEM (orijinal üretici)",
  oem_equivalent: "OEM muadili",
  aftermarket: "Aftermarket",
};

export function parseSourcingType(
  value: unknown
): { ok: true; value: SourcingTypeValue } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "unknown" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "sourcingType metin olmalı." };
  }
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((SOURCING_TYPES as readonly string[]).includes(key)) {
    return { ok: true, value: key as SourcingTypeValue };
  }
  return {
    ok: false,
    error: `Geçersiz sourcingType: "${value}". Kullanılabilir: ${SOURCING_TYPES.join(" · ")}.`,
  };
}

// ── Metin alanları ───────────────────────────────────────────────────────────

/** Uzunluk sınırları — `drizzle/0008` ile aynı olmalı. */
export const FIELD_LIMITS = {
  partManufacturer: 255,
  shortDescription: 500,
  metaTitle: 255,
  /** `drizzle/0010` → products.internal_stock_code varchar(100) */
  internalStockCode: 100,
  /** `drizzle/0011` → product_images.alt_text varchar(300) */
  imageAltText: 300,
  /** `drizzle/0011` → product_images.source_note varchar(255) */
  imageSourceNote: 255,
  /**
   * `fitments.notes` kolonu `text` olduğu için veritabanı sınırı YOK.
   * Bu sınır ÜRÜN KARARI: not kısa bir açıklamadır, gövde metni değil.
   * Arayüz ve sunucu AYNI sabiti kullanır (bulgu P12).
   */
  fitmentNotes: 500,
} as const;

/**
 * Boş/whitespace değerleri `null`'a çevirir, sınırı aşanı reddeder.
 * `null` döndürmek "bilinmiyor" demektir ve iddia üretmez.
 */
export function parseOptionalText(
  value: unknown,
  field: string,
  maxLength?: number
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${field} metin olmalı.` };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (maxLength && trimmed.length > maxLength) {
    return {
      ok: false,
      error: `${field} en fazla ${maxLength} karakter olabilir (girilen: ${trimmed.length}).`,
    };
  }
  return { ok: true, value: trimmed };
}

// ── Yayın onayı ──────────────────────────────────────────────────────────────

/**
 * `seo_ready` yalnızca AÇIK bir boolean ile değişir.
 *
 * ÖNEMLİ: bu alan hiçbir zaman otomatik olarak `true` olmaz; yalnızca bir
 * insanın admin panelinde işaretlemesiyle değişir. Toplu import bu alanı
 * HİÇ yazmaz (bkz. import-validation.ts / OPTIONAL_PRODUCT_COLUMNS).
 */
export function parseSeoReady(
  value: unknown
): { ok: true; value: boolean } | { ok: false; error: string } {
  if (typeof value === "boolean") return { ok: true, value };
  if (value === "true") return { ok: true, value: true };
  if (value === "false") return { ok: true, value: false };
  return { ok: false, error: "seoReady true veya false olmalı." };
}

// ── Orijinal Logo stok kodu (Faz 3 / drizzle/0010) ───────────────────────────

/**
 * Logo İşbaşı'nın ORİJİNAL stok kodunu ayrıştırır.
 *
 * KORUMA SÖZLEŞMESİ (kullanıcı kararı, Faz 3):
 *   · Ham değer AYNEN saklanır: baştaki sıfırlar, tireler, iç boşluklar,
 *     eğik çizgiler, noktalar — hiçbiri silinmez, kırpılmaz, büyütülmez.
 *     "002 236 11 10" veritabanına tam olarak böyle yazılır.
 *   · Yalnızca BAŞTAKİ ve SONDAKİ boşluk kırpılır; bunlar kopyala-yapıştır
 *     kazasıdır ve bilgi taşımaz.
 *   · Normalizasyon SADECE arama ve eşleştirme içindir; görünen değeri
 *     ASLA değiştirmez. Normalize değer ayrı bir kolonda durur.
 *   · Bu bir OEM / muadil numarası İDDİASI DEĞİLDİR ve public yüzeyde
 *     gösterilmez.
 *
 * Sınırı aşan değer KIRPILMAZ, reddedilir — sessiz veri kaybı olmaz.
 */
export function parseInternalStockCode(
  value: unknown
):
  | { ok: true; value: { code: string; normalized: string } | null }
  | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: "internalStockCode metin olmalı." };
  }
  // Yalnızca dış boşluk. İç karakterlere DOKUNULMAZ.
  const code = value.trim();
  if (!code) return { ok: true, value: null };
  if (code.length > FIELD_LIMITS.internalStockCode) {
    return {
      ok: false,
      error:
        `internalStockCode en fazla ${FIELD_LIMITS.internalStockCode} karakter olabilir ` +
        `(girilen: ${code.length}). Değer kırpılmaz, kayıt reddedilir.`,
    };
  }
  const normalized = normalizePartNumber(code);
  if (!normalized) {
    return {
      ok: false,
      error:
        "internalStockCode en az bir harf veya rakam içermeli " +
        `(girilen: "${code}").`,
    };
  }
  return { ok: true, value: { code, normalized } };
}

// ── Ürün görseli doğrulama alanları (drizzle/0011) ────────────────────────────

/**
 * ALT metni için EN AZ karakter sayısı.
 *
 * NEDEN BİR EŞİK VAR: Google Images belgesi ALT metnini "en önemli özellik"
 * olarak tanımlıyor. "x", "resim" veya yalnızca parça numarası ALT metni
 * değildir. Eşik, görseli gerçekten TARİF eden bir cümleyi zorunlu kılar.
 * Üst sınır `FIELD_LIMITS.imageAltText` (DB kolonu ile aynı).
 */
export const IMAGE_ALT_TEXT_MIN = 15;

/**
 * Görsel ALT metni.
 *
 * `verified = true` ise ALT metni ZORUNLUDUR — kural veritabanı katmanında
 * `ck_product_images_verified_evidence` ile de uygulanır, yani buradaki
 * kontrol atlanırsa yazma DB tarafından reddedilir. `verified = false` iken
 * ALT metni serbesttir (taslak olarak girilebilir).
 */
export function parseImageAltText(
  value: unknown,
  verified: boolean
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: "altText metin olmalı." };
  }
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (verified && !trimmed) {
    return {
      ok: false,
      error:
        "Fotoğrafı doğrulanmış olarak işaretlemek için ALT metni zorunludur. " +
        "Görseli tarif edin (ör. \"Çamurluk üzerine monte edilmiş kavrama ayar pulu, yakın plan\").",
    };
  }
  if (verified && trimmed.length < IMAGE_ALT_TEXT_MIN) {
    return {
      ok: false,
      error:
        `ALT metni en az ${IMAGE_ALT_TEXT_MIN} karakter olmalı ` +
        `(girilen: ${trimmed.length}). Parça numarasının tekrarı ALT metni değildir.`,
    };
  }
  if (trimmed.length > FIELD_LIMITS.imageAltText) {
    return {
      ok: false,
      error: `altText en fazla ${FIELD_LIMITS.imageAltText} karakter olabilir.`,
    };
  }
  return { ok: true, value: trimmed || null };
}

/**
 * Fotoğrafın kaynağı / dayanağı.
 *
 * `verified = true` ise ZORUNLUDUR. `fitments` ve `oem_numbers` için geçerli
 * olan kuralın aynısı (`src/lib/verification.ts` → parseVerificationSource):
 * dayanağı belirtilmeden "doğrulandı" denmez. Fark yalnızca alan adı ve
 * örneklerdedir; bu yüzden ayrı bir fonksiyon tutulur.
 */
export function parseImageSourceNote(
  value: unknown,
  verified: boolean
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: "sourceNote metin olmalı." };
  }
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (verified && !trimmed) {
    return {
      ok: false,
      error:
        "Fotoğrafı doğrulanmış olarak işaretlemek için kaynak zorunludur " +
        "(ör. depo çekimi + tarih, üretici katalogu + sayfa, tedarikçi teyidi).",
    };
  }
  if (trimmed.length > FIELD_LIMITS.imageSourceNote) {
    return {
      ok: false,
      error: `sourceNote en fazla ${FIELD_LIMITS.imageSourceNote} karakter olabilir.`,
    };
  }
  return { ok: true, value: trimmed || null };
}
