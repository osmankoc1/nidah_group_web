import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  BULK_MAX,
  parseBulkRequest,
  summarizeBulk,
  type BulkItemResult,
} from "@/lib/bulk-actions";
import { evaluatePublishEligibility } from "@/lib/seo-gate-server";
import { adminUsername } from "@/lib/admin-identity";
import { recordAdminAudit, type AuditAction, type AuditEntry } from "@/lib/audit-log";

/**
 * Toplu işlemler — bulgu P5, karar K10.
 *
 * ── K10 BURADA NASIL UYGULANIYOR ───────────────────────────────────────────
 *   1. AÇIK ONAY: `parseBulkRequest` gövdede `confirm: true` yoksa reddeder.
 *      Arayüzdeki onay diyaloğu bu bayrağı kullanıcı onayladıktan SONRA
 *      gönderir; diyalog atlanırsa uç yine reddeder.
 *   2. KAYIT BAŞINA KAPI: `publish` işleminde her ürün için
 *      `evaluatePublishEligibility()` AYRI AYRI çalışır. Ölçütleri
 *      karşılamayan ürün reddedilir, diğerleri etkilenmez (kısmi başarı
 *      raporlanır). Toplu yol, tek ürün yolundaki kapıyı ATLAMAZ: aynı
 *      fonksiyonu çağırır.
 *   3. OTOMATİK YAYIN YOK: hiçbir eylem varsayılan değildir ve bu uç kendi
 *      başına hiçbir ürünü yayına almaz.
 *
 * ── BİLİNÇLİ OLARAK YOK ────────────────────────────────────────────────────
 *   · Toplu SİLME (geri alınamaz, cascade ile görsel/uyumluluk/OEM gider).
 *   · Toplu FOTOĞRAF DOĞRULAMA (ALT metni + kaynak kayıt başına kanıttır).
 *
 * ── YAZIM BİÇİMİ ───────────────────────────────────────────────────────────
 * `neon-http` sürücüsünde `db.transaction()` YOKTUR. Yayın onayı kayıt
 * başına ayrı `UPDATE` ile yazılır (kapı kayıt başına çalıştığı için zaten
 * kayıt bazlı bir karar); aktiflik, pasiflik ve stok durumu TEK `UPDATE … IN
 * (…)` ifadesiyle yazılır, çünkü karar kayıt bazlı değildir ve tek ifade
 * atomiktir.
 */

