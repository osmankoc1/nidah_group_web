import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, categories, fitments, machines, manufacturers } from "@/lib/db/schema";
import { eq, and, ilike, or, desc, count, inArray, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const search    = searchParams.get("search")?.trim();
  const condition = searchParams.get("condition");
  const brand     = searchParams.get("brand")?.trim().toUpperCase();
  const page      = Math.max(1, Number(searchParams.get("page"))  || 1);
  const limit     = Math.min(48, Math.max(1, Number(searchParams.get("limit")) || 24));
  const offset    = (page - 1) * limit;

  const conditions = [eq(products.isActive, true)];

  if (search) {
    conditions.push(
      or(
        ilike(products.partNumber, `%${search}%`),
        ilike(products.name, `%${search}%`)
      )!
    );
  }
  if (condition && ["new", "used", "remanufactured"].includes(condition)) {
    conditions.push(eq(products.condition, condition as "new" | "used" | "remanufactured"));
  }

  // Brand filter: products that have fitments linked to a manufacturer matching the brand name
  if (brand) {
    const brandProductIds = await db!
      .selectDistinct({ productId: fitments.productId })
      .from(fitments)
      .innerJoin(machines,      eq(fitments.machineId,      machines.id))
      .innerJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
      .where(sql`UPPER(${manufacturers.name}) = ${brand}`);
    const ids = brandProductIds.map((r) => r.productId);
    if (ids.length === 0) {
      return NextResponse.json(
        { data: [], meta: { page: 1, limit, total: 0, pages: 0 } },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
      );
    }
    conditions.push(inArray(products.id, ids));
  }

  const where = and(...conditions);

  try {
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:           products.id,
          partNumber:   products.partNumber,
          name:         products.name,
          description:  products.description,
          condition:    products.condition,
          inStock:      products.inStock,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    const ids = rows.map((r) => r.id);

    // Batch 1 — primary images
    const imageMap: Record<string, string> = {};
    // Batch 2 — unique brand names per product (via fitments → machines → manufacturers)
    const brandMap: Record<string, string[]> = {};

    if (ids.length > 0) {
      const [imgs, brandRows] = await Promise.all([
        db
          .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
          .from(productImages)
          .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, ids))),
        db
          .select({ productId: fitments.productId, brandName: manufacturers.name })
          .from(fitments)
          .innerJoin(machines,      eq(fitments.machineId,      machines.id))
          .innerJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
          .where(inArray(fitments.productId, ids)),
      ]);

      for (const img of imgs) imageMap[img.productId] = img.url;

      for (const row of brandRows) {
        if (!brandMap[row.productId]) brandMap[row.productId] = [];
        if (!brandMap[row.productId].includes(row.brandName)) {
          brandMap[row.productId].push(row.brandName);
        }
      }
    }

    const data = rows.map((r) => ({
      id:           r.id,
      partNumber:   r.partNumber,
      name:         r.name,
      description:  r.description,
      condition:    r.condition,
      inStock:      r.inStock,
      categoryName: r.categoryName ?? null,
      imageUrl:     imageMap[r.id] ?? null,
      brands:       brandMap[r.id] ?? [],
    }));

    const totalNum = Number(total);
    return NextResponse.json(
      { data, meta: { page, limit, total: totalNum, pages: Math.ceil(totalNum / limit) } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
