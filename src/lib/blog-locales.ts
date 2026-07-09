// Supported locales for the multilingual blog system

export type Locale = "tr" | "en" | "ru" | "ar";

export const LOCALES = ["tr", "en", "ru", "ar"] as const;
export const TRANSLATION_LOCALES = ["en", "ru", "ar"] as const; // locales stored in blogPostTranslations
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export interface LocaleConfig {
  label: string;
  flag: string;
  dir: "ltr" | "rtl";
  lang: string;
  name: string;
  dateLocale: string;
  // UI strings
  heroTag: string;
  heroBody: string;
  heroTitle: string;
  allPostsLabel: string;
  readSuffix: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
  noPostsText: string;
  browseTrText: string;
  tagsLabel: string;
  trVersionLabel: string;
  trReadLabel: string;
  relatedPostsLabel: string;
  categoryNavTitle: string;
  categoryNavSubtitle: string;
}

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  tr: {
    label: "TR", flag: "🇹🇷", dir: "ltr", lang: "tr", name: "Türkçe",
    dateLocale: "tr-TR",
    heroTag: "Teknik Rehber & Sektör İçerikleri",
    heroTitle: "Blog",
    heroBody: "İş makinası bakımı, yedek parça seçimi ve teknik servis hakkında uzman içerikler.",
    allPostsLabel: "Tüm Blog Yazıları",
    readSuffix: "dk okuma",
    ctaTitle: "Parça veya Servis İhtiyacınız mı Var?",
    ctaBody: "Teknik ekibimiz sorularınızı yanıtlamak için hazır.",
    ctaButton: "Teklif Al",
    noPostsText: "Henüz yayınlanmış yazı bulunmuyor.",
    browseTrText: "",
    tagsLabel: "Etiketler",
    trVersionLabel: "",
    trReadLabel: "Türkçe oku",
    relatedPostsLabel: "Benzer Yazılar",
    categoryNavTitle: "Kategoriler",
    categoryNavSubtitle: "Konuya göre blog yazılarını keşfedin.",
  },
  en: {
    label: "EN", flag: "🇬🇧", dir: "ltr", lang: "en", name: "English",
    dateLocale: "en-GB",
    heroTag: "Technical Guides & Industry Content",
    heroTitle: "Blog",
    heroBody: "Expert articles on construction machinery maintenance, spare parts, and technical service.",
    allPostsLabel: "All Blog Posts",
    readSuffix: "min read",
    ctaTitle: "Need Parts or Service?",
    ctaBody: "Our technical team is ready to answer your questions.",
    ctaButton: "Get a Quote",
    noPostsText: "No articles published yet.",
    browseTrText: "Browse Turkish articles →",
    tagsLabel: "Tags",
    trVersionLabel: "This article is also available in Turkish.",
    trReadLabel: "Read in Turkish →",
    relatedPostsLabel: "Related Posts",
    categoryNavTitle: "Categories",
    categoryNavSubtitle: "Explore articles by topic.",
  },
  ru: {
    label: "RU", flag: "🇷🇺", dir: "ltr", lang: "ru", name: "Русский",
    dateLocale: "ru-RU",
    heroTag: "Технические руководства и отраслевые материалы",
    heroTitle: "Блог",
    heroBody: "Экспертные статьи о техническом обслуживании строительной техники, запасных частях и сервисе.",
    allPostsLabel: "Все статьи",
    readSuffix: "мин чтения",
    ctaTitle: "Нужны запчасти или сервис?",
    ctaBody: "Наша техническая команда готова ответить на ваши вопросы.",
    ctaButton: "Получить предложение",
    noPostsText: "Статьи пока не опубликованы.",
    browseTrText: "Читать на турецком →",
    tagsLabel: "Теги",
    trVersionLabel: "Эта статья также доступна на турецком языке.",
    trReadLabel: "Читать на турецком →",
    relatedPostsLabel: "Похожие статьи",
    categoryNavTitle: "Категории",
    categoryNavSubtitle: "Просматривайте статьи по темам.",
  },
  ar: {
    label: "AR", flag: "🇸🇦", dir: "rtl", lang: "ar", name: "العربية",
    dateLocale: "ar-SA",
    heroTag: "أدلة تقنية ومحتوى متخصص",
    heroTitle: "المدونة",
    heroBody: "مقالات متخصصة في صيانة المعدات الثقيلة وقطع الغيار والخدمة الفنية.",
    allPostsLabel: "جميع المقالات",
    readSuffix: "دقيقة قراءة",
    ctaTitle: "هل تحتاج إلى قطع غيار أو خدمة؟",
    ctaBody: "فريقنا الفني جاهز للإجابة على أسئلتكم.",
    ctaButton: "احصل على عرض سعر",
    noPostsText: "لا توجد مقالات منشورة حتى الآن.",
    browseTrText: "تصفح المقالات التركية →",
    tagsLabel: "الوسوم",
    trVersionLabel: "هذا المقال متاح أيضًا باللغة التركية.",
    trReadLabel: "اقرأ بالتركية →",
    relatedPostsLabel: "مقالات ذات صلة",
    categoryNavTitle: "الفئات",
    categoryNavSubtitle: "تصفح المقالات حسب الموضوع.",
  },
} as const;

