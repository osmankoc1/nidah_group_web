import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import {
  parseCategoryName,
  parseCategoryParentId,
  parseCategorySlug,
  parseCategorySortOrder,
  wouldCreateCycle,
} from "@/lib/category-tree";
import { isUniqueViolation } from "@/lib/db/errors";

type Params = { params: Promise<{ id: string }> };

/**
 * Tek kategori — düzenleme ve silme (bulgu P6).
 *
 * İKİ KORUMA burada uygulanır, çünkü veritabanı ikisini de garanti etmez:
 *   1. DÖNGÜ: `parent_id` kolonunun yabancı anahtarı yok; bir kategori kendi
 *      alt ağacına bağlanırsa ağacı basan her kod sonsuz döngüye girer.
 *   2. VERİ KAYBI: `products.category_id` yabancı anahtarı `ON DELETE SET
 *      NULL` taşır. Yani dolu bir kategoriyi silmek, ürünlerin kategorisini
 *      SESSİZCE boşaltır. Bu yüzden dolu kategori ve alt kategorisi olan
 *      kategori silinmez; operatöre sayı gösterilir.
 */

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const body = await request.json();

    const [mevcut] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!mevcut) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};

    if ("name" in body) {
      const ad = parseCategoryName(body.name);
      if (!ad.ok) return NextResponse.json({ error: ad.error }, { status: 400 });
      updates.name = ad.value;
    }

    if ("slug" in body) {
      const slug = parseCategorySlug(
        body.slug,
        (updates.name as string | undefined) ?? mevcut.name
      );
      if (!slug.ok) return NextResponse.json({ error: slug.error }, { status: 400 });
      updates.slug = slug.value;
    }

    if ("sortOrder" in body) {
      const sira = parseCategorySortOrder(body.sortOrder);
      if (!sira.ok) return NextResponse.json({ error: sira.error }, { status: 400 });
      updates.sortOrder = sira.value;
    }

    if ("parentId" in body) {
      const ust = parseCategoryParentId(body.parentId);
      if (!ust.ok) return NextResponse.json({ error: ust.error }, { status: 400 });

      if (ust.value) {
        const tum = await db
          .select({ id: categories.id, parentId: categories.parentId })
          .from(categories);
        const parentOf = new Map(tum.map((r) => [r.id, r.parentId]));
        if (!parentOf.has(ust.value)) {
          return NextResponse.json({ error: "Üst kategori bulunamadı." }, { status: 400 });
        }
        if (wouldCreateCycle(id, ust.value, parentOf)) {
          return NextResponse.json(
            { error: "Bir kategori kendisine veya kendi alt kategorisine bağlanamaz." },
            { status: 400 }
          );
        }
      }
      updates.parentId = ust.value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
    }

    const [row] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
      });

    return NextResponse.json({ data: row });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Bu slug zaten kullanılıyor." }, { status: 409 });
    }
    console.error("[PATCH /api/admin/categories/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id } = await params;

  try {
    const [mevcut] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!mevcut) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [[urun], [alt]] = await Promise.all([
      db.select({ adet: count() }).from(products).where(eq(products.categoryId, id)),
      db.select({ adet: count() }).from(categories).where(eq(categories.parentId, id)),
    ]);

    const urunAdet = Number(urun?.adet ?? 0);
    const altAdet = Number(alt?.adet ?? 0);

    if (urunAdet > 0 || altAdet > 0) {
      return NextResponse.json(
        {
          error:
            "Bu kategori silinemez: bağlı kayıtlar var. Önce ürünleri başka " +
            "bir kategoriye taşıyın veya alt kategorileri kaldırın.",
          productCount: urunAdet,
          childCount: altAdet,
        },
        { status: 409 }
      );
    }

    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/categories/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
