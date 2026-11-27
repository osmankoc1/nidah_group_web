/** Grup 2 dayanaklarinin teyidi — SALT OKUNUR. */
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
  "60525-06300","60525-06400","60532-00100","60563-00201","60632-05500",
  "60994-00600","62625-16300","62625-35901","62663-00500","69241-03403",
  // komsu olarak anilanlar
  "60332-00700","60332-00801","60632-05900","69331-06900","60432-10200",
  "91831-01500","62625-06400","60525-03800","60525-02900","62625-27100",
  "92525-03800","62246-00501","C5660-07080","60325-01300","58822-32300",
];
const r = await sql`
  SELECT part_number, name, notes, length(btrim(coalesce(long_description,'')))::int AS acik_uz
  FROM products WHERE part_number = ANY(${PN}) ORDER BY part_number`;
console.log("bulunan:", r.length, "/ sorulan:", PN.length);
for (const x of r) {
  console.log(`${String(x.part_number).padEnd(14)} | ${String(x.name).slice(0,34).padEnd(34)} | ${String(x.notes ?? "").slice(0,46)}`);
}
const eksik = PN.filter((p) => !r.some((x) => x.part_number === p));
if (eksik.length) console.log("\nKAYITTA YOK:", eksik.join(", "));
