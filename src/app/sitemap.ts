/**
 * Sitemap index + chunked sitemaps.
 *
 * Next.js App Router generateSitemaps() produces:
 *   /sitemap.xml         → index pointing to /sitemap/0, /sitemap/1, …
 *   /sitemap/0           → static pages
 *   /sitemap/1           → /parca-katalog product pages (chunk 0)
 *   /sitemap/N           → future chunks
 */

import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://www.nidahgroup.com.tr";
const CHUNK_SIZE = 200;

// ── URL lists ─────────────────────────────────────────────────────────────────

const STATIC_URLS: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
  { url: `${BASE_URL}/hizmetler`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/parca-katalog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/catalog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE_URL}/hakkimizda`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/iletisim`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/sss`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/teklif-al`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  // Service sub-pages
  { url: `${BASE_URL}/hizmetler/hidrolik-pompa-revizyonu`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/sanziman-revizyonu`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/diferansiyel-revizyonu`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/ecu-elektronik-tamir`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/hizmetler/periyodik-bakim-ariza-tespit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  // Brand catalog pages
  { url: `${BASE_URL}/parca-katalog/volvo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/komatsu`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/cat`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/hidromek`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/hamm`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/bomag`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/ammann`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
  { url: `${BASE_URL}/parca-katalog/champion`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
];

// ── Sitemap generation ────────────────────────────────────────────────────────

/**
 * Returns chunk descriptors.
 * Chunk 0 is always the static pages.
 * Chunks 1..N are CHUNK_SIZE slices of DB products.
 */
export async function generateSitemaps() {
  const dbProducts = await db?.select({ partNumber: products.partNumber })
    .from(products)
    .where(eq(products.isActive, true)) ?? [];

  const dynamicChunks = Math.max(1, Math.ceil(dbProducts.length / CHUNK_SIZE));
  const ids = [0, ...Array.from({ length: dynamicChunks }, (_, i) => i + 1)];
  return ids.map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  if (id === 0) {
    return STATIC_URLS;
  }

  // Dynamic chunks: id 1 → slice [0..CHUNK_SIZE-1], id 2 → slice [CHUNK_SIZE..], …
  const dbProducts = await db?.select({ partNumber: products.partNumber })
    .from(products)
    .where(eq(products.isActive, true)) ?? [];

  const chunkIndex = id - 1;
  const start = chunkIndex * CHUNK_SIZE;
  const end = start + CHUNK_SIZE;
  const chunk = dbProducts.slice(start, end);

  return chunk.map((p) => ({
    url: `${BASE_URL}/parca-katalog/${p.partNumber}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}
