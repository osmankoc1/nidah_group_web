/**
 * Doğrulama sunumu — OEM numaraları ve makine uyumluluğu.
 *
 * KURAL (talimat): "OEM ve makine uyumluluğu doğrulanmadan kesin bilgi olarak
 * yayınlanmasın."
 *
 * Bu modül tek bir soruyu yanıtlar: elimizdeki kayıt DOĞRULANMIŞ mı, ve
 * doğrulanmamışsa nasıl sunulur?
 *
 *   doğrulanmış    → kesin dil ("OEM Numarası", "Uyumlu"), yapısal veriye GİRER
 *   doğrulanmamış  → koşullu dil ("Teyit bekliyor"), yapısal veriye GİRMEZ
 *
 * `fitments.verified` ve `oem_numbers.verified` kolonları drizzle/0008 ile
 * gelir ve varsayılanları `false`'tur: mevcut hiçbir kayıt doğrulanmış sayılmaz.
 *
 * KAPSAM: saf. İstemci ve sunucu tarafında birlikte kullanılabilir.
 */

/** `oem_numbers.type` enum'u — drizzle/0007. */
export type PartNumberType =
  | "oem"
  | "cross_ref"
  | "alternate"
  | "supersedes"
  | "superseded_by"
  | "prefixless";

export interface VerificationPresentation {
  /** Kullanıcıya gösterilecek etiket. */
  label: string;
  /** Kesin (iddia içeren) dil kullanılabilir mi? */
  definitive: boolean;
  /** Bu kayıt JSON-LD'ye yazılabilir mi? */
  includeInStructuredData: boolean;
}

/** Doğrulanmış numara tipi etiketleri. */
const VERIFIED_TYPE_LABEL: Record<PartNumberType, string> = {
  oem:           "OEM Numarası",
  cross_ref:     "Çapraz Referans",
  alternate:     "Alternatif Gösterim",
  supersedes:    "Yerine Geçtiği Numara",
  superseded_by: "Yerine Kullanılan Numara",
  prefixless:    "Prefiksiz Biçim",
};

/**
 * `prefixless` yalnızca ARAMA içindir; sayfada muadil gibi gösterilmez
 * (drizzle/0007 başlığındaki kurala uyar).
 */
export function isDisplayableNumberType(type: PartNumberType): boolean {
  return type !== "prefixless";
}

/**
 * OEM / çapraz referans numarasının sunumu.
 *
 * Doğrulanmamış bir numara "OEM Numarası" olarak etiketlenmez — bu bir üretici
 * iddiasıdır. Nötr "Bildirilen Numara · teyit bekliyor" etiketi kullanılır ve
 * numara yapısal veriye yazılmaz.
 */
export function oemNumberPresentation(input: {
  type: PartNumberType;
  verified: boolean;
}): VerificationPresentation {
  if (!input.verified) {
    return {
      label: "Bildirilen Numara · teyit bekliyor",
      definitive: false,
      includeInStructuredData: false,
    };
  }
  return {
    label: VERIFIED_TYPE_LABEL[input.type],
    definitive: true,
    includeInStructuredData: true,
  };
}

/**
 * Makine uyumluluğu kaydının sunumu.
 *
 * Doğrulanmamış uyumluluk sayfada listelenebilir (kullanıcı için bilgi
 * değeri var) ama "uyumludur" diye KESİN sunulmaz ve yapısal veriye girmez.
 */
export function fitmentPresentation(input: {
  verified: boolean;
}): VerificationPresentation {
  if (!input.verified) {
    return {
      label: "Teyit bekliyor",
      definitive: false,
      includeInStructuredData: false,
    };
  }
  return {
    label: "Doğrulandı",
    definitive: true,
    includeInStructuredData: true,
  };
}

export interface VerificationSummary {
  total: number;
  verified: number;
  unverified: number;
  /** Hepsi doğrulanmış mı? (total 0 ise false — iddia edilecek bir şey yok.) */
  allVerified: boolean;
  /** Başlık altına yazılacak tek satırlık açıklama. */
  notice: string;
}

