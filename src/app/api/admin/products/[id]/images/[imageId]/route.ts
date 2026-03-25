import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { destroyFromCloudinary } from "@/lib/cloudinary";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, imageId } = await params;

  const [image] = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await destroyFromCloudinary(image.cloudinaryId);
  } catch (err) {
    console.warn("[DELETE image] Cloudinary destroy failed:", err);
    // Continue with DB deletion regardless
  }

  await db.delete(productImages).where(eq(productImages.id, imageId));

  // If we deleted the primary image, promote the first remaining image
  if (image.isPrimary) {
    const remaining = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sortOrder, productImages.createdAt)
      .limit(1);

    if (remaining[0]) {
      await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, remaining[0].id));
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, imageId } = await params;
  const body = await request.json();

  // Set as primary: clear others first
  if (body.isPrimary === true) {
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, id));

    await db
      .update(productImages)
      .set({ isPrimary: true })
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));
  }

  return NextResponse.json({ success: true });
}
