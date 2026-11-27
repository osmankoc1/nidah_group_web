/**
 * Aktarım sonrası kalite denetimi + yayın grubu adaylarını ölçer. SALT OKUNUR.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function baglanti(dosya, anahtar) {
  for (const satir of readFileSync(join(homedir(), ".osko", dosya), "utf-8").split(/\r?\n/)) {
    const i = satir.indexOf("=");
    if (i > 0 && satir.slice(0, i).trim() === anahtar) {
      return satir.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("env anahtari yok");
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const yeni = JSON.parse(readFileSync("scripts/veri/geri-donus/v18-284/olusan.json", "utf-8")).partNumbers;

console.log("=== 1) AKTARILAN 284 KUMESI");
const a = await sql`
  SELECT count(*)::int AS adet,
    count(*) FILTER (WHERE is_active)::int AS aktif,
    count(*) FILTER (WHERE seo_ready)::int AS seo,
    count(*) FILTER (WHERE internal_stock_code IS NOT NULL)::int AS logoKodu,
    count(*) FILTER (WHERE part_number_normalized IS NULL)::int AS normalizeBos,
    count(DISTINCT part_number_normalized)::int AS benzersizNorm,
    count(DISTINCT name)::int AS benzersizAd,
    min(length(name))::int AS adEnKisa, max(length(name))::int AS adEnUzun
  FROM products WHERE part_number = ANY(${yeni})`;
console.log("  " + JSON.stringify(a[0]));

console.log("\n=== 2) MUKERRER AD (aktarilan kume icinde, en kalabalik 10)");
const m = await sql`
  SELECT name, count(*)::int AS adet, string_agg(part_number, ' , ' ORDER BY part_number) AS pnler
  FROM products WHERE part_number = ANY(${yeni})
  GROUP BY name HAVING count(*) > 1 ORDER BY count(*) DESC, name LIMIT 10`;
for (const r of m) console.log("  " + String(r.adet) + "x " + String(r.name).slice(0, 44).padEnd(46) + "| " + String(r.pnler).slice(0, 70));
const mAdet = await sql`
  SELECT count(*)::int AS kume, coalesce(sum(adet), 0)::int AS satir FROM (
    SELECT count(*)::int AS adet FROM products WHERE part_number = ANY(${yeni})
    GROUP BY name HAVING count(*) > 1) t`;
console.log("  mukerrer ad kumesi: " + mAdet[0].kume + " | kapsadigi satir: " + mAdet[0].satir);

console.log("\n=== 3) TUM KATALOG — yayin olcutleri");
const t = await sql`
  SELECT count(*)::int AS toplam,
    count(*) FILTER (WHERE length(btrim(coalesce(long_description, ''))) > 0)::int AS aciklamali,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM fitments f WHERE f.product_id = products.id AND f.verified))::int AS uyumlu,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM product_images g WHERE g.product_id = products.id AND g.verified))::int AS gorselli
  FROM products`;
console.log("  " + JSON.stringify(t[0]));

console.log("\n=== 4) SIRADAKI YAYIN GRUBU ADAYLARI (pasif ama icerik tam)");
const g = await sql`
  SELECT p.part_number, p.name, length(p.long_description) AS uz
  FROM products p
  WHERE NOT p.is_active AND NOT p.seo_ready
    AND length(btrim(coalesce(p.long_description, ''))) > 0
    AND EXISTS (SELECT 1 FROM fitments f WHERE f.product_id = p.id AND f.verified)
    AND array_length(regexp_split_to_array(btrim(p.name), '\\s+'), 1) >= 2
  ORDER BY p.part_number`;
console.log("  aday: " + g.length);
for (const r of g.slice(0, 15)) console.log("    " + String(r.part_number).padEnd(14) + "| " + String(r.uz).padStart(4) + " kr | " + r.name);
if (g.length > 15) console.log("    ... (" + (g.length - 15) + " tane daha)");

console.log("\n=== 5) 284'UN YAYIN ICIN EKSIGI");
const e = await sql`
  SELECT
    count(*) FILTER (WHERE length(btrim(coalesce(long_description, ''))) = 0)::int AS aciklamaYok,
    count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM fitments f WHERE f.product_id = products.id AND f.verified))::int AS uyumYok
  FROM products WHERE part_number = ANY(${yeni})`;
console.log("  " + JSON.stringify(e[0]));