/**
 * Uyumluluk listesinin bütünü için özet.
 *
 * Kısmen doğrulanmış bir liste, tamamen doğrulanmış gibi sunulamaz; bu yüzden
 * tek bir sayı değil, doğrulanan/doğrulanmayan ayrımı döner.
 */
export function summarizeVerification(
  records: ReadonlyArray<{ verified: boolean }>
): VerificationSummary {
  const total = records.length;
  const verified = records.filter((r) => r.verified).length;
  const unverified = total - verified;

  let notice: string;
  if (total === 0) {
    notice = "Bu parça için kayıtlı makine uyumluluğu bulunmuyor.";
  } else if (unverified === 0) {
    notice = `${verified} makine uyumu doğrulandı.`;
  } else if (verified === 0) {
    notice =
      `${total} makine uyumu kayıtlı; hiçbiri henüz doğrulanmadı. ` +
      `Siparişten önce parça numarasını teyit ediniz.`;
  } else {
    notice =
      `${total} makine uyumu kayıtlı; ${verified} tanesi doğrulandı, ` +
      `${unverified} tanesi teyit bekliyor. Siparişten önce parça numarasını teyit ediniz.`;
  }

  return { total, verified, unverified, allVerified: total > 0 && unverified === 0, notice };
}

/**
 * Parçanın üreticisi, yapısal veride `Product.brand` olarak yazılabilir mi?
 *
 * İKİ KOŞUL BİRLİKTE gerekir:
 *   1. `part_manufacturer` dolu olmalı (bir insan girmiş olmalı),
 *   2. `sourcing_type` 'unknown' OLMAMALI (temin niteliği belirlenmiş olmalı).
 *
 * Uyumlu makine üreticisi BU FONKSİYONA HİÇ GELMEZ — ayrı bir alandır
 * (denetim C9: eski kod makine üreticisini marka olarak yazıyordu).
 */
// ── Doğrulama girdisinin ayrıştırılması (admin API) ──────────────────────────

/** `verified` alanı yalnızca açık bir boolean ile değişir. */
export function parseVerifiedFlag(
  value: unknown
): { ok: true; value: boolean } | { ok: false; error: string } {
  if (typeof value === "boolean") return { ok: true, value };
  if (value === "true") return { ok: true, value: true };
  if (value === "false") return { ok: true, value: false };
  return { ok: false, error: "verified true veya false olmalı." };
}

/** `source` için en fazla uzunluk — `drizzle/0008` ile aynı. */
export const VERIFICATION_SOURCE_MAX = 255;

/**
 * Doğrulama kaynağı.
 *
 * KURAL: `verified = true` ise KAYNAK ZORUNLUDUR. Dayanağı belirtilmeden
 * "doğrulandı" denemez — talimat #7'nin ("uydurma … uyumluluk iddiası
 * üretme") doğrudan karşılığı. `verified = false` iken kaynak serbesttir
 * (ör. "tedarikçi listesi, teyit bekliyor").
 */
export function parseVerificationSource(
  value: unknown,
  verified: boolean
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: "source metin olmalı." };
  }
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (verified && !trimmed) {
    return {
      ok: false,
      error:
        "Doğrulandı olarak işaretlemek için kaynak zorunludur " +
        "(üretici katalogu, tedarikçi teyidi, fiziksel ölçüm vb.).",
    };
  }
  if (trimmed.length > VERIFICATION_SOURCE_MAX) {
    return {
      ok: false,
      error: `source en fazla ${VERIFICATION_SOURCE_MAX} karakter olabilir.`,
    };
  }
  return { ok: true, value: trimmed || null };
}

export function brandClaimAllowed(input: {
  partManufacturer: string | null | undefined;
  sourcingType: "unknown" | "oem" | "oem_equivalent" | "aftermarket" | null | undefined;
}): boolean {
  const name = input.partManufacturer?.trim();
  if (!name) return false;
  return input.sourcingType !== "unknown" && input.sourcingType != null;
}
