/**
 * Çeviri yayın kapısı — bulgu P11.
 *
 * ── SORUN ──────────────────────────────────────────────────────────────────
 * `TranslationsManager`'daki "Kaydet ve yayınla" düğmesi HİÇBİR ölçüt
 * kontrol etmiyordu. Yalnızca ürün adı dolu bir İngilizce çeviri
 * yayınlanabiliyordu; gövde metni Türkçe'ye düşüyordu. Teknik olarak boş
 * sayfa üretmiyor (yedek mekanizması çalışıyor) ama ortaya YARI ÇEVRİLMİŞ
 * bir sayfa çıkıyordu: başlık İngilizce, gövde Türkçe.
 *
 * ── BU KAPI ÜRÜN YAYIN KAPISINDAN AYRI VE DAHA HAFİFTİR ───────────────────
 * `seo-gate.ts` ürünün kendisini yayına açar ve fotoğraf, açıklama,
 * doğrulanmış uyumluluk ister. Bu kapı yalnızca ÇEVİRİNİN yayınlanabilir
 * olup olmadığına bakar ve `products.seo_ready` alanına ASLA dokunmaz.
 *
 * Çeviri yayınlamak ürünü yayına AÇMAZ; ürün yayında değilse çevirisi de
 * hiçbir yerde görünmez.
 *
 * KAPSAM: saf. DB, ağ, React yok.
 */

/** Çeviri gövdesi için en az karakter — ürün eşiğinden bilinçli olarak düşük. */
export const MIN_TRANSLATION_BODY_CHARS = 120;

export type TranslationCriterion =
  | "name_missing"
  | "body_missing"
  | "body_too_short";

export interface TranslationReadinessInput {
  /** Çeviri ürün adı. */
  name: string | null | undefined;
  shortDescription: string | null | undefined;
  longDescription: string | null | undefined;
}

export interface TranslationReadinessResult {
  eligible: boolean;
  unmet: TranslationCriterion[];
  reasons: string[];
}

const REASON: Record<TranslationCriterion, string> = {
  name_missing: "Çeviri ürün adı boş.",
  body_missing:
    "Kısa veya uzun açıklamadan en az biri doldurulmalı. " +
    "Boş bırakılırsa sayfanın gövdesi Türkçe kalır — yarı çevrilmiş sayfa yayınlanmaz.",
  body_too_short:
    `Çeviri gövdesi en az ${MIN_TRANSLATION_BODY_CHARS} karakter olmalı ` +
    `(makine çevirisi gibi görünen tek cümlelik metin yayınlanmaz).`,
};

/**
 * Çeviri yayınlanabilir mi?
 *
 * Taslak kaydetmek HER ZAMAN serbesttir; bu kapı yalnızca YAYINLAMA
 * eylemini denetler. Yarım kalmış bir çeviri taslak olarak durabilir.
 */
export function evaluateTranslationReadiness(
  input: TranslationReadinessInput
): TranslationReadinessResult {
  const unmet: TranslationCriterion[] = [];

  const ad = input.name?.trim() ?? "";
  if (!ad) unmet.push("name_missing");

  const kisa = input.shortDescription?.trim() ?? "";
  const uzun = input.longDescription?.trim() ?? "";
  const govde = uzun || kisa;

  if (!govde) {
    unmet.push("body_missing");
  } else if (govde.length < MIN_TRANSLATION_BODY_CHARS) {
    unmet.push("body_too_short");
  }

  return {
    eligible: unmet.length === 0,
    unmet,
    reasons: unmet.map((k) => REASON[k]),
  };
}
