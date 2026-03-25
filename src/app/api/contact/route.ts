import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rate-limit";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = "NİDAH GROUP <bilgi@nidahgroup.com.tr>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bilgi@nidahgroup.com.tr";

const contactSchema = z.object({
  name:    z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır.").max(255),
  email:   z.string().email("Geçerli bir e-posta adresi giriniz.").max(255),
  phone:   z.string().max(50).optional().default(""),
  subject: z.string().min(2, "Konu alanı boş bırakılamaz.").max(255),
  message: z.string().min(10, "Mesajınız en az 10 karakter olmalıdır.").max(5000),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const { success: withinLimit } = await rateLimit(`contact:${ip}`, 5, 15 * 60 * 1000, "15 m");
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ success: false, error: firstError.message }, { status: 400 });
    }

    const data = parsed.data;

    // Honeypot
    if (data.website) {
      return NextResponse.json({ success: true, message: "Mesajınız alındı." });
    }

    if (!resend) {
      console.log("[Contact] Resend not configured — skipping email send");
      return NextResponse.json({ success: true, message: "Mesajınız alındı." });
    }

    await resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      replyTo: data.email,
      subject: `📩 İletişim: ${data.name} — ${data.subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1A1A2E;border-bottom:2px solid #F59E0B;padding-bottom:10px;">
            Yeni İletişim Formu Mesajı
          </h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:7px 0;font-weight:bold;width:120px;color:#374151;">Ad Soyad:</td><td>${data.name}</td></tr>
            <tr><td style="padding:7px 0;font-weight:bold;color:#374151;">E-posta:</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>
            ${data.phone ? `<tr><td style="padding:7px 0;font-weight:bold;color:#374151;">Telefon:</td><td>${data.phone}</td></tr>` : ""}
            <tr><td style="padding:7px 0;font-weight:bold;color:#374151;">Konu:</td><td>${data.subject}</td></tr>
            <tr><td style="padding:7px 0;font-weight:bold;color:#374151;vertical-align:top;">Mesaj:</td><td style="white-space:pre-wrap;">${data.message}</td></tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#9CA3AF;">
            www.nidahgroup.com.tr üzerinden gönderildi.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Mesajınız alındı." });
  } catch (error) {
    console.error("[Contact] submission error:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
