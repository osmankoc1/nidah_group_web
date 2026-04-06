import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostTags, blogTags } from "@/lib/db/schema";
import { eq, desc, ilike, and, or } from "drizzle-orm";

// GET /api/admin/blog/posts?status=&search=&page=&pageSize=
export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status") || "";
  const search   = searchParams.get("search") || "";
  const page     = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") || "20"));

  const conditions = [];
  if (status) conditions.push(eq(blogPosts.status, status as "draft" | "published" | "archived"));
  if (search) conditions.push(or(ilike(blogPosts.title, `%${search}%`), ilike(blogPosts.slug, `%${search}%`)));

  const rows = await db
    .select({
      id:             blogPosts.id,
      title:          blogPosts.title,
      slug:           blogPosts.slug,
      status:         blogPosts.status,
      publishedAt:    blogPosts.publishedAt,
      authorName:     blogPosts.authorName,
      readingTimeMinutes: blogPosts.readingTimeMinutes,
      categoryName:   blogCategories.name,
      createdAt:      blogPosts.createdAt,
      updatedAt:      blogPosts.updatedAt,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(blogPosts.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({ data: rows, page, pageSize });
}

// POST /api/admin/blog/posts
export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.slug) {
    return NextResponse.json({ error: "title ve slug zorunlu" }, { status: 400 });
  }

  const now = new Date();
  const publishedAt = body.status === "published"
    ? (body.publishedAt ? new Date(body.publishedAt) : now)
    : null;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title:              body.title,
      slug:               body.slug,
      content:            body.content ?? "",
      excerpt:            body.excerpt ?? null,
      coverImageUrl:      body.coverImageUrl ?? null,
      metaTitle:          body.metaTitle ?? null,
      metaDescription:    body.metaDescription ?? null,
      status:             body.status ?? "draft",
      publishedAt,
      authorName:         body.authorName ?? "NİDAH GROUP",
      categoryId:         body.categoryId ?? null,
      readingTimeMinutes: body.readingTimeMinutes ?? 3,
    })
    .returning();

  // Insert tags
  if (Array.isArray(body.tagIds) && body.tagIds.length > 0) {
    await db.insert(blogPostTags).values(
      body.tagIds.map((tagId: string) => ({ postId: post.id, tagId }))
    );
  }

  return NextResponse.json({ data: post }, { status: 201 });
}
