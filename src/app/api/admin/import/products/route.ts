import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { sql, inArray, eq, ilike } from "drizzle-orm";
import { parseUploadedFile } from "@/lib/import-xlsx";

export const maxDuration = 60; // allow up to 60 s for large imports

const VALID_CONDITIONS = ["new", "used", "remanufactured"] as const;
type Condition = typeof VALID_CONDITIONS[number];

interface RowResult {
  row:    number;
  partNumber: string;
  name:   string;
  action: "insert" | "update" | "skip" | "error";
  reason?: string;
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const mode     = request.nextUrl.searchParams.get("mode") ?? "dry-run";
  const isDryRun = mode !== "apply";

  // ── Parse file ────────────────────────────────────────────────────────────
  const formData = await request.formData();
  const { rows: rawRows, error: parseErr } = await parseUploadedFile(formData);
  if (parseErr) return NextResponse.json({ error: parseErr }, { status: 400 });
  if (rawRows.length === 0) return NextResponse.json({ error: "Dosya boş veya başlık satırı eksik." }, { status: 400 });

  // ── Validate ──────────────────────────────────────────────────────────────
  const results: RowResult[] = [];
  interface UpsertRow {
    partNumber:  string;
    name:        string;
    description: string | null;
    condition:   Condition;
    inStock:     boolean;
    weight:      number | null;
    categoryId:  string | null;
    notes:       string | null;
  }
  const valid: UpsertRow[] = [];

  // Collect category names for batch resolve
  const rawCategoryNames = rawRows
    .map((r) => r.category?.trim())
    .filter(Boolean) as string[];
  const uniqueCatNames = [...new Set(rawCategoryNames.map((c) => c.toLowerCase()))];

  // Batch-fetch matching categories
  const categoryMap: Record<string, string> = {}; // lower-name → id
  if (uniqueCatNames.length > 0) {
    const cats = await db.select({ id: categories.id, name: categories.name })
      .from(categories);
    for (const cat of cats) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    }
  }

  for (let i = 0; i < rawRows.length; i++) {
    const r      = rawRows[i];
    const rowNum = i + 2;
    const pn     = r.partNumber?.trim().toUpperCase();
    const nm     = r.name?.trim();

    if (!pn) {
      results.push({ row: rowNum, partNumber: "", name: nm ?? "", action: "error", reason: "partNumber zorunlu" });
      continue;
    }
    if (!nm) {
      results.push({ row: rowNum, partNumber: pn, name: "", action: "error", reason: "name zorunlu" });
      continue;
    }

    const condRaw = (r.condition?.trim().toLowerCase() || "new") as Condition;
    if (!VALID_CONDITIONS.includes(condRaw)) {
      results.push({ row: rowNum, partNumber: pn, name: nm, action: "error",
        reason: `Geçersiz condition: "${r.condition}" (new / used / remanufactured olmalı)` });
      continue;
    }

    const weightRaw = r.weight?.trim();
    const weight    = weightRaw ? Number(weightRaw) : null;
    if (weightRaw && isNaN(weight!)) {
      results.push({ row: rowNum, partNumber: pn, name: nm, action: "error",
        reason: `Geçersiz weight: "${r.weight}" (sayısal olmalı)` });
      continue;
    }

    const inStockRaw = r.inStock?.trim().toLowerCase();
    const inStock = inStockRaw === "" || inStockRaw === undefined || inStockRaw === "true" || inStockRaw === "1" || inStockRaw === "evet";

    const catName  = r.category?.trim().toLowerCase();
    const categoryId = catName ? (categoryMap[catName] ?? null) : null;
    if (catName && !categoryId) {
      // Not an error — just warn via reason on a skip, but we'll still insert
      results.push({ row: rowNum, partNumber: pn, name: nm, action: "insert",
        reason: `Kategori "${r.category}" bulunamadı, kategorisiz eklendi` });
    } else {
      results.push({ row: rowNum, partNumber: pn, name: nm, action: "insert" });
    }

    valid.push({ partNumber: pn, name: nm,
      description: r.description?.trim() || null,
      condition:   condRaw,
      inStock,
      weight,
      categoryId,
      notes: r.notes?.trim() || null,
    });
  }

  const hasErrors = results.some((r) => r.action === "error");

  // In dry-run: also classify insert vs update
  if (isDryRun && valid.length > 0) {
    const existingPNs = new Set(
      (await db.select({ partNumber: products.partNumber })
        .from(products)
        .where(inArray(products.partNumber, valid.map((v) => v.partNumber))))
        .map((r) => r.partNumber)
    );
    for (const res of results) {
      if (res.action === "insert" && existingPNs.has(res.partNumber)) {
        res.action = "update";
        res.reason = (res.reason ? res.reason + " · " : "") + "Mevcut kayıt güncellenecek";
      }
    }
  }

  if (!isDryRun && !hasErrors && valid.length > 0) {
    // ── UPSERT in transaction ───────────────────────────────────────────────
    // 1. Find which partNumbers already exist → mark as update
    const existingPNs = new Set(
      (await db.select({ partNumber: products.partNumber })
        .from(products)
        .where(inArray(products.partNumber, valid.map((v) => v.partNumber))))
        .map((r) => r.partNumber)
    );
    for (const res of results) {
      if (res.action === "insert" && existingPNs.has(res.partNumber)) {
        res.action = "update";
      }
    }

    // 2. Execute UPSERT (batch, single statement per 500 rows)
    await db.transaction(async (tx) => {
      const BATCH = 500;
      for (let start = 0; start < valid.length; start += BATCH) {
        const chunk = valid.slice(start, start + BATCH);
        await tx
          .insert(products)
          .values(chunk.map((v) => ({
            partNumber:  v.partNumber,
            name:        v.name,
            description: v.description,
            condition:   v.condition,
            inStock:     v.inStock,
            weight:      v.weight,
            categoryId:  v.categoryId,
            notes:       v.notes,
          })))
          .onConflictDoUpdate({
            target: products.partNumber,
            set: {
              name:        sql`excluded.name`,
              description: sql`excluded.description`,
              condition:   sql`excluded.condition`,
              inStock:     sql`excluded.in_stock`,
              weight:      sql`excluded.weight`,
              categoryId:  sql`excluded.category_id`,
              notes:       sql`excluded.notes`,
              updatedAt:   new Date(),
            },
          });
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
