import { NextRequest, NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/revalidate-public";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { sql, inArray, or, type SQL } from "drizzle-orm";
import { parseUploadedFile } from "@/lib/import-xlsx";
import { runImportBatch } from "@/lib/import-apply";
import { normalizePartNumber } from "@/lib/part-number";
import {
  checkIdentifierCell,
  clashIssue,
  duplicateIssue,
  findInternalStockCodeDuplicates,
  findNormalizedDuplicates,
  isIssue,
  parseCondition,
  parseStockFlag,
  parseWeight,
  updatableColumns,
  parseImportSourcingType,
  parseImportStockStatus,
  parseImportInternalStockCode,
  parseImportText,
  IMPORT_FORBIDDEN_COLUMNS,
  type ImportIssue,
  type OptionalProductColumn,
  type ProductCondition,
} from "@/lib/import-validation";
import type { SourcingTypeValue, StockStatusValue } from "@/lib/product-fields";

export const maxDuration = 60; // allow up to 60 s for large imports

/**
 * Tek istekte işlenebilecek en fazla satır sayısı.
 *
 * `maxDuration = 60` ile 500'lük partiler hâlinde yazıldığında bu sınır
 * güvenle tamamlanır. Daha büyük dosyalar zaman aşımına uğrar; transaction
 * güvenle geri alınır ama operatör hiçbir ilerleme görmez. Bu yüzden dosya
 * baştan reddedilir ve parçalama istenir (denetim E-5).
 */
const MAX_ROWS = 5000;

/** Upsert parti büyüklüğü. */
const BATCH = 500;

interface RowResult {
  row: number;
  partNumber: string;
  name: string;
  action: "insert" | "update" | "skip" | "error";
  reason?: string;
  /** Makine-okunur sorun kodu — arayüz filtrelemesi ve test için. */
  code?: string;
}

interface UpsertRow {
  rowNum: number;
  /** Görünen kanonik değer — tireler ve baştaki sıfırlar KORUNUR. */
  partNumber: string;
  /** Eşleştirme anahtarı — `uq_products_pn_norm` ile aynı kural. */
  partNumberNormalized: string;
  name: string;
  description: string | null;
  condition: ProductCondition;
  inStock: boolean;
  weight: number | null;
  categoryId: string | null;
  notes: string | null;
  // ── Faz 2 ──
  partManufacturer: string | null;
  sourcingType: SourcingTypeValue;
  stockStatus: StockStatusValue;
  shortDescription: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  // ── Faz 3 — İÇ KULLANIM, eşleştirme anahtarı DEĞİL ──
  internalStockCode: string | null;
  internalStockCodeNormalized: string | null;
}

/**
 * ON CONFLICT DO UPDATE SET gövdesi.
 *
 * Dosyada BULUNMAYAN kolona `products.<kolon>` yazılır — yani kendi mevcut
 * değeri, no-op. Eski davranış her kolona `excluded.<kolon>` yazıyordu; bu
 * yüzden yalnızca `partNumber` + `name` içeren bir dosya, mevcut kayıtların
 * `description` / `weight` / `category_id` / `notes` alanlarını NULL'a
 * çekiyordu (denetim E-4, sessiz veri kaybı).
 */
function buildConflictSet(updatable: Set<OptionalProductColumn>) {
  const pick = (column: OptionalProductColumn, excluded: SQL, current: SQL) =>
    updatable.has(column) ? excluded : current;

  return {
    name: sql`excluded.name`,
    // Kimlik anahtarı HER ZAMAN yenilenir — denetim E-1'in kök nedeni buydu.
    partNumberNormalized: sql`excluded.part_number_normalized`,
    description: pick("description", sql`excluded.description`, sql`${products.description}`),
    condition: pick("condition", sql`excluded.condition`, sql`${products.condition}`),
    inStock: pick("inStock", sql`excluded.in_stock`, sql`${products.inStock}`),
    weight: pick("weight", sql`excluded.weight`, sql`${products.weight}`),
    categoryId: pick("category", sql`excluded.category_id`, sql`${products.categoryId}`),
    notes: pick("notes", sql`excluded.notes`, sql`${products.notes}`),
    // ── Faz 2 — aynı "dosyada yoksa dokunma" kuralı ────────────────────────
    partManufacturer: pick("partManufacturer", sql`excluded.part_manufacturer`, sql`${products.partManufacturer}`),
    sourcingType:     pick("sourcingType",     sql`excluded.sourcing_type`,     sql`${products.sourcingType}`),
    stockStatus:      pick("stockStatus",      sql`excluded.stock_status`,      sql`${products.stockStatus}`),
    shortDescription: pick("shortDescription", sql`excluded.short_description`, sql`${products.shortDescription}`),
    longDescription:  pick("longDescription",  sql`excluded.long_description`,  sql`${products.longDescription}`),
    metaTitle:        pick("metaTitle",        sql`excluded.meta_title`,        sql`${products.metaTitle}`),
    metaDescription:  pick("metaDescription",  sql`excluded.meta_description`,  sql`${products.metaDescription}`),
    // ── Faz 3 — ham kod ve normalize kolon BİRLİKTE güncellenir; biri
    // güncellenip diğeri eski kalırsa arama sessizce yanlış sonuç verir.
    internalStockCode:
      pick("internalStockCode", sql`excluded.internal_stock_code`, sql`${products.internalStockCode}`),
    internalStockCodeNormalized:
      pick("internalStockCode", sql`excluded.internal_stock_code_normalized`, sql`${products.internalStockCodeNormalized}`),
    // `seo_ready` ve `seo_ready_at` BILINCLI OLARAK YOK: yayin onayi toplu
    // import ile verilemez (IMPORT_FORBIDDEN_COLUMNS).
    updatedAt: sql`now()`,
  };
}

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const mode = request.nextUrl.searchParams.get("mode") ?? "dry-run";
  const isDryRun = mode !== "apply";

  // ── Dosyayı ayrıştır ──────────────────────────────────────────────────────
  const formData = await request.formData();
  const parsed = await parseUploadedFile(formData);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const rawRows = parsed.rows;
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Dosya boş veya başlık satırı eksik." }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error:
          `Dosyada ${rawRows.length} satır var; tek seferde en fazla ${MAX_ROWS} satır ` +
          `işlenebilir. Dosyayı parçalara bölüp sırayla yükleyin.`,
      },
      { status: 400 }
    );
  }

  // ── Başlık kontrolü ───────────────────────────────────────────────────────
  const headers = parsed.headers;
  const missingRequired = ["partNumber", "name"].filter((h) => !headers.includes(h));
  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        error:
          `Zorunlu kolon eksik: ${missingRequired.join(", ")}. ` +
          `Şablonu "Şablon İndir" ile yeniden alın.`,
      },
      { status: 400 }
    );
  }

  const updatable = updatableColumns(headers);

  // Yayin onayi ve dogrulama bayraklari toplu import ile YAZILAMAZ. Dosyada
  // bulunsalar bile yok sayilir; operator sessizce yanilmasin diye bildirilir.
  const ignoredColumns = headers.filter((h) =>
    (IMPORT_FORBIDDEN_COLUMNS as readonly string[]).includes(h)
  );

  // ── Kategori çözümü (yalnızca kolon varsa) ────────────────────────────────
  const categoryMap: Record<string, string> = {}; // lower(name) → id
  if (updatable.has("category")) {
    const cats = await db.select({ id: categories.id, name: categories.name }).from(categories);
    for (const cat of cats) categoryMap[cat.name.toLowerCase()] = cat.id;
  }

  // ── 1. geçiş: alan doğrulama ──────────────────────────────────────────────
  const results: RowResult[] = [];
  const candidates: UpsertRow[] = [];
  const resultByRow = new Map<number, RowResult>();

  const pushResult = (r: RowResult) => {
    results.push(r);
    resultByRow.set(r.row, r);
  };

  const fail = (rowNum: number, partNumber: string, name: string, problem: ImportIssue) =>
    pushResult({
      row: rowNum,
      partNumber,
      name,
      action: "error",
      reason: problem.message,
      code: problem.code,
    });

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 2; // 1 = başlık satırı
    const typedCells = parsed.numericCells[i] ?? new Set<string>();

    const rawPn = r.partNumber;
    const nm = (r.name ?? "").trim();

    // Kimlik — baştaki sıfır / bilimsel gösterim / sayı tipli hücre burada yakalanır.
    const identityIssue = checkIdentifierCell({
      value: rawPn,
      wasTypedCell: typedCells.has("partNumber"),
      columnLabel: "partNumber",
    });
    if (identityIssue) {
      fail(rowNum, (rawPn ?? "").trim(), nm, identityIssue);
      continue;
    }

    // Görünen değer: trim + büyük harf. İç boşluklar, tireler ve baştaki
    // sıfırlar DEĞİŞMEZ. (api/admin/products POST ile aynı davranış.)
    const pn = rawPn!.trim().toUpperCase();
    const normalized = normalizePartNumber(pn);

    if (!nm) {
      fail(rowNum, pn, "", { code: "name_missing", message: "name zorunlu." });
      continue;
    }

    const cond = parseCondition(r.condition);
    if (isIssue(cond)) {
      fail(rowNum, pn, nm, cond);
      continue;
    }

    const w = parseWeight(r.weight);
    if (isIssue(w)) {
      fail(rowNum, pn, nm, w);
      continue;
    }

    const stock = parseStockFlag(r.inStock);
    if (isIssue(stock)) {
      fail(rowNum, pn, nm, stock);
      continue;
    }

    const catName = updatable.has("category") ? r.category?.trim().toLowerCase() : undefined;
    const categoryId = catName ? (categoryMap[catName] ?? null) : null;

    // ── Faz 2 alanlari ──────────────────────────────────────────────────────
    const stockStatus = parseImportStockStatus(r.stockStatus);
    if (isIssue(stockStatus)) {
      fail(rowNum, pn, nm, stockStatus);
      continue;
    }

    const sourcingType = parseImportSourcingType(r.sourcingType);
    if (isIssue(sourcingType)) {
      fail(rowNum, pn, nm, sourcingType);
      continue;
    }

    const textValues: Record<string, string | null> = {};
    let textIssue: ImportIssue | null = null;
    for (const column of ["partManufacturer", "shortDescription", "longDescription", "metaTitle", "metaDescription"] as const) {
      const parsed = parseImportText(r[column], column);
      if (isIssue(parsed)) { textIssue = parsed; break; }
      textValues[column] = parsed.value;
    }
    if (textIssue) {
      fail(rowNum, pn, nm, textIssue);
      continue;
    }

    // ── Faz 3: orijinal Logo stok kodu ──────────────────────────────────────
    const internalStock = parseImportInternalStockCode(r.internalStockCode);
    if (isIssue(internalStock)) {
      fail(rowNum, pn, nm, internalStock);
      continue;
    }

    pushResult({
      row: rowNum,
      partNumber: pn,
      name: nm,
      action: "insert",
      ...(catName && !categoryId
        ? { reason: `Kategori "${r.category}" bulunamadı, kategorisiz eklendi` }
        : {}),
    });

    candidates.push({
      rowNum,
      partNumber: pn,
      partNumberNormalized: normalized,
      name: nm,
      description: r.description?.trim() || null,
      condition: cond.value,
      inStock: stock.value,
      weight: w.value,
      categoryId,
      notes: r.notes?.trim() || null,
      partManufacturer: textValues.partManufacturer ?? null,
      sourcingType: sourcingType.value,
      stockStatus: stockStatus.value,
      shortDescription: textValues.shortDescription ?? null,
      longDescription: textValues.longDescription ?? null,
      metaTitle: textValues.metaTitle ?? null,
      metaDescription: textValues.metaDescription ?? null,
      internalStockCode: internalStock.value?.code ?? null,
      internalStockCodeNormalized: internalStock.value?.normalized ?? null,
    });
  }

  // ── 2. geçiş: dosya içi normalize çakışması ───────────────────────────────
  const duplicates = findNormalizedDuplicates(
    candidates.map((c) => ({ rowNum: c.rowNum, partNumber: c.partNumber }))
  );
  const duplicateRows = new Set<number>();
  for (const [, rowNums] of duplicates) {
    for (const rowNum of rowNums) duplicateRows.add(rowNum);
  }
  if (duplicateRows.size > 0) {
    for (const [, rowNums] of duplicates) {
      for (const rowNum of rowNums) {
        const existing = resultByRow.get(rowNum);
        if (!existing) continue;
        const problem = duplicateIssue(rowNums, existing.partNumber);
        existing.action = "error";
        existing.reason = problem.message;
        existing.code = problem.code;
      }
    }
  }

  const surviving = candidates.filter((c) => !duplicateRows.has(c.rowNum));

  // ── 3. geçiş: veritabanı kimlik çakışması ve insert/update sınıflaması ────
  const normalizedList = [...new Set(surviving.map((c) => c.partNumberNormalized))];
  const pnList = [...new Set(surviving.map((c) => c.partNumber))];

  /** normalize → DB'deki görünen yazım */
  const dbSpellingByNormalized = new Map<string, string>();

  if (normalizedList.length > 0) {
    const existingRows = await db
      .select({
        partNumber: products.partNumber,
        partNumberNormalized: products.partNumberNormalized,
      })
      .from(products)
      .where(
        or(
          inArray(products.partNumberNormalized, normalizedList),
          inArray(products.partNumber, pnList)
        )
      );

    for (const row of existingRows) {
      // Eski (0006 öncesi) veya hatalı import'tan kalan NULL normalize satırlar
      // için değer yazımdan yeniden türetilir.
      const key = row.partNumberNormalized ?? normalizePartNumber(row.partNumber);
      if (key) dbSpellingByNormalized.set(key, row.partNumber);
    }
  }

  const toUpsert: UpsertRow[] = [];
  for (const c of surviving) {
    const dbSpelling = dbSpellingByNormalized.get(c.partNumberNormalized);
    const result = resultByRow.get(c.rowNum);
    if (!result) continue;

    if (dbSpelling && dbSpelling !== c.partNumber) {
      const problem = clashIssue(c.partNumber, dbSpelling);
      result.action = "error";
      result.reason = problem.message;
      result.code = problem.code;
      continue;
    }

    if (dbSpelling) {
      result.action = "update";
      result.reason = result.reason
        ? `${result.reason} · Mevcut kayıt güncellenecek`
        : "Mevcut kayıt güncellenecek";
    }
    toUpsert.push(c);
  }

  const hasErrors = results.some((r) => r.action === "error");

  // ── Uygula ────────────────────────────────────────────────────────────────
  // Hata varsa HİÇBİR ŞEY yazılmaz (mevcut davranış korunuyor).
  let applied = false;
  if (!isDryRun && !hasErrors && toUpsert.length > 0) {
    const conflictSet = buildConflictSet(updatable);

    /*
     * ── NEDEN `db.batch`, `db.transaction` DEĞİL ────────────────────────────
     *
     * Bu yol `neon-http` sürücüsünü kullanıyor (src/lib/db/index.ts). O sürücü
     * durumsuz HTTP üzerinden çalışır ve `db.transaction()` çağrıldığında
     * "No transactions support in neon-http driver" hatası fırlatır — yani
     * APPLY YOLU HİÇ ÇALIŞMIYORDU (dry-run etkilenmiyordu, bu yüzden fark
     * edilmemişti).
     *
     * `db.batch([...])` tüm ifadeleri TEK HTTP isteğinde gönderir ve Neon
     * bunları sunucu tarafında TEK TRANSACTION içinde çalıştırır. Yani
     * "hepsi ya da hiçbiri" güvencesi korunur: bir parça başarısız olursa
     * hiçbiri yazılmaz.
     *
     * Sorgular önce dizi olarak KURULUR (await edilmez), sonra tek seferde
     * gönderilir.
     */
    const statements = [];
    for (let start = 0; start < toUpsert.length; start += BATCH) {
      const chunk = toUpsert.slice(start, start + BATCH);
      statements.push(
        db
          .insert(products)
          .values(
            chunk.map((v) => ({
              partNumber: v.partNumber,
              partNumberNormalized: v.partNumberNormalized,
              name: v.name,
              description: v.description,
              condition: v.condition,
              // Bilinmeyen stok INSERT'te de "stokta" sayılmaz; şema
              // varsayılanı TRUE olduğu için değer açıkça yazılır.
              inStock: v.inStock,
              weight: v.weight,
              categoryId: v.categoryId,
              notes: v.notes,
              partManufacturer: v.partManufacturer,
              sourcingType: v.sourcingType,
              stockStatus: v.stockStatus,
              // 'unknown' bir insan karari degildir, damgalanmaz.
              stockStatusUpdatedAt: v.stockStatus === "unknown" ? null : new Date(),
              shortDescription: v.shortDescription,
              longDescription: v.longDescription,
              metaTitle: v.metaTitle,
              metaDescription: v.metaDescription,
              // Faz 3 — ic stok kodu. Eslestirme anahtari DEGILDIR; upsert
              // hedefi hala products.partNumber.
              internalStockCode: v.internalStockCode,
              internalStockCodeNormalized: v.internalStockCodeNormalized,
              // seoReady YAZILMAZ -> sema varsayilani false kalir.
            }))
          )
          .onConflictDoUpdate({ target: products.partNumber, set: conflictSet })
      );
    }

    if (statements.length > 0) {
      // Tek istek, tek transaction. Hata olursa HİÇBİRİ yazılmaz.
      const yazma = await runImportBatch(statements);
      if (!yazma.ok) {
        console.error("[import/products]", yazma.detail);
        return NextResponse.json({ error: yazma.message }, { status: 500 });
      }
    }
    applied = true;
  }

  /*
   * ── Mükerrer Logo stok kodu: UYARI, HATA DEĞİL ──────────────────────────
   *
   * Kullanıcı kararı: aynı veya benzer stok koduna sahip ürünler OTOMATİK
   * BİRLEŞTİRİLMEZ ve üzerine yazılmaz. Kayıtlar ayrı kalır; operatör görür,
   * kararı insan verir. `drizzle/0010` bu yüzden benzersiz kısıt koymaz.
   *
   * Hem dosya içi hem de veritabanına karşı kontrol edilir.
   */
  const stockCodeWarnings: Array<{ normalized: string; rows: number[]; existingPartNumbers?: string[] }> = [];
  const survivingWithCode = candidates.filter(
    (c) => !duplicateRows.has(c.rowNum) && c.internalStockCodeNormalized
  );

  for (const [key, rowNums] of findInternalStockCodeDuplicates(
    survivingWithCode.map((c) => ({
      rowNum: c.rowNum,
      internalStockCodeNormalized: c.internalStockCodeNormalized,
    }))
  )) {
    stockCodeWarnings.push({ normalized: key, rows: rowNums });
  }

  const codeKeys = [...new Set(survivingWithCode.map((c) => c.internalStockCodeNormalized!))];
  if (codeKeys.length > 0) {
    const existing = await db
      .select({
        partNumber: products.partNumber,
        code: products.internalStockCodeNormalized,
      })
      .from(products)
      .where(inArray(products.internalStockCodeNormalized, codeKeys));

    const byCode = new Map<string, string[]>();
    for (const row of existing) {
      if (!row.code) continue;
      const list = byCode.get(row.code);
      if (list) list.push(row.partNumber);
      else byCode.set(row.code, [row.partNumber]);
    }
    for (const c of survivingWithCode) {
      const hits = byCode.get(c.internalStockCodeNormalized!);
      if (!hits || hits.length === 0) continue;
      // Kaydin KENDISI zaten o kodu tasiyorsa uyari uretme.
      const digerleri = hits.filter((pn) => normalizePartNumber(pn) !== c.partNumberNormalized);
      if (digerleri.length === 0) continue;
      stockCodeWarnings.push({
        normalized: c.internalStockCodeNormalized!,
        rows: [c.rowNum],
        existingPartNumbers: digerleri,
      });
    }
  }

  const summary = {
    total: rawRows.length,
    insert: results.filter((r) => r.action === "insert").length,
    update: results.filter((r) => r.action === "update").length,
    skip: results.filter((r) => r.action === "skip").length,
    error: results.filter((r) => r.action === "error").length,
    dryRun: isDryRun,
    applied,
    /** Dosyada bulunan ve bu yüzden ÜZERİNE YAZILACAK opsiyonel kolonlar. */
    writableColumns: [...updatable],
    /** Dosyada bulunup BILINCLI OLARAK yok sayilan kolonlar. */
    ignoredColumns,
    format: parsed.format,
    /**
     * Mükerrer Logo stok kodu uyarıları. Satırlar REDDEDİLMEZ ve kayıtlar
     * BİRLEŞTİRİLMEZ — operatörün elle incelemesi için bildirilir.
     */
    stockCodeWarnings,
  };

  // Public urun onbellegini dusur (2026-11-24, bulgu B1): atlanirsa
  // panelde gorunen veri ile sitede gorunen veri ayrisir.
  revalidateProducts();
  return NextResponse.json({ summary, results });
}
