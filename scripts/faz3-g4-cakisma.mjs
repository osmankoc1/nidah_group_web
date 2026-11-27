/** Grup 4 ad cakismasi ortaklari + uyumluluk — SALT OKUNUR. */
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
const mc = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'machines' ORDER BY ordinal_position`;
console.log("machines: " + mc.map((x) => x.column_name).join(", "));
const ORTAK = ["69241-00901", "F2515-14000", "C0305-42010", "62663-02300", "60325-01300"];
const r = await sql`SELECT part_number, name, long_description FROM products WHERE part_number = ANY(${ORTAK}) ORDER BY part_number`;
for (const x of r) console.log("\n### " + x.part_number + " | " + x.name + "\n" + x.long_description);
const G4 = ["C0210-42010","N1455-22050","N010232438","N030810015","N1035-20150","N2515-22000","69404-02600"];
const f = await sql`
  SELECT p.part_number, count(*)::int AS adet, count(*) FILTER (WHERE f.verified)::int AS dogrulanmis,
         string_agg(DISTINCT mf.name || ' ' || m.model, ' , ') AS makineler
  FROM products p JOIN fitments f ON f.product_id = p.id JOIN machines m ON m.id = f.machine_id
  JOIN manufacturers mf ON mf.id = m.manufacturer_id
  WHERE p.part_number = ANY(${G4}) GROUP BY p.part_number ORDER BY p.part_number`;
console.log("\nG4 UYUMLULUK:");
for (const x of f) console.log("  " + String(x.part_number).padEnd(14) + "| " + x.adet + " kayit, " + x.dogrulanmis + " dogrulanmis | " + x.makineler);
