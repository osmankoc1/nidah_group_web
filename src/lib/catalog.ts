import "server-only";
import { db } from "@/lib/db";
import { products, productImages, categories, fitments, machines, manufacturers, machineVariants } from "@/lib/db/schema";
import { eq, and, ilike, or, asc, desc, count } from "drizzle-orm";

export interface CatalogListItem {
  id:             string;
  partNumber:     string;
  name:           string;
  condition:      string;
  categoryId:     string | null;
  primaryImageUrl: string | null;
  createdAt:      Date;
}

export interface CatalogListResult {
  items: CatalogListItem[];
  total: number;
  page:  number;
  pages: number;
}

export interface CatalogFilters {
  search?:     string;
  categoryId?: string;
  condition?:  string;
  page?:       number;
  limit?:      number;
}

/**
 * List active products with optional filters. Used by the public catalog page.
 */
export async function listProducts(filters: CatalogFilters = {}): Promise<CatalogListResult> {
  if (!db) return { items: [], total: 0, page: 1, pages: 0 };

  const page  = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(products.isActive, true)];

  if (filters.search) {
    conditions.push(
      or(
        ilike(products.partNumber, `%${filters.search}%`),
        ilike(products.name, `%${filters.search}%`)
      )!
    );
  }
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.condition)  conditions.push(eq(products.condition, filters.condition as "new" | "used" | "remanufactured"));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:          products.id,
        partNumber:  products.partNumber,
        name:        products.name,
        condition:   products.condition,
        categoryId:  products.categoryId,
        createdAt:   products.createdAt,
      })
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(products).where(where),
  ]);

  // Fetch primary images in a second query
  const ids = rows.map((r) => r.id);
  const imageMap: Record<string, string> = {};

  if (ids.length > 0) {
    const imgs = await db
      .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
      .from(productImages)
      .where(and(eq(productImages.isPrimary, true)))
      .orderBy(asc(productImages.productId));

    for (const img of imgs) {
      if (ids.includes(img.productId)) imageMap[img.productId] = img.url;
    }
  }

  const items: CatalogListItem[] = rows.map((r) => ({
    ...r,
    primaryImageUrl: imageMap[r.id] ?? null,
  }));

  const totalNum = Number(total);
  return { items, total: totalNum, page, pages: Math.ceil(totalNum / limit) };
}

export interface CatalogDetail {
  id:          string;
  partNumber:  string;
  name:        string;
  description: string | null;
  condition:   string;
  weight:      number | null;
  categoryId:  string | null;
  images:      { id: string; url: string; isPrimary: boolean }[];
  fitments:    {
    id:              string;
    manufacturerName: string | null;
    machineModel:     string | null;
    machineType:      string | null;
    variantName:      string | null;
  }[];
}

/**
 * Get a single active product with images and fitments. Used by the public detail page.
 */
export async function getProduct(idOrPartNumber: string): Promise<CatalogDetail | null> {
  if (!db) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPartNumber);
  const where = and(
    eq(products.isActive, true),
    isUuid
      ? eq(products.id, idOrPartNumber)
      : eq(products.partNumber, idOrPartNumber.toUpperCase())
  );

  const [product] = await db.select().from(products).where(where).limit(1);
  if (!product) return null;

  const [images, fitmentsRows] = await Promise.all([
    db
      .select({ id: productImages.id, url: productImages.cloudinaryUrl, isPrimary: productImages.isPrimary })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select({
        id:              fitments.id,
        manufacturerName: manufacturers.name,
        machineModel:    machines.model,
        machineType:     machines.type,
        variantName:     machineVariants.variantName,
      })
      .from(fitments)
      .leftJoin(machines,        eq(fitments.machineId,        machines.id))
      .leftJoin(manufacturers,   eq(machines.manufacturerId,   manufacturers.id))
      .leftJoin(machineVariants, eq(fitments.machineVariantId, machineVariants.id))
      .where(eq(fitments.productId, product.id)),
  ]);

  return {
    id:          product.id,
    partNumber:  product.partNumber,
    name:        product.name,
    description: product.description,
    condition:   product.condition,
    weight:      product.weight,
    categoryId:  product.categoryId,
    images,
    fitments:    fitmentsRows,
  };
}

/**
 * List all active product IDs + partNumbers for sitemap generation.
 */
export async function listProductSlugs(): Promise<{ id: string; partNumber: string }[]> {
  if (!db) return [];
  return db
    .select({ id: products.id, partNumber: products.partNumber })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.createdAt));
}
