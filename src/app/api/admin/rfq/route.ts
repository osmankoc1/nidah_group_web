import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { eq, desc, ilike, or, and, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    // Pagination
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search")?.trim();

    const conditions = [];

    if (status && ["pending", "contacted", "quoted", "closed"].includes(status)) {
      conditions.push(eq(rfqSubmissions.status, status as "pending" | "contacted" | "quoted" | "closed"));
    }

    if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
      conditions.push(eq(rfqSubmissions.priority, priority as "low" | "normal" | "high" | "urgent"));
    }

    if (brand) {
      conditions.push(eq(rfqSubmissions.brand, brand));
    }

    if (search) {
      conditions.push(
        or(
          ilike(rfqSubmissions.fullName, `%${search}%`),
          ilike(rfqSubmissions.email, `%${search}%`),
          ilike(rfqSubmissions.partNumber, `%${search}%`),
          ilike(rfqSubmissions.company, `%${search}%`),
          ilike(rfqSubmissions.phone, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [submissions, [totalResult]] = await Promise.all([
      db
        .select()
        .from(rfqSubmissions)
        .where(where)
        .orderBy(desc(rfqSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(rfqSubmissions)
        .where(where),
    ]);

    const total = totalResult.total;

    return NextResponse.json({
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin RFQ list error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
