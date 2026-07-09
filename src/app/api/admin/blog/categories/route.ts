import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogCategories, blogCategoryTranslations, blogPosts } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { slugifyTaxonomy } from "@/lib/blog-taxonomy";

export async function GET() {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const rows = await db
    .select({
      id:          blogCategories.id,
      name:        blogCategories.name,
      slug:        blogCategories.slug,
      description: blogCategories.description,
      createdAt:   blogCategories.createdAt,
      postCount:   sql<number>`count(${blogPosts.id})`.mapWith(Number),
    })
    .from(blogCategories)
    .leftJoin(blogPosts, eq(blogPosts.categoryId, blogCategories.id))
    .groupBy(
      blogCategories.id,
      blogCategories.name,
      blogCategories.slug,
      blogCategories.description,
      blogCategories.createdAt,
    )
    .orderBy(asc(blogCategories.name));

  const allTrans = await db
    .select({
      categoryId:  blogCategoryTranslations.categoryId,
      locale:      blogCategoryTranslations.locale,
      name:        blogCategoryTranslations.name,
      slug:        blogCategoryTranslations.slug,
      description: blogCategoryTranslations.description,
    })
    .from(blogCategoryTranslations);

  const data = rows.map(cat => ({
    ...cat,
    translations: allTrans
      .filter(t => t.categoryId === cat.id)
      .map(({ categoryId: _, ...rest }) => rest),
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name zorunlu" }, { status: 400 });
  }

  const name = body.name.trim();
  const slug = body.slug?.trim() || slugifyTaxonomy(name);

  const [existing] = await db
    .select()
    .from(blogCategories)
    .where(eq(blogCategories.slug, slug))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Bu isimde bir kategori zaten mevcut", existing },
      { status: 409 },
    );
  }

  const [cat] = await db
    .insert(blogCategories)
    .values({ name, slug, description: body.description ?? null })
    .returning();

  if (!cat) return NextResponse.json({ error: "Kategori oluşturulamadı" }, { status: 500 });

  return NextResponse.json({ data: { ...cat, translations: [] } }, { status: 201 });
}
