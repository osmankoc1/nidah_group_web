import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { NAV_ITEMS } from "@/lib/constants";

// ── Yönetilebilir sayfalar tanımı ────────────────────────────────────────────

// İki ayrı varsayılan vardır ve KARIŞTIRILMAMALIDIR:
//
// `defaultEnabled`  — ayarlar OKUNDU, ama bu anahtar için satır YOK.
//                     "Henüz hiç kaydedilmemiş" durumudur. Yerel geliştirmede
//                     `site_settings` boş olduğu için devreye giren değer de
//                     budur (bkz. CLAUDE.md §4) — bu yüzden değiştirilmez.
//
// `fallbackEnabled` — ayarlar HİÇ OKUNAMADI (DATABASE_URL yok ya da sorgu
//                     hata verdi). Bilgi yokluğunda uygulanacak GÜVENLİ
//                     değerdir. Bilinçli olarak kapalı tutulan sayfalarda
//                     `false`'tır: bilgi kaybı asla kapalı bir sayfayı
//                     açmamalıdır. Canlıda açık olan içerik sayfalarında
//                     `true`'dur; geçici bir DB arızası tüm siteyi
//                     karartmasın diye.
export const MANAGED_PAGES = [
  { key: "page_parca_katalog",  path: "/parca-katalog", label: "Parça Kataloğu (Statik)",  defaultEnabled: true,  fallbackEnabled: false },
  { key: "page_catalog",        path: "/catalog",        label: "Canlı Katalog (Prosis)",   defaultEnabled: false, fallbackEnabled: false },
  { key: "page_blog",           path: "/blog",           label: "Blog",                     defaultEnabled: true,  fallbackEnabled: true  },
  { key: "page_hizmetler",      path: "/hizmetler",      label: "Hizmetler",                defaultEnabled: true,  fallbackEnabled: true  },
  { key: "page_hakkimizda",     path: "/hakkimizda",     label: "Hakkımızda",               defaultEnabled: true,  fallbackEnabled: true  },
  { key: "page_sss",            path: "/sss",            label: "SSS",                      defaultEnabled: true,  fallbackEnabled: true  },
  { key: "page_teklif_al",      path: "/teklif-al",      label: "Teklif Al",                defaultEnabled: true,  fallbackEnabled: true  },
  { key: "page_iletisim",       path: "/iletisim",       label: "İletişim",                 defaultEnabled: true,  fallbackEnabled: true  },
] as const;

export type PageKey = (typeof MANAGED_PAGES)[number]["key"];

// ── Ayarları DB'den oku (etiket tabanlı önbellek) ────────────────────────────
//
// ÖNEMLİ — BU ÖNBELLEĞE `revalidate: <sayı>` EKLENMEZ.
//
// `unstable_cache`'e sayısal bir `revalidate` verildiğinde Next.js bu değeri
// yalnızca veri önbelleğine uygulamaz; onu RENDER EDEN ROTANIN revalidate
// süresine de taşır (Next 16: `unstable-cache.js` → `workUnitStore.revalidate`
// minimuma çekilir). Bu fonksiyon `(public)/layout.tsx` içinden çağrıldığı
// için değer TÜM public sayfalara ve `/sitemap.xml`'e yayılır: her sayfa
// zaman tabanlı ISR sayfasına döner ve her TTL dolumundan sonra gelen ilk
// istek bir yeniden üretim (= 1 Vercel "ISR write") tetikler.
//
// Daha önce burada `{ revalidate: 60 }` vardı ve build çıktısında 31
// prerender rotasının 28'i `initialRevalidateSeconds: 60` olarak işaretliydi;
// yani tüm site, içerik değişmese bile dakikada bir yeniden yazılabiliyordu.
//
// Doğru mekanizma zaman değil OLAY tabanlıdır: ayarlar yalnızca admin
// panelinden değişir (`/api/admin/settings` PATCH — tek yazma yolu), o da
// `revalidateTag(SITE_SETTINGS_CACHE_TAG)` çağırır. Böylece sayfalar tam
// statik kalır (`initialRevalidateSeconds: false`) ve yeniden üretim yalnızca
// gerçekten bir toggle değiştiğinde olur.
//
// UYARI: `site_settings` tablosu admin API'si DIŞINDA (örn. elle SQL veya
// bir script ile) değiştirilirse önbellek kendiliğinden tazelenmez; bu
// durumda yeni bir deploy ya da `revalidateTag` gerekir.

