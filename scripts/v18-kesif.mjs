/** v18 yapisini olcer. SALT OKUNUR — yalnizca yerel xlsx okur. */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
console.log("SAYFALAR:");
for (const ad of wb.SheetNames) {
  const j = XLSX.utils.sheet_to_json(wb.Sheets[ad], { raw: false, defval: "" });
  console.log("\n### " + ad + "  (" + j.length + " satir)");
  if (j.length) console.log("    kolonlar: " + Object.keys(j[0]).join(" | "));
}
