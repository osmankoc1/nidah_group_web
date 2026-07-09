import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  products,
  blogPosts,
  blogPostTranslations,
  blogCategories,
  blogCategoryTranslations,
  blogTags,
  blogTagTranslations,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://www.nidahgroup.com.tr";

// ── Static pages ──────────────────────────────────────────────────────────────

const STATIC_URLS: MetadataRoute.Sitemap = [
  { url: BASE_URL,                      lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE_URL}/hizmetler`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/parca-katalog`,   lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
  { url: `${BASE_URL}/catalog`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/hakkimizda`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/iletisim`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/sss`,             lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/teklif-al`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  // Blog — all 4 language list pages
  { url: `${BASE_URL}/blog`,            lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${BASE_URL}/blog/en`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE_URL}/blog/ru`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE_URL}/blog/ar`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  // Service sub-pages
  { url: `${BASE_URL}/hizmetler/hidrolik-pompa-revizyonu`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/sanziman-revizyonu`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/diferansiyel-revizyonu`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/ecu-elektronik-tamir`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/periyodik-bakim-ariza-tespit`,lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  // Brand catalog pages
  { url: `${BASE_URL}/parca-katalog/volvo`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/komatsu`,  lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/cat`,      lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/hidromek`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/hamm`,     lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/bomag`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/ammann`,   lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/champion`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
];

// ── Single sitemap — no generateSitemaps() so /sitemap.xml works in dev+prod ──

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!db) return STATIC_URLS;

  // TR published blog posts
  const trPosts = await db
    .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));

  // EN/RU/AR translated posts (only for published parent posts)
  const translatedPosts = await db
    .select({
      locale:    blogPostTranslations.locale,
      slug:      blogPostTranslations.slug,
      updatedAt: blogPostTranslations.updatedAt,
    })
    .from(blogPostTranslations)
    .innerJoin(blogPosts, eq(blogPostTranslations.postId, blogPosts.id))
    .where(eq(blogPosts.status, "published"));

  // Active product pages
  const dbProducts = await db
    .select({ partNumber: products.partNumber })
    .from(products)
    .where(eq(products.isActive, true));

  // Blog categories (TR slugs)
  const dbCategories = await db.select({ id: blogCategories.id, slug: blogCategories.slug }).from(blogCategories);

  // Blog tags (TR slugs)
  const dbTags = await db.select({ id: blogTags.id, slug: blogTags.slug }).from(blogTags);

  // Category translations for locale-specific slugs (graceful fallback if migration not yet applied)
  const catTranslations = await db
    .select({
      categoryId: blogCategoryTranslations.categoryId,
      locale:     blogCategoryTranslations.locale,
      slug:       blogCategoryTranslations.slug,
    })
    .from(blogCategoryTranslations)
    .catch(() => [] as { categoryId: string; locale: string; slug: string }[]);

  // Tag translations
  const tagTranslations = await db
    .select({
      tagId:  blogTagTranslations.tagId,
      locale: blogTagTranslations.locale,
      slug:   blogTagTranslations.slug,
    })
    .from(blogTagTranslations)
    .catch(() => [] as { tagId: string; locale: string; slug: string }[]);

  const trBlogUrls: MetadataRoute.Sitemap = trPosts.map(p => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const translatedUrls: MetadataRoute.Sitemap = translatedPosts.map(t => ({
    url: `${BASE_URL}/blog/${t.locale}/${t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const productUrls: MetadataRoute.Sitemap = dbProducts.map(p => ({
    url: `${BASE_URL}/parca-katalog/${p.partNumber}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = dbCategories.map(c => ({
    url: `${BASE_URL}/blog/kategori/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const tagUrls: MetadataRoute.Sitemap = dbTags.map(t => ({
    url: `${BASE_URL}/blog/etiket/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Locale-specific category and tag hub pages — use translated slugs, fall back to TR slug
  const localeHubUrls: MetadataRoute.Sitemap = [];
  for (const locale of ["en", "ru", "ar"] as const) {
    for (const cat of dbCategories) {
      const trans = catTranslations.find(t => t.categoryId === cat.id && t.locale === locale);
      localeHubUrls.push({
        url: `${BASE_URL}/blog/${locale}/category/${trans?.slug ?? cat.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      });
    }
    for (const tag of dbTags) {
      const trans = tagTranslations.find(t => t.tagId === tag.id && t.locale === locale);
      localeHubUrls.push({
        url: `${BASE_URL}/blog/${locale}/tag/${trans?.slug ?? tag.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.4,
      });
    }
  }

  return [...STATIC_URLS, ...trBlogUrls, ...translatedUrls, ...productUrls, ...categoryUrls, ...tagUrls, ...localeHubUrls];
}
