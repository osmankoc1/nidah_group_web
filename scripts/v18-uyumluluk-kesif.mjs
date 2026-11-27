/**
 * v18 "Kanıtlı Makine Modelleri" alanının KANIT DEĞERİNİ ölçer. SALT OKUNUR.
 *
 * Soru: `Web Katalog Adayları`.`Kanıtlı Makine Modelleri` alanı, `Makine
 * Uyumluluğu` sayfasındaki `Uyum Kanıtı` değerleriyle tutarlı mı? Eğer bu
 * alan "Olası eşleşme" satırlarından da besleniyorsa `verified = true`
 * yazmak YANLIŞ olur.
 *
 * ÇIKTI: scripts/veri/v18-uyumluluk-284.json (aktarıma hazır küme)
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const S = (r, c) => String(r[c] ?? "").trim();
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });

const WK = sh("Web Katalog Adayları");
const UY = sh("Makine Uyumluluğu");

// ── 1. Uyum Kanıtı değer dağılımı ─────────────────────────────────────────
const kanitDagilim = new Map();
for (const r of UY) {
  const k = S(r, "Uyum Kanıtı") || "(bos)";
  kanitDagilim.set(k, (kanitDagilim.get(k) ?? 0) + 1);
}
console.log("=== Makine Uyumlulugu / 'Uyum Kaniti' dagilimi (" + UY.length + " satir)");
for (const [k, v] of [...kanitDagilim].sort((a, b) => b[1] - a[1])) {
  console.log("  " + String(v).padStart(5) + "  " + k);
}

// ── 2. Kimlik bazında: kanıt türleri vs "Kanıtlı Makine Modelleri" dolu mu ─
const kanitByKimlik = new Map();
for (const r of UY) {
  const k = S(r, "Araştırma Kimliği");
  if (!k) continue;
  if (!kanitByKimlik.has(k)) kanitByKimlik.set(k, new Set());
  kanitByKimlik.get(k).add(S(r, "Uyum Kanıtı") || "(bos)");
}
const capraz = new Map();
for (const r of WK) {
  const k = S(r, "Araştırma Kimliği");
  const dolu = S(r, "Kanıtlı Makine Modelleri") ? "KANITLI-DOLU" : "kanitli-bos";
  const turler = [...(kanitByKimlik.get(k) ?? ["(uyum satiri yok)"])].sort().join(" + ");
  const anahtar = dolu + " <- " + turler;
  capraz.set(anahtar, (capraz.get(anahtar) ?? 0) + 1);
}
console.log("\n=== 'Kanitli Makine Modelleri' DOLU/BOS  x  o kimligin Uyum Kaniti turleri");
for (const [k, v] of [...capraz].sort((a, b) => b[1] - a[1])) {
  console.log("  " + String(v).padStart(4) + "  " + k);
}

// ── 3. 284'lük aktarım kümesi için uyumluluk satırları ────────────────────
const yeni = JSON.parse(
  readFileSync("scripts/veri/geri-donus/v18-284/olusan.json", "utf-8")
).partNumbers;
const yeniSet = new Set(yeni);

const kayit = [];
let modelsiz = 0;
for (const r of WK) {
  const pn = S(r, "Katalog Referansı");
  if (!yeniSet.has(pn)) continue;
  const ham = S(r, "Kanıtlı Makine Modelleri");
  if (!ham) { modelsiz++; continue; }
  const modeller = ham.split("|").map((x) => x.trim()).filter(Boolean);
  kayit.push({
    partNumber: pn,
    kimlik: S(r, "Araştırma Kimliği"),
    adTR: S(r, "Teknik Ad TR"),
    markaIpucu: S(r, "Marka İpucu"),
    kategori: S(r, "Teknik Kategori"),
    modeller,
    seriKapsami: S(r, "Seri Kapsamı"),
    kaynakUrl: S(r, "Kaynak URL"),
    kanitTurleri: [...(kanitByKimlik.get(S(r, "Araştırma Kimliği")) ?? [])].sort(),
  });
}
console.log("\n=== AKTARILAN 284 ICIN");
console.log("  uyumluluk satiri olan urun: " + kayit.length);
console.log("  'Kanitli Makine Modelleri' BOS olan: " + modelsiz);
console.log("  toplam (urun, model) cifti: " + kayit.reduce((t, k) => t + k.modeller.length, 0));

const markaSay = new Map();
for (const k of kayit) for (const m of k.modeller) {
  const marka = m.split(/\s+/)[0];
  markaSay.set(marka, (markaSay.get(marka) ?? 0) + 1);
}
console.log("  model markalari:");
for (const [m, v] of [...markaSay].sort((a, b) => b[1] - a[1])) {
  console.log("    " + String(v).padStart(4) + "  " + m);
}
const kanitSay = new Map();
for (const k of kayit) {
  const a = k.kanitTurleri.join(" + ") || "(uyum satiri yok)";
  kanitSay.set(a, (kanitSay.get(a) ?? 0) + 1);
}
console.log("  kanit turleri:");
for (const [m, v] of [...kanitSay].sort((a, b) => b[1] - a[1])) {
  console.log("    " + String(v).padStart(4) + "  " + m);
}

writeFileSync("scripts/veri/v18-uyumluluk-284.json", JSON.stringify(kayit, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/v18-uyumluluk-284.json");
