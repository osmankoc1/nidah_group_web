/** Grup 4 kaynak teyidi — SALT OKUNUR. */
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
const G4 = ["C0210-42010","N1455-22050","N010232438","N030810015","N1035-20150","N2515-22000","69404-02600"];
const KOMSU = ["62663-00500","62246-00501","44716-28500","C5660-07080","N2305-22000","60463-00400",
  "N3153-13000","60563-10100","60563-00201","61963-10400","60482-00500","61382-01000",
  "60525-01700","60525-12300","C5621-00300","60325-01300","69241-00901","69241-03403","58822-32300"];
const r = await sql`SELECT part_number, name, long_description, is_active, seo_ready
                    FROM products WHERE part_number = ANY(${[...G4, ...KOMSU]}) ORDER BY part_number`;
console.log("bulunan " + r.length + "/" + (G4.length + KOMSU.length));
for (const x of r) console.log("  " + String(x.part_number).padEnd(14) + "| aktif=" + x.is_active + " seo=" + x.seo_ready + " uz=" + String((x.long_description || "").length).padStart(4) + " | " + x.name);
const eksik = [...G4, ...KOMSU].filter((p) => !r.some((x) => x.part_number === p));
if (eksik.length) console.log("KAYITTA YOK: " + eksik.join(", "));

// G4 adlarinin catisma haritasi
const adlar = r.filter((x) => G4.includes(x.part_number)).map((x) => x.name);
const c = await sql`
  SELECT name, count(*)::int AS adet, string_agg(part_number, ' , ' ORDER BY part_number) AS pnler
  FROM products WHERE name = ANY(${adlar}) GROUP BY name ORDER BY name`;
console.log("\nG4 ADLARININ TAM CAKISMA HARITASI:");
for (const x of c) console.log("  " + String(x.adet) + "x " + String(x.name).padEnd(28) + "| " + x.pnler);

// benzer adlar (plaka / pul / somun / civata aileleri)
for (const kalip of ["%plaka%", "%pul%", "%somun%", "%cıvata%", "%saplama%"]) {
  const s = await sql`SELECT part_number, name FROM products WHERE lower(name) LIKE ${kalip} ORDER BY name, part_number`;
  console.log("\nAILE " + kalip + " (" + s.length + "):");
  for (const x of s) console.log("    " + String(x.part_number).padEnd(14) + "| " + x.name);
}
// G4 uyumluluk dogrulamasi
const f = await sql`
  SELECT p.part_number, count(*)::int AS adet, count(*) FILTER (WHERE f.verified)::int AS dogrulanmis,
         string_agg(DISTINCT m.brand || ' ' || m.model, ' , ') AS makineler
  FROM products p JOIN fitments f ON f.product_id = p.id JOIN machines m ON m.id = f.machine_id
  WHERE p.part_number = ANY(${G4}) GROUP BY p.part_number ORDER BY p.part_number`;
console.log("\nG4 UYUMLULUK:");
for (const x of f) console.log("  " + String(x.part_number).padEnd(14) + "| " + x.adet + " kayit, " + x.dogrulanmis + " dogrulanmis | " + x.makineler);