/** `site_settings` veri önbelleğinin geçersiz kılma etiketi. */
export const SITE_SETTINGS_CACHE_TAG = "site_settings";

// Hata DURUMU ÖNBELLEĞE ALINMAZ. `unstable_cache` yalnızca BAŞARILI sonucu
// yazar (`unstable-cache.js`: `cacheNewResult` ancak callback resolve olunca
// çağrılır). Bu yüzden `!db` ve sorgu hatası bilinçli olarak burada THROW
// edilir; yakalama bir üst katmanda yapılır. Aksi halde geçici bir arıza
// `revalidate: false` ile bir yıl boyunca donmuş "güvenli varsayılan" olarak
// kalırdı.
const fetchSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    if (!db) {
      // Ayırt edilebilir ad: logda "DB hiç yok" ile "sorgu hata verdi"
      // birbirine karışmasın.
      const e = new Error("site-settings: DATABASE_URL tanımlı değil");
      e.name = "SettingsDbUnavailable";
      throw e;
    }
    const rows = await db.select().from(siteSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  ["site_settings"],
  // `revalidate: false` → süreyle eskimez, rotaya revalidate süresi taşımaz.
  { tags: [SITE_SETTINGS_CACHE_TAG], revalidate: false }
);

/** Ayarlar okunabildi mi? `ok: false` → `fallbackEnabled` uygulanır. */
type SettingsRead =
  | { ok: true; settings: Record<string, string> }
  | { ok: false };

let dbYokLoglandi = false;

async function readSettings(): Promise<SettingsRead> {
  // DB hiç yapılandırılmamışsa önbelleğe hiç girmeyiz. Sessiz kalmayız:
  // eksik DATABASE_URL bir yapılandırma hatasıdır ve logda görünmelidir.
  if (!db) {
    // Süreç başına BİR kez loglanır: eksik env değişkeni süreç içinde
    // değişmez, her render'da yazmak log hacmini boşa şişirir (build'de
    // tek senaryoda 179 satır ölçüldü). Sorgu hatası ise geçicidir ve
    // sıklığı önemli olduğu için aşağıda her seferinde loglanır.
    if (!dbYokLoglandi) {
      dbYokLoglandi = true;
      console.error(
        "[site-settings] DATABASE_URL tanımlı değil — güvenli varsayılanlar (fallbackEnabled) uygulanıyor"
      );
    }
    return { ok: false };
  }

  try {
    return { ok: true, settings: await fetchSettings() };
  } catch (err) {
    // Hata ADI dışında hiçbir ayrıntı loglanmaz: bağlantı hatalarının mesajı
    // uç nokta adresini taşıyabilir (bkz. ~/.claude/CLAUDE.md §3).
    const kind = err instanceof Error ? err.name : "UnknownError";
    console.error(
      `[site-settings] ayarlar okunamadı (${kind}) — güvenli varsayılanlar (fallbackEnabled) uygulanıyor`
    );
    return { ok: false };
  }
}

/** Tek otorite: bir anahtarın etkin olup olmadığını okuma sonucundan çözer. */
function resolveEnabled(read: SettingsRead, key: PageKey): boolean {
  const page = MANAGED_PAGES.find((p) => p.key === key);
  if (!page) return true; // bilinmeyen sayfa — engelleme

  if (!read.ok) return page.fallbackEnabled; // bilgi yok → güvenli taraf
  if (!(key in read.settings)) return page.defaultEnabled; // kayıt yok
  return read.settings[key] === "true";
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function isPageEnabled(key: PageKey): Promise<boolean> {
  return resolveEnabled(await readSettings(), key);
}

export async function getAllPageSettings(): Promise<
  Array<{ key: PageKey; path: string; label: string; enabled: boolean }>
> {
  const read = await readSettings();
  return MANAGED_PAGES.map((p) => ({
    key: p.key,
    path: p.path,
    label: p.label,
    enabled: resolveEnabled(read, p.key),
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
  const read = await readSettings();

  function enabled(key: PageKey): boolean {
    return resolveEnabled(read, key);
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
