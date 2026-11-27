/**
 * Katalog toggle'ı AÇILMADAN ÖNCE son ön kontrol. SALT OKUNUR.
 *
 * Ölçülenler:
 *   1. Yayına girecek ürün kümesi (is_active VE seo_ready) — tam liste
 *   2. Yayın onayı OLMADAN aktif olan ürün var mı (olmamalı)
 *   3. Aktif olmadan yayın onaylı ürün var mı (olmamalı)
 *   4. Yayına girecek her ürün gerçek yayın kapısından geçiyor mu
 *   5. Sitemap'e girecek ürün sayısı ve görsel sayısı
 *   6. 76281 / 90898 kayıtlarının güncel durumu
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

const d = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo,
  count(*) FILTER (WHERE is_active AND seo_ready)::int AS yayinda,
  count(*) FILTER (WHERE is_active AND NOT seo_ready)::int AS aktifAmaOnaysiz,
  count(*) FILTER (WHERE seo_ready AND NOT is_active)::int AS onayliAmaPasif
  FROM products`;
console.log("1-3) GENEL: " + JSON.stringify(d[0]));

const yayin = await sql`
  SELECT p.part_number, p.name,
    length(coalesce(p.long_description, '')) AS uz,
    (SELECT count(*) FILTER (WHERE f.verified) FROM fitments f WHERE f.product_id = p.id)::int AS uyum,
    (SELECT count(*) FILTER (WHERE g.verified) FROM product_images g WHERE g.product_id = p.id)::int AS gorsel
  FROM products p WHERE p.is_active AND p.seo_ready ORDER BY p.part_number`;
console.log("\n4) YAYINA GIRECEK " + yayin.length + " URUN:");
let kapiSorunu = 0;
for (const u of yayin) {
  const ad = String(u.name ?? "").trim();
  const kelime = ad.split(/\s+/).filter(Boolean).length;
  const harfler = ad.replace(/[^A-Za-zÇĞİIÖŞÜçğıiöşü]/g, "");
  const adYeterli =
    ad !== "" &&
    !(harfler && harfler === harfler.toLocaleUpperCase("tr-TR")) &&
    ad.replace(/[^A-Za-z0-9]/g, "").toUpperCase() !==
      String(u.part_number).replace(/[^A-Za-z0-9]/g, "").toUpperCase() &&
    (kelime >= 2 || ad.length >= 10);
  const gecer = adYeterli && u.uz > 0 && u.uyum >= 1;
  if (!gecer) kapiSorunu++;
  console.log(
    "  " + (gecer ? "GECER" : "!!KAPI") + "  " + String(u.part_number).padEnd(14) +
    "| aciklama " + String(u.uz).padStart(4) + " kr | uyum " + u.uyum +
    " | gorsel " + u.gorsel + " | " + u.name
  );
}
console.log("  kapi sorunu olan: " + kapiSorunu);

const sm = await sql`
  SELECT count(*)::int AS urun FROM products WHERE is_active AND seo_ready`;
const smg = await sql`
  SELECT count(*)::int AS gorsel FROM product_images g
  JOIN products p ON p.id = g.product_id
  WHERE p.is_active AND p.seo_ready AND g.verified`;
console.log("\n5) SITEMAP: urun URL " + sm[0].urun + " | gorsel girisi " + smg[0].gorsel);

const iki = await sql`
  SELECT part_number, name, is_active, seo_ready,
    length(coalesce(long_description, '')) AS uz, coalesce(description, '') AS eski
  FROM products WHERE part_number IN ('76281', '90898') ORDER BY part_number`;
console.log("\n6) 76281 / 90898:");
for (const x of iki) {
  console.log("  " + String(x.part_number).padEnd(8) + "| aktif=" + x.is_active +
    " seo=" + x.seo_ready + " | ad='" + x.name + "' | uzun=" + x.uz + " kr" +
    " | eski description='" + x.eski + "'");
}
