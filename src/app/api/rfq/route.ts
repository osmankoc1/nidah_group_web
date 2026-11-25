import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rfqSubmissions } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendAdminNotification,
  sendCustomerReceipt,
  type RfqEmailPayload,
} from "@/lib/email";

/**
 * Teklif talebi alma ucu.
 *
 * ── 2026-11-24, bulgu B2 — TALEP GÜVENİLİRLİĞİ ───────────────────────────────
 * ÖNCEKİ DAVRANIŞ: DB'ye `INSERT` önce, e-posta sonra yapılıyordu ve
 * `INSERT` hata verirse `catch` 500 dönüyordu — **e-posta hiç
 * gönderilmiyordu.** Neon compute'u askıya alındığında (kota bitişi, geçici
 * arıza) müşteri "Sunucu hatası" görüyor, bize hiçbir bildirim ulaşmıyordu:
 * talep sessizce kayboluyordu.
 *
 * YENİ DAVRANIŞ — iki kanal birbirinden BAĞIMSIZ:
 *  1. Veritabanı kaydı denenir. Başarısızlık ölümcül DEĞİLDİR.
 *  2. Yönetici e-postası HER DURUMDA denenir ve **beklenir**. Kayıt
 *     düşmediyse e-posta konusu ve gövdesi bunu açıkça söyler, böylece talep
 *     elle işlenebilir.
 *  3. Müşteri makbuzu ikincildir: `after()` ile yanıttan sonra gönderilir.
 *     (Eski kod `Promise.allSettled(...)` ile fire-and-forget yapıyordu;
 *     serverless'te yanıt dönünce örnek dondurulabildiği için e-posta hiç
 *     gönderilmeyebilirdi. `after()` çalışmayı garanti eder.)
 *  4. İKİSİ DE başarısızsa müşteriye **başarı mesajı gösterilmez**; 503 ve
 *     alternatif iletişim kanalı döner.
 *
 * MÜKERRER KORUMASI iki katmanlı:
 *  - Bellek içi pencere (`sonGonderimler`): aynı örnekte hızlı çift
 *    gönderimi yakalar; DB erişilemezken ÇALIŞAN tek korumadır. Örnek
 *    başınadır — Vercel'de birden çok örnek olabilir, bu yüzden tek başına
 *    yeterli sayılmaz.
 *  - Veritabanı penceresi: aynı e-posta + parça + mesaj son 3 dakikada zaten
 *    kaydedilmişse yeni kayıt açılmaz ve İKİNCİ E-POSTA GÖNDERİLMEZ.
 *
 * Rate limit, honeypot ve şema doğrulaması AYNEN korunmuştur.
 */

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

/** Mükerrer penceresi — hem bellek hem DB katmanı için. */
const MUKERRER_PENCERESI_MS = 3 * 60 * 1000;

/**
 * Örnek başına işlenen talepler.
 *
 * Değer bir SONUÇ SÖZÜ tutar. Neden sadece zaman damgası değil: aynı talep
 * ilki HENÜZ SÜRERKEN ikinci kez gelirse (çift tıklama, ağ yeniden denemesi)
 * ikinci isteğe hemen "alındı" demek YANLIŞ BAŞARI olur — birincinin her iki
 * kanalı da başarısız olabilir. İkinci istek birincinin sonucunu bekler ve
 * AYNI yanıtı döndürür. Başarısız sonuç haritada tutulmaz: müşteri yeniden
 * deneyebilsin.
 */
type TalepSonucu = { basarili: boolean };
const islenenTalepler = new Map<string, { t: number; sozu: Promise<TalepSonucu> }>();

function parmakIzi(d: {
  email: string;
  partNumber: string;
  message: string;
  fullName: string;
  quantity: number;
}): string {
  return createHash("sha256")
    .update(
      [
        d.email.trim().toLowerCase(),
        d.partNumber.trim(),
        d.message.trim(),
        d.fullName.trim(),
        String(d.quantity),
      ].join("|")
    )
    .digest("hex")
    .slice(0, 32);
}

/**
 * Talebi tek kez işler. Aynı parmak izi pencere içinde ikinci kez gelirse
 * yeni iş BAŞLATILMAZ; birincinin sonucu beklenir ve döndürülür.
 */
