import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Sağlık kontrolü — İKİ AYRI SEVİYE.
 *
 * ── 2026-11-24, bulgu B4 — NEDEN DEĞİŞTİ ────────────────────────────────────
 * Bu uç ESKİDEN her çağrıda `SELECT 1` çalıştırıyordu. Neon'da compute 5
 * dakika hareketsizlikte uyur; dışarıdan 1–5 dakika aralıkla ping atan bir
 * uptime servisi bu sorguyla veritabanını 7/24 uyanık tutar ve TEK BAŞINA
 * ayda ~180 CU-saat tüketebilir (ücretsiz paket: 100 CU-saat/proje).
 * Repoda cron, zamanlanmış görev veya keep-alive YOKTUR (doğrulandı:
 * `vercel.json`'da `crons` yok, `.github` yok, kodda çağıran yok) — yani
 * böyle bir ping varsa KAYNAĞI HARİCİDİR ve kod tarafından görülemez.
 *
 * Bu yüzden varsayılan davranış ters çevrildi:
 *
 *  | İstek                 | Ne kontrol edilir            | Neon uyandırılır mı |
 *  |-----------------------|------------------------------|---------------------|
 *  | `/api/health`         | yalnızca UYGULAMA ayakta mı  | **HAYIR**           |
 *  | `/api/health?deep=1`  | uygulama + veritabanı + Prosis | evet              |
 *
 * "Uygulama ayakta" ile "veritabanı erişilebilir" BİLİNÇLİ olarak iki ayrı
 * sağlık sorusudur: uygulamanın ayakta olduğunu öğrenmek için veritabanını
 * uyandırmak gerekmez. Dışarıdaki izleme servisleri sık aralıkla SIĞ ucu,
 * seyrek aralıkla (≥ 15 dk) derin ucu çağırmalıdır.
 *
 * Geriye uyumluluk: sığ çağrı yine 200 ve `status: "ok"` döner, bu yüzden
 * mevcut bir izleyici kırmızıya düşmez; yalnızca `checks` içeriği değişir.
 */

export const dynamic = "force-dynamic";

type CheckState = "ok" | "error" | "unconfigured" | "skipped";

export async function GET(request: NextRequest) {
  const derin = request.nextUrl.searchParams.get("deep") === "1";

  const checks: Record<string, CheckState> = { app: "ok" };
  let overallOk = true;

  if (!derin) {
    // Veritabanına DOKUNULMAZ. `unconfigured` ile karıştırılmaması için
    // ayrı bir durum adı kullanılır.
    checks.database = "skipped";
    checks.prosis = "skipped";
  } else {
    // DB check
    if (!db) {
      checks.database = "unconfigured";
    } else {
      try {
        await db.execute(sql`SELECT 1`);
        checks.database = "ok";
      } catch {
        checks.database = "error";
        overallOk = false;
      }
    }

    // Prosis connector check (optional — only if configured)
    const prosisUrl = process.env.PROSIS_CONNECTOR_URL;
    if (prosisUrl) {
      try {
        const res = await fetch(`${prosisUrl}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        checks.prosis = res.ok ? "ok" : "error";
      } catch {
        checks.prosis = "error";
        // Prosis is optional — don't fail overall health
      }
    } else {
      checks.prosis = "unconfigured";
    }
  }

  const status = overallOk ? 200 : 503;

  return NextResponse.json(
    {
      status: overallOk ? "ok" : "degraded",
      depth: derin ? "deep" : "shallow",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      checks,
    },
    {
      status,
      // İzleme servisleri taze yanıt görmeli; CDN araya girmemeli.
      headers: { "Cache-Control": "no-store" },
    }
  );
}
