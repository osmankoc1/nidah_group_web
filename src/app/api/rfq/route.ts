import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminNotification, sendCustomerReceipt } from "@/lib/email";

const rfqSchema = z.object({
  fullName: z
    .string()
    .min(2, "Ad Soyad en az 2 karakter olmalıdır.")
    .max(255),
  company: z.string().max(255).optional().default(""),
  phone: z.string().max(50).optional().default(""),
  email: z.string().email("Geçerli bir e-posta adresi giriniz.").max(255),
  brand: z.string().max(100).optional().default(""),
  machineModel: z.string().max(255).optional().default(""),
  partNumber: z.string().max(100).optional().default(""),
  quantity: z.coerce.number().int().min(1).default(1),
  country: z.string().max(100).default("Türkiye"),
  message: z.string().max(5000).optional().default(""),
  // Honeypot field — must be empty
  website: z.string().max(0).optional(),
});

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured. See .env.example." },
      { status: 503 }
    );
  }

  try {
    // Rate limiting by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { success: withinLimit } = await rateLimit(ip, 5, 15 * 60 * 1000, "15 m");
    if (!withinLimit) {
      return NextResponse.json(
        {
          success: false,
          error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = rfqSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Honeypot check — if filled, it's a bot. Return fake success.
    if (data.website) {
      return NextResponse.json({
        success: true,
        message: "Teklif talebiniz alındı",
      });
    }

    // Insert into database
    const [submission] = await db
      .insert(rfqSubmissions)
      .values({
        fullName: data.fullName.trim(),
        company: data.company || null,
        phone: data.phone?.trim() || "",
        email: data.email.trim().toLowerCase(),
        brand: data.brand || null,
        machineModel: data.machineModel || null,
        partNumber: data.partNumber || null,
        quantity: data.quantity,
        country: data.country,
        message: data.message || null,
      })
      .returning();

    console.log(
      `[${submission.createdAt.toISOString()}] Yeni teklif talebi: ${submission.fullName} - ${submission.partNumber || "Parça belirtilmedi"} - ${submission.email}`
    );

    // Fire-and-forget — email failure must NOT affect the 200 response
    Promise.allSettled([
      sendAdminNotification(submission),
      ...(submission.email ? [sendCustomerReceipt(submission)] : []),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[Email] job[${i}] failed:`, r.reason);
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Teklif talebiniz alındı",
    });
  } catch (error) {
    console.error("RFQ submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}
