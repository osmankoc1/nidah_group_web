import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manufacturers, machines, machineVariants } from "@/lib/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { parseUploadedFile } from "@/lib/import-xlsx";

export const maxDuration = 60;

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

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

    const allMachs = await db.select({ id: machines.id, manufacturerId: machines.manufacturerId, model: machines.model, type: machines.type }).from(machines);
    const machKey  = (mId: string, mod: string, tp: string | null) => `${mId}|${mod.toUpperCase()}|${(tp ?? "").toUpperCase()}`;
    const machByKey = new Map(allMachs.map((m) => [machKey(m.manufacturerId, m.model, m.type), m.id]));

    const allVars = await db.select({ id: machineVariants.id, machineId: machineVariants.machineId, variantName: machineVariants.variantName }).from(machineVariants);
    const varKey  = (mId: string, vn: string) => `${mId}|${vn.toUpperCase()}`;
    const varByKey = new Map(allVars.map((v) => [varKey(v.machineId, v.variantName), v.id]));

    await db.transaction(async (tx) => {
      for (const v of valid) {
        const idx  = results.findIndex((r) => r.row === v.rowNum);

        // 1. Manufacturer — UPSERT by slug
        let mfrId = mfrByName.get(v.manufacturer);
        if (!mfrId) {
          const slug = slugify(v.manufacturer);
          const [mfr] = await tx
            .insert(manufacturers)
            .values({ name: v.manufacturer, slug })
            .onConflictDoUpdate({
              target: manufacturers.slug,
              set: { name: sql`excluded.name` },
            })
            .returning({ id: manufacturers.id });
          mfrId = mfr.id;
          mfrByName.set(v.manufacturer, mfrId);
        }

        // 2. Machine — find or insert/update
        const mk  = machKey(mfrId, v.model, v.type);
        let machId = machByKey.get(mk);
        if (!machId) {
          const [mach] = await tx
            .insert(machines)
            .values({ manufacturerId: mfrId, model: v.model, type: v.type, yearFrom: v.yearFrom, yearTo: v.yearTo })
            .returning({ id: machines.id });
          machId = mach.id;
          machByKey.set(mk, machId);
          results[idx].action = "insert";
        } else {
          // Update year range if provided
          if (v.yearFrom !== null || v.yearTo !== null) {
            await tx.update(machines)
              .set({ yearFrom: v.yearFrom, yearTo: v.yearTo })
              .where(eq(machines.id, machId));
          }
          results[idx].action = "update";
          results[idx].reason = "Mevcut makine güncellendi";
        }

        // 3. Variant (only if variantName supplied)
        if (v.variantName) {
          const vk     = varKey(machId, v.variantName);
          const varId  = varByKey.get(vk);
          if (!varId) {
            const [variant] = await tx
              .insert(machineVariants)
              .values({ machineId: machId, variantName: v.variantName, engineModel: v.engineModel, serialFrom: v.serialFrom, serialTo: v.serialTo })
              .returning({ id: machineVariants.id });
            varByKey.set(vk, variant.id);
            results[idx].detail = `Yeni varyant: ${v.variantName}`;
          } else {
            results[idx].detail = `Varyant mevcut: ${v.variantName}`;
          }
        }
      }
    });
  }

  const summary = {
    total:  rawRows.length,
    insert: results.filter((r) => r.action === "insert").length,
    update: results.filter((r) => r.action === "update").length,
    skip:   results.filter((r) => r.action === "skip").length,
    error:  results.filter((r) => r.action === "error").length,
    dryRun: isDryRun,
  };

  return NextResponse.json({ summary, results });
}
