/**
 * OTURUM SONU NİHAİ DENETİM — SALT OKUNUR.
 * Rapordaki her sayı buradan gelir; tahmin yoktur.
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
  throw new Error("env anahtari yok");
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));

const [a] = await sql`
  SELECT count(*)::int AS toplam,
    count(*) FILTER (WHERE is_active)::int AS aktif,
    count(*) FILTER (WHERE seo_ready)::int AS seo,
    count(*) FILTER (WHERE is_active AND seo_ready)::int AS yayinda,
    count(*) FILTER (WHERE is_active AND NOT seo_ready)::int AS aktif_ama_onaysiz,
    count(*) FILTER (WHERE seo_ready AND NOT is_active)::int AS onayli_ama_pasif,
    count(*) FILTER (WHERE length(btrim(coalesce(long_description, ''))) > 0)::int AS aciklamali,
    count(*) FILTER (WHERE part_manufacturer IS NOT NULL)::int AS markali,
    count(*) FILTER (WHERE stock_status <> 'unknown')::int AS stok_iddiasi
  FROM products`;
console.log("1) URUNLER            : " + JSON.stringify(a));

/** adYeterli() — src/lib/seo-gate.ts ile birebir aynı mantık. */
const [b] = await sql`
  WITH g AS (
    SELECT p.id, p.part_number, btrim(coalesce(p.name, '')) AS ad,
      length(btrim(coalesce(p.long_description, ''))) AS uz,
      (SELECT count(*)::int FROM fitments f WHERE f.product_id = p.id AND f.verified) AS uyum
    FROM products p
  )
  SELECT
    count(*) FILTER (
      WHERE ad <> ''
        AND regexp_replace(upper(ad), '[^A-Z0-9]', '', 'g') <> regexp_replace(upper(part_number), '[^A-Z0-9]', '', 'g')
        AND upper(ad) <> ad
        AND (array_length(regexp_split_to_array(ad, '\\s+'), 1) >= 2 OR length(ad) >= 10)
        AND uz > 0 AND uyum >= 1
    )::int AS kapiyi_gecebilen
  FROM g`;
console.log("2) YAYIN KAPISINI GECEBILEN (aktiflik haric): " + b.kapiyi_gecebilen);

const [c] = await sql`
  SELECT count(*)::int AS icerigi_tam_pasif FROM products p
  WHERE NOT p.is_active AND NOT p.seo_ready
    AND length(btrim(coalesce(p.long_description, ''))) > 0
    AND EXISTS (SELECT 1 FROM fitments f WHERE f.product_id = p.id AND f.verified)
    AND btrim(coalesce(p.name, '')) <> ''
    AND upper(btrim(p.name)) <> btrim(p.name)
    AND (array_length(regexp_split_to_array(btrim(p.name), '\\s+'), 1) >= 2 OR length(btrim(p.name)) >= 10)`;
console.log("3) ICERIGI TAM, PASIF (yayin grubu adayi): " + c.icerigi_tam_pasif);

const [d] = await sql`
  SELECT count(*)::int AS fitment, count(*) FILTER (WHERE verified)::int AS dogrulanmis FROM fitments`;
const [e] = await sql`
  SELECT count(*)::int AS gorsel, count(*) FILTER (WHERE verified)::int AS dogrulanmis FROM product_images`;
console.log("4) KANIT              : fitment " + JSON.stringify(d) + " | gorsel " + JSON.stringify(e));

const [f] = await sql`
  SELECT count(*)::int AS makine FROM machines`;
const [g] = await sql`SELECT count(*)::int AS uretici FROM manufacturers`;
console.log("5) MAKINE/URETICI     : " + JSON.stringify({ ...f, ...g }));

const iki = await sql`
  SELECT part_number, name, length(coalesce(long_description, '')) AS uz,
    is_active, seo_ready,
    (SELECT count(*)::int FROM product_images i WHERE i.product_id = products.id AND i.verified) AS gorsel_dogrulanmis,
    (SELECT count(*)::int FROM fitments ft WHERE ft.product_id = products.id AND ft.verified) AS uyum_dogrulanmis
  FROM products WHERE part_number IN ('CH 76281', 'CH 90898') ORDER BY part_number`;
console.log("6) ONCELIKLI IKI URUN :");
for (const x of iki) console.log("   " + JSON.stringify(x));

const eski = await sql`
  SELECT count(*)::int AS kalan FROM products WHERE part_number IN ('76281', '90898')`;
console.log("   eski numarali kalan kayit: " + eski[0].kalan + " (0 olmali)");

const ad = await sql`
  SELECT count(*)::int AS kume, coalesce(sum(adet), 0)::int AS satir FROM (
    SELECT count(*)::int AS adet FROM products GROUP BY lower(name) HAVING count(*) > 1) t`;
console.log("7) AD CAKISMASI (tum katalog): " + JSON.stringify(ad[0]));

const yayin = await sql`
  SELECT part_number, name FROM products WHERE is_active AND seo_ready ORDER BY part_number`;
console.log("8) YAYINDAKI " + yayin.length + " URUN:");
for (const y of yayin) console.log("   " + y.part_number.padEnd(16) + "| " + y.name);
