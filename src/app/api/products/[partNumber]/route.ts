import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers, machineVariants, oemNumbers,
} from "@/lib/db/schema";
import { eq, and, asc, isNull, or, sql } from "drizzle-orm";
import { productLookupKey } from "@/lib/product-url";
import { publicProductConditions } from "@/lib/public-visibility";
import { productCache } from "@/lib/product-cache";

type Params = { params: Promise<{ partNumber: string }> };

/**
 * CDN (`s-maxage`) 60 → 600 sn ve altına ETİKET TABANLI veri önbelleği
 * eklendi (2026-11-24, bulgu B9): CDN'de olmayan bir parça numarası sunucuya
 * gelse bile Neon'a inilmez. Admin yazma yolları `revalidateProducts()` ile
 * düşürür.
 */
const CDN_CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

const getProductDetail = productCache(
  ["public-product-detail"],
  async (normalized: string) => {
    if (!db) return null;

    const [product] = await db
      .select({
        id:           products.id,
        partNumber:   products.partNumber,
        name:         products.name,
        description:  products.description,
        condition:    products.condition,
        inStock:      products.inStock,
        weight:       products.weight,
        // `notes` BILINCLI OLARAK YOK: bu alan YONETIM NOTUDUR (admin duzenleme
        // ekraninda girilir, ornegin "Logo'da iki stok satiri ayni parcaya
        // cozuluyor" ya da "yuklu gorsel urun fotografi degil"). Public uca
        // konursa bu ic yorumlar disariya acilir. Olculdu: uygulamada bu alani
        // tuketen public bir yuzey YOK.
        categoryName: categories.name,
        createdAt:    products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          // YAYIN = aktif VE yayın onaylı (bkz. lib/public-visibility.ts).
          ...publicProductConditions(),
          or(
            eq(products.partNumberNormalized, normalized),
            // 0006 öncesinden kalan NULL normalize satırlar için geri dönüş.
            and(
              isNull(products.partNumberNormalized),
              sql`upper(regexp_replace(${products.partNumber}, '[^A-Za-z0-9]', '', 'g')) = ${normalized}`
            )
          )
        )
      )
      .limit(1);

    if (!product) return null;

    // Fetch related data in parallel
    const [images, fitmentsRows, oems] = await Promise.all([
      db
        .select({
          id:           productImages.id,
          cloudinaryUrl: productImages.cloudinaryUrl,
          isPrimary:    productImages.isPrimary,
          sortOrder:    productImages.sortOrder,
          altText:      productImages.altText,
        })
        .from(productImages)
        // YALNIZCA DOGRULANMIS GORSELLER (karar K2). Yuklenmis ama bu parcayi
        // gosterdigi teyit edilmemis bir dosya public yuzeye CIKMAZ: Google
        // merchant listing kurali "Images must represent the marked up
        // content." Dogrulanmamis fotograf yalnizca yonetim panelinde gorunur.
        .where(
          and(
            eq(productImages.productId, product.id),
            eq(productImages.verified, true)
          )
        )
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

    return {
      data: {
        ...product,
        // Tarih önbellek sınırını ISO string olarak geçer; JSON yanıtında
        // zaten ISO string görünüyordu, dolayısıyla sözleşme değişmez.
        createdAt: product.createdAt ? product.createdAt.toISOString() : null,
        images,
        fitments: fitmentsRows,
        oemNumbers: oems,
      },
    };
  }
);

export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { partNumber } = await params;
  // Kimlik araması normalize anahtar üzerinden (denetim C3): "ch-76281",
  // "CH%2076281" ve "CH 76281" aynı ürüne çözülür.
  const normalized = productLookupKey(partNumber);
  if (!normalized) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const result = await getProductDetail(normalized);
    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": CDN_CACHE } });
  } catch (err) {
    console.error("[GET /api/products/[partNumber]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
