/**
 * Deploy sonrasi production DOGRULAMASI — SALT OKUNUR.
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

// Aktarimdan ONCE var olan 3 kayit
const ONCEKI = ["76281", "90898", "DENEMEE32424"];

const [a] = await sql`
  SELECT count(*)::int AS toplam,
         count(*) FILTER (WHERE is_active)::int AS aktif,
         count(*) FILTER (WHERE NOT is_active)::int AS pasif,
         count(*) FILTER (WHERE seo_ready)::int AS seo_onayli
  FROM products`;
console.log("A) TOPLAM / AKTIF / PASIF / SEO:", JSON.stringify(a));

const [b] = await sql`
  SELECT count(*)::int AS aktarilan,
         count(*) FILTER (WHERE NOT is_active)::int AS pasif,
         count(*) FILTER (WHERE is_active)::int AS AKTIF_OLMAMALI,
         count(*) FILTER (WHERE seo_ready)::int AS SEO_OLMAMALI,
         count(*) FILTER (WHERE in_stock)::int AS STOKTA_OLMAMALI,
         count(*) FILTER (WHERE stock_status <> 'unknown')::int AS STOK_IDDIASI_OLMAMALI
  FROM products WHERE part_number <> ALL(${ONCEKI})`;
console.log("B) AKTARILAN 154         :", JSON.stringify(b));

const [c] = await sql`
  SELECT count(*)::int AS kayit FROM products WHERE part_number = ANY(${ONCEKI})`;
console.log("C) ONCEKI 3 KAYIT        :", JSON.stringify(c));

const [d] = await sql`
  SELECT count(*)::int AS dogrulanmis_fotograf FROM product_images WHERE verified`;
const [e] = await sql`
  SELECT count(*)::int AS dogrulanmis_uyumluluk FROM fitments WHERE verified`;
console.log("D) DOGRULANMIS KANIT     :", JSON.stringify({ ...d, ...e }));

const [f] = await sql`
  SELECT count(*)::int AS yayin_kapisini_gecen
  FROM products p
  WHERE p.is_active
    AND btrim(coalesce(p.part_number,'')) <> ''
    AND btrim(coalesce(p.name,'')) <> ''
    AND length(btrim(coalesce(p.long_description,''))) > 0
    AND (SELECT count(*) FROM product_images i WHERE i.product_id = p.id AND i.verified) > 0
    AND (SELECT count(*) FROM fitments ft WHERE ft.product_id = p.id AND ft.verified) > 0`;
console.log("E) YENI KAPIYI GECEN     :", JSON.stringify(f));

const [g] = await sql`
  SELECT value FROM site_settings WHERE key = 'page_parca_katalog'`;
const [h] = await sql`
  SELECT value FROM site_settings WHERE key = 'page_catalog'`;
console.log("F) KATALOG TOGGLE        :", JSON.stringify({ page_parca_katalog: g?.value ?? "(satir yok)", page_catalog: h?.value ?? "(satir yok)" }));
