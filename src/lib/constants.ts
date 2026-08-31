export const SITE_CONFIG = {
  name: "NİDAH GROUP",
  legalName: "Nidah İş Makinaları",
  url: "https://www.nidahgroup.com.tr",
  description:
    "İş makinası yedek parça tedariği, hidrolik şanzıman ve pompa revizyonu, ECU onarımı. Türkiye merkezli, 3 kıtada 13+ ülkeye ihracat.",
  locale: "tr_TR",
  location: {
    city: "Ankara",
    country: "Türkiye",
  },
} as const;

export const CONTACTS = {
  mustafa: {
    name: "Mustafa KOÇ",
    phone: "+90 530 884 59 79",
    phoneRaw: "905308845979",
    email: "mustafa.koc@nidahgroup.com.tr",
    role: "Genel Müdür",
  },
  osman: {
    name: "Osman Koç",
    phone: "+90 555 182 86 29",
    phoneRaw: "905551828629",
    email: "osman.koc@nidahgroup.com.tr",
    role: "Satış Müdürü",
  },
} as const;

export const WHATSAPP_URL = (phoneRaw: string, message?: string) => {
  const base = `https://wa.me/${phoneRaw}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
};

// ── Sosyal paylaşım görselleri ───────────────────────────────────────────────
// app/opengraph-image.tsx ve app/twitter-image.tsx tarafından üretilir.
// metadataBase (root layout) ile mutlak URL'e çözülür.
// TEK KAYNAK: root layout ve ana sayfa aynı sabiti kullanır — drift olmaz.

export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "NİDAH GROUP | İş Makinası Servisi & Yedek Parça",
} as const;

export const TWITTER_IMAGE = "/twitter-image";

/** Marka son eki — root layout'taki title.template ile aynı olmalı. */
export const TITLE_SUFFIX = " | NİDAH GROUP";

// ── Structured data kimlikleri ───────────────────────────────────────────────
// Organization düğümü root layout'ta BİR KEZ tanımlanır. Diğer tüm şemalar
// (Service.provider, AboutPage.about, ContactPage.mainEntity …) firma bilgisini
// tekrar etmek yerine bu @id'ye referans verir — böylece sayfada ikinci bir
// bağımsız Organization oluşmaz ve veri drift'i imkânsız hâle gelir.

export const ORGANIZATION_ID = "https://www.nidahgroup.com.tr/#organization";

/** Şemalarda firma referansı olarak kullanılır: provider, about, mainEntity… */
export const ORGANIZATION_REF = { "@id": ORGANIZATION_ID } as const;

/** Servis sayfalarının hizmet alanı — ülke geneli + Ankara merkez sinyali.
 *  LocalBusiness.areaServed ("Worldwide", parça ihracatı) ile çelişmez:
 *  bu, fiziksel servis işinin coğrafyasıdır. */
export const SERVICE_AREA_SERVED = [
  { "@type": "Country", name: "Turkey" },
  { "@type": "City", name: "Ankara" },
] as const;

export const BRANDS = [
  { name: "VOLVO", slug: "volvo" },
  { name: "CHAMPION", slug: "champion" },
  { name: "KOMATSU", slug: "komatsu" },
  { name: "CAT", slug: "cat" },
  { name: "HİDROMEK", slug: "hidromek" },
  { name: "HAMM", slug: "hamm" },
  { name: "BOMAG", slug: "bomag" },
  { name: "AMMANN", slug: "ammann" },
] as const;

export const NAV_ITEMS = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Hizmetler", href: "/hizmetler" },
  { label: "Parça Kataloğu", href: "/parca-katalog" },
  { label: "Blog", href: "/blog" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "İletişim", href: "/iletisim" },
  { label: "SSS", href: "/sss" },
] as const;
