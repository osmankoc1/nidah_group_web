import { cache } from "react";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers, machineVariants, oemNumbers,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  cloudinaryUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface FitmentRow {
  id: string;
  manufacturerName: string;
  machineModel: string;
  machineType: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  variantName: string | null;
  notes: string | null;
}

export interface OemRow {
  oemNumber: string;
  manufacturer: string | null;
}

export interface ProductDetail {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  condition: "new" | "used" | "remanufactured";
  inStock: boolean;
  weight: number | null;
  categoryName: string | null;
  images: ProductImage[];
  fitments: FitmentRow[];
  oemNumbers: OemRow[];
}

// ── Cached query ──────────────────────────────────────────────────────────────

export const getProductByPartNumber = cache(
  async (rawPartNumber: string): Promise<ProductDetail | null> => {
    if (!db) return null;
    const pn = rawPartNumber.toUpperCase();
    try {
      const [product] = await db
        .select({
          id:           products.id,
          partNumber:   products.partNumber,
          name:         products.name,
          description:  products.description,
          condition:    products.condition,
          inStock:      products.inStock,
          weight:       products.weight,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.partNumber, pn), eq(products.isActive, true)))
        .limit(1);

      if (!product) return null;

      const [imageRows, fitmentsRows, oems] = await Promise.all([
        db
          .select({
            id:            productImages.id,
            cloudinaryUrl: productImages.cloudinaryUrl,
            isPrimary:     productImages.isPrimary,
            sortOrder:     productImages.sortOrder,
          })
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .orderBy(asc(productImages.sortOrder)),
        db
          .select({
            id:              fitments.id,
            manufacturerName: manufacturers.name,
            machineModel:    machines.model,
            machineType:     machines.type,
            yearFrom:        machines.yearFrom,
            yearTo:          machines.yearTo,
            variantName:     machineVariants.variantName,
            notes:           fitments.notes,
          })
          .from(fitments)
          .innerJoin(machines,       eq(fitments.machineId,        machines.id))
          .innerJoin(manufacturers,  eq(machines.manufacturerId,   manufacturers.id))
          .leftJoin(machineVariants, eq(fitments.machineVariantId, machineVariants.id))
          .where(eq(fitments.productId, product.id))
          .orderBy(asc(manufacturers.name), asc(machines.model)),
        db
          .select({
            oemNumber:    oemNumbers.oemNumber,
            manufacturer: oemNumbers.manufacturer,
          })
          .from(oemNumbers)
          .where(eq(oemNumbers.productId, product.id)),
      ]);

      return {
        ...product,
        categoryName: product.categoryName ?? null,
        images:       imageRows,
        fitments:     fitmentsRows,
        oemNumbers:   oems,
      };
    } catch {
      return null;
    }
  }
);
