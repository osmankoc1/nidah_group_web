import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fitments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string; fitmentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, fitmentId } = await params;

  const [deleted] = await db
    .delete(fitments)
    .where(and(eq(fitments.id, fitmentId), eq(fitments.productId, id)))
    .returning({ id: fitments.id });

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
