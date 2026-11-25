import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { eq, and, ne, asc } from "drizzle-orm";
import { destroyFromCloudinary } from "@/lib/cloudinary";
import { PRODUCT_IMAGE_COLUMNS_V2 } from "@/lib/db/columns";
import { adminUsername } from "@/lib/admin-identity";
import { parseVerifiedFlag } from "@/lib/verification";
import { parseImageAltText, parseImageSourceNote } from "@/lib/product-fields";
import { revokeSeoReadyStatement } from "@/lib/seo-gate-server";

type Params = { params: Promise<{ id: string; imageId: string }> };

/**
 * Fotoğraf silme.
 *
 * ── ATOMİKLİK (kullanıcı şartı 5) ──────────────────────────────────────────
 * Silme, ana fotoğraf devri ve dayanaksız kalan yayın onayının geri alınması
 * TEK `db.batch()` içinde yürür. `neon-http` `db.transaction()` desteklemez;
 * `db.batch` bu projede ölçülmüş üç davranışı sağlar
 * (`scripts/batch-atomiklik-kaniti.mjs`): atomiktir, ifadeler verilen sırada
 * çalışır ve sonraki ifade öncekinin yazdığı satırı aynı transaction içinde
 * görür. Üçüncüsü burada kritiktir: geri alma ifadesindeki `NOT EXISTS`,
 * silme ifadesi uygulandıktan SONRAKİ duruma bakar.
 *
 * Eskiden silme ile geri alma iki ayrı HTTP çağrısıydı; arada bir çökme
 * "doğrulanmış fotoğrafı olmayan ama yayında duran ürün" bırakabilirdi.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, imageId } = await params;

  // Yalnızca gereken iki kolon — yıldız select 0011 kolonlarını da isteyeceği
  // için migration uygulanmamış bir veritabanında 500 dönerdi.
  const [image] = await db
    .select({ cloudinaryId: productImages.cloudinaryId, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ana fotoğraf siliniyorsa devredilecek adayı ÖNCEDEN oku: `db.batch` tüm
  // ifadelerin baştan kurulmasını ister, ara sonuç okunamaz.
  let devralacakId: string | null = null;
  if (image.isPrimary) {
    const [aday] = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.productId, id), ne(productImages.id, imageId)))
      .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt))
      .limit(1);
    devralacakId = aday?.id ?? null;
  }

  try {
    await destroyFromCloudinary(image.cloudinaryId);
  } catch (err) {
    console.warn("[DELETE image] Cloudinary destroy failed:", err);
    // Continue with DB deletion regardless
  }

  const silme = db
    .delete(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));

  const geriAlma = revokeSeoReadyStatement(id);

  let yayindanAlindi = false;

  if (devralacakId) {
    const devir = db
      .update(productImages)
      .set({ isPrimary: true })
      .where(eq(productImages.id, devralacakId));

    const [, , geri] = await db.batch([silme, devir, geriAlma]);
    yayindanAlindi = geri.length > 0;
  } else {
    const [, geri] = await db.batch([silme, geriAlma]);
    yayindanAlindi = geri.length > 0;
  }

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ success: true, seoReadyRevoked: yayindanAlindi });
}

/**
 * Görsel güncelleme: ana fotoğraf seçimi + DOĞRULAMA (drizzle/0011).
 *
 * FOTOĞRAF DOĞRULAMA ≠ YAYIN ONAYI (kullanıcı şartı 3). Bu uç
 * `products.seo_ready` alanını HİÇBİR KOŞULDA `true` YAPMAZ:
 *   · bir fotoğrafı doğrulamak ürünü yayına AÇMAZ,
 *   · daha önce geri alınmış bir yayın onayını GERİ GETİRMEZ.
 * Yayına alma yalnızca `PATCH /api/admin/products/[id]` üzerinden, yöneticinin
 * açık kararıyla ve sunucu tarafı kapıdan geçerek olur. Bu uç `seo_ready`
 * alanına yalnızca TEK YÖNDE — `true` → `false` — dokunur.
 *
 * DOĞRULAMA SÖZLEŞMESİ (`ck_product_images_verified_evidence` ile aynı):
 *   verified = true  → verified_at + alt_text + source_note ZORUNLU
 *   verified = false → verified_at ve verified_by TEMİZLENİR
 * Alanlar istekte yoksa mevcut satırdaki değerler kullanılır; bu yüzden
 * "yalnızca verified: true" göndermek, ALT metni ve kaynak zaten kayıtlıysa
 * geçerlidir. Kayıtlı değilse 400 döner — sunucu istemciye GÜVENMEZ.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { id, imageId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const [current] = await db
    .select(PRODUCT_IMAGE_COLUMNS_V2)
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Ana fotoğraf ──────────────────────────────────────────────────────────
  // Mevcut davranış korunur: önce diğerleri temizlenir, sonra bu satır
  // işaretlenir. İkisi tek batch'te — arada kalan "hiç ana fotoğraf yok"
  // durumu oluşmaz.
  if (body.isPrimary === true) {
    await db.batch([
      db
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, id)),
      db
        .update(productImages)
        .set({ isPrimary: true })
        .where(and(eq(productImages.id, imageId), eq(productImages.productId, id))),
    ]);
  }

  // ── Doğrulama / ALT metni / kaynak ────────────────────────────────────────
  const dogrulamaIstendi = "verified" in body;
  const metinIstendi = "altText" in body || "sourceNote" in body;

  if (!dogrulamaIstendi && !metinIstendi) {
    // Yalnızca isPrimary gönderildi — eski sözleşme.
    // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
    // panelde gorunen veri ile sitede gorunen veri ayrisir.
    revalidateProducts();
    return NextResponse.json({ success: true });
  }

  let verified = current.verified;
  if (dogrulamaIstendi) {
    const parsed = parseVerifiedFlag(body.verified);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    verified = parsed.value;
  }

  // Alan istekte yoksa MEVCUT değer doğrulanır; böylece "sadece verified: true"
  // göndermek kayıtlı ALT metni/kaynak varsa çalışır, yoksa reddedilir.
  const altGirdi = "altText" in body ? body.altText : current.altText;
  const kaynakGirdi = "sourceNote" in body ? body.sourceNote : current.sourceNote;

  const alt = parseImageAltText(altGirdi, verified);
  if (!alt.ok) return NextResponse.json({ error: alt.error }, { status: 400 });

  const kaynak = parseImageSourceNote(kaynakGirdi, verified);
  if (!kaynak.ok) return NextResponse.json({ error: kaynak.error }, { status: 400 });

  const updates: Record<string, unknown> = {
    altText: alt.value,
    sourceNote: kaynak.value,
  };

  const dogrulamaGeriAlindi = dogrulamaIstendi && verified === false && current.verified === true;

  if (dogrulamaIstendi && verified !== current.verified) {
    updates.verified = verified;
    if (verified) {
      updates.verifiedAt = new Date();
      // İşlem kaydı. Kimlik okunamazsa NULL kalır ve işlem ENGELLENMEZ.
      updates.verifiedBy = await adminUsername();
    } else {
      // CHECK kısıtı: verified = false iken damga ve kimlik NULL olmak zorunda.
      updates.verifiedAt = null;
      updates.verifiedBy = null;
    }
  }

  try {
    const yazim = db
      .update(productImages)
      .set(updates)
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)))
      .returning(PRODUCT_IMAGE_COLUMNS_V2);

    // Doğrulama GERİ ALINIYORSA, geri alma ifadesi AYNI batch'e girer: ya
    // ikisi birlikte yazılır ya hiçbiri. Böylece "fotoğraf doğrulanmamış ama
    // ürün hâlâ yayında" ara durumu hiçbir anda oluşamaz.
    let updated: typeof current | undefined;
    let yayindanAlindi = false;

    if (dogrulamaGeriAlindi) {
      const [yazilan, geri] = await db.batch([yazim, revokeSeoReadyStatement(id)]);
      updated = yazilan[0];
      yayindanAlindi = geri.length > 0;
    } else {
      [updated] = await yazim;
    }

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
    // panelde gorunen veri ile sitede gorunen veri ayrisir.
    revalidateProducts();
    return NextResponse.json({
      success: true,
      data: updated,
      seoReadyRevoked: yayindanAlindi,
    });
  } catch (err) {
    // `ck_product_images_verified_evidence` ihlali buraya düşer. Yukarıdaki
    // doğrulamalar aynı kuralı uyguladığı için normalde ulaşılmaz; DB kısıtı
    // son güvencedir ve mesajı operatöre anlaşılır biçimde çevrilir.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("ck_product_images_verified_evidence")) {
      return NextResponse.json(
        {
          error:
            "Doğrulanmış fotoğraf için zaman damgası, ALT metni ve kaynak " +
            "birlikte gereklidir (veritabanı kısıtı).",
        },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/admin/products/[id]/images/[imageId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
