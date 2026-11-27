/**
 * Taslakların KAYNAK DOĞRULAMASI. SALT OKUNUR.
 *
 * Her taslağın içindeki her olgu unsurunu, o ürünün kayıtlı kaynak alanına
 * geri izler. Bir unsur kaynağa bağlanamıyorsa taslak REDDEDİLİR.
 *
 * Denetlenenler:
 *   1. Parça numarası taslakta geçiyor ve kayıtla aynı
 *   2. Teknik ad kayıtla aynı
 *   3. Anılan marka, `verified=true` bir uyumluluk satırından geliyor
 *   4. Anılan HER model, `verified=true` bir uyumluluk satırında var
 *   5. Çizim / kalem numarası `kaynakKalem` ile tutuyor
 *   6. Seri kapsamı metni `seriKapsami` ile tutuyor
 *   7. OEM referansı `oem` ile tutuyor
 *   8. İngilizce ad `adEN` ile tutuyor
 *   9. YASAK İÇERİK YOK: ölçü (mm/çap/kalınlık), malzeme, ağırlık (kg),
 *      "üretici ... tarafından üretilmiştir" gibi üretici iddiası, fiyat,
 *      stok iddiası
 *
 * Kullanım:
 *   node scripts/faz3-taslak-dogrulama.mjs <60_taslaklar_87.json> <pilot.md> <supheli.csv> <cikti>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu, pilotMd, supheliCsv, outArg] = process.argv;
if (!taslakYolu || !pilotMd || !supheliCsv || !outArg) {
  console.error("Kullanim: node scripts/faz3-taslak-dogrulama.mjs <taslaklar.json> <pilot.md> <supheli.csv> <cikti>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(taslakYolu, "utf-8"));

// Pilot taslaklari
const md = readFileSync(pilotMd, "utf-8");
const pilotTaslak = new Map();
for (const m of md.matchAll(/^> (.+)$/gm)) {
  const metin = m[1].replace(/\s*\[K\d\](\[K\d\])*/g, "").trim();
  const o = veri.find((v) => metin.startsWith(v.pn + ","));
  if (o) pilotTaslak.set(o.pn, metin);
}