export function isValidLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export function isTranslationLocale(v: string): v is TranslationLocale {
  return (TRANSLATION_LOCALES as readonly string[]).includes(v);
}

/** Canonical href for a locale's blog list page */
export function blogListHref(locale: Locale): string {
  return locale === "tr" ? "/blog" : `/blog/${locale}`;
}

/** Canonical href for a blog post in a given locale */
export function blogPostHref(locale: Locale, slug: string): string {
  return locale === "tr" ? `/blog/${slug}` : `/blog/${locale}/${slug}`;
}

/** Canonical href for a category hub page in a given locale */
export function localeCategoryHref(locale: Locale, slug: string): string {
  return locale === "tr" ? `/blog/kategori/${slug}` : `/blog/${locale}/category/${slug}`;
}

/** Canonical href for a tag hub page in a given locale */
export function localeTagHref(locale: Locale, slug: string): string {
  return locale === "tr" ? `/blog/etiket/${slug}` : `/blog/${locale}/tag/${slug}`;
}

const SITE_BASE = "https://www.nidahgroup.com.tr";

/** Build hreflang alternates for a blog post given slugs per locale */
export function buildPostHreflangs(slugsByLocale: Partial<Record<Locale, string>>) {
  const result: Record<string, string> = {};
  for (const [locale, slug] of Object.entries(slugsByLocale) as [Locale, string][]) {
    if (slug) result[locale] = `${SITE_BASE}${blogPostHref(locale, slug)}`;
  }
  // x-default points to the Turkish version; fall back to the first available locale
  if (slugsByLocale.tr) {
    result["x-default"] = `${SITE_BASE}${blogPostHref("tr", slugsByLocale.tr)}`;
  } else {
    const first = (Object.entries(slugsByLocale) as [Locale, string][]).find(([, s]) => s);
    if (first) result["x-default"] = `${SITE_BASE}${blogPostHref(first[0], first[1])}`;
  }
  return result;
}

/** Build hreflang alternates for category hub pages.
 *  Accepts per-locale slugs — only locales with a slug are included.
 *  Falls back to x-default = TR slug. */
export function buildCategoryHreflangs(
  slugsByLocale: Partial<Record<Locale, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (slugsByLocale.tr) result.tr = `${SITE_BASE}/blog/kategori/${slugsByLocale.tr}`;
  if (slugsByLocale.en) result.en = `${SITE_BASE}/blog/en/category/${slugsByLocale.en}`;
  if (slugsByLocale.ru) result.ru = `${SITE_BASE}/blog/ru/category/${slugsByLocale.ru}`;
  if (slugsByLocale.ar) result.ar = `${SITE_BASE}/blog/ar/category/${slugsByLocale.ar}`;
  // x-default = TR if available, else first available
  result["x-default"] = result.tr ?? Object.values(result)[0] ?? "";
  return result;
}

/** Build hreflang alternates for tag hub pages.
 *  Accepts per-locale slugs — only locales with a slug are included. */
export function buildTagHreflangs(
  slugsByLocale: Partial<Record<Locale, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (slugsByLocale.tr) result.tr = `${SITE_BASE}/blog/etiket/${slugsByLocale.tr}`;
  if (slugsByLocale.en) result.en = `${SITE_BASE}/blog/en/tag/${slugsByLocale.en}`;
  if (slugsByLocale.ru) result.ru = `${SITE_BASE}/blog/ru/tag/${slugsByLocale.ru}`;
  if (slugsByLocale.ar) result.ar = `${SITE_BASE}/blog/ar/tag/${slugsByLocale.ar}`;
  result["x-default"] = result.tr ?? Object.values(result)[0] ?? "";
  return result;
}

/** Build hreflang alternates for blog list pages */
export function buildListHreflangs() {
  return {
    ...Object.fromEntries(LOCALES.map(l => [l, `${SITE_BASE}${blogListHref(l)}`])),
    "x-default": `${SITE_BASE}/blog`,
  };
}
