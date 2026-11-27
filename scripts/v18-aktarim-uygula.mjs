/**
 * v18 aktarım kümesini production'a PASİF ve YAYIN ONAYSIZ olarak yazar.
 *
 * VARSAYILAN: dry-run. Yazma yalnızca `--apply` ile olur.
 *
 * ── GÜVENCELER ────────────────────────────────────────────────────────────
 *   · `is_active = false` ve `seo_ready = false` AÇIKÇA yazılır (şema
 *     varsayılanı `is_active = true`'dur; ona güvenilmez).
 *   · `in_stock = false`, `stock_status = 'unknown'`: stok iddiası yok.
 *   · Açıklama, marka ve temin niteliği YAZILMAZ — doğrulanmamış iddia yok.
 *   · Tek `INSERT ... ON CONFLICT (part_number) DO NOTHING`: mevcut hiçbir
 *     kayıt değişmez, mükerrer oluşmaz.
 *   · Yazma öncesi durum ve geri dönüş SQL'i dosyaya yazılır.
 *   · Yazma sonrası sayım ve örnek kayıtlar birebir doğrulanır.
 *
 * Kullanım:
 *   node scripts/v18-aktarim-uygula.mjs                 # dry-run
 *   node scripts/v18-aktarim-uygula.mjs --apply         # yazar
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const APPLY = process.argv.includes("--apply");
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const KAYNAK = "scripts/veri/v18-aktarim-284.json";
const YEDEK = "scripts/veri/geri-donus/v18-284";

const satirlar = JSON.parse(readFileSync(KAYNAK, "utf-8"));
console.log((APPLY ? "UYGULAMA" : "PROVA (dry-run)") + " | kaynak: " + KAYNAK + " | satir: " + satirlar.length);

const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));

// ── 1. Yazma öncesi durum ─────────────────────────────────────────────────
const once = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo FROM products`;
console.log("ONCE: " + JSON.stringify(once[0]));

const normListe = satirlar.map((s) => N(s.partNumber));
const carpisan = await sql`
  SELECT part_number, part_number_normalized FROM products
  WHERE part_number_normalized = ANY(${normListe})`;
console.log("production'da ZATEN VAR olan aday: " + carpisan.length);
if (carpisan.length) {
  for (const c of carpisan.slice(0, 10)) console.log("   " + c.part_number);
}

const kodListe = satirlar.map((s) => N(s.logoKodu)).filter(Boolean);
const kodCarpisan = await sql`
  SELECT part_number, internal_stock_code FROM products
  WHERE internal_stock_code_normalized = ANY(${kodListe})`;
console.log("ayni Logo stok kodu production'da: " + kodCarpisan.length + " (uyari; birlestirme yapilmaz)");

// ── 2. Geri dönüş dosyaları ───────────────────────────────────────────────
mkdirSync(YEDEK, { recursive: true });
writeFileSync(
  join(YEDEK, "once.json"),
  JSON.stringify({ tarih: new Date().toISOString(), oncekiDurum: once[0], carpisan, kodCarpisan }, null, 1),
  "utf-8"
);
const geriSql =
  "-- v18 284 urun aktarimini GERI AL. Yalnizca bu aktarimin olusturdugu,\n" +
  "-- hala pasif ve yayin onaysiz kayitlari siler.\n" +
  "BEGIN;\n" +
  "DELETE FROM products\n WHERE is_active = false AND seo_ready = false\n   AND part_number_normalized IN (\n" +
  normListe.map((n) => "     '" + n + "'").join(",\n") +
  "\n   );\n-- Beklenen: 284 satir. Farkliysa COMMIT ETMEYIN.\nROLLBACK; -- dogruladiktan sonra COMMIT yapin\n";
writeFileSync(join(YEDEK, "geri-al.sql"), geriSql, "utf-8");
console.log("yedek ve geri donus yazildi: " + YEDEK);

if (!APPLY) {
  console.log("\nPROVA SONUCU: " + (satirlar.length - carpisan.length) + " yeni kayit olusacak, " +
    carpisan.length + " satir atlanacak. Yazma YAPILMADI.");
  process.exit(0);
}

// ── 3. Tek toplu yazma ────────────────────────────────────────────────────
const pn = satirlar.map((s) => s.partNumber);
const pnn = satirlar.map((s) => N(s.partNumber));
const ad = satirlar.map((s) => s.adTR);
const kod = satirlar.map((s) => s.logoKodu || null);
const kodn = satirlar.map((s) => (s.logoKodu ? N(s.logoKodu) : null));

const yazilan = await sql`
  INSERT INTO products (
    part_number, part_number_normalized, name,
    internal_stock_code, internal_stock_code_normalized,
    is_active, seo_ready, in_stock, stock_status, condition
  )
  SELECT t.pn, t.pnn, t.ad, t.kod, t.kodn,
         false, false, false, 'unknown', 'new'
  FROM unnest(
    ${pn}::text[], ${pnn}::text[], ${ad}::text[], ${kod}::text[], ${kodn}::text[]
  ) AS t(pn, pnn, ad, kod, kodn)
  ON CONFLICT (part_number) DO NOTHING
  RETURNING part_number`;
console.log("YAZILDI: " + yazilan.length + " kayit");
writeFileSync(
  join(YEDEK, "olusan.json"),
  JSON.stringify({ tarih: new Date().toISOString(), adet: yazilan.length, partNumbers: yazilan.map((r) => r.part_number) }, null, 1),
  "utf-8"
);

// ── 4. Yazma sonrası doğrulama ────────────────────────────────────────────
const sonra = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo FROM products`;
console.log("SONRA: " + JSON.stringify(sonra[0]));

const denetim = await sql`
  SELECT count(*)::int AS adet,
    count(*) FILTER (WHERE is_active)::int AS aktif,
    count(*) FILTER (WHERE seo_ready)::int AS seo,
    count(*) FILTER (WHERE in_stock)::int AS stokta,
    count(*) FILTER (WHERE stock_status <> 'unknown')::int AS stokIddiasi,
    count(*) FILTER (WHERE long_description IS NOT NULL)::int AS aciklamali,
    count(*) FILTER (WHERE part_manufacturer IS NOT NULL)::int AS markali,
    count(*) FILTER (WHERE name IS NULL OR btrim(name) = '')::int AS adsiz
  FROM products WHERE part_number_normalized = ANY(${pnn})`;
console.log("AKTARILAN KUMENIN DURUMU: " + JSON.stringify(denetim[0]));

const beklenen = {
  aktifArtisi: sonra[0].aktif - once[0].aktif,
  seoArtisi: sonra[0].seo - once[0].seo,
  toplamArtisi: sonra[0].toplam - once[0].toplam,
};
console.log("DEGISIM: " + JSON.stringify(beklenen));
if (beklenen.aktifArtisi !== 0 || beklenen.seoArtisi !== 0) {
  console.error("!! BEKLENMEDIK: aktif veya yayin onayli sayisi degisti. Inceleyin.");
  process.exit(1);
}
console.log("TAMAM: aktif ve yayin onayli sayilari DEGISMEDI.");
