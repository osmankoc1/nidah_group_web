/**
 * v17 araştırma kitabını, development'taki 97 katalog adayıyla karşılaştırır.
 * SALT OKUNUR — veritabanına ve çalışma kitabına yazmaz.
 *
 * Amaç: 97 aday v8'den çıkarılmıştı. v17 aradan geçen sürede büyüdü
 * (A grubu 527 → 580). Fotoğraf, açıklama ve teknik alanlarda ilerleme olup
 * olmadığı ÖLÇÜLÜR, varsayılmaz.
 *
 * Kullanım:
 *   node scripts/faz3-v17-karsilastirma.mjs <dev-urun-listesi> <cikti-dizini>
 *
 * Dev ürün listesi: her satırda `URUN|<parça no>|<logo stok kodu>`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , devListe, outArg] = process.argv;
if (!devListe || !outArg) {
  console.error("Kullanim: node scripts/faz3-v17-karsilastirma.mjs <dev-liste> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V17 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v17.xlsx";
const V8 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v8.xlsx";

const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

// ── Dev envanteri ────────────────────────────────────────────────────────────
const dev = readFileSync(devListe, "utf-8")
  .split(/\r?\n/)
  .filter((l) => l.startsWith("URUN|"))
  .map((l) => {
    const [, pn, kod] = l.split("|");
    return { partNumber: (pn ?? "").trim(), logoKodu: (kod ?? "").trim() };
  })
  .filter((d) => d.partNumber && !/^(TEST|ATOM)[-\s]/i.test(d.partNumber) && d.partNumber !== "0012345");

console.log(`dev gercek katalog adayi : ${dev.length}`);

// ── Çalışma kitapları ────────────────────────────────────────────────────────
const oku = (yol, sayfa) => {
  const wb = XLSX.read(readFileSync(yol), { type: "buffer" });
  if (!wb.SheetNames.includes(sayfa)) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[sayfa], { raw: false, defval: "" });
};

const a17 = oku(V17, "A Yayın Adayları");
const a8 = oku(V8, "A Yayın Adayları");
console.log(`v8  A Yayin Adaylari     : ${a8.length}`);
console.log(`v17 A Yayin Adaylari     : ${a17.length}`);

// v17'de eslesmeyi HEM katalog referansi HEM Logo stok kodu uzerinden kur.
// Yalnizca numara benzerligiyle birlestirme YAPILMAZ: her iki anahtar da
// ayri ayri tutulur ve hangisinin eslestigi raporlanir.
const v17ByKatalog = new Map();
const v17ByLogo = new Map();
for (const r of a17) {
  const kr = N(S(r, "Katalog Referansı"));
  const lk = N(S(r, "Orijinal Ürün Kodu"));
  if (kr && !v17ByKatalog.has(kr)) v17ByKatalog.set(kr, r);
  if (lk && !v17ByLogo.has(lk)) v17ByLogo.set(lk, r);
}

// ── Eşleştirme ───────────────────────────────────────────────────────────────
const satirlar = [];
let eslesenKatalog = 0, eslesenLogo = 0, eslesenHer = 0, eslesmeyen = 0;
for (const d of dev) {
  const kr = N(d.partNumber);
  const lk = N(d.logoKodu);
  const byKat = v17ByKatalog.get(kr) ?? null;
  const byLogo = v17ByLogo.get(lk) ?? null;
  const r = byKat ?? byLogo;

  let anahtar = "eslesmedi";
  if (byKat && byLogo) { anahtar = "katalog+logo"; eslesenHer++; }
  else if (byKat) { anahtar = "yalniz-katalog"; eslesenKatalog++; }
  else if (byLogo) { anahtar = "yalniz-logo"; eslesenLogo++; }
  else eslesmeyen++;

  const ta = r ? S(r, "Teknik Açıklama") : "";
  satirlar.push({
    partNumber: d.partNumber,
    logoKodu: d.logoKodu,
    v17Eslesme: anahtar,
    // Eslesen iki kayit AYNI urun mu? Karar otomatik verilmez; her iki
    // anahtarin da eslesip eslesmedigi acikca raporlanir.
    katalogAnahtariEslesti: byKat ? "evet" : "hayir",
    logoAnahtariEslesti: byLogo ? "evet" : "hayir",
    v17TeknikAdTR: r ? S(r, "Teknik Ad TR") : "",
    v17AciklamaUzunluk: ta.length,
    v17FotografURL: r ? (S(r, "Doğrulanmış Fotoğraf URL") || "") : "",
    v17OlcuOzellik: r ? S(r, "Ölçü ve Özellik") : "",
    v17Malzeme: r ? S(r, "Malzeme") : "",
    v17MontajYeri: r ? S(r, "Montaj Yeri") : "",
    v17DogrulamaSeviyesi: r ? S(r, "Doğrulama Seviyesi") : "",
  });
}

console.log("\n=== DEV 97 ADAYIN v17'DEKI KARSILIGI ===");
console.log(`  her iki anahtarla eslesen : ${eslesenHer}`);
console.log(`  yalniz katalog numarasiyla: ${eslesenKatalog}`);
console.log(`  yalniz Logo stok koduyla  : ${eslesenLogo}`);
console.log(`  v17'de BULUNAMAYAN        : ${eslesmeyen}`);

// ── v17'de ilerleme var mı? ──────────────────────────────────────────────────
const eslesenler = satirlar.filter((s) => s.v17Eslesme !== "eslesmedi");
const fotoVar = eslesenler.filter((s) => s.v17FotografURL).length;
const ac300 = eslesenler.filter((s) => s.v17AciklamaUzunluk >= 300).length;
const olcuVar = eslesenler.filter((s) => s.v17OlcuOzellik).length;
const malzVar = eslesenler.filter((s) => s.v17Malzeme).length;
const montVar = eslesenler.filter((s) => s.v17MontajYeri).length;
const uz = eslesenler.map((s) => s.v17AciklamaUzunluk).sort((x, y) => x - y);

console.log("\n=== v17'DE ILERLEME (eslesen " + eslesenler.length + " urun) ===");
console.log(`  dogrulanmis fotograf URL'si : ${fotoVar}`);
console.log(`  aciklama >=300 karakter     : ${ac300}`);
console.log(`  aciklama uzunlugu           : min=${uz[0] ?? 0} medyan=${uz[Math.floor(uz.length / 2)] ?? 0} max=${uz[uz.length - 1] ?? 0}`);
console.log(`  olcu bilgisi olan           : ${olcuVar}`);
console.log(`  malzeme bilgisi olan        : ${malzVar}`);
console.log(`  montaj yeri olan            : ${montVar}`);

// v8 ile karsilastirma (ayni urunler icin)
const v8ByKat = new Map();
for (const r of a8) { const k = N(S(r, "Katalog Referansı")); if (k && !v8ByKat.has(k)) v8ByKat.set(k, r); }
let artanAciklama = 0, toplamArtis = 0;
for (const s of eslesenler) {
  const v8r = v8ByKat.get(N(s.partNumber));
  if (!v8r) continue;
  const eski = S(v8r, "Teknik Açıklama").length;
  if (s.v17AciklamaUzunluk > eski) { artanAciklama++; toplamArtis += s.v17AciklamaUzunluk - eski; }
}
console.log(`\n  v8'e gore aciklamasi UZAYAN urun: ${artanAciklama} (toplam +${toplamArtis} karakter)`);

// ── Yalnızca v17'de olan A grubu adaylar ─────────────────────────────────────
const devKatalogKume = new Set(dev.map((d) => N(d.partNumber)));
const devLogoKume = new Set(dev.map((d) => N(d.logoKodu)));
const yalnizV17 = a17.filter((r) => {
  const kr = N(S(r, "Katalog Referansı"));
  const lk = N(S(r, "Orijinal Ürün Kodu"));
  return !devKatalogKume.has(kr) && !devLogoKume.has(lk);
});
console.log(`\n  v17 A grubunda olup dev'de OLMAYAN : ${yalnizV17.length}`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "\uFEFF" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(38)} ${String(rows.length).padStart(4)} satir`);
};

console.log("\n=== URETILEN DOSYALAR ===");
yaz("30_dev97_v17_eslesme.csv", satirlar,
  ["partNumber", "logoKodu", "v17Eslesme", "katalogAnahtariEslesti", "logoAnahtariEslesti",
   "v17TeknikAdTR", "v17AciklamaUzunluk", "v17FotografURL", "v17OlcuOzellik", "v17Malzeme",
   "v17MontajYeri", "v17DogrulamaSeviyesi"]);

yaz("31_yalniz_v17_adaylar.csv",
  yalnizV17.map((r) => ({
    katalogReferansi: S(r, "Katalog Referansı"),
    logoKodu: S(r, "Orijinal Ürün Kodu"),
    teknikAdTR: S(r, "Teknik Ad TR"),
    dogrulamaSeviyesi: S(r, "Doğrulama Seviyesi"),
    aciklamaUzunluk: S(r, "Teknik Açıklama").length,
    fotografURL: S(r, "Doğrulanmış Fotoğraf URL") || "(YOK)",
  })),
  ["katalogReferansi", "logoKodu", "teknikAdTR", "dogrulamaSeviyesi", "aciklamaUzunluk", "fotografURL"]);

console.log(`\nCikti dizini: ${OUT}`);
