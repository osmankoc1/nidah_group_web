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
    role: "Satış Müdürü",
  },
  osman: {
    name: "Osman Koç",
    phone: "+90 555 182 86 29",
    phoneRaw: "905551828629",
    email: "osman.koc@nidahgroup.com.tr",
    role: "Genel Müdür",
  },
} as const;

export const WHATSAPP_URL = (phoneRaw: string, message?: string) => {
  const base = `https://wa.me/${phoneRaw}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
};

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
