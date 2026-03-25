import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers, machineVariants, oemNumbers,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

type Params = { params: Promise<{ partNumber: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { partNumber } = await params;
  const pn = decodeURIComponent(partNumber).toUpperCase();

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
        notes:        products.notes,
        categoryName: categories.name,
        createdAt:    products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.partNumber, pn), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch related data in parallel
    const [images, fitmentsRows, oems] = await Promise.all([
      db
        .select({
          id:           productImages.id,
          cloudinaryUrl: productImages.cloudinaryUrl,
          isPrimary:    productImages.isPrimary,
          sortOrder:    productImages.sortOrder,
        })
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
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
        .select({ oemNumber: oemNumbers.oemNumber, manufacturer: oemNumbers.manufacturer })
        .from(oemNumbers)
        .where(eq(oemNumbers.productId, product.id)),
    ]);

    return NextResponse.json(
      { data: { ...product, images, fitments: fitmentsRows, oemNumbers: oems } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (err) {
    console.error("[GET /api/products/[partNumber]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
