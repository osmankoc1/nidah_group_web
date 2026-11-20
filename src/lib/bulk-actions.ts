/**
 * Toplu işlem isteğinin ayrıştırılması — bulgu P5, karar K10.
 *
 * ── K10'UN ŞARTLARI ────────────────────────────────────────────────────────
 *   · Toplu yayın YALNIZCA AÇIK OPERATÖR ONAYIYLA çalışır → `confirm: true`
 *     gövdede AÇIKÇA bulunmak zorundadır; yokluğunda istek reddedilir.
 *   · Her ürün mevcut sunucu tarafı yayın kapısından AYRI AYRI geçer →
 *     uç tarafında `evaluatePublishEligibility()` kayıt başına çalışır.
 *   · Hiçbir ürün OTOMATİK yayına alınmaz → bu modül hiçbir eylemi
 *     varsayılan yapmaz; `action` açıkça verilmezse istek reddedilir.
 *
 * ── YAPILMAYANLAR (bilinçli) ───────────────────────────────────────────────
 *   · TOPLU SİLME yok. Geri alınamaz ve `products` silinince görseller,
 *     uyumluluklar ve OEM kayıtları cascade ile gider.
 *   · TOPLU FOTOĞRAF DOĞRULAMA yok. Doğrulama ALT metni + kaynak notu ister
 *     (K1/K2); bunlar kayıt başına girilen KANITLARDIR, toplu üretilemez.
 *
 * KAPSAM: saf. Veritabanı, istek veya React yok — bu yüzden test edilebilir.
 */

import { STOCK_STATUSES, type StockStatusValue } from "@/lib/product-fields";

/** Tek istekte işlenebilecek en fazla kayıt sayısı. */
export const BULK_MAX = 100;

export const BULK_ACTIONS = [
  "activate",
  "deactivate",
  "stock_status",
  "publish",
  "unpublish",
] as const;

export type BulkAction = (typeof BULK_ACTIONS)[number];

/** Operatöre gösterilen Türkçe eylem adları. */
export const BULK_ACTION_LABELS: Record<BulkAction, string> = {
  activate: "Aktife al",
  deactivate: "Pasife al",
  stock_status: "Stok durumu ata",
  publish: "Yayın onayı ver",
  unpublish: "Yayından al",
};

/**
 * Onay diyaloğunda gösterilen SONUÇ cümleleri.
 *
 * Her cümle işlemin public yüzeydeki etkisini söyler; "emin misiniz?" gibi
 * içeriksiz bir soru operatörü bilgilendirmez.
 */
export const BULK_ACTION_CONSEQUENCE: Record<BulkAction, string> = {
  activate: "Seçili ürünler public yüzeylerde görünür hâle gelir.",
  deactivate: "Seçili ürünler hiçbir public yüzeyde görünmez. Yayın onayı geri ALINMAZ.",
  stock_status:
    "Seçili ürünlerin stok durumu değişir. Teyitli bir stok iddiası sitede ve " +
    "yapısal veride yayımlanır — yalnızca gerçekten teyit ettiyseniz seçin.",
  publish:
    "Her ürün yayın kapısından AYRI AYRI geçer. Ölçütleri karşılamayan ürün " +
    "reddedilir ve yayına ALINMAZ.",
  unpublish: "Seçili ürünlerin sayfaları noindex olur ve sitemap'ten çıkar.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BulkRequest {
  action: BulkAction;
  ids: string[];
  /** Yalnızca `action === "stock_status"` için. */
  stockStatus?: StockStatusValue;
}

export type BulkParseResult =
  | { ok: true; value: BulkRequest }
  | { ok: false; error: string };

export function parseBulkRequest(body: unknown): BulkParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Geçersiz gövde." };
  }
  const g = body as Record<string, unknown>;

  // AÇIK OPERATÖR ONAYI (K10). Varsayılan YOK: eksikse reddedilir.
  if (g.confirm !== true) {
    return {
      ok: false,
      error:
        "Toplu işlem için açık onay gerekir. İstek gövdesinde `confirm: true` bulunmalıdır.",
    };
  }

  if (typeof g.action !== "string" || !(BULK_ACTIONS as readonly string[]).includes(g.action)) {
    return {
      ok: false,
      error: `Geçersiz işlem. İzinli değerler: ${BULK_ACTIONS.join(", ")}`,
    };
  }
  const action = g.action as BulkAction;

  if (!Array.isArray(g.ids) || g.ids.length === 0) {
    return { ok: false, error: "En az bir ürün seçilmelidir." };
  }
  if (g.ids.length > BULK_MAX) {
    return {
      ok: false,
      error: `Tek istekte en fazla ${BULK_MAX} kayıt işlenebilir (gönderilen: ${g.ids.length}).`,
    };
  }

  const ids: string[] = [];
  const gorulen = new Set<string>();
  for (const id of g.ids) {
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      return { ok: false, error: "Geçersiz ürün kimliği." };
    }
    // Aynı kimlik iki kez gelirse bir kez işlenir; aksi hâlde işlem kaydında
    // aynı ürün için iki satır oluşur ve sayım yanıltıcı olur.
    if (gorulen.has(id)) continue;
    gorulen.add(id);
    ids.push(id);
  }

  if (action === "stock_status") {
    const value = g.stockStatus;
    if (
      typeof value !== "string" ||
      !(STOCK_STATUSES as readonly string[]).includes(value)
    ) {
      return {
        ok: false,
        error: `Geçersiz stok durumu. İzinli değerler: ${STOCK_STATUSES.join(", ")}`,
      };
    }
    return { ok: true, value: { action, ids, stockStatus: value as StockStatusValue } };
  }

  return { ok: true, value: { action, ids } };
}

export interface BulkItemResult {
  id: string;
  ok: boolean;
  /** Reddedilme gerekçesi — başarıda yok. */
  error?: string;
  /** Yayın işleminde karşılanmayan ölçüt KODLARI (makine okunur). */
  unmet?: string[];
  /**
   * Aynı ölçütlerin TÜRKÇE karşılığı (`seo-gate.ts` → `REASON`).
   *
   * Kodlar tek başına operatöre gösterilmez: canlı doğrulamada ekranda
   * "no_verified_image, long_description_too_short" (eski ölçüt adı; bugünkü
   * karşılığı `long_description_missing`) yazıyordu ve bu, paneli kullanan
   * kişiye ne yapması gerektiğini SÖYLEMİYOR. Kod listesi
   * (`unmet`) geliştirici/log tarafı için duruyor.
   */
  reasons?: string[];
}

export interface BulkSummary {
  islenen: number;
  basarili: number;
  reddedilen: number;
}

export function summarizeBulk(results: BulkItemResult[]): BulkSummary {
  const basarili = results.filter((r) => r.ok).length;
  return {
    islenen: results.length,
    basarili,
    reddedilen: results.length - basarili,
  };
}
