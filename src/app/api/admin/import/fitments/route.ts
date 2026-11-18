import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fitments, products, machines, manufacturers, machineVariants } from "@/lib/db/schema";
import { parseUploadedFile } from "@/lib/import-xlsx";
import { runImportBatch } from "@/lib/import-apply";
import { normalizePartNumber } from "@/lib/part-number";
import { checkIdentifierCell } from "@/lib/import-validation";
import { parseVerificationSource, parseVerifiedFlag } from "@/lib/verification";

export const maxDuration = 60;

interface RowResult {
  row:        number;
  partNumber: string;
  machine:    string;
  action:     "insert" | "skip" | "error";
  reason?:    string;
  code?:      string;
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const mode     = request.nextUrl.searchParams.get("mode") ?? "dry-run";
  const isDryRun = mode !== "apply";

  const formData = await request.formData();
  const parsed = await parseUploadedFile(formData);
  const { rows: rawRows, error: parseErr } = parsed;
  if (parseErr) return NextResponse.json({ error: parseErr }, { status: 400 });
  if (rawRows.length === 0) return NextResponse.json({ error: "Dosya boş veya başlık satırı eksik." }, { status: 400 });

  // ── Build lookup maps (batch — avoids N+1) ───────────────────────────────
  const [allProducts, allMfrs, allMachs, allVars] = await Promise.all([
    db.select({
      id: products.id,
      partNumber: products.partNumber,
      partNumberNormalized: products.partNumberNormalized,
    }).from(products),
    db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers),
    db.select({ id: machines.id, manufacturerId: machines.manufacturerId, model: machines.model, type: machines.type }).from(machines),
    db.select({ id: machineVariants.id, machineId: machineVariants.machineId, variantName: machineVariants.variantName }).from(machineVariants),
  ]);

  // Kimlik eşleştirmesi normalize anahtar üzerinden yapılır: "CH 76281",
  // "CH-76281" ve "ch76281" AYNI ürüne gider. 0006 öncesinden kalan NULL
  // normalize satırlar için değer yazımdan yeniden türetilir.
  const productByNormalized = new Map(
    allProducts
      .map((p) => [p.partNumberNormalized ?? normalizePartNumber(p.partNumber), p.id] as const)
      .filter(([key]) => key.length > 0)
  );
  const mfrByName    = new Map(allMfrs.map((m) => [m.name.toUpperCase(), m.id]));

  // machine key = mfrId|model.upper|type.upper
  const machKey   = (mId: string, mod: string, tp: string | null) => `${mId}|${mod.toUpperCase()}|${(tp ?? "").toUpperCase()}`;
  const machByKey = new Map(allMachs.map((m) => [machKey(m.manufacturerId, m.model, m.type), m.id]));

  // variant key = machineId|variantName.upper
  const varKey   = (mId: string, vn: string) => `${mId}|${vn.toUpperCase()}`;
  const varByKey = new Map(allVars.map((v) => [varKey(v.machineId, v.variantName), v.id]));

  // ── Existing fitments map (to detect duplicates in dry-run) ───────────────
  const allFitments = await db.select({
    productId: fitments.productId, machineId: fitments.machineId, machineVariantId: fitments.machineVariantId,
  }).from(fitments);
  const fitmentKey = (pid: string, mid: string, vid: string | null) => `${pid}|${mid}|${vid ?? "null"}`;
  const existingFitments = new Set(allFitments.map((f) => fitmentKey(f.productId, f.machineId, f.machineVariantId)));

  // ── Validate & resolve rows ───────────────────────────────────────────────
  const results: RowResult[] = [];

  interface ValidFitment {
    productId:        string;
    machineId:        string;
    machineVariantId: string | null;
    notes:            string | null;
    verified:         boolean;
    source:           string | null;
    rowIdx:           number;
  }
  const toInsert: ValidFitment[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r      = rawRows[i];
    const rowNum = i + 2;
    const pn     = (r.partNumber ?? "").trim().toUpperCase();
    const mfrN   = r.manufacturer?.trim().toUpperCase();
    const modN   = r.model?.trim().toUpperCase();
    const typeN  = r.type?.trim().toUpperCase() || null;
    const varN   = r.variantName?.trim().toUpperCase() || null;
    const label  = `${mfrN ?? ""} ${modN ?? ""}`.trim();

    // Kimlik bütünlüğü: Excel'de sayı olarak saklanmış / bilimsel gösterime
    // düşmüş parça numarası tahmin edilmez, satır reddedilir.
    const identityIssue = checkIdentifierCell({
      value: r.partNumber,
      wasTypedCell: (parsed.numericCells[i] ?? new Set<string>()).has("partNumber"),
      columnLabel: "partNumber",
    });
    if (identityIssue) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: identityIssue.message, code: identityIssue.code });
      continue;
    }

    if (!mfrN || !modN) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: "manufacturer ve model zorunlu" });
      continue;
    }

    // Resolve product — normalize anahtar üzerinden
    const productId = productByNormalized.get(normalizePartNumber(pn));
    if (!productId) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: `Ürün bulunamadı: ${pn}` });
      continue;
    }

    // Resolve manufacturer
    const mfrId = mfrByName.get(mfrN);
    if (!mfrId) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: `Üretici bulunamadı: "${r.manufacturer}" (önce Makine Import ile ekleyin)` });
      continue;
    }

    // Resolve machine (type-aware lookup, falls back to type-agnostic)
    let machId = machByKey.get(machKey(mfrId, modN, typeN));
    if (!machId && typeN) {
      // try without type
      machId = machByKey.get(machKey(mfrId, modN, null));
    }
    if (!machId) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: `Makine bulunamadı: "${r.manufacturer} ${r.model}" (önce Makine Import ile ekleyin)` });
      continue;
    }

    // Resolve variant
    let variantId: string | null = null;
    if (varN) {
      variantId = varByKey.get(varKey(machId, varN)) ?? null;
      if (!variantId) {
        results.push({ row: rowNum, partNumber: pn, machine: label,
          action: "error", reason: `Varyant bulunamadı: "${r.variantName}" (önce Makine Import ile ekleyin)` });
        continue;
      }
    }

    // Duplicate check
    const fk = fitmentKey(productId, machId, variantId);
    if (existingFitments.has(fk)) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "skip", reason: "Bu uyumluluk zaten mevcut" });
      continue;
    }

    // ── Doğrulama durumu ────────────────────────────────────────────────────
    // Boş bırakılırsa DOĞRULANMAMIŞ kabul edilir. "true" yazılırsa kaynak
    // ZORUNLUDUR — dayanağı olmayan uyumluluk kesin bilgi olarak yayınlanmaz.
    const verifiedRaw = (r.verified ?? "").trim().toLowerCase();
    const verified = verifiedRaw
      ? parseVerifiedFlag(verifiedRaw)
      : ({ ok: true as const, value: false });
    if (!verified.ok) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: verified.error, code: "verified_invalid" });
      continue;
    }
    const source = parseVerificationSource(r.source, verified.value);
    if (!source.ok) {
      results.push({ row: rowNum, partNumber: pn, machine: label,
        action: "error", reason: source.error, code: "verification_source_missing" });
      continue;
    }

    results.push({ row: rowNum, partNumber: pn, machine: label, action: "insert" });
    toInsert.push({ productId, machineId: machId, machineVariantId: variantId,
      notes: r.notes?.trim() || null,
      verified: verified.value, source: source.value,
      rowIdx: results.length - 1 });
    existingFitments.add(fk); // prevent in-file duplicates
  }

  const hasErrors = results.some((r) => r.action === "error");

  if (!isDryRun && !hasErrors && toInsert.length > 0) {
    /*
     * `db.transaction` KULLANILMAZ: bu yol `neon-http` sürücüsünü kullanıyor
     * ve o sürücü durumsuz HTTP üzerinden çalıştığı için transaction
     * desteklemez ("No transactions support in neon-http driver"). Apply yolu
     * bu yüzden hiç çalışmıyordu. `db.batch` tüm ifadeleri TEK istekte
     * gönderir ve Neon bunları TEK transaction içinde çalıştırır.
     */
    const BATCH = 200;
    const statements = [];
    for (let start = 0; start < toInsert.length; start += BATCH) {
      const chunk = toInsert.slice(start, start + BATCH);
      statements.push(
        db
          .insert(fitments)
          .values(chunk.map((f) => ({
            productId:        f.productId,
            machineId:        f.machineId,
            machineVariantId: f.machineVariantId,
            notes:            f.notes,
            verified:         f.verified,
            verifiedAt:       f.verified ? new Date() : null,
            source:           f.source,
          })))
          .onConflictDoNothing()
      );
    }
    if (statements.length > 0) {
      const yazma = await runImportBatch(statements);
      if (!yazma.ok) {
        console.error("[import/fitments]", yazma.detail);
        return NextResponse.json({ error: yazma.message }, { status: 500 });
      }
    }
  }

  const summary = {
    total:  rawRows.length,
    insert: results.filter((r) => r.action === "insert").length,
    update: 0,
    skip:   results.filter((r) => r.action === "skip").length,
    error:  results.filter((r) => r.action === "error").length,
    dryRun: isDryRun,
  };

  return NextResponse.json({ summary, results });
}
