/**
 * 57 ürün + 45 makine için AKTARIM ÖNCESİ bütünlük kontrolü. SALT OKUNUR.
 *
 * Dosyalar birbirine ve veritabanının mevcut durumuna karşı sınanır.
 * TEK BİR hata bile aktarımı durdurur (exit 1).
 *
 * Kontroller:
 *   M1  Küme içi mükerrer parça numarası
 *   M2  Küme içi mükerrer NORMALIZE parça numarası
 *   M3  Küme içi mükerrer Logo stok kodu (ham ve normalize)
 *   M4  Mevcut ürünlerle parça numarası / normalize / stok kodu çakışması
 *   M5  Küme içi mükerrer makine (üretici+model)
 *   M6  Mevcut veritabanında zaten olan makine dosyaya girmiş mi
 *   I1  Her uyumluluk satırının ürünü B1'de var mı
 *   I2  Her uyumluluk satırının makinesi B2'de ya da veritabanında var mı
 *   I3  Her çevirinin ürünü B1'de var mı
 *   I4  Uyumluluğu olmayan ürün var mı
 *   I5  Çevirisi olmayan ürün var mı (uyarı)
 *   K1  Kaynağı boş uyumluluk satırı
 *   K2  verified=true olmayan uyumluluk satırı
 *   K3  Açıklaması 300 karakterden kısa ürün
 *   K4  Logo stok kodu boş ürün
 *   G1  stockStatus != unknown olan ürün
 *   G2  inStock != false olan ürün
 *   G3  published != false olan çeviri
 *   G4  Baştaki sıfır / tire / boşluk korunmuş mu (ham ↔ dosya karşılaştırması)
 *
 * Kullanım: node scripts/faz3-57-onkontrol.mjs <envanter.txt> <cikti-dizini>
 */
import { readFileSync } from "node:fs";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-57-onkontrol.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/**
 * Gerçek CSV ayrıştırıcı (RFC 4180, ayraç ";").
 *
 * Naif `split(";")` KULLANILAMAZ: açıklama ve not alanları noktalı virgül
 * içeriyor ("...üretilir; sipariş öncesinde..."). Naif ayrıştırma kolonları
 * kaydırıp sahte hata üretir — ilk denemede tam olarak bu oldu.
 */
const csvAyristir = (metin) => {
  const satirlar = [];
  let alan = "", satir = [], tirnakIcinde = false;
  const t = metin.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (tirnakIcinde) {
      if (c === '"') {
        if (t[i + 1] === '"') { alan += '"'; i++; }
        else tirnakIcinde = false;
      } else alan += c;
    } else if (c === '"') {
      tirnakIcinde = true;
    } else if (c === ";") {
      satir.push(alan); alan = "";
    } else if (c === "\n") {
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else if (c !== "\r") {
      alan += c;
    }
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar.filter((s) => s.some((x) => x !== ""));
};

const oku = (p) => {
  const satirlar = csvAyristir(readFileSync(p, "utf-8"));
  const h = satirlar[0];
  return satirlar.slice(1).map((c) => Object.fromEntries(h.map((b, i) => [b, c[i] ?? ""])));
};

const urunler = oku(OUT + "B1_57_urunler.csv");
const makineler = oku(OUT + "B2_57_makineler.csv");
const uyumluluk = oku(OUT + "B3_57_uyumluluk.csv");
const ceviriler = oku(OUT + "B4_57_ceviriler.csv");
const taslaklar = JSON.parse(readFileSync(OUT + "A3_taslaklar_57.json", "utf-8"));

const envanter = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcutPn = new Set(envanter.filter((l) => l.startsWith("URUN|")).map((l) => N(l.split("|")[1])));
const mevcutStok = new Set(
  envanter.filter((l) => l.startsWith("URUN|")).map((l) => (l.split("|")[3] ?? "").trim()).filter(Boolean),
);
const mevcutMakine = new Set(
  envanter.filter((l) => l.startsWith("MAKINE|")).map((l) => {
    const [, mf, mod] = l.split("|");
    return `${N(mf)}|${N(mod)}`;
  }),
);

const hatalar = [];
const uyarilar = [];
const gecenler = [];
const kontrol = (kod, baslik, bulgular, uyariMi = false) => {
  if (bulgular.length === 0) {
    gecenler.push(`${kod}  ${baslik}`);
  } else if (uyariMi) {
    uyarilar.push(`${kod}  ${baslik} -> ${bulgular.length}: ${bulgular.slice(0, 8).join(", ")}`);
  } else {
    hatalar.push(`${kod}  ${baslik} -> ${bulgular.length}: ${bulgular.slice(0, 8).join(", ")}`);
  }
};
const tekrarlar = (liste) => {
  const m = new Map();
  for (const x of liste) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].filter(([, n]) => n > 1).map(([k]) => k);
};

