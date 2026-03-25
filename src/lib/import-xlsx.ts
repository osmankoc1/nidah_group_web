/**
 * Shared utilities for admin bulk-import routes.
 * Supports: .xlsx / .xls  (via SheetJS)  and  .csv  (via papaparse).
 */
import * as XLSX from "xlsx";
import Papa from "papaparse";

// ── Parse an uploaded File → array of plain row objects ───────────────────────

export async function parseUploadedFile(
  formData: FormData
): Promise<{ rows: Record<string, string>[]; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { rows: [], error: "Dosya bulunamadı." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const name   = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    try {
      const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
        raw:    false,
        defval: "",
        header: undefined, // use first row as headers
      });
      // Trim all string values and header keys
      return {
        rows: rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
          )
        ),
      };
    } catch (e) {
      return { rows: [], error: `Excel parse hatası: ${(e as Error).message}` };
    }
  }

  // CSV fallback
  const text = buffer.toString("utf-8");
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header:         true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform:       (v) => v.trim(),
  });
  if (errors.length) {
    return { rows: [], error: `CSV parse hatası: ${errors[0].message}` };
  }
  return { rows: data };
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
