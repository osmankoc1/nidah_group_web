import { Resend } from "resend";

/**
 * Teklif talebi e-postaları.
 *
 * ── 2026-11-24, bulgu B2 — NE DEĞİŞTİ ───────────────────────────────────────
 * 1. Fonksiyonlar artık DB satırı (`RfqSubmission`) değil, düz bir
 *    `RfqEmailPayload` alır. Böylece **veritabanı erişilemez olsa bile**
 *    talep e-posta ile iletilebilir: e-posta kanalı DB'ye bağımlı değildir.
 * 2. Dönüş tipi `void` değil `EmailResult`: çağıran, talebin gerçekten
 *    iletildiğini bilmeden müşteriye "alındı" DEMEMELİDİR.
 * 3. Geçici hatalarda sınırlı yeniden deneme (`sendWithRetry`).
 * 4. `recordFailed` bayrağı: kayıt düşmediyse yönetici e-postası bunu
 *    konu satırında ve gövdede AÇIKÇA söyler — talep yalnızca o e-postada
 *    durduğu için elle işlenmesi gerekir.
 * 5. Kullanıcı girdisi HTML'e artık KAÇIŞLI gömülür (`escapeHtml`). Önceden
 *    ham gömülüyordu; bir form alanına HTML/bağlantı yazarak yönetici ve
 *    müşteri e-postasının içeriği manipüle edilebiliyordu.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = "NİDAH GROUP <bilgi@nidahgroup.com.tr>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bilgi@nidahgroup.com.tr";

/** E-posta gövdesi için gereken alanlar — DB satırı da bu şekle uyar. */
export type RfqEmailPayload = {
  fullName: string;
  company: string | null;
  phone: string;
  email: string;
  brand: string | null;
  machineModel: string | null;
  partNumber: string | null;
  quantity: number | null;
  country: string | null;
  message: string | null;
  createdAt: Date;
};

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: "unconfigured" | "error"; errorName?: string };

/**
 * Resend yanıtı — SDK API hatalarını FIRLATMAZ, `{ data, error }` döndürür.
 * Bu tip, `sendWithRetry`'nin hatayı görebilmesi için gereklidir.
 */
type ResendYanit = {
  data: { id: string } | null;
  error: { message: string; statusCode: number | null; name: string } | null;
};

/**
 * Kalıcı (yeniden denemenin düzeltmeyeceği) hata mı?
 * 4xx doğrulama/yetki hatalarında 3 kez denemek yalnızca gecikme ekler;
 * 429 ve 5xx geçicidir, denenir.
 */
function kaliciHata(statusCode: number | null): boolean {
  if (statusCode === null) return false; // ağ hatası → geçici sayılır
  if (statusCode === 429) return false;
  return statusCode >= 400 && statusCode < 500;
}

/** HTML bağlamına gömülen her kullanıcı değeri bundan geçer. */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sınırlı yeniden deneme. Resend'in geçici 429/5xx yanıtları ve ağ hataları
 * tek denemede kaybedilmemeli; ama form gönderimi de dakikalarca beklememeli.
 * Toplam en kötü durum: ~2 saniye.
 */
async function sendWithRetry(
  label: string,
  gonder: () => Promise<ResendYanit>,
  denemeler = 3
): Promise<EmailResult> {
  let sonHataAdi = "UnknownError";

  for (let i = 1; i <= denemeler; i++) {
    try {
      const yanit = await gonder();

      // ── KRİTİK: Resend API hatasını FIRLATMAZ, döndürür. ──────────────────
      // `await`in geçmesi e-postanın gittiği anlamına GELMEZ; `error` alanı
      // kontrol edilmezse geçersiz alan adı / bitmiş kota / 429 durumunda
      // müşteriye yanlışlıkla "alındı" denir.
      if (yanit?.error) {
        sonHataAdi = yanit.error.name || "ResendError";
        const kod = yanit.error.statusCode;
        console.error(
          `[Email] ${label}: ${i}/${denemeler} Resend reddetti (${sonHataAdi}, http=${kod ?? "yok"})`
        );
        if (kaliciHata(kod)) {
          console.error(`[Email] ${label}: kalıcı hata — yeniden denenmeyecek`);
          return { sent: false, reason: "error", errorName: sonHataAdi };
        }
      } else if (yanit?.data?.id) {
        if (i > 1) console.warn(`[Email] ${label}: ${i}. denemede gönderildi`);
        return { sent: true };
      } else {
        // Ne `data.id` ne `error`: beklenmeyen şekil. Gönderildiğini
        // VARSAYMAYIZ.
        sonHataAdi = "ResendBeklenmeyenYanit";
        console.error(`[Email] ${label}: ${i}/${denemeler} beklenmeyen yanıt şekli`);
      }
    } catch (err) {
      // Ağ/DNS hataları gerçekten fırlatır. Hata ADI loglanır; gövde
      // müşteri verisi taşıyabilir.
      sonHataAdi = err instanceof Error ? err.name : "UnknownError";
      console.error(
        `[Email] ${label}: ${i}/${denemeler} deneme başarısız (${sonHataAdi})`
      );
    }

    if (i < denemeler) await new Promise((r) => setTimeout(r, i * 400));
  }

  return { sent: false, reason: "error", errorName: sonHataAdi };
}

