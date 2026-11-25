import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { manufacturers, machines, machineVariants } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { parseUploadedFile } from "@/lib/import-xlsx";
import { runImportBatch } from "@/lib/import-apply";
import { slugifyName } from "@/lib/slugify";
import { randomUUID } from "node:crypto";
import type { BatchItem } from "drizzle-orm/batch";

export const maxDuration = 60;

/**
 * Üretici slug'ı — TEK KAYNAK `@/lib/slugify`.
 *
 * Yerel kopya 2026-11-16'da kaldırıldı: Türkçe harfleri ÇEVİRMİYOR, SİLİYORDU
 * ("ÇUKUROVA" -> "ukurova"). Yeni kural ASCII adlarda birebir aynı sonucu
 * verir, yalnızca Türkçe harf içeren adlar düzelir.
 */
const slugify = slugifyName;

interface RowResult {
  row:    number;
  label:  string;
  action: "insert" | "update" | "skip" | "error";
  detail: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const mode     = request.nextUrl.searchParams.get("mode") ?? "dry-run";
  const isDryRun = mode !== "apply";

  const formData = await request.formData();
  const { rows: rawRows, error: parseErr } = await parseUploadedFile(formData);
  if (parseErr) return NextResponse.json({ error: parseErr }, { status: 400 });
  if (rawRows.length === 0) return NextResponse.json({ error: "Dosya boş veya başlık satırı eksik." }, { status: 400 });

  // ── Validation pass ───────────────────────────────────────────────────────
  const results: RowResult[] = [];

  interface ValidRow {
    manufacturer: string;
    model:        string;
    type:         string | null;
    yearFrom:     number | null;
    yearTo:       number | null;
    variantName:  string | null;
    engineModel:  string | null;
    serialFrom:   string | null;
    serialTo:     string | null;
  }
  const valid: (ValidRow & { rowNum: number })[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r      = rawRows[i];
    const rowNum = i + 2;
    const mfrName = r.manufacturer?.trim().toUpperCase();
    const model   = r.model?.trim().toUpperCase();

    if (!mfrName) {
      results.push({ row: rowNum, label: model ?? "", detail: "—", action: "error", reason: "manufacturer zorunlu" });
      continue;
    }
    if (!model) {
      results.push({ row: rowNum, label: mfrName, detail: "—", action: "error", reason: "model zorunlu" });
      continue;
    }

    const yearFrom = r.yearFrom?.trim() ? Number(r.yearFrom) : null;
    const yearTo   = r.yearTo?.trim()   ? Number(r.yearTo)   : null;
    if (r.yearFrom?.trim() && isNaN(yearFrom!)) {
      results.push({ row: rowNum, label: `${mfrName} ${model}`, detail: "—", action: "error", reason: `Geçersiz yearFrom: "${r.yearFrom}"` });
      continue;
    }
    if (r.yearTo?.trim() && isNaN(yearTo!)) {
      results.push({ row: rowNum, label: `${mfrName} ${model}`, detail: "—", action: "error", reason: `Geçersiz yearTo: "${r.yearTo}"` });
      continue;
    }

    const type        = r.type?.trim().toUpperCase() || null;
    const variantName = r.variantName?.trim().toUpperCase() || null;
    const engineModel = r.engineModel?.trim() || null;
    const serialFrom  = r.serialFrom?.trim() || null;
    const serialTo    = r.serialTo?.trim() || null;

    const label = [mfrName, model, type].filter(Boolean).join(" — ");
    results.push({
      row:    rowNum,
      label,
      detail: variantName ? `Varyant: ${variantName}` : "—",
      action: "insert",
    });

    valid.push({ rowNum, manufacturer: mfrName, model, type, yearFrom, yearTo, variantName, engineModel, serialFrom, serialTo });
  }

  const hasErrors = results.some((r) => r.action === "error");

  // ── DRY RUN classification ─────────────────────────────────────────────────
  if (isDryRun && valid.length > 0) {
    // Pre-load manufacturers and machines
    const allMfrs  = await db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers);
    const allMachs = await db.select({ id: machines.id, manufacturerId: machines.manufacturerId, model: machines.model, type: machines.type }).from(machines);

