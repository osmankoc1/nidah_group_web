/**
 * Servis sayfaları arası iç link topolojisi.
 *
 * KAPSAM BİLİNÇLİ OLARAK DAR: yalnızca stabil anahtar, görünen ad ve URL.
 * Metadata, JSON-LD, açıklama, ikon ve sayfa içeriği burada TUTULMAZ — onlar
 * ilgili sayfaların kendi sorumluluğunda kalır. Burası bir "service registry"
 * değil, sadece hangi hizmetin hangisiyle ilişkili olduğunu söyleyen harita.
 */

export type ServiceKey =
  | "sanziman"
  | "diferansiyel"
  | "hidrolik-pompa"
  | "ecu"
  | "periyodik-bakim";

export interface ServiceLink {
  key: ServiceKey;
  /** Anchor metni — sitedeki mevcut hizmet adlarıyla aynı. */
  label: string;
  href: string;
}

export const SERVICES: Record<ServiceKey, ServiceLink> = {
  "sanziman": {
    key: "sanziman",
    label: "Şanzıman Revizyonu",
    href: "/hizmetler/sanziman-revizyonu",
  },
  "diferansiyel": {
    key: "diferansiyel",
    label: "Diferansiyel Revizyonu",
    href: "/hizmetler/diferansiyel-revizyonu",
  },
  "hidrolik-pompa": {
    key: "hidrolik-pompa",
    label: "Hidrolik Pompa Revizyonu",
    href: "/hizmetler/hidrolik-pompa-revizyonu",
  },
  "ecu": {
    key: "ecu",
    label: "ECU & Elektronik Tamir",
    href: "/hizmetler/ecu-elektronik-tamir",
  },
  "periyodik-bakim": {
    key: "periyodik-bakim",
    label: "Periyodik Bakım & Arıza Tespit",
    href: "/hizmetler/periyodik-bakim-ariza-tespit",
  },
};

/**
 * İlişkiler sayfaların GERÇEK içeriğinden türetildi, SEO için rastgele
 * çapraz link üretilmedi:
 *  - şanzıman ↔ diferansiyel : aynı tahrik hattı; her ikisinde de dişli grubu
 *    kontrolü ve rulman/keçe değişimi adımları var
 *  - şanzıman ↔ hidrolik      : "hidrolik-mekanik şanzıman" tipi + basınç testi
 *  - hidrolik ↔ periyodik     : pompa sayfası basınç-debi eğrisi testi yapıyor,
 *    bakım sayfasında "Basınç & Debi Test Kiti" var — birebir aynı ölçüm
 *  - ecu ↔ periyodik          : ECU'da "Teşhis Taraması", bakımda "Dijital Hata
 *    Kodu Okuyucu" — birebir aynı işlem
 *  - diferansiyel ↔ periyodik : yağ analizi → metal partikül → dişli aşınması
 *
 * ECU ile mekanik revizyon hizmetleri arasında gerçek içerik örtüşmesi
 * bulunmadığı için o bağlar BİLİNÇLİ olarak kurulmadı.
 */
const RELATED: Record<ServiceKey, readonly ServiceKey[]> = {
  "sanziman":        ["diferansiyel", "hidrolik-pompa"],
  "diferansiyel":    ["sanziman", "periyodik-bakim"],
  "hidrolik-pompa":  ["periyodik-bakim", "sanziman"],
  "ecu":             ["periyodik-bakim"],
  "periyodik-bakim": ["ecu", "hidrolik-pompa", "diferansiyel"],
};

/** İlgili hizmetler — self-link ve tekrar elenir. */
export function getRelatedServices(key: ServiceKey): ServiceLink[] {
  const seen = new Set<ServiceKey>([key]);
  return (RELATED[key] ?? []).flatMap((k) => {
    if (seen.has(k)) return [];
    seen.add(k);
    return [SERVICES[k]];
  });
}

/**
 * Blog kategorisi → hizmet eşlemesi (yalnızca TR).
 *
 * Kategori bazlıdır, yazı slug'ına özel kural İÇERMEZ: aynı kategoriye eklenen
 * yeni bir yazı otomatik olarak aynı hizmetlere bağlanır. Etiket bazlı eşleme
 * ve otomatik keyword eşleştirmesi bilinçli olarak kullanılmaz.
 *
 * Eşleşme yoksa hiçbir link üretilmez.
 */
const BLOG_CATEGORY_SERVICES: Record<string, readonly ServiceKey[]> = {
  // "İş Makineleri": greyder/ekskavatör gibi makinelerin aks, hidrolik ve
  // periyodik bakım ihtiyaçlarıyla doğrudan örtüşür.
  "is-makineleri": ["diferansiyel", "hidrolik-pompa", "periyodik-bakim"],
};

export function getServicesForBlogCategory(
  categorySlug: string | null | undefined,
): ServiceLink[] {
  if (!categorySlug) return [];
  const seen = new Set<ServiceKey>();
  return (BLOG_CATEGORY_SERVICES[categorySlug] ?? []).flatMap((k) => {
    if (seen.has(k)) return [];
    seen.add(k);
    return [SERVICES[k]];
  });
}
