/** Kalan 22 urunun kaynak verisi — SALT OKUNUR. */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
function baglanti(d, a) {
  for (const s of readFileSync(join(homedir(), ".osko", d), "utf-8").split(/\r?\n/)) {
    const i = s.indexOf("=");
    if (i > 0 && s.slice(0, i).trim() === a) return s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("yok");
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const ONCEKI = ["76281", "90898", "DENEMEE32424"];
const ONAYLI = [
  // Grup 1
  "324-0386","58822-32300","60325-01300","60332-00700","60332-00801",
  "60425-01800","60441-10300","60463-00400","60525-02900","60525-03800",
  // Grup 2
  "60525-06300","60525-06400","60532-00100","60563-00201","60632-05500",
  "60994-00600","62625-16300","62625-35901","62663-00500","69241-03403",
];

const r = await sql`
  SELECT p.id, p.part_number, p.name, p.part_manufacturer, p.internal_stock_code,
         length(btrim(coalesce(p.long_description,'')))::int AS uz,
         btrim(coalesce(p.long_description,'')) AS mevcut
  FROM products p
  WHERE p.part_number <> ALL(${ONCEKI})
    AND length(btrim(coalesce(p.long_description,''))) BETWEEN 1 AND 299
    AND p.part_number <> ALL(${ONAYLI})
  ORDER BY p.part_number`;

console.log("KALAN:", r.length);
for (const x of r) {
  const u = await sql`
    SELECT m.model AS makine, mf.name AS uretici, f.verified
    FROM fitments f
    JOIN machines m ON m.id = f.machine_id
    LEFT JOIN manufacturers mf ON mf.id = m.manufacturer_id
    WHERE f.product_id = ${x.id}
    ORDER BY m.model`;
  const o = await sql`
    SELECT oem_number AS number, type, verified FROM oem_numbers WHERE product_id = ${x.id} ORDER BY oem_number`;
  console.log("---");
  console.log("PN=" + x.part_number);
  console.log("AD=" + x.name);
  console.log("URETICI=" + (x.part_manufacturer ?? ""));
  console.log("STOKKODU=" + (x.internal_stock_code ?? ""));
  console.log("UZ=" + x.uz);
  console.log("MAKINE=" + u.map((y) => `${y.uretici ?? "?"}/${y.makine}${y.verified ? "+" : "-"}`).join(" , "));
  console.log("OEM=" + o.map((y) => `${y.number}(${y.type}${y.verified ? "+" : "-"})`).join(" , "));
  console.log("MEVCUT=" + x.mevcut);
}
