import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { desc, and, gte, lte } from "drizzle-orm";

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [];

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(rfqSubmissions.createdAt, fromDate));
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(rfqSubmissions.createdAt, toDate));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const submissions = await db
      .select()
      .from(rfqSubmissions)
      .where(where)
      .orderBy(desc(rfqSubmissions.createdAt));

    const headers = [
      "ID",
      "Ad Soyad",
      "Firma",
      "Telefon",
      "E-posta",
      "Marka",
      "Makine Modeli",
      "Parça No",
      "Adet",
      "Ülke",
      "Mesaj",
      "Durum",
      "Öncelik",
      "Admin Notu",
      "Oluşturulma",
      "Güncellenme",
    ];

    const rows = submissions.map((s) =>
      [
        s.id,
        s.fullName,
        s.company,
        s.phone,
        s.email,
        s.brand,
        s.machineModel,
        s.partNumber,
        s.quantity,
        s.country,
        s.message,
        s.status,
        s.priority,
        s.adminNote,
        s.createdAt.toISOString(),
        s.updatedAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    );

    // BOM for proper Turkish character display in Excel
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows].join("\r\n");

    const filename = `teklif-talepleri-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("RFQ export error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
