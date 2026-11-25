import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// Body: { order: string[] }  — ordered array of imageIds
export async function POST(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();
  const order: string[] = body.order ?? [];

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "order must be a non-empty array" }, { status: 400 });
  }

  await Promise.all(
    order.map((imageId, idx) =>
      db!
        .update(productImages)
        .set({ sortOrder: idx })
        .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)))
    )
  );

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ success: true });
}