export async function sendAdminNotification(
  submission: RfqEmailPayload,
  opts: { recordFailed?: boolean; idempotencyKey?: string } = {}
): Promise<EmailResult> {
  if (!resend) {
    console.error(
      "[Email] RESEND_API_KEY tanımlı değil — yönetici bildirimi GÖNDERİLEMEDİ"
    );
    return { sent: false, reason: "unconfigured" };
  }

  const kayitDustu = opts.recordFailed === true;

  const uyariKutusu = kayitDustu
    ? `<div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
         <p style="margin:0 0 6px;font-weight:700;color:#991B1B;font-size:15px;">
           ⚠️ BU TALEP VERİTABANINA KAYDEDİLEMEDİ
         </p>
         <p style="margin:0;color:#7F1D1D;font-size:13px;line-height:1.5;">
           Talep yönetim panelinde GÖRÜNMEYECEK. Kayıt yalnızca bu e-postadadır:
           lütfen elle işleyin ve müşteriye dönüş yapın.
         </p>
       </div>`
    : "";

  const konu = kayitDustu
    ? `⚠️ KAYITSIZ TEKLİF: ${submission.fullName} — ${submission.partNumber || "Genel Talep"}`
    : `🔔 Yeni Teklif: ${submission.fullName} — ${submission.partNumber || "Genel Talep"}`;

  // Mükerrer koruması — ÖRNEKLER ARASI. `Idempotency-Key` başlığı Resend
  // tarafında saklanır: aynı anahtarla gelen ikinci istek YENİ E-POSTA
  // GÖNDERMEZ, ilk gönderimin sonucunu döndürür. Bellek penceresi yalnızca
  // tek örnekte çalıştığı ve veritabanı penceresi DB erişilemezken hiç
  // çalışmadığı için bu katman kritiktir (bulgu B2, 2026-11-25).
  const istekSecenekleri = opts.idempotencyKey
    ? { idempotencyKey: `rfq-yonetici-${opts.idempotencyKey}` }
    : undefined;

  return sendWithRetry("yönetici bildirimi", () =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      replyTo: submission.email,
      subject: konu,
      html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${uyariKutusu}
        <h2 style="color: #1A1A2E; border-bottom: 2px solid #F59E0B; padding-bottom: 10px;">
          Yeni Teklif Talebi
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Ad Soyad:</td><td>${escapeHtml(submission.fullName)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">E-posta:</td><td>${escapeHtml(submission.email)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Telefon:</td><td>${escapeHtml(submission.phone)}</td></tr>
          ${submission.company ? `<tr><td style="padding: 8px 0; font-weight: bold;">Firma:</td><td>${escapeHtml(submission.company)}</td></tr>` : ""}
          ${submission.brand ? `<tr><td style="padding: 8px 0; font-weight: bold;">Marka:</td><td>${escapeHtml(submission.brand)}</td></tr>` : ""}
          ${submission.partNumber ? `<tr><td style="padding: 8px 0; font-weight: bold;">Parça No:</td><td>${escapeHtml(submission.partNumber)}</td></tr>` : ""}
          ${submission.machineModel ? `<tr><td style="padding: 8px 0; font-weight: bold;">Model:</td><td>${escapeHtml(submission.machineModel)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; font-weight: bold;">Adet:</td><td>${escapeHtml(submission.quantity ?? 1)}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Ülke:</td><td>${escapeHtml(submission.country)}</td></tr>
          ${submission.message ? `<tr><td style="padding: 8px 0; font-weight: bold;">Mesaj:</td><td>${escapeHtml(submission.message)}</td></tr>` : ""}
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #6B7280;">
          ${escapeHtml(submission.createdAt.toISOString())} tarihinde web sitesinden gönderildi.
          ${opts.idempotencyKey ? `<br>Talep kimliği: <code>${escapeHtml(opts.idempotencyKey)}</code> — aynı kimlikli iki e-posta aynı taleptir.` : ""}
        </p>
      </div>
    `,
    },
    istekSecenekleri)
  );
}

export async function sendCustomerReceipt(
  submission: RfqEmailPayload,
  opts: { idempotencyKey?: string } = {}
): Promise<EmailResult> {
  if (!resend) {
    console.error(
      "[Email] RESEND_API_KEY tanımlı değil — müşteri makbuzu gönderilemedi"
    );
    return { sent: false, reason: "unconfigured" };
  }

  if (!submission.email) {
    console.log("[Email] No customer email — skipping customer receipt");
    return { sent: false, reason: "unconfigured" };
  }

  const partInfo = submission.partNumber
    ? `<tr>
         <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #374151;">Parça No:</td>
         <td style="padding: 6px 0; font-family: monospace; color: #1A1A2E;">${escapeHtml(submission.partNumber)}</td>
       </tr>`
    : "";

  const brandInfo = submission.brand
    ? `<tr>
         <td style="padding: 6px 0; font-weight: 600; color: #374151;">Marka:</td>
         <td style="padding: 6px 0; color: #1A1A2E;">${escapeHtml(submission.brand)}</td>
       </tr>`
    : "";

  // Aynı mükerrer koruması müşteri makbuzu için de geçerli: müşteri iki
  // "talebiniz alındı" e-postası almamalı.
  const istekSecenekleri = opts.idempotencyKey
    ? { idempotencyKey: `rfq-musteri-${opts.idempotencyKey}` }
    : undefined;

  return sendWithRetry("müşteri makbuzu", () =>
    resend.emails.send({
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

          <p style="color: #374151; margin: 0 0 16px;">Sayın <strong>${escapeHtml(submission.fullName)}</strong>,</p>
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
                      <td style="padding: 6px 0; color: #1A1A2E;">${escapeHtml(submission.quantity ?? 1)}</td>
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
    },
    istekSecenekleri)
  );
}
