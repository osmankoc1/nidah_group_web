/** 76281 / 90898 kayit denetimi — SALT OKUNUR. */
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
const kol = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position`;
console.log("products kolonlari:\n  " + kol.map((x) => x.column_name).join(", "));

console.log("\n=== 76281 / 90898 iceren TUM kayitlar (normalize arama)");
const r = await sql`
  SELECT id, part_number, part_number_normalized, name, is_active, seo_ready, stock_status,
         created_at, updated_at, length(coalesce(long_description,'')) AS uz,
         coalesce(short_description,'') AS kisa, coalesce(long_description,'') AS uzun
  FROM products
  WHERE part_number_normalized LIKE '%76281%' OR part_number_normalized LIKE '%90898%'
  ORDER BY part_number`;
for (const x of r) {
  console.log("\n--- " + x.part_number + "  (norm: " + x.part_number_normalized + ")");
  console.log("    ad='" + x.name + "' | aktif=" + x.is_active + " | seo_ready=" + x.seo_ready + " | stok=" + x.stock_status);
  console.log("    olusturma=" + x.created_at + " | guncelleme=" + x.updated_at);
  console.log("    kisa='" + x.kisa + "'");
  console.log("    uzun(" + x.uz + ")='" + String(x.uzun).slice(0, 200) + "'");
  const f = await sql`SELECT count(*)::int AS adet, count(*) FILTER (WHERE verified)::int AS dogru FROM fitments WHERE product_id = ${x.id}`;
  const g = await sql`SELECT count(*)::int AS adet, count(*) FILTER (WHERE verified)::int AS dogru FROM product_images WHERE product_id = ${x.id}`;
  const o = await sql`SELECT oem_number, type FROM oem_numbers WHERE product_id = ${x.id}`;
  console.log("    uyumluluk: " + f[0].adet + " (dogrulanmis " + f[0].dogru + ") | gorsel: " + g[0].adet + " (dogrulanmis " + g[0].dogru + ") | oem: " + (o.map((y) => y.oem_number + "/" + y.type).join(", ") || "yok"));
}
console.log("\n=== 'vites' veya 'kart' veya 'gosterge' adli kayitlar");
const v = await sql`SELECT part_number, name, is_active FROM products
  WHERE lower(name) LIKE '%vites%' OR lower(name) LIKE '%kart%' OR lower(name) LIKE '%göster%'
     OR lower(name) LIKE '%kit%' OR lower(name) LIKE '%gaude%' ORDER BY name`;
for (const x of v) console.log("  " + String(x.part_number).padEnd(16) + "| aktif=" + x.is_active + " | " + x.name);

console.log("\n=== GENEL DURUM");
const d = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo,
  count(*) FILTER (WHERE is_active AND seo_ready)::int AS yayinda FROM products`;
console.log("  " + JSON.stringify(d[0]));
const akt = await sql`SELECT part_number, name, is_active, seo_ready FROM products WHERE is_active OR seo_ready ORDER BY part_number`;
console.log("  aktif/seo kayitlar:");
for (const x of akt) console.log("    " + String(x.part_number).padEnd(16) + "| aktif=" + x.is_active + " seo=" + x.seo_ready + " | " + x.name);
