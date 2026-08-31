import { db } from "@/lib/db";
import {
  blogCategories,
  blogCategoryTranslations,
  blogTags,
  blogTagTranslations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isUsableSlug, type Locale } from "@/lib/blog-locales";

// Shared slugify for categories and tags (TR-aware).
// Centralizes the function duplicated across 7 API routes.
export function slugifyTaxonomy(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export interface ResolvedCategory {
  id: string;
  trSlug: string;
  trName: string;
  trDescription: string | null;
  /** Translated name for the requested locale; falls back to trName if no translation exists. */
  localeName: string;
  /** Translated description; falls back to trDescription. */
  localeDescription: string | null;
  /** Per-locale slugs for building hreflang alternates. Only locales with data are present. */
  allSlugs: Partial<Record<Locale, string>>;
}

export interface ResolvedTag {
  id: string;
  trSlug: string;
  trName: string;
  localeName: string;
  allSlugs: Partial<Record<Locale, string>>;
}

/**
 * Resolve a category by locale + slug.
 * For EN/RU/AR: tries the locale-specific slug first, then falls back to the TR slug.
 * For TR: queries the main table directly.
 * Always fetches all translations to build the allSlugs hreflang map.
 */
export async function resolveCategory(
  locale: Locale,
  slugParam: string,
): Promise<ResolvedCategory | null> {
  if (!db) return null;

  let catId: string | null = null;
  let localeName: string | null = null;
  let localeDescription: string | null = null;

  // Step 1: For non-TR locales, try to find by locale-specific slug
  if (locale !== "tr") {
    const [trans] = await db
      .select({
        categoryId:  blogCategoryTranslations.categoryId,
        name:        blogCategoryTranslations.name,
        description: blogCategoryTranslations.description,
      })
      .from(blogCategoryTranslations)
      .where(
        and(
          eq(blogCategoryTranslations.locale, locale),
          eq(blogCategoryTranslations.slug, slugParam),
        ),
      )
      .limit(1);

    if (trans) {
      catId           = trans.categoryId;
      localeName      = trans.name;
      localeDescription = trans.description;
    }
  }

  // Step 2: TR locale, or locale slug not found → try TR slug as fallback
  if (!catId) {
    const [cat] = await db
      .select({ id: blogCategories.id })
      .from(blogCategories)
      .where(eq(blogCategories.slug, slugParam))
      .limit(1);
    if (!cat) return null;
    catId = cat.id;
  }

  // Step 3: Fetch the full category record
  const [cat] = await db
    .select({
      id:          blogCategories.id,
      name:        blogCategories.name,
      slug:        blogCategories.slug,
      description: blogCategories.description,
    })
    .from(blogCategories)
    .where(eq(blogCategories.id, catId))
    .limit(1);
  if (!cat) return null;

  // Step 4: Fetch all locale translations for hreflang
  const translations = await db
    .select({
      locale:      blogCategoryTranslations.locale,
      slug:        blogCategoryTranslations.slug,
      name:        blogCategoryTranslations.name,
      description: blogCategoryTranslations.description,
    })
    .from(blogCategoryTranslations)
    .where(eq(blogCategoryTranslations.categoryId, catId));

  // If we arrived via TR fallback and no localeName yet, check translations
  if (locale !== "tr" && !localeName) {
    const locTrans = translations.find(t => t.locale === locale);
    if (locTrans) {
      localeName        = locTrans.name;
      localeDescription = locTrans.description;
    }
  }

  // Build allSlugs map
  const allSlugs: Partial<Record<Locale, string>> = { tr: cat.slug };
  for (const t of translations) {
    // Kullanılamaz slug'lar (Kiril/Arapça adlardan üretilen boş string vb.)
    // haritaya girmez — aksi hâlde bozuk hreflang URL'i üretilir.
    if (isUsableSlug(t.slug)) allSlugs[t.locale as Locale] = t.slug;
  }

  return {
    id:               cat.id,
    trSlug:           cat.slug,
    trName:           cat.name,
    trDescription:    cat.description,
    localeName:       localeName ?? cat.name,
    localeDescription: localeDescription ?? cat.description,
    allSlugs,
  };
}

/**
 * Resolve a tag by locale + slug.
 * Same dual-path pattern as resolveCategory.
 */
export async function resolveTag(
  locale: Locale,
  slugParam: string,
): Promise<ResolvedTag | null> {
  if (!db) return null;

  let tagId: string | null = null;
  let localeName: string | null = null;

  if (locale !== "tr") {
    const [trans] = await db
      .select({
        tagId: blogTagTranslations.tagId,
        name:  blogTagTranslations.name,
      })
      .from(blogTagTranslations)
      .where(
        and(
          eq(blogTagTranslations.locale, locale),
          eq(blogTagTranslations.slug, slugParam),
        ),
      )
      .limit(1);

    if (trans) {
      tagId      = trans.tagId;
      localeName = trans.name;
    }
  }

  if (!tagId) {
    const [tag] = await db
      .select({ id: blogTags.id })
      .from(blogTags)
      .where(eq(blogTags.slug, slugParam))
      .limit(1);
    if (!tag) return null;
    tagId = tag.id;
  }

  const [tag] = await db
    .select({ id: blogTags.id, name: blogTags.name, slug: blogTags.slug })
    .from(blogTags)
    .where(eq(blogTags.id, tagId))
    .limit(1);
  if (!tag) return null;

  const translations = await db
    .select({
      locale: blogTagTranslations.locale,
      slug:   blogTagTranslations.slug,
      name:   blogTagTranslations.name,
    })
    .from(blogTagTranslations)
    .where(eq(blogTagTranslations.tagId, tagId));

  if (locale !== "tr" && !localeName) {
    const locTrans = translations.find(t => t.locale === locale);
    if (locTrans) localeName = locTrans.name;
  }

  const allSlugs: Partial<Record<Locale, string>> = { tr: tag.slug };
  for (const t of translations) {
    // Kullanılamaz slug'lar (Kiril/Arapça adlardan üretilen boş string vb.)
    // haritaya girmez — aksi hâlde bozuk hreflang URL'i üretilir.
    if (isUsableSlug(t.slug)) allSlugs[t.locale as Locale] = t.slug;
  }

  return {
    id:        tag.id,
    trSlug:    tag.slug,
    trName:    tag.name,
    localeName: localeName ?? tag.name,
    allSlugs,
  };
}
