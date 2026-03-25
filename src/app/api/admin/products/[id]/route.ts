import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, fitments, oemNumbers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { destroyFromCloudinary } from "@/lib/cloudinary";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [images, fitmentsRows, oems] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, id)),
      db.select().from(fitments).where(eq(fitments.productId, id)),
      db.select().from(oemNumbers).where(eq(oemNumbers.productId, id)),
    ]);

    return NextResponse.json({ data: { ...product, images, fitments: fitmentsRows, oemNumbers: oems } });
  } catch (err) {
    console.error("[GET /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const body = await request.json();
    const allowedFields = ["name", "description", "condition", "categoryId", "weight", "notes", "isActive", "inStock", "partNumber"];
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "partNumber") {
          updates.partNumber = String(body[field]).trim().toUpperCase();
        } else {
          updates[field] = body[field];
        }
      }
    }

    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("uq_products_part_number")) {
      return NextResponse.json({ error: "Part number already exists" }, { status: 409 });
    }
    console.error("[PATCH /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    // 1. Verify product exists
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2. Fetch cloudinaryIds before cascade-delete wipes them
    const imgs = await db
      .select({ cloudinaryId: productImages.cloudinaryId })
      .from(productImages)
      .where(eq(productImages.productId, id));

    // 3. Hard delete — DB cascades to product_images, fitments, oem_numbers automatically
    await db.delete(products).where(eq(products.id, id));

    // 4. Delete Cloudinary assets (best-effort — don't fail the response if this errors)
    if (imgs.length > 0) {
      Promise.allSettled(imgs.map((img) => destroyFromCloudinary(img.cloudinaryId))).catch(
        (err) => console.warn("[DELETE products] Cloudinary cleanup partial failure", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
