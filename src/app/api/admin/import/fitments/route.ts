import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fitments, products, machines, manufacturers, machineVariants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseUploadedFile } from "@/lib/import-xlsx";

export const maxDuration = 60;

interface RowResult {
  row:        number;
  partNumber: string;
  machine:    string;
  action:     "insert" | "skip" | "error";
  reason?:    string;
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const mode     = request.nextUrl.searchParams.get("mode") ?? "dry-run";
  const isDryRun = mode !== "apply";

  const formData = await request.formData();
  const { rows: rawRows, error: parseErr } = await parseUploadedFile(formData);
  if (parseErr) return NextResponse.json({ error: parseErr }, { status: 400 });
  if (rawRows.length === 0) return NextResponse.json({ error: "Dosya boş veya başlık satırı eksik." }, { status: 400 });

  // ── Build lookup maps (batch — avoids N+1) ───────────────────────────────
  const [allProducts, allMfrs, allMachs, allVars] = await Promise.all([
    db.select({ id: products.id, partNumber: products.partNumber }).from(products),
    db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers),
    db.select({ id: machines.id, manufacturerId: machines.manufacturerId, model: machines.model, type: machines.type }).from(machines),
    db.select({ id: machineVariants.id, machineId: machineVariants.machineId, variantName: machineVariants.variantName }).from(machineVariants),
  ]);

  const productByPN  = new Map(allProducts.map((p) => [p.partNumber.toUpperCase(), p.id]));
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
    rowIdx:           number;
  }
  const toInsert: ValidFitment[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r      = rawRows[i];
    const rowNum = i + 2;
    const pn     = r.partNumber?.trim().toUpperCase();
    const mfrN   = r.manufacturer?.trim().toUpperCase();
    const modN   = r.model?.trim().toUpperCase();
    const typeN  = r.type?.trim().toUpperCase() || null;
    const varN   = r.variantName?.trim().toUpperCase() || null;
    const label  = `${mfrN ?? ""} ${modN ?? ""}`.trim();

    if (!pn || !mfrN || !modN) {
      results.push({ row: rowNum, partNumber: pn ?? "", machine: label,
        action: "error", reason: "partNumber, manufacturer ve model zorunlu" });
      continue;
    }

    // Resolve product
    const productId = productByPN.get(pn);
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

    results.push({ row: rowNum, partNumber: pn, machine: label, action: "insert" });
    toInsert.push({ productId, machineId: machId, machineVariantId: variantId,
      notes: r.notes?.trim() || null, rowIdx: results.length - 1 });
    existingFitments.add(fk); // prevent in-file duplicates
  }

  const hasErrors = results.some((r) => r.action === "error");

  if (!isDryRun && !hasErrors && toInsert.length > 0) {
    await db.transaction(async (tx) => {
      const BATCH = 200;
      for (let start = 0; start < toInsert.length; start += BATCH) {
        const chunk = toInsert.slice(start, start + BATCH);
        await tx
          .insert(fitments)
          .values(chunk.map((f) => ({
            productId:        f.productId,
            machineId:        f.machineId,
            machineVariantId: f.machineVariantId,
            notes:            f.notes,
          })))
          .onConflictDoNothing();
      }
    });
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