function tekSeferIsle(
  anahtar: string,
  isle: () => Promise<TalepSonucu>
): { sozu: Promise<TalepSonucu>; mukerrer: boolean } {
  const simdi = Date.now();
  // Fırsatçı temizlik: harita yalnızca gönderim sırasında büyür.
  for (const [k, v] of islenenTalepler) {
    if (simdi - v.t > MUKERRER_PENCERESI_MS) islenenTalepler.delete(k);
  }

  const onceki = islenenTalepler.get(anahtar);
  if (onceki && simdi - onceki.t <= MUKERRER_PENCERESI_MS) {
    return { sozu: onceki.sozu, mukerrer: true };
  }

  const sozu = isle().then((sonuc) => {
    // Başarısız sonucu TUTMA: müşteri yeniden deneyebilsin.
    if (!sonuc.basarili) islenenTalepler.delete(anahtar);
    return sonuc;
  });
  // Söz reddedilirse (beklenmeyen hata) kayıt düşürülür, yoksa pencere
  // boyunca her yeniden deneme aynı hatayı alırdı.
  sozu.catch(() => islenenTalepler.delete(anahtar));

  islenenTalepler.set(anahtar, { t: simdi, sozu });
  return { sozu, mukerrer: false };
}

const BASARI = { success: true, message: "Teklif talebiniz alındı" } as const;

const ALINAMADI = {
  success: false,
  error:
    "Talebiniz şu anda alınamadı. Lütfen WhatsApp (+90 530 884 59 79) " +
    "veya bilgi@nidahgroup.com.tr üzerinden iletin.",
} as const;

/**
 * Talebin asıl işi: DB mükerrer penceresi → DB kaydı → yönetici e-postası →
 * müşteri makbuzu. İki kanal birbirinden bağımsızdır; en az biri tutarsa
 * talep bize ulaşmış sayılır.
 */