    const mfrByName  = new Map(allMfrs.map(m  => [m.name.toUpperCase(), m.id]));
    const machKey    = (mId: string, mod: string, tp: string | null) => `${mId}|${mod.toUpperCase()}|${(tp ?? "").toUpperCase()}`;
    const machByKey  = new Map(allMachs.map(m  => [machKey(m.manufacturerId, m.model, m.type), m.id]));

    for (const v of valid) {
      const idx = results.findIndex((r) => r.row === v.rowNum);
      const mfrId = mfrByName.get(v.manufacturer);
      if (mfrId) {
        const machId = machByKey.get(machKey(mfrId, v.model, v.type));
        results[idx].action = machId ? "update" : "insert";
        if (machId) results[idx].reason = "Mevcut makine güncellenecek";
      }
    }
  }

  if (!isDryRun && !hasErrors && valid.length > 0) {
    // ── UPSERT in transaction ──────────────────────────────────────────────
    // Build manufacturer map
    const allMfrs = await db.select({ id: manufacturers.id, name: manufacturers.name, slug: manufacturers.slug }).from(manufacturers);
    const mfrByName = new Map(allMfrs.map((m) => [m.name.toUpperCase(), m.id]));
    /*
     * Slug haritası AYRICA tutulur. Ad haritası "VOLVO CE" ile "Volvo-CE"yi
     * FARKLI görür ama `slugify` ikisini de "volvo-ce" yapar; slug benzersiz
     * olduğu için ikinci kayıt çakışır. Slug'ı da arayarak mevcut üreticinin
     * kimliğini buluruz ve gereksiz INSERT üretmeyiz.
     */
    const mfrBySlug = new Map(allMfrs.map((m) => [m.slug, m.id]));

    const allMachs = await db.select({ id: machines.id, manufacturerId: machines.manufacturerId, model: machines.model, type: machines.type }).from(machines);
    const machKey  = (mId: string, mod: string, tp: string | null) => `${mId}|${mod.toUpperCase()}|${(tp ?? "").toUpperCase()}`;
    const machByKey = new Map(allMachs.map((m) => [machKey(m.manufacturerId, m.model, m.type), m.id]));

    const allVars = await db.select({ id: machineVariants.id, machineId: machineVariants.machineId, variantName: machineVariants.variantName }).from(machineVariants);
    const varKey  = (mId: string, vn: string) => `${mId}|${vn.toUpperCase()}`;
    const varByKey = new Map(allVars.map((v) => [varKey(v.machineId, v.variantName), v.id]));

    /*
     * ── NEDEN `db.batch`, `db.transaction` DEĞİL ────────────────────────────
     *
     * `src/lib/db/index.ts` `neon-http` sürücüsünü kullanıyor. Bu sürücü
     * durumsuz HTTP üzerinden çalışır ve `db.transaction()` çağrısında
     * "No transactions support in neon-http driver" hatası fırlatır — apply
     * yolu bu yüzden HİÇ çalışmıyordu (dry-run etkilenmiyordu).
     *
     * ── TASARIM: kimlikler ÖNCEDEN üretilir ────────────────────────────────
     *
     * Asıl zorluk, bu bloğun SIRALI OKUMA gerektirmesiydi: üretici
     * INSERT'inin `.returning()` sonucu makine INSERT'ini besliyordu.
     * `db.batch` ise tüm ifadelerin ÖNCEDEN kurulmasını ister.
     *
     * Çözüm: `.returning()` beklemek yerine birincil anahtarları uygulama
     * tarafında `randomUUID()` ile ÜRETİYORUZ. Böylece ilişkiler ifadeler
     * kurulurken bilinir ve tek bir batch yeterli olur.
     *
     * Bu tasarımın dayandığı üç davranış ÖLÇÜLDÜ, varsayılmadı
     * (`scripts/batch-atomiklik-kaniti.mjs`):
     *   1. `db.batch` ATOMİKTİR — bir ifade başarısız olursa hiçbiri yazılmaz.
     *   2. İfadeler VERİLEN SIRADA çalışır.
     *   3. Sonraki ifade, önceki ifadenin aynı transaction içinde yazdığı
     *      satırı GÖRÜR (üretici INSERT → ona FK veren makine INSERT çalışır).
     *
     * YARIŞ DURUMU: üreticiler haritaya okunduktan sonra, biz yazmadan önce
     * başka bir istek aynı slug'ı eklerse INSERT çakışır. `onConflictDoUpdate`
     * mevcut satırın kimliğini DEĞİŞTİRMEZ, dolayısıyla ürettiğimiz kimliğe
     * FK veren makine INSERT'i başarısız olur ve TÜM BATCH geri alınır.
     * Yani sonuç yine "hepsi ya da hiçbiri"dir: kısmi veri OLUŞMAZ, operatör
     * hatayı görür ve dosyayı yeniden yükler.
     */
    const statements: BatchItem<"pg">[] = [];

    for (const v of valid) {
      const idx = results.findIndex((r) => r.row === v.rowNum);

      // 1. Üretici — haritada yoksa kimliği ÜRET ve INSERT kuyruğa al.
      const slug = slugify(v.manufacturer);
      let mfrId = mfrByName.get(v.manufacturer) ?? mfrBySlug.get(slug);
      if (!mfrId) {
        mfrId = randomUUID();
        statements.push(
          db
            .insert(manufacturers)
            .values({ id: mfrId, name: v.manufacturer, slug })
            .onConflictDoUpdate({
              target: manufacturers.slug,
              set: { name: sql`excluded.name` },
            })
        );
        mfrByName.set(v.manufacturer, mfrId);
        mfrBySlug.set(slug, mfrId);
      }

      // 2. Makine — bul ya da ekle. (Tabloda benzersiz kısıt yok; eşleştirme
      //    önceden okunan harita üzerinden yapılır — mevcut davranış.)
      const mk = machKey(mfrId, v.model, v.type);
      let machId = machByKey.get(mk);
      if (!machId) {
        machId = randomUUID();
        statements.push(
          db.insert(machines).values({
            id: machId,
            manufacturerId: mfrId,
            model: v.model,
            type: v.type,
            yearFrom: v.yearFrom,
            yearTo: v.yearTo,
          })
        );
        machByKey.set(mk, machId);
        results[idx].action = "insert";
      } else {
        if (v.yearFrom !== null || v.yearTo !== null) {
          statements.push(
            db
              .update(machines)
              .set({ yearFrom: v.yearFrom, yearTo: v.yearTo })
              .where(eq(machines.id, machId))
          );
        }
        results[idx].action = "update";
        results[idx].reason = "Mevcut makine güncellendi";
      }

      // 3. Varyant — yalnızca variantName verilmişse.
      if (v.variantName) {
        const vk = varKey(machId, v.variantName);
        if (!varByKey.get(vk)) {
          const variantId = randomUUID();
          statements.push(
            db.insert(machineVariants).values({
              id: variantId,
              machineId: machId,
              variantName: v.variantName,
              engineModel: v.engineModel,
              serialFrom: v.serialFrom,
              serialTo: v.serialTo,
            })
          );
          varByKey.set(vk, variantId);
          results[idx].detail = `Yeni varyant: ${v.variantName}`;
        } else {
          results[idx].detail = `Varyant mevcut: ${v.variantName}`;
        }
      }
    }

    if (statements.length > 0) {
      // Tek istek, tek transaction. Hata olursa HİÇBİRİ yazılmaz.
      const yazma = await runImportBatch(statements);
      if (!yazma.ok) {
        console.error("[import/machines]", yazma.detail);
        return NextResponse.json({ error: yazma.message }, { status: 500 });
      }
    }
  }

  const summary = {
    total:  rawRows.length,
    insert: results.filter((r) => r.action === "insert").length,
    update: results.filter((r) => r.action === "update").length,
    skip:   results.filter((r) => r.action === "skip").length,
    error:  results.filter((r) => r.action === "error").length,
    dryRun: isDryRun,
  };

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ summary, results });
}
