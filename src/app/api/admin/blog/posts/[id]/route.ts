import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogPostTags, blogCategories, blogTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/blog/posts/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id));

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tags = await db
    .select({ id: blogTags.id, name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, id));

  return NextResponse.json({ data: { ...post, tags } });
}

// PUT /api/admin/blog/posts/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const now = new Date();
  const publishedAt = body.status === "published"
    ? (body.publishedAt ? new Date(body.publishedAt) : now)
    : body.status === "draft" ? null : undefined;

  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };
  if (body.title           !== undefined) updateData.title             = body.title;
  if (body.slug            !== undefined) updateData.slug              = body.slug;
  if (body.content         !== undefined) updateData.content           = body.content;
  if (body.excerpt         !== undefined) updateData.excerpt           = body.excerpt;
  if (body.coverImageUrl   !== undefined) updateData.coverImageUrl     = body.coverImageUrl;
  if (body.metaTitle       !== undefined) updateData.metaTitle         = body.metaTitle;
  if (body.metaDescription !== undefined) updateData.metaDescription   = body.metaDescription;
  if (body.status          !== undefined) updateData.status            = body.status;
  if (publishedAt          !== undefined) updateData.publishedAt       = publishedAt;
  if (body.authorName      !== undefined) updateData.authorName        = body.authorName;
  if (body.categoryId      !== undefined) updateData.categoryId        = body.categoryId || null;
  if (body.readingTimeMinutes !== undefined) updateData.readingTimeMinutes = body.readingTimeMinutes;

  const [updated] = await db
    .update(blogPosts)
    .set(updateData)
    .where(eq(blogPosts.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync tags
  if (Array.isArray(body.tagIds)) {
    await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
    if (body.tagIds.length > 0) {
      await db.insert(blogPostTags).values(
        body.tagIds.map((tagId: string) => ({ postId: id, tagId }))
      );
    }
  }

  return NextResponse.json({ data: updated });
}

// DELETE /api/admin/blog/posts/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { id } = await params;

  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return NextResponse.json({ ok: true });
}
