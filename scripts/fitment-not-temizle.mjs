/**
 * Bu oturumda yazılan 47 fitment kaydının NOT alanını temizler.
 *
 * NEDEN: `fitments.notes` PUBLIC ürün sayfasında gösteriliyor
 * (`(public)/parca-katalog/[slug]/page.tsx:222`). İlk yazımda bu alana
 * "Kanit duzeyi: Güçlü eşleşme" ve kaynak URL'si (scribd bağlantısı) da
 * konmuştu — bunlar İÇ araştırma yorumudur, müşteri karşısına çıkmamalı.
 *
 * SONRASI:
 *   notes  -> yalnızca müşteriye dönük bilgi: "Katalog kapsamı: <seri no>".
 *             Böyle bir bilgi yoksa NULL.
 *   source -> iç köken kaydı: "v18 arastirma / <kimlik> / <kanit duzeyi>".
 *             Bu alan public yüzeyde RENDER EDİLMİYOR (ölçüldü).
 *
 * Kaynak URL'leri veritabanından çıkarılır; git'te izlenen
 * scripts/veri/v18-uyumluluk-284.json içinde durmaya devam eder.
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
const YEDEK = "scripts/veri/geri-donus/fitment-not-temizlik";
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const ids = JSON.parse(readFileSync("scripts/veri/geri-donus/uyumluluk-284/olusan.json", "utf-8")).ids;
console.log("hedef fitment: " + ids.length);

const once = await sql`
  SELECT id, coalesce(notes, '') AS notes, coalesce(source, '') AS source
  FROM fitments WHERE id = ANY(${ids})`;
if (once.length !== ids.length) {
  console.error("DURDURULDU: " + once.length + " / " + ids.length + " kayit bulundu");
  process.exit(1);
}

const KAPSAM = /Seri kapsami:\s*([^|]+)/;
const KANIT = /Kanit duzeyi:\s*([^|]+)/;
const plan = once.map((r) => {
  // "HMK 600MG: 1GCI0003 · belge kapsamı" -> "HMK 600MG: 1GCI0003"
  const kapsam = (KAPSAM.exec(r.notes)?.[1] ?? "").split("·")[0].trim();
  const kanit = (KANIT.exec(r.notes)?.[1] ?? "").trim();
  return {
    id: r.id,
    yeniNot: kapsam ? "Katalog kapsamı: " + kapsam : null,
    yeniKaynak: (r.source + (kanit ? " / " + kanit : "")).slice(0, 255),
  };
});
const urlKalan = plan.filter((p) => p.yeniNot && /https?:\/\//.test(p.yeniNot));
if (urlKalan.length) { console.error("DURDURULDU: yeni notta URL kalmis: " + urlKalan.length); process.exit(1); }

console.log("notu dolacak : " + plan.filter((p) => p.yeniNot).length);
console.log("notu NULL    : " + plan.filter((p) => !p.yeniNot).length);
console.log("ornek:");
for (const p of plan.slice(0, 4)) {
  console.log("  not='" + (p.yeniNot ?? "(NULL)") + "' | kaynak='" + p.yeniKaynak + "'");
}

if (!APPLY) { console.log("\nPROVA — yazma yapilmadi."); process.exit(0); }

mkdirSync(YEDEK, { recursive: true });
writeFileSync(join(YEDEK, "once.json"),
  JSON.stringify({ tarih: new Date().toISOString(), satirlar: once }, null, 1), "utf-8");

const sonuc = await sql`
  UPDATE fitments f SET notes = nullif(t.not_, ''), source = t.kaynak
  FROM unnest(
    ${plan.map((p) => p.id)}::text[],
    ${plan.map((p) => p.yeniNot ?? "")}::text[],
    ${plan.map((p) => p.yeniKaynak)}::text[]
  ) AS t(id, not_, kaynak)
  WHERE f.id = t.id::uuid
  RETURNING f.id`;
console.log("UPDATE: " + sonuc.length + " satir");

const [kalan] = await sql`
  SELECT count(*)::int AS urlli FROM fitments WHERE notes ILIKE '%http%'`;
console.log("TUM fitments icinde notunda URL gecen: " + kalan.urlli + " (0 olmali)");
const [kanitli] = await sql`
  SELECT count(*)::int AS adet FROM fitments WHERE notes ILIKE '%kanit duzeyi%'`;
console.log("notunda 'Kanit duzeyi' gecen: " + kanitli.adet + " (0 olmali)");
process.exit(kalan.urlli === 0 && kanitli.adet === 0 ? 0 : 1);