async function talebiIsle(
  payload: RfqEmailPayload,
  anahtar: string
): Promise<TalepSonucu> {
  // ── 2. KATMAN: veritabanı mükerrer penceresi ──────────────────────────────
  // Örnekler arası çalışır ama DB erişilemezken hiç çalışmaz; bu yüzden
  // e-posta tarafında ayrıca `Idempotency-Key` kullanılır (3. katman).
  if (db) {
    try {
      const esik = new Date(Date.now() - MUKERRER_PENCERESI_MS);
      const [varOlan] = await db
        .select({ id: rfqSubmissions.id })
        .from(rfqSubmissions)
        .where(
          and(
            eq(rfqSubmissions.email, payload.email),
            gt(rfqSubmissions.createdAt, esik),
            sql`coalesce(${rfqSubmissions.partNumber}, '') = ${payload.partNumber ?? ""}`,
            sql`coalesce(${rfqSubmissions.message}, '') = ${payload.message ?? ""}`
          )
        )
        .limit(1);

      if (varOlan) {
        console.warn("[RFQ] mükerrer gönderim (DB penceresi) — yoksayıldı");
        return { basarili: true };
      }
    } catch (err) {
      // Mükerrer kontrolü yapılamadıysa akış DURMAZ: kayıt denemesine
      // geçilir. En kötü durumda mükerrer bir satır oluşur — talebi
      // kaybetmek bundan çok daha kötüdür.
      console.error(
        `[RFQ] mükerrer kontrolü başarısız (${err instanceof Error ? err.name : "UnknownError"}) — devam ediliyor`
      );
    }
  }

  // ── KANAL 1: veritabanı kaydı (başarısızlık ÖLÜMCÜL DEĞİL) ────────────────
  let kaydedildi = false;
  let kayitHatasi: unknown = null;

  if (db) {
    try {
      const [submission] = await db
        .insert(rfqSubmissions)
        .values({
          fullName: payload.fullName,
          company: payload.company,
          phone: payload.phone,
          email: payload.email,
          brand: payload.brand,
          machineModel: payload.machineModel,
          partNumber: payload.partNumber,
          quantity: payload.quantity ?? 1,
          country: payload.country ?? "Türkiye",
          message: payload.message,
        })
        .returning({ id: rfqSubmissions.id, createdAt: rfqSubmissions.createdAt });

      if (submission) {
        kaydedildi = true;
        payload.createdAt = submission.createdAt;
      }
    } catch (err) {
      kayitHatasi = err;
    }
  } else {
    kayitHatasi = new Error("DATABASE_URL tanımlı değil");
  }

  if (!kaydedildi) {
    // Hata ADI dışında ayrıntı loglanmaz: bağlantı hataları uç nokta
    // adresini taşıyabilir (~/.claude/CLAUDE.md §3).
    console.error(
      `[RFQ] KAYIT DÜŞMEDİ (${kayitHatasi instanceof Error ? kayitHatasi.name : "UnknownError"}) — talep yalnızca e-posta ile iletilecek`
    );
    Sentry.captureException(kayitHatasi, {
      tags: { area: "rfq", stage: "db-insert" },
    });
  }

  // ── KANAL 2: yönetici e-postası — HER DURUMDA, BEKLENEREK ─────────────────
  // 3. KATMAN mükerrer koruması: `idempotencyKey` Resend tarafında tutulur,
  // yani AYRI serverless örneklerinden gelen aynı talep için ikinci e-posta
  // gönderilmez. DB kapalıyken tek örnekler arası koruma budur.
  const yoneticiSonucu = await sendAdminNotification(payload, {
    recordFailed: !kaydedildi,
    idempotencyKey: anahtar,
  });

  // ── Müşteri makbuzu — ikincil; yanıtı bekletmez ama çalışması garanti ─────
  if (payload.email) {
    after(async () => {
      const r = await sendCustomerReceipt(payload, { idempotencyKey: anahtar });
      if (!r.sent) {
        console.error(`[RFQ] müşteri makbuzu gönderilemedi (${r.reason})`);
      }
    });
  }

  // ── Sonuç: en az bir kanal tuttuysa talep BİZE ULAŞTI ─────────────────────
  if (kaydedildi || yoneticiSonucu.sent) {
    console.log(
      `[RFQ] talep alındı | kayit=${kaydedildi ? "var" : "YOK"} | yonetici_eposta=${yoneticiSonucu.sent ? "gitti" : "GITMEDI"}`
    );
    return { basarili: true };
  }

  console.error("[RFQ] TALEP ALINAMADI — ne kayıt ne e-posta başarılı");
  Sentry.captureException(
    new Error("RFQ: hem veritabanı hem e-posta başarısız"),
    { tags: { area: "rfq", stage: "both-channels" } }
  );
  return { basarili: false };
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting by IP (DEĞİŞMEDİ) ──────────────────────────────────────
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
      return NextResponse.json(BASARI);
    }

    const payload: RfqEmailPayload = {
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
      createdAt: new Date(),
    };

    const anahtar = parmakIzi({
      email: payload.email,
      partNumber: data.partNumber,
      message: data.message,
      fullName: payload.fullName,
      quantity: data.quantity,
    });

    // ── 1. KATMAN: bellek içi TEK SEFERLİK işleme ───────────────────────────
    // Eşzamanlı çift gönderim: ikinci istek yeni iş başlatmaz, birincinin
    // sonucunu bekler ve AYNI yanıtı alır. Böylece ne ikinci e-posta gider
    // ne de birincinin başarısız olduğu durumda ikinciye "alındı" denir.
    const { sozu, mukerrer } = tekSeferIsle(anahtar, () =>
      talebiIsle(payload, anahtar)
    );

    if (mukerrer) {
      console.warn(
        "[RFQ] mükerrer gönderim (bellek penceresi) — birinci isteğin sonucu bekleniyor"
      );
    }

    const sonuc = await sozu;

    if (sonuc.basarili) return NextResponse.json(BASARI);

    // İKİSİ DE başarısız: müşteriye YANLIŞ BAŞARI GÖSTERİLMEZ.
    return NextResponse.json(ALINAMADI, { status: 503 });
  } catch (error) {
    console.error("RFQ submission error:", error);
    Sentry.captureException(error, { tags: { area: "rfq", stage: "handler" } });
    return NextResponse.json(
      {
        success: false,
        error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}
