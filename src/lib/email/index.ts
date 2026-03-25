import { Resend } from "resend";
import type { RfqSubmission } from "@/lib/db/schema";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = "NİDAH GROUP <bilgi@nidahgroup.com.tr>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bilgi@nidahgroup.com.tr";

export async function sendAdminNotification(
  submission: RfqSubmission
): Promise<void> {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping admin notification");
    return;
  }

  await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_EMAIL,
    replyTo: submission.email,
    subject: `🔔 Yeni Teklif: ${submission.fullName} — ${submission.partNumber || "Genel Talep"}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A1A2E; border-bottom: 2px solid #F59E0B; padding-bottom: 10px;">
          Yeni Teklif Talebi
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Ad Soyad:</td><td>${submission.fullName}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">E-posta:</td><td>${submission.email}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Telefon:</td><td>${submission.phone}</td></tr>
          ${submission.company ? `<tr><td style="padding: 8px 0; font-weight: bold;">Firma:</td><td>${submission.company}</td></tr>` : ""}
          ${submission.brand ? `<tr><td style="padding: 8px 0; font-weight: bold;">Marka:</td><td>${submission.brand}</td></tr>` : ""}
          ${submission.partNumber ? `<tr><td style="padding: 8px 0; font-weight: bold;">Parça No:</td><td>${submission.partNumber}</td></tr>` : ""}
          ${submission.machineModel ? `<tr><td style="padding: 8px 0; font-weight: bold;">Model:</td><td>${submission.machineModel}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; font-weight: bold;">Adet:</td><td>${submission.quantity}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Ülke:</td><td>${submission.country}</td></tr>
          ${submission.message ? `<tr><td style="padding: 8px 0; font-weight: bold;">Mesaj:</td><td>${submission.message}</td></tr>` : ""}
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #6B7280;">
          ${submission.createdAt.toISOString()} tarihinde web sitesinden gönderildi.
        </p>
      </div>
    `,
  });
}

export async function sendCustomerReceipt(
  submission: RfqSubmission
): Promise<void> {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping customer receipt");
    return;
  }

  if (!submission.email) {
    console.log("[Email] No customer email — skipping customer receipt");
    return;
  }

  const partInfo = submission.partNumber
    ? `<tr>
         <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #374151;">Parça No:</td>
         <td style="padding: 6px 0; font-family: monospace; color: #1A1A2E;">${submission.partNumber}</td>
       </tr>`
    : "";

  const brandInfo = submission.brand
    ? `<tr>
         <td style="padding: 6px 0; font-weight: 600; color: #374151;">Marka:</td>
         <td style="padding: 6px 0; color: #1A1A2E;">${submission.brand}</td>
       </tr>`
    : "";

  await resend.emails.send({
    from: EMAIL_FROM,
    to: submission.email,
    replyTo: ADMIN_EMAIL,
    subject: "Teklif Talebiniz Alındı — NİDAH GROUP",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #1A1A2E; padding: 32px 40px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #F59E0B; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">NİDAH GROUP</h1>
          <p style="margin: 4px 0 0; color: #9CA3AF; font-size: 13px;">İş Makinası Servisi & Yedek Parça</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 40px; background: #ffffff; border: 1px solid #E5E7EB; border-top: none;">
          <div style="display: inline-block; background: #D1FAE5; color: #065F46; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px;">
            ✓ Teklif Talebiniz Alındı
          </div>

          <p style="color: #374151; margin: 0 0 16px;">Sayın <strong>${submission.fullName}</strong>,</p>
          <p style="color: #6B7280; line-height: 1.6; margin: 0 0 24px;">
            Teklif talebiniz ekibimize iletilmiştir. En kısa sürede proforma fatura
            hazırlayarak e-posta veya WhatsApp üzerinden dönüş yapacağız.
          </p>

          ${
            submission.partNumber || submission.brand
              ? `<div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Talep Özeti</p>
                  <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                    ${partInfo}${brandInfo}
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #374151;">Adet:</td>
                      <td style="padding: 6px 0; color: #1A1A2E;">${submission.quantity ?? 1}</td>
                    </tr>
                  </table>
                 </div>`
              : ""
          }

          <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #92400E;">Acil Durumlar İçin</p>
            <a href="https://wa.me/905308845979" style="display: inline-flex; align-items: center; gap: 6px; background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              WhatsApp: +90 530 884 59 79
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 40px; background: #F9FAFB; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
            NİDAH GROUP · Ankara, Türkiye ·
            <a href="https://www.nidahgroup.com.tr" style="color: #F59E0B; text-decoration: none;">www.nidahgroup.com.tr</a>
          </p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #D1D5DB;">
            Bu e-posta www.nidahgroup.com.tr üzerinden gönderilen teklif talebinize otomatik yanıttır.
          </p>
        </div>
      </div>
    `,
  });
}