// -- M: mukerrer -------------------------------------------------------------
kontrol("M1", "kume ici mukerrer parca numarasi", tekrarlar(urunler.map((u) => u.partNumber)));
kontrol("M2", "kume ici mukerrer NORMALIZE parca numarasi", tekrarlar(urunler.map((u) => N(u.partNumber))));
kontrol("M3a", "kume ici mukerrer Logo stok kodu (ham)", tekrarlar(urunler.map((u) => u.internalStockCode)));
kontrol("M3b", "kume ici mukerrer Logo stok kodu (normalize)", tekrarlar(urunler.map((u) => N(u.internalStockCode))), true);
kontrol("M4a", "mevcut parca numarasiyla cakisma", urunler.filter((u) => mevcutPn.has(N(u.partNumber))).map((u) => u.partNumber));
kontrol("M4b", "mevcut Logo stok koduyla cakisma", urunler.filter((u) => mevcutStok.has(N(u.internalStockCode))).map((u) => u.partNumber));
kontrol("M5", "kume ici mukerrer makine", tekrarlar(makineler.map((m) => `${N(m.manufacturer)}|${N(m.model)}`)));
kontrol("M6", "veritabaninda zaten olan makine dosyada", makineler.filter((m) => mevcutMakine.has(`${N(m.manufacturer)}|${N(m.model)}`)).map((m) => `${m.manufacturer} ${m.model}`));

// -- I: iliskiler -------------------------------------------------------------
const urunPn = new Set(urunler.map((u) => u.partNumber));
const dosyaMakine = new Set(makineler.map((m) => `${N(m.manufacturer)}|${N(m.model)}`));
kontrol("I1", "uyumlulugun urunu B1'de yok", [...new Set(uyumluluk.filter((f) => !urunPn.has(f.partNumber)).map((f) => f.partNumber))]);
kontrol("I2", "uyumlulugun makinesi ne B2'de ne veritabaninda",
  [...new Set(uyumluluk
    .filter((f) => {
      const k = `${N(f.manufacturer)}|${N(f.model)}`;
      return !dosyaMakine.has(k) && !mevcutMakine.has(k);
    })
    .map((f) => `${f.manufacturer} ${f.model}`))]);
kontrol("I3", "cevirinin urunu B1'de yok", [...new Set(ceviriler.filter((c) => !urunPn.has(c.partNumber)).map((c) => c.partNumber))]);
const uyumluOlan = new Set(uyumluluk.map((f) => f.partNumber));
kontrol("I4", "hic uyumlulugu olmayan urun", urunler.filter((u) => !uyumluOlan.has(u.partNumber)).map((u) => u.partNumber));
const ceviriOlan = new Set(ceviriler.map((c) => c.partNumber));
kontrol("I5", "hic cevirisi olmayan urun", urunler.filter((u) => !ceviriOlan.has(u.partNumber)).map((u) => u.partNumber), true);

