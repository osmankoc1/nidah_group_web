import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { eq, desc, ilike, or, and, inArray, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page   = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(products.partNumber, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )
      );
    }
    if (active === "true")  conditions.push(eq(products.isActive, true));
    if (active === "false") conditions.push(eq(products.isActive, false));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:         products.id,
          partNumber: products.partNumber,
          name:       products.name,
          condition:  products.condition,
          isActive:   products.isActive,
          inStock:    products.inStock,
          categoryId: products.categoryId,
          createdAt:  products.createdAt,
        })
        .from(products)
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    // Batch-fetch primary images for this page — single query, no N+1
    const ids = rows.map((r) => r.id);
    const imageMap: Record<string, string> = {};
    if (ids.length > 0) {
      const imgs = await db
        .select({ productId: productImages.productId, url: productImages.cloudinaryUrl })
        .from(productImages)
        .where(and(eq(productImages.isPrimary, true), inArray(productImages.productId, ids)));
      for (const img of imgs) imageMap[img.productId] = img.url;
    }

    const data = rows.map((r) => ({ ...r, primaryImageUrl: imageMap[r.id] ?? null }));

    return NextResponse.json({
      data,
      meta: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { partNumber, name, description, condition, categoryId, weight, notes } = body;

    if (!partNumber?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "partNumber and name are required" }, { status: 400 });
    }

    const [product] = await db
      .insert(products)
      .values({
        partNumber: partNumber.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        condition: condition ?? "new",
        categoryId: categoryId || null,
        weight: weight ? Number(weight) : null,
        notes: notes?.trim() || null,
      })
      .returning();

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("uq_products_part_number")) {
      return NextResponse.json({ error: "Part number already exists" }, { status: 409 });
    }
    console.error("[POST /api/admin/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
