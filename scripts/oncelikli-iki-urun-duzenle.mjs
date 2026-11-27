/**
 * ÖNCELİKLİ İKİ ÜRÜN — parça numarası, ad ve açıklama düzenlemesi.
 * Kullanıcı kararı 2026-11-27: 76281 -> CH 76281, 90898 -> CH 90898.
 *
 * DEĞİŞEN      : part_number, part_number_normalized, name, long_description, notes
 * DEĞİŞMEYEN   : id, fotoğraflar, uyumluluk kayıtları, description (eski alan),
 *                is_active, seo_ready, stok alanları, part_manufacturer,
 *                sourcing_type.
 *
 * ESKİ NUMARAYLA ARAMA: `/api/products` parça numarasını NORMALİZE kolonda
 * `LIKE %terim%` ile arar. "76281" -> "CH76281" alt dizesi olduğu için eski
 * numarayla yapılan aramalar bu ürünü bulmaya DEVAM EDER. Canlıda ölçüldü:
 * "0180" araması 60425-01800 ürününü döndürüyor.
 *
 * GÜVENCELER:
 *   · Hedef kayıtların PASİF ve YAYIN ONAYSIZ olduğu şart koşulur.
 *   · Hedef normalize numaraların boş olduğu şart koşulur (mükerrer olmaz).
 *   · Yazma öncesi tam satır yedeği + geri alma SQL'i diske yazılır.
 *   · Tek ifadede atomik UPDATE; sonra birebir doğrulama.
 *   · Varsayılan dry-run; yazma yalnızca --apply ile.
 *
 * Bağlantı adresi hiçbir çıktıya yazılmaz.
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
const YEDEK = "scripts/veri/geri-donus/oncelikli-iki";
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));

const PLAN = [
  {
    eskiPn: "76281",
    yeniPn: "CH 76281",
    yeniPnn: "CH76281",
    yeniAd: "Vites kartı",
    aciklama:
      "Greyder vites kumandasında kullanılan elektronik karttır; konnektörlü " +
      "kablo demetiyle birlikte kayıtlıdır. NİDAH GROUP kataloğunda CH 76281 " +
      "numarasıyla izlenir ve 76281 numarasıyla yapılan aramalar da bu ürüne " +
      "ulaşır. Makinenizin model ve seri numarasını teklif formunda " +
      "paylaşırsanız uygunluğu teyit edip dönüş yaparız.",
    not:
      "Önceki parça numarası: 76281. 27.11.2026'da kullanıcı kararıyla " +
      "CH ön eki eklendi. Yüklü fotoğraf gerçek ürün fotoğrafıdır " +
      "(NİDAH GROUP filigranlı), doğrulama onayı BEKLİYOR.",
  },
  {
    eskiPn: "90898",
    yeniPn: "CH 90898",
    yeniPnn: "CH90898",
    yeniAd: "Vites göstergesi",
    aciklama:
      "Greyder gösterge panelinde kullanılan vites göstergesidir. NİDAH GROUP " +
      "kataloğunda CH 90898 numarasıyla izlenir ve 90898 numarasıyla yapılan " +
      "aramalar da bu ürüne ulaşır. Makinenizin model ve seri numarasını " +
      "teklif formunda paylaşırsanız uygunluğu teyit edip dönüş yaparız.",
    not:
      "Önceki parça numarası: 90898. 27.11.2026'da kullanıcı kararıyla " +
      "CH ön eki eklendi. Kayıttaki eski `description` alanı 'VOLVO 700 " +
      "SERİSİ VİTES GÖSTERGESİ' der; bu seri bilgisi DOĞRULANMADIĞI için " +
      "açıklamaya alınmadı. Yüklü görsel ÜRÜN FOTOĞRAFI DEĞİL, şirket " +
      "logosudur — doğrulanmamalı, gerçek fotoğrafla değiştirilmeli.",
  },
];

const eskiler = PLAN.map((p) => p.eskiPn);
const yeniNorm = PLAN.map((p) => p.yeniPnn);

// ── 1. Önce durum ve şartlar ───────────────────────────────────────────────
const once = await sql`
  SELECT id, part_number, part_number_normalized, name,
    coalesce(long_description, '') AS long_description,
    coalesce(notes, '') AS notes,
    is_active, seo_ready
  FROM products WHERE part_number = ANY(${eskiler}) ORDER BY part_number`;

if (once.length !== PLAN.length) {
  console.error("DURDURULDU: beklenen " + PLAN.length + " kayit, bulunan " + once.length);
  process.exit(1);
}
for (const r of once) {
  if (r.is_active || r.seo_ready) {
    console.error("DURDURULDU: " + r.part_number + " aktif veya yayin onayli. Canli kayit bu betikle degistirilmez.");
    process.exit(1);
  }
}
const carpisma = await sql`
  SELECT part_number FROM products WHERE part_number_normalized = ANY(${yeniNorm})`;
if (carpisma.length) {
  console.error("DURDURULDU: hedef normalize numara DOLU -> " + JSON.stringify(carpisma));
  process.exit(1);
}
console.log("on dogrulama TAMAM: 2 kayit, ikisi de pasif ve yayin onaysiz, hedef numaralar bos");

// ── 2. Yedek ve geri alma ──────────────────────────────────────────────────
mkdirSync(YEDEK, { recursive: true });
writeFileSync(join(YEDEK, "once.json"),
  JSON.stringify({ tarih: new Date().toISOString(), satirlar: once }, null, 1), "utf-8");
const kacis = (s) => "'" + String(s).replace(/'/g, "''") + "'";
writeFileSync(join(YEDEK, "geri-al.sql"),
  "-- Oncelikli iki urun duzenlemesini GERI AL (27.11.2026).\nBEGIN;\n" +
  once.map((r) =>
    "UPDATE products SET part_number = " + kacis(r.part_number) +
    ", part_number_normalized = " + kacis(r.part_number_normalized) +
    ", name = " + kacis(r.name) +
    ", long_description = " + (r.long_description ? kacis(r.long_description) : "NULL") +
    ", notes = " + (r.notes ? kacis(r.notes) : "NULL") +
    " WHERE id = " + kacis(r.id) + ";"
  ).join("\n") +
  "\n-- Beklenen: 2 satir. Farkliysa COMMIT ETMEYIN.\nROLLBACK; -- dogruladiktan sonra COMMIT\n",
  "utf-8");
console.log("yedek + geri alma yazildi: " + YEDEK);

if (!APPLY) {
  console.log("\nPROVA — yazma yapilmadi. Planlanan:");
  for (const p of PLAN) {
    const r = once.find((x) => x.part_number === p.eskiPn);
    console.log("  " + p.eskiPn + " -> " + p.yeniPn + " | ad: '" + r.name + "' -> '" + p.yeniAd +
      "' | aciklama: " + r.long_description.length + " -> " + p.aciklama.length + " kr");
  }
  process.exit(0);
}

// ── 3. Atomik toplu UPDATE ─────────────────────────────────────────────────
const sonuc = await sql`
  UPDATE products p SET
    part_number = t.yeni_pn,
    part_number_normalized = t.yeni_pnn,
    name = t.yeni_ad,
    long_description = t.aciklama,
    notes = t.not_,
    updated_at = now()
  FROM unnest(
    ${PLAN.map((p) => p.eskiPn)}::text[],
    ${PLAN.map((p) => p.yeniPn)}::text[],
    ${PLAN.map((p) => p.yeniPnn)}::text[],
    ${PLAN.map((p) => p.yeniAd)}::text[],
    ${PLAN.map((p) => p.aciklama)}::text[],
    ${PLAN.map((p) => p.not)}::text[]
  ) AS t(eski_pn, yeni_pn, yeni_pnn, yeni_ad, aciklama, not_)
  WHERE p.part_number = t.eski_pn
    AND p.is_active = false AND p.seo_ready = false
  RETURNING p.id, p.part_number`;
console.log("UPDATE: " + sonuc.length + " satir");

// ── 4. Doğrulama ───────────────────────────────────────────────────────────
const sonra = await sql`
  SELECT id, part_number, part_number_normalized, name,
    length(coalesce(long_description, '')) AS uz, is_active, seo_ready,
    (SELECT count(*)::int FROM product_images i WHERE i.product_id = products.id) AS gorsel,
    (SELECT count(*)::int FROM product_images i WHERE i.product_id = products.id AND i.verified) AS gorsel_dogrulanmis,
    (SELECT count(*)::int FROM fitments f WHERE f.product_id = products.id) AS uyum,
    (SELECT count(*)::int FROM fitments f WHERE f.product_id = products.id AND f.verified) AS uyum_dogrulanmis
  FROM products WHERE id = ANY(${once.map((r) => r.id)}) ORDER BY part_number`;
for (const r of sonra) console.log("  " + JSON.stringify(r));

let hata = 0;
for (const p of PLAN) {
  const r = sonra.find((x) => x.part_number === p.yeniPn);
  if (!r) { console.error("  !! " + p.yeniPn + " bulunamadi"); hata++; continue; }
  if (r.part_number_normalized !== p.yeniPnn) { console.error("  !! normalize yanlis: " + r.part_number_normalized); hata++; }
  if (r.name !== p.yeniAd) { console.error("  !! ad yanlis: " + r.name); hata++; }
  if (Number(r.uz) !== p.aciklama.length) { console.error("  !! aciklama uzunlugu: " + r.uz); hata++; }
  if (r.is_active || r.seo_ready) { console.error("  !! aktiflik/yayin degismis"); hata++; }
  if (r.gorsel_dogrulanmis !== 0 || r.uyum_dogrulanmis !== 0) { console.error("  !! dogrulama bayragi degismis"); hata++; }
}
console.log(hata === 0
  ? "TAMAM: iki kayit da dogru; fotograf ve uyumluluk DOGRULANMAMIS olarak duruyor."
  : "HATA sayisi: " + hata);
process.exit(hata === 0 ? 0 : 1);