// -- K: kaynak ve kalite ------------------------------------------------------
kontrol("K1", "kaynagi bos uyumluluk satiri", uyumluluk.filter((f) => !f.source.trim()).map((f) => `${f.partNumber}/${f.model}`));
kontrol("K2", "verified=true olmayan uyumluluk", uyumluluk.filter((f) => f.verified !== "true").map((f) => f.partNumber));
kontrol("K3", "aciklamasi <300 karakter urun", urunler.filter((u) => u.longDescription.length < 300).map((u) => u.partNumber));
kontrol("K4", "Logo stok kodu bos urun", urunler.filter((u) => !u.internalStockCode.trim()).map((u) => u.partNumber));
kontrol("K5", "metaTitle bos urun", urunler.filter((u) => !u.metaTitle.trim()).map((u) => u.partNumber), true);

// Her urunun uyumluluk sayisi taslaktaki ile ayni mi?
const taslakUyum = new Map(taslaklar.map((t) => [t.pn, t.uyumluluk.length]));
const uyumSayac = new Map();
for (const f of uyumluluk) uyumSayac.set(f.partNumber, (uyumSayac.get(f.partNumber) ?? 0) + 1);
kontrol("K6", "uyumluluk sayisi taslaktakinden farkli",
  [...taslakUyum.entries()].filter(([pn, n]) => (uyumSayac.get(pn) ?? 0) !== n).map(([pn, n]) => `${pn}(taslak=${n} dosya=${uyumSayac.get(pn) ?? 0})`));

// -- G: guvenlik anahtarlari ---------------------------------------------------
kontrol("G1", "stockStatus != unknown", urunler.filter((u) => u.stockStatus !== "unknown").map((u) => u.partNumber));
kontrol("G2", "inStock != false", urunler.filter((u) => u.inStock !== "false").map((u) => u.partNumber));
kontrol("G3", "published != false ceviri", ceviriler.filter((c) => c.published !== "false").map((c) => c.partNumber));
kontrol("G4", "partManufacturer dolu (marka iddiasi)", urunler.filter((u) => u.partManufacturer.trim()).map((u) => u.partNumber));

// Bastaki sifir / tire / bosluk: dosyadaki deger taslaktaki HAM deger ile birebir mi?
const hamPn = new Map(taslaklar.map((t) => [t.pn, t.logo]));
kontrol("G5", "Logo stok kodu ham degerden farkli",
  urunler.filter((u) => u.internalStockCode !== hamPn.get(u.partNumber)).map((u) => `${u.partNumber}: "${u.internalStockCode}" != "${hamPn.get(u.partNumber)}"`));
const kirpilmis = urunler.filter((u) => u.internalStockCode !== u.internalStockCode.trim() ? false : /^[0\s-]/.test(u.internalStockCode) && u.internalStockCode !== hamPn.get(u.partNumber));
kontrol("G6", "bastaki sifir/tire/bosluk kaybolmus", kirpilmis.map((u) => u.partNumber));

// -- Rapor --------------------------------------------------------------------
console.log("=== 57 URUN + 45 MAKINE — AKTARIM ONCESI KONTROL ===\n");
console.log(`dosyalar: urun=${urunler.length} makine=${makineler.length} uyumluluk=${uyumluluk.length} ceviri=${ceviriler.length}\n`);
console.log(`GECEN KONTROLLER (${gecenler.length}):`);
for (const g of gecenler) console.log(`  OK   ${g}`);
if (uyarilar.length) {
  console.log(`\nUYARILAR (${uyarilar.length}) — aktarimi durdurmaz:`);
  for (const u of uyarilar) console.log(`  !!   ${u}`);
}
if (hatalar.length) {
  console.log(`\nHATALAR (${hatalar.length}) — AKTARIM DURDURULDU:`);
  for (const h of hatalar) console.log(`  XX   ${h}`);
  process.exit(1);
}
console.log(`\nSONUC: ${hatalar.length} hata. Aktarima uygun.`);
