import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
