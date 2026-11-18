/**
 * Stok durumunun sunumu — TEK KAYNAK.
 *
 * SORUN (denetim C10): `products.in_stock` şemada `DEFAULT TRUE`. Bu yüzden
 * "true" değeri iki ayrı anlamı taşıyor:
 *   a) bir insan stoğu TEYİT ETTİ
 *   b) kimse dokunmadı, varsayılan geldi
 * Boolean şema bu ikisini ayırt edemez. Dolayısıyla `true` değeri "stokta"
 * iddiasını DESTEKLEMEZ.
 *
 * FAZ 1 KARARI: teyit edilmemiş hiçbir stok iddiası ne ekranda gösterilir ne de
 * JSON-LD'ye yazılır. `schemaAvailability` bu yüzden HER ZAMAN `null` döner ve
 * `buildProductJsonLd()` `offers` düğümünü hiç üretmez.
 *
 * FAZ 2 (onay bekliyor — karar D3): `products.stock_status` enum'u
 * (`unknown` | `in_stock` | `on_order`) eklendiğinde bir insanın açıkça
 * `in_stock` işaretlediği ürün için "Stokta Mevcut" + `schema.org/InStock`
 * geri gelir. O zamana kadar bu modül bilinçli olarak az iddia eder.
 *
 * KAPSAM: saf. İstemci ve sunucu tarafında birlikte kullanılabilir.
 */

export type StockTone = "pending" | "backorder" | "positive";

/** `products.stock_status` enum'u — drizzle/0008. */
export type StockStatus = "unknown" | "in_stock" | "on_order";

export interface StockPresentation {
  /** Kullanıcıya gösterilecek metin. */
  label: string;
  /** Görsel vurgu anahtarı — renk sınıfları çağıran tarafta. */
  tone: StockTone;
  /**
   * schema.org `Offer.availability` değeri — yalnızca bir insan stok durumunu
   * AÇIKÇA işaretlediğinde doludur. `unknown` iken `null` kalır ve
   * `buildProductJsonLd()` `offers` düğümünü hiç üretmez.
   */
  schemaAvailability: string | null;
}

const CONFIRMING: StockPresentation = {
  label: "Stok Durumu Teyit Ediliyor",
  tone: "pending",
  schemaAvailability: null,
};

const ON_ORDER: StockPresentation = {
  label: "Sipariş Üzerine",
  tone: "backorder",
  schemaAvailability: null,
};

/** Yalnızca insan teyidiyle ulaşılabilen durum. */
const IN_STOCK: StockPresentation = {
  label: "Stokta Mevcut",
  tone: "positive",
  schemaAvailability: "https://schema.org/InStock",
};

/** İnsan teyidiyle "sipariş üzerine" işaretlenmiş durum. */
const ON_ORDER_CONFIRMED: StockPresentation = {
  label: "Sipariş Üzerine",
  tone: "backorder",
  schemaAvailability: "https://schema.org/BackOrder",
};

/**
 * FAZ 2 OTORİTESİ — `products.stock_status` enum'undan sunum üretir.
 *
 *   'in_stock' → "Stokta Mevcut"              + schema.org/InStock
 *   'on_order' → "Sipariş Üzerine"            + schema.org/BackOrder
 *   'unknown'  → "Stok Durumu Teyit Ediliyor" + availability YOK
 *
 * Yalnızca `unknown` DIŞINDAKİ değerler bir insan kararıdır; bu yüzden yalnızca
 * onlar yapısal veriye yazılabilir.
 */
export function stockPresentationFromStatus(
  status: StockStatus | null | undefined
): StockPresentation {
  switch (status) {
    case "in_stock":
      return IN_STOCK;
    case "on_order":
      return ON_ORDER_CONFIRMED;
    default:
      return CONFIRMING;
  }
}

/** Stok durumu bir insan tarafından belirlenmiş mi? */
export function isStockStatusVerified(
  status: StockStatus | null | undefined
): boolean {
  return status === "in_stock" || status === "on_order";
}

/**
 * `products.in_stock` boolean'ını sunuma çevirir.
 *
 *   true  → "Stok Durumu Teyit Ediliyor"  (varsayılan TRUE olabileceği için iddia edilmez)
 *   false → "Sipariş Üzerine"             (az iddia eden taraf)
 *   null/undefined → "Sipariş Üzerine"
 */
export function stockPresentation(
  inStock: boolean | null | undefined
): StockPresentation {
  return inStock === true ? CONFIRMING : ON_ORDER;
}

/**
 * Stok durumu, bir insanın teyidiyle mi belirlenmiş?
 * FAZ 1'de şema bunu temsil edemediği için daima `false`.
 */
export function isStockVerified(): boolean {
  return false;
}
