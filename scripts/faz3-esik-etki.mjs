/**
 * Açıklama eşiği kaldırılmasının ürün bazındaki etkisi — SALT OKUNUR.
 * Hiçbir yazma işlemi yoktur. Bağlantı adresi hiçbir çıktıya yazılmaz.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function baglanti(dosya, anahtar) {
  const metin = readFileSync(join(homedir(), ".osko", dosya), "utf-8");
  for (const satir of metin.split(/\r?\n/)) {
    const i = satir.indexOf("=");
    if (i > 0 && satir.slice(0, i).trim() === anahtar) {
      return satir.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`${anahtar} bulunamadi`);
}

const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));

const [a] = await sql`
  SELECT current_database() AS db,
         count(*)::int AS toplam,
         count(*) FILTER (WHERE long_description IS NULL OR btrim(long_description) = '')::int AS bos,
         count(*) FILTER (WHERE length(btrim(coalesce(long_description,''))) BETWEEN 1 AND 299)::int AS kisa,
         count(*) FILTER (WHERE length(btrim(coalesce(long_description,''))) >= 300)::int AS uzun,
         min(length(btrim(long_description))) FILTER (WHERE btrim(coalesce(long_description,'')) <> '')::int AS en_kisa
  FROM products`;
console.log("1) TUM URUNLER        :", JSON.stringify(a));

const [b] = await sql`
  SELECT count(*) FILTER (WHERE is_active)::int AS aktif,
         count(*) FILTER (WHERE seo_ready)::int AS seo_ready,
         count(*) FILTER (WHERE coalesce(is_synthetic,false))::int AS sentetik
  FROM products`;
console.log("2) DURUM              :", JSON.stringify(b));

const [c] = await sql`
  SELECT count(*) FILTER (WHERE eski)::int AS eski_kapi,
         count(*) FILTER (WHERE yeni)::int AS yeni_kapi
  FROM (
    SELECT (p.is_active
             AND btrim(coalesce(p.part_number,'')) <> ''
             AND btrim(coalesce(p.name,'')) <> ''
             AND length(btrim(coalesce(p.long_description,''))) >= 300
             AND (SELECT count(*) FROM product_images i WHERE i.product_id = p.id AND i.verified) > 0
             AND (SELECT count(*) FROM fitments f WHERE f.product_id = p.id AND f.verified) > 0) AS eski,
           (p.is_active
             AND btrim(coalesce(p.part_number,'')) <> ''
             AND btrim(coalesce(p.name,'')) <> ''
             AND length(btrim(coalesce(p.long_description,''))) > 0
             AND (SELECT count(*) FROM product_images i WHERE i.product_id = p.id AND i.verified) > 0
             AND (SELECT count(*) FROM fitments f WHERE f.product_id = p.id AND f.verified) > 0) AS yeni
    FROM products p
  ) x`;
console.log("3) GERCEK YAYIN KAPISI:", JSON.stringify(c));

const [d] = await sql`
  SELECT count(*)::int AS gercek_urun,
         count(*) FILTER (WHERE length(btrim(coalesce(long_description,''))) >= 300)::int AS icerik_eski,
         count(*) FILTER (WHERE length(btrim(coalesce(long_description,''))) > 0)::int AS icerik_yeni
  FROM products WHERE NOT coalesce(is_synthetic,false)`;
console.log("4) ICERIK SARTI       :", JSON.stringify(d));

const e = await sql`
  SELECT part_number, name, is_active, seo_ready
  FROM products
  WHERE long_description IS NULL OR btrim(long_description) = ''
  ORDER BY part_number`;
console.log("5) ACIKLAMASI BOS (hala engelli):");
for (const r of e) console.log("   -", r.part_number, "|", r.name, "| aktif:", r.is_active, "| seo_ready:", r.seo_ready);