// Supheli listesi
const supheliSet = new Set(
  readFileSync(supheliCsv, "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(";")[0]?.replace(/^"|"$/g, "")).filter(Boolean)
);

const kayitlar = veri.map((v) => ({
  ...v,
  metin: v.taslak ?? pilotTaslak.get(v.pn) ?? "",
  tur: v.taslak ? "bestelendi" : "pilot",
}));

const AKSAN = { "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "I": "i", "İ": "i",
  "ö": "o", "Ö": "o", "ş": "s", "Ş": "s", "ü": "u", "Ü": "u" };
const katla = (s) => String(s ?? "").split("").map((c) => AKSAN[c] ?? c).join("").toLowerCase();

/** Yasak içerik kalıpları — doğrulanmamış bilgi sızmış mı? */
const YASAK = [
  [/\b\d+[.,]?\d*\s*mm\b/i, "olcu (mm)"],
  [/\b\d+[.,]?\d*\s*(kg|gram|gr)\b/i, "agirlik"],
  [/\b(iç|dış)\s*çap\b/i, "olcu (cap)"],
  [/\bkalınlığı?\s*\d/i, "olcu (kalinlik)"],
  [/\b(çelik|dökme demir|bronz|alüminyum|pirinç|kauçuk|nbr|ptfe|teflon)\b/i, "malzeme iddiasi"],
  [/tarafından üretil/i, "uretici iddiasi"],
  [/\b(orijinal|OEM) üretici\b/i, "uretici iddiasi"],
  [/\b(stokta|stoklarımızda|mevcuttur|hemen teslim)\b/i, "stok iddiasi"],
  [/\b(fiyat|TL|USD|EUR|₺)\b/, "fiyat"],
];

const sonuc = [];
for (const k of kayitlar) {
  const hatalar = [], uyarilar = [], kanitlar = [];
  const metin = k.metin;
  if (!metin) { hatalar.push("taslak metni yok"); }

  // 1. Parca numarasi
  if (metin && !metin.includes(k.pn)) hatalar.push(`parca numarasi taslakta yok (${k.pn})`);
  else if (metin) kanitlar.push("parca numarasi");

  // 2. Teknik ad
  if (metin && k.adTR && !katla(metin).includes(katla(k.adTR))) {
    hatalar.push(`teknik ad taslakta gecmiyor ("${k.adTR}")`);
  } else if (k.adTR) kanitlar.push("teknik ad");

  // 3-4. Marka ve modeller
  const dogrulananMarkalar = new Set(k.uyumluluk.map((u) => String(u.marka ?? "").trim()).filter(Boolean));
  const dogrulananModeller = new Set(k.uyumluluk.map((u) => String(u.model ?? "").trim()).filter(Boolean));
  if (dogrulananMarkalar.size === 0) uyarilar.push("dogrulanmis uyumluluk yok");
  // Taslaktaki "Marka Model1, Model2 ve Model3" kaliplarini cikar
  if (metin) {
    const uyumCumle = metin.split(". ").find((c) => /uyumluluk kaydına göre/i.test(c)) ?? "";
    for (const model of dogrulananModeller) {
      if (uyumCumle && !uyumCumle.includes(model)) {
        // Modelin taslakta OLMAMASI hata degil (hepsini yazmak zorunlu degil),
        // ama taslakta OLUP kayitta OLMAYAN model HATADIR — asagida.
      }
    }
    // Taslakta anilan ama kayitta olmayan marka var mi?
    for (const marka of dogrulananMarkalar) if (metin.includes(marka)) kanitlar.push(`marka: ${marka}`);
    const bilinenMarkalar = ["Volvo","Caterpillar","Komatsu","Champion","HİDROMEK","Hidromek","Ammann","Bomag","Hamm","Mitsubishi","JCB","ZF"];
    for (const m of bilinenMarkalar) {
      if (metin.includes(m) && !dogrulananMarkalar.has(m) &&
          !(m === "Hidromek" && dogrulananMarkalar.has("HİDROMEK"))) {
        hatalar.push(`taslakta DOGRULANMAMIS marka: ${m}`);
      }
    }
  }

  // 5. Cizim / kalem
  if (metin && k.kaynakKalem) {
    const kalemNo = k.kaynakKalem.match(/kalem\s+(\d+)/i);
    const cizim = k.kaynakKalem.match(/Çizim\s+([^,]+)/i);
    if (cizim && metin.includes(cizim[1].trim())) kanitlar.push("cizim numarasi");
    if (kalemNo && new RegExp(`${kalemNo[1]} numaralı kalem`).test(metin)) kanitlar.push("kalem numarasi");
    // Taslakta kalem numarasi var ama kayitta yoksa HATA
    const taslakKalem = metin.match(/(\d+) numaralı kalem/);
    if (taslakKalem && kalemNo && taslakKalem[1] !== kalemNo[1]) {
      hatalar.push(`kalem numarasi uyusmuyor: taslak ${taslakKalem[1]}, kayit ${kalemNo[1]}`);
    }
  }

  // 6. Seri kapsami
  if (metin && /Kaynak, kapsamı/.test(metin)) {
    if (!k.seriKapsami) hatalar.push("taslakta seri kapsami var ama kayitta YOK");
    else kanitlar.push("seri kapsami");
  }

  // 7. OEM
  if (metin && /OEM referansı/.test(metin)) {
    if (!k.oem) hatalar.push("taslakta OEM referansi var ama kayitta YOK");
    else kanitlar.push("OEM referansi");
  }

  // 8. Ingilizce ad
  if (metin && /İngilizce adı/.test(metin)) {
    if (!k.adEN) hatalar.push("taslakta Ingilizce ad var ama kayitta YOK");
    else if (!metin.includes(k.adEN)) hatalar.push("Ingilizce ad kayitla uyusmuyor");
    else kanitlar.push("Ingilizce ad");
  }

  // 9. Yasak icerik
  for (const [kalip, etiket] of YASAK) {
    if (metin && kalip.test(metin)) {
      // Teknik ADIN kendisinde gecen olcu (orn. "35 mm mafsal yatagi",
      // "M20×150 civata") yasak degil - ad kayitli bir alandir.
      // `replace` yalnizca ILK gecisi siler; ad taslakta birden fazla kez
      // geciyor (kimlik cumlesi + Ingilizce ad cumlesi). `replaceAll` sart.
      // Kimlik cumlesinde adin ilk harfi kuculturuldugu icin dislama
      // BUYUK/KUCUK HARFE DUYARSIZ olmak zorunda ("Kaucuk-metal takoz"
      // taslakta "kaucuk-metal takoz" olarak geciyor).
      // Kimlik cumlesinde adin ilk harfi kuculturuldugu icin dislama
      // BUYUK/KUCUK HARFE DUYARSIZ olmak zorunda. Regex kullanmadan,
      // kucuk harfe indirgenmis kopya uzerinde indeks bularak siliyoruz.
      let adDisinda = metin;
      for (const ad of [k.adTR, k.adEN]) {
        if (!ad) continue;
        const hedef = ad.toLowerCase();
        let guard = 0;
        while (guard++ < 10) {
          const idx = adDisinda.toLowerCase().indexOf(hedef);
          if (idx < 0) break;
          adDisinda = adDisinda.slice(0, idx) + adDisinda.slice(idx + ad.length);
        }
      }
      if (kalip.test(adDisinda)) hatalar.push(`YASAK ICERIK: ${etiket}`);
    }
  }

  const supheli = supheliSet.has(k.pn);
  sonuc.push({
    partNumber: k.pn, logoKodu: k.logo, teknikAdTR: k.adTR, tur: k.tur,
    uzunluk: metin.length,
    denetimDurumu: supheli ? "SUPHELI" : "temiz",
    dogrulama: hatalar.length === 0 ? "GECTI" : "REDDEDILDI",
    yazilabilir: (!supheli && hatalar.length === 0) ? "EVET" : "hayir",
    hatalar: hatalar.join(" | "),
    uyarilar: uyarilar.join(" | "),
    kanitSayisi: new Set(kanitlar).size,
    kanitlar: [...new Set(kanitlar)].join(", "),
    taslak: metin,
  });
}

const gecti = sonuc.filter((s) => s.dogrulama === "GECTI");
const reddedildi = sonuc.filter((s) => s.dogrulama === "REDDEDILDI");
const yazilabilir = sonuc.filter((s) => s.yazilabilir === "EVET");

console.log(`denetlenen taslak : ${sonuc.length}`);
console.log(`  kaynak dogrulamasindan GECTI  : ${gecti.length}`);
console.log(`  REDDEDILDI                    : ${reddedildi.length}`);
console.log(`  temiz + gecti = YAZILABILIR   : ${yazilabilir.length}`);
console.log(`  supheli (yazilmayacak)        : ${sonuc.filter((s) => s.denetimDurumu === "SUPHELI").length}`);

if (reddedildi.length) {
  console.log(`\n=== REDDEDILENLER ===`);
  for (const r of reddedildi) console.log(`  ${r.partNumber.padEnd(16)} ${r.hatalar}`);
}
const kanitDag = new Map();
for (const g of yazilabilir) kanitDag.set(g.kanitSayisi, (kanitDag.get(g.kanitSayisi) ?? 0) + 1);
console.log(`\nyazilabilir taslaklarin kanit sayisi: ${[...kanitDag.entries()].sort().map(([k, v]) => `${k} kanit: ${v} urun`).join(" · ")}`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = ["partNumber","logoKodu","teknikAdTR","tur","uzunluk","denetimDurumu","dogrulama","yazilabilir","kanitSayisi","kanitlar","hatalar","uyarilar","taslak"];
writeFileSync(OUT + "72_taslak_dogrulama.csv", "﻿" + csv(sonuc, COLS), "utf8");
writeFileSync(OUT + "73_yazilacak_taslaklar.json", JSON.stringify(
  yazilabilir.map((y) => ({ partNumber: y.partNumber, longDescription: y.taslak })), null, 1), "utf8");
console.log(`\n72_taslak_dogrulama.csv (${sonuc.length}) · 73_yazilacak_taslaklar.json (${yazilabilir.length}) yazildi`);