const AUDIT_ACTION: Record<string, AuditAction> = {
  activate: "bulk_activate",
  deactivate: "bulk_deactivate",
  stock_status: "bulk_stock_status",
  publish: "bulk_publish",
  unpublish: "bulk_unpublish",
};

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = parseBulkRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { action, ids, stockStatus } = parsed.value;
  const actor = await adminUsername();

  try {
    // Var olmayan kimlikler SESSİZCE geçmez: operatör neyin işlenmediğini
    // görmeli. Mevcut durum da buradan okunur (işlem kaydının "before"u).
    const mevcut = await db
      .select({
        id: products.id,
        partNumber: products.partNumber,
        name: products.name,
        isActive: products.isActive,
        seoReady: products.seoReady,
        stockStatus: products.stockStatus,
        longDescription: products.longDescription,
      })
      .from(products)
      .where(inArray(products.id, ids));

    const bilinen = new Map(mevcut.map((p) => [p.id, p]));
    const results: BulkItemResult[] = [];
    const kayitlar: AuditEntry[] = [];

    for (const id of ids) {
      if (!bilinen.has(id)) {
        results.push({ id, ok: false, error: "Ürün bulunamadı." });
      }
    }

    const islenecek = mevcut;

    if (action === "publish") {
      // ── KAYIT BAŞINA YAYIN KAPISI (K10) ─────────────────────────────────
      for (const p of islenecek) {
        const readiness = await evaluatePublishEligibility({
          productId: p.id,
          isActive: p.isActive,
          partNumber: p.partNumber,
          name: p.name,
          longDescription: p.longDescription,
        });

        if (!readiness.eligible) {
          results.push({
            id: p.id,
            ok: false,
            error: "Yayın ölçütleri karşılanmıyor.",
            unmet: readiness.unmet,
            // Operatör ekranda TÜRKÇE gerekçeyi görür; kodlar log/geliştirici
            // tarafı için yanıtta kalır.
            reasons: readiness.reasons,
          });
          kayitlar.push({
            actor,
            action: "bulk_publish",
            productId: p.id,
            outcome: "rejected",
            before: { seoReady: p.seoReady },
            after: null,
            reason: readiness.reasons.join(" "),
          });
          continue;
        }

        if (p.seoReady) {
          // Zaten yayında — yeniden yazmak `seo_ready_at` damgasını
          // gereksizce tazeler, bu yüzden dokunulmaz.
          results.push({ id: p.id, ok: true });
          continue;
        }

        const [guncel] = await db
          .update(products)
          .set({ seoReady: true, seoReadyAt: new Date(), updatedAt: new Date() })
          .where(and(eq(products.id, p.id), eq(products.seoReady, false)))
          .returning({ id: products.id });

        results.push({ id: p.id, ok: Boolean(guncel) });
        kayitlar.push({
          actor,
          action: "bulk_publish",
          productId: p.id,
          outcome: guncel ? "ok" : "error",
          before: { seoReady: false },
          after: { seoReady: true },
          reason: guncel ? null : "Kayıt güncellenemedi.",
        });
      }
    } else if (islenecek.length > 0) {
      // ── Kayıt bazlı karar GEREKTİRMEYEN işlemler: tek atomik UPDATE ─────
      const hedefIds = islenecek.map((p) => p.id);
      const set: Record<string, unknown> = { updatedAt: new Date() };

      if (action === "activate") set.isActive = true;
      if (action === "deactivate") set.isActive = false;
      if (action === "unpublish") {
        // Yayından almak ölçüt GEREKTİRMEZ: görünürlüğü yalnızca AZALTIR.
        set.seoReady = false;
        set.seoReadyAt = null;
      }
      if (action === "stock_status" && stockStatus) {
        set.stockStatus = stockStatus;
        // 'unknown' bir insan kararı DEĞİLDİR; damga yalnızca teyitli
        // durumlarda yazılır (tek ürün yoluyla aynı kural).
        set.stockStatusUpdatedAt = stockStatus === "unknown" ? null : new Date();
      }

      const guncellenen = await db
        .update(products)
        .set(set)
        .where(inArray(products.id, hedefIds))
        .returning({ id: products.id });

      const yazilan = new Set(guncellenen.map((r) => r.id));
      for (const p of islenecek) {
        const ok = yazilan.has(p.id);
        results.push(ok ? { id: p.id, ok: true } : { id: p.id, ok: false, error: "Kayıt güncellenemedi." });

        const before =
          action === "stock_status"
            ? { stockStatus: p.stockStatus }
            : action === "unpublish"
              ? { seoReady: p.seoReady }
              : { isActive: p.isActive };
        const after =
          action === "stock_status"
            ? { stockStatus: stockStatus ?? null }
            : action === "unpublish"
              ? { seoReady: false }
              : { isActive: action === "activate" };

        kayitlar.push({
          actor,
          action: AUDIT_ACTION[action],
          productId: p.id,
          outcome: ok ? "ok" : "error",
          before,
          after,
          reason: ok ? null : "Kayıt güncellenemedi.",
        });
      }
    }

    // Bulunamayan kimlikler de kayda girer — "neden işlenmedi" izi kalsın.
    for (const id of ids) {
      if (!bilinen.has(id)) {
        kayitlar.push({
          actor,
          action: AUDIT_ACTION[action],
          productId: id,
          outcome: "rejected",
          before: null,
          after: null,
          reason: "Ürün bulunamadı.",
        });
      }
    }

    // İşlem kaydı yazılamazsa işlem DÜŞMEZ (K9 notu: `audit-log.ts`).
    const kaydedildi = await recordAdminAudit(kayitlar);

    return NextResponse.json({
      data: {
        action,
        limit: BULK_MAX,
        summary: summarizeBulk(results),
        results,
        audited: kaydedildi,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/products/bulk]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
