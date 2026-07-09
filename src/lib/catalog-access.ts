import { isPageEnabled } from "@/lib/site-settings";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";

/**
 * Katalog erişim mimarisi — TEK OTORİTE: admin panelindeki sayfa toggle'ları.
 *
 * Admin → Sayfalar → "Parça Kataloğu (Statik)" anahtarı AÇIK olduğunda site
 * genelindeki tüm katalog CTA'ları kataloğa; KAPALI olduğunda ise otomatik
 * olarak Teklif Al formuna (ön-dolu parça numarasıyla) veya WhatsApp'a
 * yönlenir. Kod değişikliği gerekmez — toggle tek başına yeterlidir.
 *
 * Kapalıyken fallback zinciri: /parca-katalog → /teklif-al → /iletisim
 * (teklif-al da kapatılmışsa kullanıcı asla 404'e düşmez).
 */
export type CatalogAccess = {
  /** page_parca_katalog toggle durumu */
  enabled: boolean;
  /** Katalog hub CTA hedefi (açıkken /parca-katalog, kapalıyken fallback) */
  hubHref: string;
  /** Hub CTA'sı için önerilen buton etiketi */
  hubLabel: string;
};

export async function getCatalogAccess(): Promise<CatalogAccess> {
  const [katalogEnabled, teklifEnabled] = await Promise.all([
    isPageEnabled("page_parca_katalog"),
    isPageEnabled("page_teklif_al"),
  ]);

  if (katalogEnabled) {
    return { enabled: true, hubHref: "/parca-katalog", hubLabel: "Parça Kataloğu" };
  }
  if (teklifEnabled) {
    return { enabled: false, hubHref: "/teklif-al", hubLabel: "Parça Sorgula & Teklif Al" };
  }
  return { enabled: false, hubHref: "/iletisim", hubLabel: "Bize Ulaşın" };
}

/**
 * Tek bir parça için toggle-duyarlı link üretir.
 *
 * - Katalog AÇIK  → katalog hub'ında ön-dolu arama (`?search=`) — DB'de o an
 *   hangi ürünler olursa olsun asla 404 üretmez.
 * - Katalog KAPALI → ön-dolu Teklif Al formu (`?partNumber=&brand=`) —
 *   TeklifAlClient bu parametreleri zaten okuyup formu doldurur.
 */
export function partLink(access: CatalogAccess, partNumber: string, brand?: string): string {
  if (access.enabled) {
    return `/parca-katalog?search=${encodeURIComponent(partNumber)}`;
  }
  if (access.hubHref === "/teklif-al") {
    const q = new URLSearchParams({ partNumber });
    if (brand) q.set("brand", brand);
    return `/teklif-al?${q.toString()}`;
  }
  return access.hubHref;
}

/**
 * Katalog kapalıyken ikincil CTA'lar için WhatsApp alternatifi.
 * (Birincil CTA zaten /teklif-al olan sayfalarda ikili buton çakışmasını önler.)
 */
export function catalogWhatsAppHref(message?: string): string {
  return WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    message ?? "Merhaba, yedek parça sorgulamak istiyorum."
  );
}
