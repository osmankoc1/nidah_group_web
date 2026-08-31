import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { NAV_ITEMS } from "@/lib/constants";

// ── Yönetilebilir sayfalar tanımı ────────────────────────────────────────────

export const MANAGED_PAGES = [
  { key: "page_parca_katalog",  path: "/parca-katalog", label: "Parça Kataloğu (Statik)",  defaultEnabled: true  },
  { key: "page_catalog",        path: "/catalog",        label: "Canlı Katalog (Prosis)",   defaultEnabled: false },
  { key: "page_blog",           path: "/blog",           label: "Blog",                     defaultEnabled: true  },
  { key: "page_hizmetler",      path: "/hizmetler",      label: "Hizmetler",                defaultEnabled: true  },
  { key: "page_hakkimizda",     path: "/hakkimizda",     label: "Hakkımızda",               defaultEnabled: true  },
  { key: "page_sss",            path: "/sss",            label: "SSS",                      defaultEnabled: true  },
  { key: "page_teklif_al",      path: "/teklif-al",      label: "Teklif Al",                defaultEnabled: true  },
  { key: "page_iletisim",       path: "/iletisim",       label: "İletişim",                 defaultEnabled: true  },
] as const;

export type PageKey = (typeof MANAGED_PAGES)[number]["key"];

// ── Ayarları DB'den oku (60 sn önbellekli) ───────────────────────────────────

const fetchSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    if (!db) return {};
    const rows = await db.select().from(siteSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  ["site_settings"],
  { revalidate: 60 }
);

// ── Public API ───────────────────────────────────────────────────────────────

export async function isPageEnabled(key: PageKey): Promise<boolean> {
  const page = MANAGED_PAGES.find((p) => p.key === key);
  if (!page) return true; // bilinmeyen sayfa — engelleme

  const settings = await fetchSettings();
  if (!(key in settings)) return page.defaultEnabled;

  return settings[key] === "true";
}

export async function getAllPageSettings(): Promise<
  Array<{ key: PageKey; path: string; label: string; enabled: boolean }>
> {
  const settings = await fetchSettings();
  return MANAGED_PAGES.map((p) => ({
    key: p.key,
    path: p.path,
    label: p.label,
    enabled: p.key in settings ? settings[p.key] === "true" : p.defaultEnabled,
  }));
}

// ── Kapalı sayfa metadata'sı ─────────────────────────────────────────────────
// Bir sayfa admin toggle'ı ile kapatıldığında layout/page `notFound()` çağırır,
// ancak Next.js statik `metadata` export'unu yine de emit eder. Bu durumda
// sayfa hem "index, follow" hem de not-found kaynaklı "noindex" etiketi
// taşır; ayrıca canonical/OG bilgileri 404 gövdesiyle çelişir.
//
// Aşağıdaki yardımcılar bu çelişkiyi kaldırır: kapalıyken TEK ve net bir
// noindex sinyali üretilir, canonical/OG/Twitter miras alınmaz.

export const DISABLED_PAGE_METADATA: Metadata = {
  title: "Sayfa Bulunamadı",
  robots: { index: false, follow: false },
  // null → root layout'tan miras alınan değerleri açıkça kaldırır.
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

/**
 * Toggle AÇIK ise verilen metadata'yı, KAPALI ise çelişkisiz noindex
 * metadata'sını döner. Açık durumdaki çıktı hiçbir şekilde değişmez.
 */
export async function metadataForPage(
  key: PageKey,
  enabledMetadata: Metadata | (() => Metadata | Promise<Metadata>)
): Promise<Metadata> {
  if (!(await isPageEnabled(key))) return DISABLED_PAGE_METADATA;
  return typeof enabledMetadata === "function"
    ? await enabledMetadata()
    : enabledMetadata;
}

// ── Nav visibility ────────────────────────────────────────────────────────────

export type NavItem = { label: string; href: string };

export type NavVisibility = {
  /** NAV_ITEMS filtrelenmiş — kapalı sayfalar çıkarılmış */
  navItems: NavItem[];
  /** /teklif-al butonu görünür mü */
  teklifAlEnabled: boolean;
  /** /hizmetler ve alt sayfaları görünür mü */
  hizmetlerEnabled: boolean;
};

export async function getNavVisibility(): Promise<NavVisibility> {
  const settings = await fetchSettings();

  function enabled(key: PageKey): boolean {
    const page = MANAGED_PAGES.find((p) => p.key === key)!;
    return key in settings ? settings[key] === "true" : page.defaultEnabled;
  }

  const navItems = NAV_ITEMS.filter((item) => {
    const managed = MANAGED_PAGES.find((p) => p.path === item.href);
    if (!managed) return true; // yönetilmiyorsa daima göster (Ana Sayfa)
    return enabled(managed.key as PageKey);
  });

  return {
    navItems,
    teklifAlEnabled: enabled("page_teklif_al"),
    hizmetlerEnabled: enabled("page_hizmetler"),
  };
}
