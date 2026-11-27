/**
 * v18 → aktarılabilir aday ölçümü. SALT OKUNUR (production'dan yalnızca okur,
 * yerel xlsx'i okur, çıktı olarak tek JSON yazar).
 *
 * SÜZGEÇ — sırayla ve her adım ölçülerek:
 *   1. "Web Katalog Adayları" (580) → `Katalog Referansı` DOLU olanlar
 *   2. kanıtlı makine uyumu olanlar ("Makine Uyumluluğu" satırı veya
 *      `Kanıtlı Makine Modelleri` dolu)
 *   3. "C Yayın Dışı Önerilen" (servis/işçilik, 163) listesinde OLMAYANLAR
 *   4. production'da HENÜZ BULUNMAYANLAR (normalize parça no VEYA Logo kodu)
 *
 * Kullanım: node scripts/v18-aktarim-aday.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
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

const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";

const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });

const WK = sh("Web Katalog Adayları");
const UYUM = sh("Makine Uyumluluğu");
const SERVIS = sh("C Yayın Dışı Önerilen");
const MUK = sh("Mükerrer Adayları");

const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const mevcut = await sql`
  SELECT part_number, part_number_normalized, internal_stock_code_normalized FROM products`;
const mevcutPn = new Set(mevcut.map((r) => r.part_number_normalized || N(r.part_number)));
const mevcutKod = new Set(mevcut.map((r) => r.internal_stock_code_normalized).filter(Boolean));
console.log("production urun: " + mevcut.length + " | normalize pn: " + mevcutPn.size + " | logo kodu: " + mevcutKod.size);

const servisKod = new Set(SERVIS.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const uyumSayisi = new Map();
for (const u of UYUM) {
  const k = S(u, "Araştırma Kimliği");
  uyumSayisi.set(k, (uyumSayisi.get(k) ?? 0) + 1);
}

const sayac = { toplam: WK.length, katalogRefVar: 0, uyumVar: 0, servisDisi: 0, yeni: 0 };
const seviyeDagilim = new Map();
const aday = [];

for (const r of WK) {
  const kimlik = S(r, "Araştırma Kimliği");
  const kod = N(S(r, "Orijinal Logo Stok Kodu"));
  const kat = S(r, "Katalog Referansı");
  const makine = S(r, "Kanıtlı Makine Modelleri");
  if (!kat) continue;
  sayac.katalogRefVar++;
  const uyum = uyumSayisi.get(kimlik) ?? 0;
  if (!(uyum > 0 || makine)) continue;
  sayac.uyumVar++;
  if (servisKod.has(kod)) continue;
  sayac.servisDisi++;
  if (mevcutPn.has(N(kat)) || (kod && mevcutKod.has(kod))) continue;
  sayac.yeni++;
  const seviye = S(r, "Seviye");
  seviyeDagilim.set(seviye, (seviyeDagilim.get(seviye) ?? 0) + 1);
  aday.push({
    kimlik,
    logoKodu: S(r, "Orijinal Logo Stok Kodu"),
    partNumber: kat,
    adTR: S(r, "Teknik Ad TR"),
    seviye,
    kategori: S(r, "Teknik Kategori"),
    markaIpucu: S(r, "Marka İpucu"),
    uretici: S(r, "Fiili Parça Üreticisi"),
    makineler: makine,
    seri: S(r, "Seri Kapsamı"),
    oem: S(r, "OEM Referansları"),
    muadil: S(r, "Muadil Referansları"),
    taslak: S(r, "Taslak Açıklama"),
    eksik: S(r, "Eksik Bilgiler"),
    uyumSatiri: uyum,
  });
}

console.log("SUZGEC: " + JSON.stringify(sayac));
console.log("seviye dagilimi: " + JSON.stringify([...seviyeDagilim]));

const marka = new Map();
for (const a of aday) marka.set(a.markaIpucu || "(bos)", (marka.get(a.markaIpucu || "(bos)") ?? 0) + 1);
console.log("MARKA DAGILIMI (aday " + aday.length + "):");
for (const [m, s] of [...marka].sort((a, b) => b[1] - a[1])) {
  console.log("  " + String(s).padStart(4) + "  " + m);
}

const mukKod = new Set(MUK.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
console.log("mukerrer aday kumesinde gecen aday: " + aday.filter((a) => mukKod.has(N(a.logoKodu))).length);

const gorulen = new Map();
let cakisma = 0;
for (const a of aday) {
  const k = N(a.partNumber);
  if (gorulen.has(k)) cakisma++;
  else gorulen.set(k, a.partNumber);
}
console.log("aday ici normalize PN cakismasi: " + cakisma + " | benzersiz: " + gorulen.size);

writeFileSync("scripts/veri/v18-aday-ham.json", JSON.stringify(aday, null, 1), "utf-8");
console.log("yazildi: scripts/veri/v18-aday-ham.json");
