/**
 * 1-299 karakter uzun aciklamali AKTARILAN urunler — SALT OKUNUR.
 * Hicbir yazma islemi yoktur. Baglanti adresi hicbir ciktiya yazilmaz.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function baglanti(dosya, anahtar) {
  for (const s of readFileSync(join(homedir(), ".osko", dosya), "utf-8").split(/\r?\n/)) {
    const i = s.indexOf("=");
    if (i > 0 && s.slice(0, i).trim() === anahtar) {
      return s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`${anahtar} bulunamadi`);
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const ONCEKI = ["76281", "90898", "DENEMEE32424"];

const r = await sql`
  SELECT id, part_number, name, part_manufacturer,
         length(btrim(long_description))::int AS uzunluk,
         is_active, seo_ready
  FROM products
  WHERE part_number <> ALL(${ONCEKI})
    AND length(btrim(coalesce(long_description, ''))) BETWEEN 1 AND 299
  ORDER BY length(btrim(long_description)) ASC`;

console.log("TOPLAM 1-299 KARAKTER:", r.length);
console.log("");
console.log("EN KISA 12:");
console.log("uzunluk | parca no        | ad                             | aktif | seo | id");
for (const x of r.slice(0, 12)) {
  console.log(
    String(x.uzunluk).padStart(7) + " | " +
    String(x.part_number).padEnd(15) + " | " +
    String(x.name).slice(0, 30).padEnd(30) + " | " +
    String(x.is_active).padEnd(5) + " | " +
    String(x.seo_ready).padEnd(3) + " | " + x.id
  );
}
console.log("");
console.log("uzunluk dagilimi: en kisa", r[0]?.uzunluk, "/ en uzun", r[r.length - 1]?.uzunluk);
