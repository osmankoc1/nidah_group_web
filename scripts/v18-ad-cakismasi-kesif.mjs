/**
 * Aktarılan 284 ürün içindeki AD ÇAKIŞMALARINI ve v18'de bu kayıtları
 * ayırt edebilecek alanları ölçer. SALT OKUNUR.
 *
 * Soru: aynı adı taşıyan ürünleri ayırmak için v18'de GERÇEKTEN veri var mı?
 * Aday ayırt ediciler: Kanıtlı Makine Modelleri, Marka İpucu, Teknik
 * Kategori, Seri Kapsamı, Katalog Referansı ön eki.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const S = (r, c) => String(r[c] ?? "").trim();
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const WK = XLSX.utils.sheet_to_json(wb.Sheets["Web Katalog Adayları"], { raw: false, defval: "" });

const yeni = JSON.parse(
  readFileSync("scripts/veri/geri-donus/v18-284/olusan.json", "utf-8")
).partNumbers;
const yeniSet = new Set(yeni);

const satir = new Map();
for (const r of WK) {
  const pn = S(r, "Katalog Referansı");
  if (!yeniSet.has(pn) || satir.has(pn)) continue;
  satir.set(pn, {
    partNumber: pn,
    ad: S(r, "Teknik Ad TR"),
    marka: S(r, "Marka İpucu"),
    kategori: S(r, "Teknik Kategori"),
    makineler: S(r, "Kanıtlı Makine Modelleri"),
    seri: S(r, "Seri Kapsamı"),
    logo: S(r, "Orijinal Logo Stok Kodu"),
    seviye: S(r, "Seviye"),
  });
}
console.log("284 urunun v18 satiri bulundu: " + satir.size);

const kume = new Map();
for (const s of satir.values()) {
  const a = s.ad.toLocaleLowerCase("tr-TR");
  if (!kume.has(a)) kume.set(a, []);
  kume.get(a).push(s);
}
const cakisan = [...kume.entries()].filter(([, v]) => v.length > 1)
  .sort((a, b) => b[1].length - a[1].length);
console.log("ad cakismasi kumesi: " + cakisan.length +
  " | kapsadigi urun: " + cakisan.reduce((t, [, v]) => t + v.length, 0));

const AYIRT = ["marka", "kategori", "makineler", "seri"];
const ozet = { markaIleAyrilan: 0, makineIleAyrilan: 0, hicAyrilmayan: 0 };
const rapor = [];

for (const [ad, uyeler] of cakisan) {
  const farkli = {};
  for (const alan of AYIRT) {
    farkli[alan] = new Set(uyeler.map((u) => u[alan] || "")).size;
  }
  const markaTek = farkli.marka === 1;
  const makineVar = uyeler.every((u) => u.makineler);
  let yontem;
  if (makineVar && farkli.makineler === uyeler.length) { yontem = "makine-modeli"; ozet.makineIleAyrilan++; }
  else if (!markaTek) { yontem = "marka"; ozet.markaIleAyrilan++; }
  else { yontem = "ayirt-edici-veri-yok"; ozet.hicAyrilmayan++; }
  rapor.push({ ad: uyeler[0].ad, adet: uyeler.length, yontem, farkli, uyeler });
}
console.log("\n=== AYRISTIRMA YONTEMI");
console.log("  makine modeliyle ayrilabilen kume : " + ozet.makineIleAyrilan);
console.log("  marka ipucuyla ayrilabilen kume   : " + ozet.markaIleAyrilan);
console.log("  ayirt edici veri OLMAYAN kume     : " + ozet.hicAyrilmayan);

console.log("\n=== EN KALABALIK 12 KUME");
for (const k of rapor.slice(0, 12)) {
  console.log("  " + String(k.adet) + "x " + k.ad.padEnd(38).slice(0, 38) +
    "| yontem: " + k.yontem + " | farkli marka=" + k.farkli.marka +
    " kategori=" + k.farkli.kategori + " makine=" + k.farkli.makineler);
  for (const u of k.uyeler.slice(0, 4)) {
    console.log("      " + u.partNumber.padEnd(16) + "| " + (u.marka || "-").padEnd(10) +
      "| " + (u.kategori || "-").padEnd(16) + "| " + (u.makineler || "(makine yok)"));
  }
  if (k.uyeler.length > 4) console.log("      ... (" + (k.uyeler.length - 4) + " tane daha)");
}

writeFileSync("scripts/veri/v18-ad-cakismasi.json", JSON.stringify(rapor, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/v18-ad-cakismasi.json");
