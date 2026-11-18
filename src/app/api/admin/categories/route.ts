import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { asc, count, eq } from "drizzle-orm";
import {
  parseCategoryName,
  parseCategoryParentId,
  parseCategorySlug,
  parseCategorySortOrder,
} from "@/lib/category-tree";
import { isUniqueViolation } from "@/lib/db/errors";

/**
 * Kategori yönetimi — bulgu P6.
 *
 * Panelde kategori ekranı ve ürün düzenleme ekranında kategori seçici YOKTU;
 * `products.category_id` yalnızca içe aktarma yoluyla yazılabiliyordu. Dev
 * veritabanında `categories` tablosu BOŞ olduğu için seçici bugün boş görünür;
 * bu bir hata değil, kategori ağacının henüz kurulmamış olmasının sonucudur
 * (kullanıcı kararı — ertelenen Y1).
 *
 * BU UÇ HİÇBİR KATEGORİ ÜRETMEZ. Varsayılan ağaç, örnek kategori veya
 * otomatik atama yapmaz.
 */

/** Ürün sayısı — "boş kategori" ile "dolu kategori" ayrımı silme kararında gerekir. */
export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const [rows, sayimlar] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          parentId: categories.parentId,
          sortOrder: categories.sortOrder,
          createdAt: categories.createdAt,
        })
        .from(categories)
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
      // TOPLU sayım — kategori başına ayrı sorgu (N+1) YOK.
      db
        .select({ categoryId: products.categoryId, adet: count() })
        .from(products)
        .groupBy(products.categoryId),
    ]);

    const sayim = new Map<string, number>();
    for (const satir of sayimlar) {
      if (satir.categoryId) sayim.set(satir.categoryId, Number(satir.adet));
    }

    return NextResponse.json({
      data: rows.map((r) => ({ ...r, productCount: sayim.get(r.id) ?? 0 })),
    });
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const body = await request.json();

    const ad = parseCategoryName(body.name);
    if (!ad.ok) return NextResponse.json({ error: ad.error }, { status: 400 });

    const slug = parseCategorySlug(body.slug, ad.value);
    if (!slug.ok) return NextResponse.json({ error: slug.error }, { status: 400 });

    const ust = parseCategoryParentId(body.parentId);
    if (!ust.ok) return NextResponse.json({ error: ust.error }, { status: 400 });

    const sira = parseCategorySortOrder(body.sortOrder);
    if (!sira.ok) return NextResponse.json({ error: sira.error }, { status: 400 });

    // `parent_id` kolonunun YABANCI ANAHTARI YOK (schema.ts) — varlık
    // kontrolü uygulama tarafında yapılmak zorunda, yoksa panel var olmayan
    // bir üst kategoriye bağlı "yetim" kayıt üretir.
    if (ust.value) {
      const [varMi] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, ust.value))
        .limit(1);
      if (!varMi) {
        return NextResponse.json({ error: "Üst kategori bulunamadı." }, { status: 400 });
      }
    }

    const [row] = await db
      .insert(categories)
      .values({
        name: ad.value,
        slug: slug.value,
        parentId: ust.value,
        sortOrder: sira.value,
      })
      .returning({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
      });

    return NextResponse.json({ data: { ...row, productCount: 0 } }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor." }, { status: 409 });
    }
    console.error("[POST /api/admin/categories]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
