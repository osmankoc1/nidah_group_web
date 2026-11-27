/**
 * 19 NORMALİZE NUMARA ÇAKIŞMASINI sınıflandırır ve çözülebilenleri aktarır.
 *
 * ── ÖLÇÜLEN DURUM ─────────────────────────────────────────────────────────
 * 19 küme / 38 Logo satırı. Her kümede satırlar AYNI katalog parça
 * numarasına çözülüyor; fark yalnızca Logo stok kodunun yazımında:
 *   "16001024" ↔ "VOE 16001024" · "13A0312" ↔ "13A-0312"
 *   "0501 316 591" ↔ "0501.316.591" · "CH 89160" ↔ "89160"
 * Yani kaynaktaki mükerrer KAYIT, farklı ÜRÜN değil.
 *
 * ── SINIFLANDIRMA ─────────────────────────────────────────────────────────
 *   TEK ÜRÜN      : parça numarası, teknik ad ve makine aynı; Logo kodları
 *                   noktalama/ön ek dışında aynı -> TEK ürün olarak aktarılır,
 *                   her iki Logo kodu da `notes` alanında saklanır.
 *   AYRI OLABİLİR : ad veya makine farklı -> AKTARILMAZ, insan kararı.
 *   BELİRSİZ      : kodlar normalize edildikten sonra da farklı -> AKTARILMAZ.
 *
 * "Marka belirlenemedi" ile "Volvo" farkı ÜRÜN farkı sayılmaz; bu bir
 * araştırma boşluğudur.
 *
 * Varsayılan dry-run; yazma yalnızca --apply ile.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const APPLY = process.argv.includes("--apply");
const YEDEK = "scripts/veri/geri-donus/cakisma-19";
const R = JSON.parse(readFileSync("scripts/veri/v18-cakisma-raporu.json", "utf-8"));

const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
/** Marka ön ekini (VOE/CH/SA/RM) atar: "VOE16001024" -> "16001024" */
const onEksiz = (v) => N(v).replace(/^(VOE|CH|SA|RM)/, "");

const tekUrun = [], ayriOlabilir = [], belirsiz = [];
for (const k of R) {
  const adlar = new Set(k.satirlar.map((s) => s.adTR));
  const pnler = new Set(k.satirlar.map((s) => N(s.partNumber)));
  const makineler = new Set(k.satirlar.map((s) => s.makineler || ""));
  const kodlar = new Set(k.satirlar.map((s) => onEksiz(s.logoKodu)));
  const kayit = { ...k, adlar: [...adlar], kodlar: [...kodlar] };
  if (adlar.size > 1 || makineler.size > 1) { ayriOlabilir.push(kayit); continue; }
  if (pnler.size > 1 || kodlar.size > 1) { belirsiz.push(kayit); continue; }
  tekUrun.push(kayit);
}
console.log("TEK URUN      : " + tekUrun.length + " kume / " +
  tekUrun.reduce((t, k) => t + k.satirSayisi, 0) + " Logo satiri");
console.log("AYRI OLABILIR : " + ayriOlabilir.length);
console.log("BELIRSIZ      : " + belirsiz.length);
for (const k of [...ayriOlabilir, ...belirsiz]) {
  console.log("  !! " + k.normalizeNumara + " | adlar: " + k.adlar.join(" / ") +
    " | kodlar: " + k.kodlar.join(" / "));
}

const aday = tekUrun.map((k) => {
  const s = k.satirlar[0];
  return {
    partNumber: s.partNumber,
    pnn: N(s.partNumber),
    adTR: s.adTR,
    logoKodu: s.logoKodu,
    tumKodlar: k.satirlar.map((x) => x.logoKodu),
    kimlikler: k.satirlar.map((x) => x.kimlik),
    not: "Logo'da " + k.satirSayisi + " ayri stok satiri ayni parca numarasina cozuluyor (" +
      k.satirlar.map((x) => x.logoKodu).join(" / ") + "); tek urun olarak aktarildi. " +
      "Arastirma kimlikleri: " + k.satirlar.map((x) => x.kimlik).join(", ") + ".",
  };
});
writeFileSync("scripts/veri/v18-cakisma-siniflandirma.json",
  JSON.stringify({ tekUrun, ayriOlabilir, belirsiz }, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/v18-cakisma-siniflandirma.json");

if (!aday.length) process.exit(0);

const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const varOlan = await sql`
  SELECT part_number, part_number_normalized FROM products
  WHERE part_number_normalized = ANY(${aday.map((a) => a.pnn)})`;
console.log("production'da ZATEN VAR olan: " + varOlan.length +
  (varOlan.length ? " -> " + varOlan.map((v) => v.part_number).join(", ") : " (temiz)"));
const yazilacak = aday.filter((a) => !varOlan.some((v) => v.part_number_normalized === a.pnn));
console.log("yazilacak yeni urun: " + yazilacak.length);

if (!APPLY) {
  console.log("\nPROVA — yazma yapilmadi:");
  for (const a of yazilacak) console.log("  " + a.partNumber.padEnd(16) + "| " + a.adTR +
    " | Logo: " + a.tumKodlar.join(" , "));
  process.exit(0);
}

mkdirSync(YEDEK, { recursive: true });
const once = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo FROM products`;
console.log("ONCE: " + JSON.stringify(once[0]));

const yazilan = await sql`
  INSERT INTO products (
    part_number, part_number_normalized, name,
    internal_stock_code, internal_stock_code_normalized, notes,
    is_active, seo_ready, in_stock, stock_status, condition
  )
  SELECT t.pn, t.pnn, t.ad, t.kod, t.kodn, t.not_,
         false, false, false, 'unknown', 'new'
  FROM unnest(
    ${yazilacak.map((a) => a.partNumber)}::text[],
    ${yazilacak.map((a) => a.pnn)}::text[],
    ${yazilacak.map((a) => a.adTR)}::text[],
    ${yazilacak.map((a) => a.logoKodu)}::text[],
    ${yazilacak.map((a) => N(a.logoKodu))}::text[],
    ${yazilacak.map((a) => a.not)}::text[]
  ) AS t(pn, pnn, ad, kod, kodn, not_)
  ON CONFLICT (part_number) DO NOTHING
  RETURNING part_number`;
console.log("YAZILDI: " + yazilan.length);

const sonra = await sql`SELECT count(*)::int AS toplam,
  count(*) FILTER (WHERE is_active)::int AS aktif,
  count(*) FILTER (WHERE seo_ready)::int AS seo FROM products`;
console.log("SONRA: " + JSON.stringify(sonra[0]));
if (sonra[0].aktif !== once[0].aktif || sonra[0].seo !== once[0].seo) {
  console.error("!! BEKLENMEDIK: aktif/yayin sayisi degisti"); process.exit(1);
}
writeFileSync(join(YEDEK, "olusan.json"),
  JSON.stringify({ tarih: new Date().toISOString(), partNumbers: yazilan.map((r) => r.part_number) }, null, 1), "utf-8");
writeFileSync(join(YEDEK, "geri-al.sql"),
  "-- 19 cakisma kumesinden aktarilan urunleri GERI AL.\nBEGIN;\nDELETE FROM products\n" +
  " WHERE is_active = false AND seo_ready = false AND part_number IN (\n" +
  yazilan.map((r) => "   '" + r.part_number.replace(/'/g, "''") + "'").join(",\n") +
  "\n );\n-- Beklenen: " + yazilan.length + " satir.\nROLLBACK; -- dogruladiktan sonra COMMIT\n", "utf-8");
console.log("TAMAM: aktif ve yayin onayli sayilari DEGISMEDI. Geri donus: " + YEDEK);
