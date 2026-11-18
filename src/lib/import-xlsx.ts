/**
 * Shared utilities for admin bulk-import routes.
 * Supports: .xlsx / .xls  (via SheetJS)  and  .csv  (via papaparse).
 */
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ── Parse an uploaded File → array of plain row objects ───────────────────────

export interface ParsedUpload {
  /** Satırlar — tüm değerler trim'lenmiş METİN. */
  rows: Record<string, string>[];
  /**
   * Her satır için, KAYNAKTA sayı veya tarih tipinde olan kolon adları.
   *
   * Neden gerekli (denetim E-2): `sheet_to_json({ raw: false })` sayısal
   * hücrenin BİÇİMLENMİŞ metnini döndürür. Excel'de sayı olarak girilen
   * `0012345` → `"12345"` (baştaki sıfırlar gitti), uzun rakam dizileri
   * `"1.23457E+11"` olur. Metne bakarak kaybı anlamak imkânsızdır; hücrenin
   * TİPİNE bakmak gerekir. Bu yüzden sayfa iki kez okunur: `raw: true` tipleri,
   * `raw: false` görünen metni verir.
   *
   * CSV'de her değer zaten metindir → küme daima boştur.
   */
  numericCells: Set<string>[];
  /** Başlık satırında gerçekten bulunan kolon adları (trim'li, sırayla). */
  headers: string[];
  format: "xlsx" | "csv" | "unknown";
  error?: string;
}

const emptyUpload = (error: string): ParsedUpload => ({
  rows: [],
  numericCells: [],
  headers: [],
  format: "unknown",
  error,
});

export async function parseUploadedFile(formData: FormData): Promise<ParsedUpload> {
  const file = formData.get("file") as File | null;
  if (!file) return emptyUpload("Dosya bulunamadı.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const name   = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    try {
      const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Başlık satırı — dosyada hangi kolonların GERÇEKTEN olduğunu bilmek
      // kazara üzerine yazmayı önlemek için şart (import-validation.ts).
      const headerMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: "",
      });
      const headers = (headerMatrix[0] ?? [])
        .map((h) => String(h ?? "").trim())
        .filter((h) => h.length > 0);

      // Aynı sayfa, iki görünüm. `blankrows` varsayılanı her ikisinde de aynı
      // olduğu için satırlar birebir hizalıdır.
      const typedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        raw:    true,
        defval: "",
      });
      const textRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
        raw:    false,
        defval: "",
      });

      const rows = textRows.map((r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
        )
      );

      const numericCells = rows.map((_, i) => {
        const flagged = new Set<string>();
        const typed = typedRows[i];
        if (!typed) return flagged;
        for (const [key, value] of Object.entries(typed)) {
          if (typeof value === "number" || value instanceof Date) {
            flagged.add(key.trim());
          }
        }
        return flagged;
      });

      return { rows, numericCells, headers, format: "xlsx" };
    } catch (e) {
      return emptyUpload(`Excel parse hatası: ${(e as Error).message}`);
    }
  }

  // CSV — her değer metin olarak gelir, tip kaybı yoktur.
  const text = buffer.toString("utf-8");
  const { data, errors, meta } = Papa.parse<Record<string, string>>(text, {
    header:         true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform:       (v) => v.trim(),
  });
  if (errors.length) {
    return emptyUpload(`CSV parse hatası: ${errors[0].message}`);
  }
  return {
    rows: data,
    numericCells: data.map(() => new Set<string>()),
    headers: (meta.fields ?? []).map((f) => f.trim()).filter((f) => f.length > 0),
    format: "csv",
  };
}

// ── Build an .xlsx template Buffer ────────────────────────────────────────────

interface TemplateSpec {
  sheetName: string;
  headers:   string[];
  examples:  Record<string, string | number>[];
}

export function buildXlsxTemplate(spec: TemplateSpec): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet with header + examples
  const ws = XLSX.utils.json_to_sheet(spec.examples, { header: spec.headers });

  // Bold + background for header row
  const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font:    { bold: true, color: { rgb: "FFFFFF" } },
      fill:    { patternType: "solid", fgColor: { rgb: "1A1A2E" } },
      alignment: { horizontal: "center" },
    };
  }

  // Auto column width (max 30 chars)
  ws["!cols"] = spec.headers.map((h) => ({ wch: Math.min(30, Math.max(h.length + 4, 12)) }));

  XLSX.utils.book_append_sheet(wb, ws, spec.sheetName);
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true }));
}
