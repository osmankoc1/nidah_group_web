import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { sql, desc, count } from "drizzle-orm";

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const [
      [totalResult],
      statusBreakdown,
      priorityBreakdown,
      brandBreakdown,
      recentSubmissions,
      [last30DaysResult],
      [todayResult],
    ] = await Promise.all([
      // Total count
      db.select({ total: count() }).from(rfqSubmissions),

      // By status
      db
        .select({
          status: rfqSubmissions.status,
          count: count(),
        })
        .from(rfqSubmissions)
        .groupBy(rfqSubmissions.status),

      // By priority
      db
        .select({
          priority: rfqSubmissions.priority,
          count: count(),
        })
        .from(rfqSubmissions)
        .groupBy(rfqSubmissions.priority),

      // By brand (top 10)
      db
        .select({
          brand: rfqSubmissions.brand,
          count: count(),
        })
        .from(rfqSubmissions)
        .groupBy(rfqSubmissions.brand)
        .orderBy(desc(count()))
        .limit(10),

      // Last 5 submissions
      db
        .select({
          id: rfqSubmissions.id,
          fullName: rfqSubmissions.fullName,
          company: rfqSubmissions.company,
          partNumber: rfqSubmissions.partNumber,
          brand: rfqSubmissions.brand,
          status: rfqSubmissions.status,
          priority: rfqSubmissions.priority,
          createdAt: rfqSubmissions.createdAt,
        })
        .from(rfqSubmissions)
        .orderBy(desc(rfqSubmissions.createdAt))
        .limit(5),

      // Last 30 days count
      db
        .select({ total: count() })
        .from(rfqSubmissions)
        .where(
          sql`${rfqSubmissions.createdAt} >= now() - interval '30 days'`
        ),

      // Today count
      db
        .select({ total: count() })
        .from(rfqSubmissions)
        .where(
          sql`${rfqSubmissions.createdAt} >= current_date`
        ),
    ]);

    // Build status map with defaults
    const statusMap: Record<string, number> = {
      pending: 0,
      contacted: 0,
      quoted: 0,
      closed: 0,
    };
    for (const row of statusBreakdown) {
      statusMap[row.status] = row.count;
    }

    return NextResponse.json({
      total: totalResult.total,
      today: todayResult.total,
      last30Days: last30DaysResult.total,
      byStatus: statusMap,
      byPriority: Object.fromEntries(
        priorityBreakdown.map((r) => [r.priority, r.count])
      ),
      byBrand: brandBreakdown.map((r) => ({
        brand: r.brand || "Belirtilmemiş",
        count: r.count,
      })),
      recent: recentSubmissions,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
