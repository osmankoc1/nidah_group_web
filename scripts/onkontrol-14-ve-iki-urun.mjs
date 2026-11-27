/**
 * Tek turda ön kontrol — SALT OKUNUR.
 *
 *   1. Onay bekleyen 14 ürünün DB durumu (ad, açıklama, doğrulanmış uyum)
 *   2. 76281 / 90898 kayıtlarının tam dökümü (görsel, uyum, stok kodu)
 *   3. "CH76281" / "CH90898" normalize numaralarının boş olduğunun teyidi
 *
 * Bağlantı adresi hiçbir çıktıya yazılmaz.
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

const ONDORT = [
  "C0210-42010", "N1455-22050", "N2515-22000", "N010232438", "N030810015",
  "N1035-20150", "69404-02600", "714-12-19320", "714-12-19710", "714-16-19730",
  "CH 12119-10", "CH 12119-16", "CH 12119-20", "VOE 12727387",
];

console.log("=== 1) ONAY BEKLEYEN 14 URUN");
const a = await sql`
  SELECT p.part_number, p.name, p.is_active, p.seo_ready,
    length(coalesce(p.long_description, '')) AS uz,
    coalesce(p.long_description, '') AS mevcut,
    (SELECT count(*) FILTER (WHERE f.verified) FROM fitments f WHERE f.product_id = p.id)::int AS uyum,
    (SELECT string_agg(DISTINCT mf.name || ' ' || m.model, ', ' ORDER BY mf.name || ' ' || m.model)
       FROM fitments f JOIN machines m ON m.id = f.machine_id
       JOIN manufacturers mf ON mf.id = m.manufacturer_id
      WHERE f.product_id = p.id AND f.verified) AS makineler
  FROM products p WHERE p.part_number = ANY(${ONDORT}) ORDER BY p.part_number`;
console.log("  bulunan: " + a.length + " / 14");
for (const r of a) {
  console.log("  " + String(r.part_number).padEnd(14) + "| aktif=" + (r.is_active ? "E" : "H") +
    " seo=" + (r.seo_ready ? "E" : "H") + " | aciklama " + String(r.uz).padStart(4) +
    " kr | uyum " + r.uyum + " | " + String(r.name).slice(0, 30));
  console.log("        makine: " + (r.makineler ?? "(yok)"));
  console.log("        MEVCUT: " + r.mevcut);
}
const eksik = ONDORT.filter((p) => !a.some((r) => r.part_number === p));
if (eksik.length) console.log("  !! DB'de YOK: " + eksik.join(", "));

console.log("\n=== 2) 76281 / 90898 TAM DOKUM");
const iki = await sql`
  SELECT id, part_number, part_number_normalized, name, is_active, seo_ready,
    coalesce(description, '') AS eski_desc,
    length(coalesce(long_description, '')) AS uz,
    coalesce(internal_stock_code, '') AS stok_kodu,
    coalesce(internal_stock_code_normalized, '') AS stok_kodu_n,
    coalesce(part_manufacturer, '') AS parca_markasi,
    sourcing_type, stock_status, condition,
    coalesce(meta_title, '') AS meta_title,
    coalesce(short_description, '') AS kisa
  FROM products WHERE part_number IN ('76281', '90898') ORDER BY part_number`;
for (const x of iki) console.log("  " + JSON.stringify(x));

const ids = iki.map((x) => x.id);
console.log("\n  -- gorseller --");
const g = await sql`
  SELECT p.part_number, i.id, i.cloudinary_url, coalesce(i.alt_text, '') AS alt,
    i.is_primary, i.sort_order, i.verified, coalesce(i.source_note, '') AS kaynak
  FROM product_images i JOIN products p ON p.id = i.product_id
  WHERE i.product_id = ANY(${ids}) ORDER BY p.part_number, i.sort_order`;
for (const x of g) console.log("  " + JSON.stringify(x));

console.log("\n  -- uyumluluk --");
const f = await sql`
  SELECT p.part_number, mf.name AS marka, m.model, f.verified,
    coalesce(f.notes, '') AS not_
  FROM fitments f JOIN products p ON p.id = f.product_id
  JOIN machines m ON m.id = f.machine_id
  JOIN manufacturers mf ON mf.id = m.manufacturer_id
  WHERE f.product_id = ANY(${ids}) ORDER BY p.part_number`;
for (const x of f) console.log("  " + JSON.stringify(x));

console.log("\n=== 3) HEDEF NORMALIZE NUMARALAR BOS MU");
const c = await sql`
  SELECT part_number, part_number_normalized FROM products
  WHERE part_number_normalized IN ('CH76281', 'CH90898')`;
console.log("  cakisan kayit: " + c.length + (c.length ? " -> " + JSON.stringify(c) : " (temiz)"));

console.log("\n=== 4) OEM_NUMBERS tablosu durumu");
const o = await sql`SELECT count(*)::int AS satir FROM oem_numbers`;
console.log("  oem_numbers satir: " + o[0].satir);
