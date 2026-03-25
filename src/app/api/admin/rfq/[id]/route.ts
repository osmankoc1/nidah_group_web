import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateSchema = z.object({
  status: z.enum(["pending", "contacted", "quoted", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  adminNote: z.string().max(5000).optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Geçersiz ID." }, { status: 400 });
    }

    const [submission] = await db
      .select()
      .from(rfqSubmissions)
      .where(eq(rfqSubmissions.id, id))
      .limit(1);

    if (!submission) {
      return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ data: submission });
  } catch (error) {
    console.error("Admin RFQ get error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Geçersiz ID." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.adminNote !== undefined) updates.adminNote = parsed.data.adminNote;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan belirtilmedi." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(rfqSubmissions)
      .set({
        ...updates,
        updatedAt: sql`now()`,
      })
      .where(eq(rfqSubmissions.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Admin RFQ update error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Geçersiz ID." }, { status: 400 });
    }

    const [deleted] = await db
      .delete(rfqSubmissions)
      .where(eq(rfqSubmissions.id, id))
      .returning({ id: rfqSubmissions.id });

    if (!deleted) {
      return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin RFQ delete error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
