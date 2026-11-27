/**
 * Aktarılan 284 ürünün AD ÇAKIŞMALARINI, v18'de GERÇEKTEN bulunan ayırt
 * edici verilerle çözer.
 *
 * ── ÖLÇÜLEN DURUM ─────────────────────────────────────────────────────────
 * 45 çakışma kümesi / 117 ürün. v18'de üç aday ayırt edici var:
 *   · Teknik Kategori        — ör. "Güç aktarımı" ↔ "Yürüyüş ve şasi"
 *   · Kanıtlı Makine Modeli  — yalnızca 33 üründe dolu
 *   · Marka İpucu            — KULLANILMAZ: kümelerin çoğunda fark
 *     "Volvo" ile "Marka belirlenemedi" arasındadır. Bu teknik bir ayrım
 *     değil, araştırma boşluğudur; ada yazmak yanıltıcı olur.
 *
 * ── KURAL ─────────────────────────────────────────────────────────────────
 * Bir kümeye ek YALNIZCA o ek kümenin TAMAMINI benzersiz yapıyorsa uygulanır.
 * Yarım çözüm uygulanmaz. Çözülemeyen kümeler olduğu gibi bırakılır ve
 * araştırma kuyruğuna yazılır — uydurma ayrım üretilmez. Parça numarası
 * zaten benzersizdir ve asıl ayırt edicidir.
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
const YEDEK = "scripts/veri/geri-donus/ad-ayristirma-284";
const kumeler = JSON.parse(readFileSync("scripts/veri/v18-ad-cakismasi.json", "utf-8"));

const kucuk = (s) => s.charAt(0).toLocaleLowerCase("tr-TR") + s.slice(1);
/** "Champion 720A | Champion 780A" -> "Champion 720A/780A" (kısa seri etiketi) */
function makineEtiketi(ham) {
  const parcalar = ham.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parcalar.length) return "";
  const marka = parcalar[0].split(/\s+/)[0];
  const modeller = parcalar.map((p) => p.split(/\s+/).slice(1).join(" ")).filter(Boolean);
  return modeller.length ? marka + " " + modeller.join("/") : marka;
}

const plan = [];
const cozulemeyen = [];

for (const k of kumeler) {
  const adaylar = [
    (u) => (u.kategori ? " — " + kucuk(u.kategori) : ""),
    (u) => (u.makineler ? " — " + makineEtiketi(u.makineler) : ""),
    (u) => {
      const a = u.kategori ? " — " + kucuk(u.kategori) : "";
      const m = u.makineler ? " (" + makineEtiketi(u.makineler) + ")" : "";
      return a + m;
    },
  ];
  let secilen = null;
  for (const f of adaylar) {
    const yeniAdlar = k.uyeler.map((u) => (u.ad + f(u)).trim());
    const hepsiEk = yeniAdlar.every((a, i) => a !== k.uyeler[i].ad);
    const benzersiz = new Set(yeniAdlar.map((a) => a.toLocaleLowerCase("tr-TR"))).size === yeniAdlar.length;
    if (hepsiEk && benzersiz) { secilen = { f, yeniAdlar }; break; }
  }
  if (!secilen) {
    cozulemeyen.push({ ad: k.ad, adet: k.adet, partNumbers: k.uyeler.map((u) => u.partNumber) });
    continue;
  }
  k.uyeler.forEach((u, i) => {
    plan.push({ partNumber: u.partNumber, eskiAd: u.ad, yeniAd: secilen.yeniAdlar[i] });
  });
}

console.log("cakisma kumesi      : " + kumeler.length);
console.log("cozulen kume        : " + (kumeler.length - cozulemeyen.length) +
  " | etkilenen urun: " + plan.length);
console.log("cozulemeyen kume    : " + cozulemeyen.length +
  " | kapsadigi urun: " + cozulemeyen.reduce((t, c) => t + c.adet, 0));

// Ad uzunluk sınırı (products.name varchar 255) ve kalite sağlaması
for (const p of plan) {
  if (p.yeniAd.length > 200) { console.error("DURDURULDU: ad cok uzun -> " + p.yeniAd); process.exit(1); }
  if (p.yeniAd.split(/\s+/).length < 2) { console.error("DURDURULDU: ad tek kelime -> " + p.yeniAd); process.exit(1); }
}

console.log("\n=== COZULEN (ilk 20)");
for (const p of plan.slice(0, 20)) {
  console.log("  " + p.partNumber.padEnd(16) + "| " + p.eskiAd + "  ->  " + p.yeniAd);
}
console.log("\n=== COZULEMEYEN KUMELER (ayirt edici veri yok — arastirma kuyruguna)");
for (const c of cozulemeyen) {
  console.log("  " + String(c.adet) + "x " + c.ad.padEnd(40).slice(0, 40) + "| " +
    c.partNumbers.join(", ").slice(0, 90));
}

mkdirSync(YEDEK, { recursive: true });
writeFileSync("scripts/veri/ad-ayristirma-plani.json",
  JSON.stringify({ plan, cozulemeyen }, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/ad-ayristirma-plani.json");

if (!APPLY) { console.log("PROVA — yazma yapilmadi."); process.exit(0); }
if (!plan.length) { console.log("Yazilacak bir sey yok."); process.exit(0); }

const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const pnler = plan.map((p) => p.partNumber);

const once = await sql`
  SELECT id, part_number, name, is_active, seo_ready
  FROM products WHERE part_number = ANY(${pnler})`;
if (once.length !== plan.length) {
  console.error("DURDURULDU: " + once.length + " / " + plan.length + " kayit bulundu");
  process.exit(1);
}
const canli = once.filter((r) => r.is_active || r.seo_ready);
if (canli.length) {
  console.error("DURDURULDU: " + canli.length + " kayit aktif/yayinda. Bu betik yalnizca pasif kayit duzenler.");
  process.exit(1);
}
for (const r of once) {
  const p = plan.find((x) => x.partNumber === r.part_number);
  if (r.name !== p.eskiAd) {
    console.error("DURDURULDU: " + r.part_number + " DB adi plandakiyle ayni degil ('" + r.name + "')");
    process.exit(1);
  }
}
writeFileSync(join(YEDEK, "once.json"),
  JSON.stringify({ tarih: new Date().toISOString(), satirlar: once }, null, 1), "utf-8");
const kacis = (s) => "'" + String(s).replace(/'/g, "''") + "'";
writeFileSync(join(YEDEK, "geri-al.sql"),
  "-- 284 kumesindeki ad ayristirmasini GERI AL.\nBEGIN;\n" +
  once.map((r) => "UPDATE products SET name = " + kacis(r.name) + " WHERE id = " + kacis(r.id) + ";").join("\n") +
  "\n-- Beklenen: " + once.length + " satir.\nROLLBACK; -- dogruladiktan sonra COMMIT\n", "utf-8");
console.log("yedek + geri alma yazildi: " + YEDEK);

const sonuc = await sql`
  UPDATE products p SET name = t.yeni_ad, updated_at = now()
  FROM unnest(${pnler}::text[], ${plan.map((x) => x.yeniAd)}::text[]) AS t(pn, yeni_ad)
  WHERE p.part_number = t.pn AND p.is_active = false AND p.seo_ready = false
  RETURNING p.part_number`;
console.log("UPDATE: " + sonuc.length + " satir");

const sonra = await sql`
  SELECT count(*)::int AS adet FROM products WHERE part_number = ANY(${pnler})
    AND name = ANY(${plan.map((x) => x.yeniAd)})`;
console.log("dogrulama: " + sonra[0].adet + " / " + plan.length + " yeni ad yerinde");
