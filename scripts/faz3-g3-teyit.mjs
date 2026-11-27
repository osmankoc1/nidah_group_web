/** Grup 3 komsu kalem teyidi — SALT OKUNUR. */
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
const PN = [
  "69331-03400","69331-03500","92525-03800","N3012-08523",
  "C5563-70280","N3153-05500","N3153-06500","N3153-13000",
  "60332-01400","60431-02901","60525-05300","44716-28500",
  "60463-00400","62625-35901",
];
const r = await sql`SELECT part_number, name FROM products WHERE part_number = ANY(${PN}) ORDER BY part_number`;
console.log("bulunan " + r.length + "/" + PN.length);
for (const x of r) console.log("  " + String(x.part_number).padEnd(14) + "| " + x.name);
const eksik = PN.filter((p) => !r.some((x) => x.part_number === p));
if (eksik.length) console.log("KAYITTA YOK: " + eksik.join(", "));
// Ayni adli urunler — catisma haritasi
const c = await sql`
  SELECT name, count(*)::int AS adet, string_agg(part_number, ' , ' ORDER BY part_number) AS pnler
  FROM products GROUP BY name HAVING count(*) > 1 ORDER BY count(*) DESC, name`;
console.log("\nAYNI ADI TASIYAN URUN GRUPLARI:");
for (const x of c) console.log("  " + String(x.adet) + "x " + String(x.name).padEnd(30) + "| " + x.pnler);
