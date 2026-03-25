import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

type Params = { params: Promise<{ id: string }> };

const MAX_IMAGES = 10;
const MAX_BYTES  = 50 * 1024 * 1024; // 50 MB — matches next.config middlewareClientMaxBodySize

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.sortOrder, productImages.createdAt);

  return NextResponse.json({ data: images });
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary yapılandırılmamış. Lütfen CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET değerlerini .env.local dosyasına ekleyin." },
      { status: 503 }
    );
  }

  const { id } = await params;

  // Verify product exists
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Count existing images
  const [{ total }] = await db.select({ total: count() }).from(productImages).where(eq(productImages.productId, id));
  if (Number(total) >= MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images per product` }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let uploadSource: Buffer | string;

  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    uploadSource = Buffer.from(bytes);
  } else {
    // JSON body with { url: "..." }
    const body = await request.json().catch(() => null);
    if (!body?.url) return NextResponse.json({ error: "Provide multipart file or JSON { url }" }, { status: 400 });
    uploadSource = body.url as string;
  }

  try {
    const uploaded = await uploadToCloudinary(uploadSource, `nidah/products/${id}`);

    const isPrimary = Number(total) === 0; // first image becomes primary
    const [image] = await db
      .insert(productImages)
      .values({
        productId:    id,
        cloudinaryId: uploaded.publicId,
        cloudinaryUrl: uploaded.secureUrl,
        sortOrder:   Number(total),
        isPrimary,
      })
      .returning();

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/images]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
