import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  products,
  productImages,
  blogPosts,
  blogPostTranslations,
  blogCategories,
  blogCategoryTranslations,
  blogTags,
  blogTagTranslations,
  blogPostTags,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAllPageSettings, type PageKey } from "@/lib/site-settings";
import { isUsableSlug } from "@/lib/blog-locales";

const BASE_URL = "https://www.nidahgroup.com.tr";

// ── Sabit URL tanımları — admin sayfa toggle'larına göre gruplanmış ──────────
// TEK OTORİTE: Admin > Sayfalar. Kapalı bir sayfa (ve tüm alt sayfaları)
// sitemap'e girmez; açılınca otomatik geri gelir. Kod değişikliği gerekmez.

const ALWAYS_URLS: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
];

const URLS_BY_PAGE: Partial<Record<PageKey, MetadataRoute.Sitemap>> = {
  page_hizmetler: [
    { url: `${BASE_URL}/hizmetler`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/hizmetler/hidrolik-pompa-revizyonu`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/hizmetler/sanziman-revizyonu`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/hizmetler/diferansiyel-revizyonu`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/hizmetler/ecu-elektronik-tamir`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/hizmetler/periyodik-bakim-ariza-tespit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ],
  page_parca_katalog: [
    { url: `${BASE_URL}/parca-katalog`,          lastModified: new Date(), changeFrequency: "weekly", priority: 0.9  },
    { url: `${BASE_URL}/parca-katalog/volvo`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/komatsu`,  lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/cat`,      lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/hidromek`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/hamm`,     lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/bomag`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/ammann`,   lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/parca-katalog/champion`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  ],
  page_catalog: [
    { url: `${BASE_URL}/catalog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ],
  page_hakkimizda: [
    { url: `${BASE_URL}/hakkimizda`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ],
  page_iletisim: [
    { url: `${BASE_URL}/iletisim`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ],
  page_sss: [
    { url: `${BASE_URL}/sss`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ],
  page_teklif_al: [
    { url: `${BASE_URL}/teklif-al`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ],
  page_blog: [
    { url: `${BASE_URL}/blog`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/blog/en`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/blog/ru`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/blog/ar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ],
};

// ── Single sitemap — no generateSitemaps() so /sitemap.xml works in dev+prod ──

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getAllPageSettings();
  const enabled = (key: PageKey) =>
    settings.find((s) => s.key === key)?.enabled ?? true;

  const staticUrls: MetadataRoute.Sitemap = [
    ...ALWAYS_URLS,
    ...Object.entries(URLS_BY_PAGE).flatMap(([key, urls]) =>
      enabled(key as PageKey) ? urls : []
    ),
  ];

  if (!db) return staticUrls;

  const blogEnabled    = enabled("page_blog");
  const katalogEnabled = enabled("page_parca_katalog");

  // TR published blog posts
  const trPosts = blogEnabled
    ? await db
        .select({
          slug:          blogPosts.slug,
          updatedAt:     blogPosts.updatedAt,
          coverImageUrl: blogPosts.coverImageUrl,
        })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
    : [];

  // EN/RU/AR translated posts (only for published parent posts)
  const translatedPosts = blogEnabled
    ? await db
        .select({
          locale:    blogPostTranslations.locale,
          slug:      blogPostTranslations.slug,
          updatedAt: blogPostTranslations.updatedAt,
        })
        .from(blogPostTranslations)
        .innerJoin(blogPosts, eq(blogPostTranslations.postId, blogPosts.id))
        .where(eq(blogPosts.status, "published"))
    : [];

  // Active product pages — yalnızca katalog yayındayken
  const dbProducts = katalogEnabled
    ? await db
        .select({ id: products.id, partNumber: products.partNumber })
        .from(products)
        .where(eq(products.isActive, true))
    : [];

  // ── Kategori ve etiketler — YALNIZCA yayımlanmış içeriği olanlar ───────────
  // Boş bir taksonomi sayfası hiçbir yazı listelemez; sitemap'e girerse Google'a
  // değersiz URL ilan etmiş oluruz. Kural veri-temellidir: bir kategori/etiket
  // en az 1 "published" yazı kazandığı anda otomatik olarak sitemap'e döner.
  // (Hiçbir slug/isim hard-code edilmez.)
  const dbCategories = blogEnabled
    ? await db
        .selectDistinct({ id: blogCategories.id, slug: blogCategories.slug })
        .from(blogCategories)
        .innerJoin(blogPosts, eq(blogPosts.categoryId, blogCategories.id))
        .where(eq(blogPosts.status, "published"))
    : [];

  const dbTags = blogEnabled
    ? await db
        .selectDistinct({ id: blogTags.id, slug: blogTags.slug })
        .from(blogTags)
        .innerJoin(blogPostTags, eq(blogPostTags.tagId, blogTags.id))
        .innerJoin(
          blogPosts,
          and(eq(blogPosts.id, blogPostTags.postId), eq(blogPosts.status, "published")),
        )
    : [];

  // Category translations for locale-specific slugs (graceful fallback if migration not yet applied)
  const catTranslations = blogEnabled
    ? await db
        .select({
          categoryId: blogCategoryTranslations.categoryId,
          locale:     blogCategoryTranslations.locale,
          slug:       blogCategoryTranslations.slug,
        })
        .from(blogCategoryTranslations)
        .catch(() => [] as { categoryId: string; locale: string; slug: string }[])
    : [];

  // Tag translations
  const tagTranslations = blogEnabled
    ? await db
        .select({
          tagId:  blogTagTranslations.tagId,
          locale: blogTagTranslations.locale,
          slug:   blogTagTranslations.slug,
        })
        .from(blogTagTranslations)
        .catch(() => [] as { tagId: string; locale: string; slug: string }[])
    : [];

  // ── Ürün görselleri ────────────────────────────────────────────────────────
  // Cloudinary'ye doğrudan yüklenmiş kaynak URL'ler; Google bunları crawl
  // edebilir. next/image (/_next/image?url=…) dönüşüm uçları KULLANILMAZ.
  // Logo, ikon ve dekoratif arka planlar bilinçli olarak dahil edilmez.
  const productImageRows = katalogEnabled && dbProducts.length > 0
    ? await db
        .select({
          productId: productImages.productId,
          url:       productImages.cloudinaryUrl,
          isPrimary: productImages.isPrimary,
          sortOrder: productImages.sortOrder,
        })
        .from(productImages)
        .innerJoin(products, eq(productImages.productId, products.id))
        .where(eq(products.isActive, true))
        .catch(() => [] as { productId: string; url: string; isPrimary: boolean; sortOrder: number }[])
    : [];

  // Ürün başına en fazla 5 görsel — birincil önce, sonra sıra numarasına göre.
  const MAX_IMAGES_PER_URL = 5;
  const imagesByProduct = new Map<string, string[]>();
  for (const row of [...productImageRows].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
  )) {
    if (!row.url) continue;
    const list = imagesByProduct.get(row.productId) ?? [];
    if (list.length < MAX_IMAGES_PER_URL) {
      list.push(row.url);
      imagesByProduct.set(row.productId, list);
    }
  }

  const trBlogUrls: MetadataRoute.Sitemap = trPosts
    .filter(p => isUsableSlug(p.slug))
    .map(p => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(isUsableSlug(p.coverImageUrl) ? { images: [p.coverImageUrl] } : {}),
    }));

  const translatedUrls: MetadataRoute.Sitemap = translatedPosts
    .filter(t => isUsableSlug(t.slug))
    .map(t => ({
      url: `${BASE_URL}/blog/${t.locale}/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const productUrls: MetadataRoute.Sitemap = dbProducts
    .filter(p => isUsableSlug(p.partNumber))
    .map(p => {
      const imgs = imagesByProduct.get(p.id) ?? [];
      return {
        url: `${BASE_URL}/parca-katalog/${encodeURIComponent(p.partNumber)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(imgs.length > 0 ? { images: imgs } : {}),
      };
    });

  const categoryUrls: MetadataRoute.Sitemap = dbCategories
    .filter(c => isUsableSlug(c.slug))
    .map(c => ({
      url: `${BASE_URL}/blog/kategori/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const tagUrls: MetadataRoute.Sitemap = dbTags
    .filter(t => isUsableSlug(t.slug))
    .map(t => ({
      url: `${BASE_URL}/blog/etiket/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  // ── Locale kategori/etiket hub'ları ────────────────────────────────────────
  // Çeviri slug'ı kullanılamaz durumdaysa (Kiril/Arapça adlardan üretilen boş
  // string) TR slug'ına düşeriz — TR slug da geçersizse URL hiç üretilmez.
  const localeHubUrls: MetadataRoute.Sitemap = [];
  for (const locale of ["en", "ru", "ar"] as const) {
    for (const cat of dbCategories) {
      const trans = catTranslations.find(t => t.categoryId === cat.id && t.locale === locale);
      const slug = isUsableSlug(trans?.slug) ? trans.slug : cat.slug;
      if (!isUsableSlug(slug)) continue;
      localeHubUrls.push({
        url: `${BASE_URL}/blog/${locale}/category/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      });
    }
    for (const tag of dbTags) {
      const trans = tagTranslations.find(t => t.tagId === tag.id && t.locale === locale);
      const slug = isUsableSlug(trans?.slug) ? trans.slug : tag.slug;
      if (!isUsableSlug(slug)) continue;
      localeHubUrls.push({
        url: `${BASE_URL}/blog/${locale}/tag/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.4,
      });
    }
  }

  const all = [...staticUrls, ...trBlogUrls, ...translatedUrls, ...productUrls, ...categoryUrls, ...tagUrls, ...localeHubUrls];

  // Son savunma: aynı URL iki kez girmesin (kanonik sinyali zayıflatır).
  const seen = new Set<string>();
  return all.filter(entry => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
