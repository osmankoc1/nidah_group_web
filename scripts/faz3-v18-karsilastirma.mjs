/**
 * V18 "Web Katalog Adayları" ile development'taki 97 gerçek katalog adayını
 * karşılaştırır. SALT OKUNUR — hiçbir veriye yazmaz.
 *
 * V18 yapısı (ölçüldü, varsayılmadı):
 *   · `Web Katalog Adayları` : 580 satır × 16 kolon
 *   · `Seviye = 1`           : 172 satır — "teknik verisi katalog taslağına uygun"
 *   · `Seviye = 2`           : 408 satır — "ek teknik doğrulama gerekli"
 *   · `Taslak Açıklama`      : yalnızca Seviye 1'de dolu (172/580)
 *
 * EŞLEŞTİRME KURALI: iki anahtar AYRI AYRI değerlendirilir —
 *   (a) katalog parça numarası (normalize)
 *   (b) orijinal Logo stok kodu (normalize)
 * Hangisinin eşleştiği kolon olarak raporlanır. Yalnızca numara benzerliğiyle
 * OTOMATİK BİRLEŞTİRME YAPILMAZ; tek anahtarla eşleşen kayıtlar "elle
 * doğrulanmalı" olarak işaretlenir.
 *
 * Kullanım:
 *   node scripts/faz3-v18-karsilastirma.mjs <dev-urun-listesi> <cikti-dizini>
 *
 * Dev listesi satır biçimi: `URUN|<parça no>|<logo stok kodu>`
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , devListe, outArg] = process.argv;
if (!devListe || !outArg) {
  console.error("Kullanim: node scripts/faz3-v18-karsilastirma.mjs <dev-liste> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";

const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

// ── Dev envanteri (sentetik kayıtlar HARİÇ) ──────────────────────────────────
const dev = readFileSync(devListe, "utf-8").split(/\r?\n/)
  .filter((l) => l.startsWith("URUN|"))
  .map((l) => { const [, pn, kod] = l.split("|"); return { partNumber: (pn ?? "").trim(), logoKodu: (kod ?? "").trim() }; })
  .filter((d) => d.partNumber && !/^(TEST|ATOM)[-\s]/i.test(d.partNumber) && d.partNumber !== "0012345");

// ── V18 ──────────────────────────────────────────────────────────────────────
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const WK = sh("Web Katalog Adayları");
const EKSIK = sh("A Grubu Teknik Eksikler");

const seviye1 = WK.filter((r) => S(r, "Seviye") === "1");
const seviye2 = WK.filter((r) => S(r, "Seviye") === "2");

console.log(`dev gercek katalog adayi      : ${dev.length}`);
console.log(`V18 Web Katalog Adaylari      : ${WK.length}`);
console.log(`  Seviye 1 (katalog taslagina uygun) : ${seviye1.length}`);
console.log(`  Seviye 2 (ek dogrulama gerekli)    : ${seviye2.length}`);

const idx = (liste) => {
  const byKat = new Map(), byLogo = new Map();
  for (const r of liste) {
    const kr = N(S(r, "Katalog Referansı"));
    const lk = N(S(r, "Orijinal Logo Stok Kodu"));
    if (kr && !byKat.has(kr)) byKat.set(kr, r);
    if (lk && !byLogo.has(lk)) byLogo.set(lk, r);
  }
  return { byKat, byLogo };
};
const s1 = idx(seviye1);
const tum = idx(WK);

const eksikByLogo = new Map();
for (const r of EKSIK) eksikByLogo.set(N(S(r, "Orijinal Logo Stok Kodu") || S(r, "Orijinal Ürün Kodu")), r);

// ── Karşılaştırma ────────────────────────────────────────────────────────────
const ortak = [], yalnizDev = [];
let s1Her = 0, s1Kat = 0, s1Logo = 0, s2Eslesen = 0;

for (const d of dev) {
  const kr = N(d.partNumber), lk = N(d.logoKodu);
  const k1 = s1.byKat.get(kr) ?? null;
  const l1 = s1.byLogo.get(lk) ?? null;
  const kAll = tum.byKat.get(kr) ?? null;
  const lAll = tum.byLogo.get(lk) ?? null;
  const r = k1 ?? l1 ?? kAll ?? lAll;

  let seviye = r ? S(r, "Seviye") : "";
  let anahtar, elleDogrulama = "hayir";
  if (k1 && l1) { anahtar = "Seviye1 · katalog+logo"; s1Her++; }
  else if (k1) { anahtar = "Seviye1 · YALNIZ katalog"; s1Kat++; elleDogrulama = "EVET"; }
  else if (l1) { anahtar = "Seviye1 · YALNIZ logo"; s1Logo++; elleDogrulama = "EVET"; }
  else if (kAll && lAll) { anahtar = `Seviye${seviye} · katalog+logo`; s2Eslesen++; }
  else if (kAll || lAll) { anahtar = `Seviye${seviye} · tek anahtar`; s2Eslesen++; elleDogrulama = "EVET"; }
  else anahtar = "V18'de YOK";

  const taslak = r ? S(r, "Taslak Açıklama") : "";
  const kayit = {
    partNumber: d.partNumber,
    logoKodu: d.logoKodu,
    v18Seviye: seviye || "(yok)",
    eslesmeAnahtari: anahtar,
    elleDogrulamaGerekli: elleDogrulama,
    v18TeknikAdTR: r ? S(r, "Teknik Ad TR") : "",
    v18TeknikKategori: r ? S(r, "Teknik Kategori") : "",
    v18TaslakAciklamaUzunluk: taslak.length,
    v18KanitliModeller: r ? S(r, "Kanıtlı Makine Modelleri") : "",
    v18SeriKapsami: r ? S(r, "Seri Kapsamı") : "",
    v18OemReferanslari: r ? S(r, "OEM Referansları") : "",
    v18MuadilReferanslari: r ? S(r, "Muadil Referansları") : "",
    v18FiiliParcaUreticisi: r ? S(r, "Fiili Parça Üreticisi") : "",
    v18EksikBilgiler: r ? S(r, "Eksik Bilgiler") : "",
  };
  if (r) ortak.push(kayit); else yalnizDev.push(kayit);
}

// Yalnız V18 Seviye 1'de olanlar
const devKat = new Set(dev.map((d) => N(d.partNumber)));
const devLogo = new Set(dev.map((d) => N(d.logoKodu)));
const yalnizV18S1 = seviye1.filter((r) =>
  !devKat.has(N(S(r, "Katalog Referansı"))) && !devLogo.has(N(S(r, "Orijinal Logo Stok Kodu")))
);
const yalnizV18Tum = WK.filter((r) =>
  !devKat.has(N(S(r, "Katalog Referansı"))) && !devLogo.has(N(S(r, "Orijinal Logo Stok Kodu")))
);

console.log("\n=== DEV 97 ADAYIN V18'DEKI KARSILIGI ===");
console.log(`  Seviye 1, HER IKI anahtarla eslesen : ${s1Her}`);
console.log(`  Seviye 1, yalniz katalog numarasi   : ${s1Kat}${s1Kat ? "  (ELLE DOGRULAMA)" : ""}`);
console.log(`  Seviye 1, yalniz Logo stok kodu     : ${s1Logo}${s1Logo ? "  (ELLE DOGRULAMA)" : ""}`);
console.log(`  Seviye 2 ile eslesen                : ${s2Eslesen}`);
console.log(`  V18'de hic bulunamayan              : ${yalnizDev.length}`);

console.log("\n=== UC GRUP ===");
console.log(`  ORTAK (dev + V18)                   : ${ortak.length}`);
console.log(`  YALNIZ V18 Seviye 1'de              : ${yalnizV18S1.length}`);
console.log(`  YALNIZ V18'de (tum seviyeler)       : ${yalnizV18Tum.length}`);
console.log(`  YALNIZ dev'de                       : ${yalnizDev.length}`);

// ── V18'in getirdigi ilerleme ────────────────────────────────────────────────
const s1Ortak = ortak.filter((o) => o.v18Seviye === "1");
const taslakUz = s1Ortak.map((o) => o.v18TaslakAciklamaUzunluk).filter((n) => n > 0).sort((a, b) => a - b);
console.log("\n=== V18 TASLAK ACIKLAMA (ortak Seviye 1 urunler) ===");
console.log(`  taslak aciklamasi OLAN   : ${taslakUz.length}/${s1Ortak.length}`);
if (taslakUz.length) {
  console.log(`  uzunluk: min=${taslakUz[0]} medyan=${taslakUz[Math.floor(taslakUz.length / 2)]} max=${taslakUz[taslakUz.length - 1]}`);
  console.log(`  >=300 karakter olan      : ${taslakUz.filter((n) => n >= 300).length}`);
}
console.log(`  kanitli makine modeli olan : ${s1Ortak.filter((o) => o.v18KanitliModeller).length}/${s1Ortak.length}`);
console.log(`  seri kapsami olan          : ${s1Ortak.filter((o) => o.v18SeriKapsami).length}/${s1Ortak.length}`);
console.log(`  OEM referansi olan         : ${s1Ortak.filter((o) => o.v18OemReferanslari).length}/${s1Ortak.length}`);
console.log(`  muadil referansi olan      : ${s1Ortak.filter((o) => o.v18MuadilReferanslari).length}/${s1Ortak.length}`);
console.log(`  FIILI PARCA URETICISI olan : ${s1Ortak.filter((o) => o.v18FiiliParcaUreticisi).length}/${s1Ortak.length}`);

// Tum 172 Seviye 1 icin taslak uzunlugu
const t172 = seviye1.map((r) => S(r, "Taslak Açıklama").length).filter((n) => n > 0).sort((a, b) => a - b);
console.log(`\n=== 172 SEVIYE 1 KAYDININ TAMAMI ===`);
console.log(`  taslak aciklamasi olan : ${t172.length}/172`);
console.log(`  uzunluk: min=${t172[0]} medyan=${t172[Math.floor(t172.length / 2)]} max=${t172[t172.length - 1]}`);
console.log(`  >=300 karakter olan    : ${t172.filter((n) => n >= 300).length}/172`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "\uFEFF" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(40)} ${String(rows.length).padStart(4)} satir`);
};
const ORTAK_COLS = ["partNumber", "logoKodu", "v18Seviye", "eslesmeAnahtari", "elleDogrulamaGerekli",
  "v18TeknikAdTR", "v18TeknikKategori", "v18TaslakAciklamaUzunluk", "v18KanitliModeller",
  "v18SeriKapsami", "v18OemReferanslari", "v18MuadilReferanslari", "v18FiiliParcaUreticisi", "v18EksikBilgiler"];

console.log("\n=== URETILEN DOSYALAR ===");
yaz("40_ortak_dev_v18.csv", [...ortak].sort((a, b) => Number(a.v18Seviye) - Number(b.v18Seviye) || b.v18TaslakAciklamaUzunluk - a.v18TaslakAciklamaUzunluk), ORTAK_COLS);
yaz("41_yalniz_v18_seviye1.csv",
  yalnizV18S1.map((r) => ({
    katalogReferansi: S(r, "Katalog Referansı"),
    logoKodu: S(r, "Orijinal Logo Stok Kodu"),
    teknikAdTR: S(r, "Teknik Ad TR"),
    teknikKategori: S(r, "Teknik Kategori"),
    taslakAciklamaUzunluk: S(r, "Taslak Açıklama").length,
    kanitliModeller: S(r, "Kanıtlı Makine Modelleri"),
    seriKapsami: S(r, "Seri Kapsamı"),
    eksikBilgiler: S(r, "Eksik Bilgiler"),
  })),
  ["katalogReferansi", "logoKodu", "teknikAdTR", "teknikKategori", "taslakAciklamaUzunluk", "kanitliModeller", "seriKapsami", "eksikBilgiler"]);
yaz("42_yalniz_dev.csv", yalnizDev, ORTAK_COLS);

console.log(`\nCikti dizini: ${OUT}`);
