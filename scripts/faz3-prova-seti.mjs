/**
 * Faz 3 — 25 ürünlük development prova seti hazırlayıcı. SALT OKUNUR.
 *
 * Girdi : V8 araştırma çalışma kitabı
 * Çıktı : içe aktarma şablonlarının BEKLEDİĞİ kolon adlarıyla CSV'ler
 *
 * Hiçbir veritabanına bağlanmaz, hiçbir şey aktarmaz, çalışma kitabını
 * değiştirmez. Üretilen CSV'ler dry-run girdisidir; tek başlarına hiçbir şey
 * yapmaz.
 *
 * Kullanım:
 *   node scripts/faz3-prova-seti.mjs "<xlsx>" "<cikti-dizini>" [adet]
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , xlsxPath, outDirArg, adetArg] = process.argv;
if (!xlsxPath || !outDirArg) {
  console.error('Kullanim: node scripts/faz3-prova-seti.mjs "<xlsx>" "<cikti-dizini>" [adet]');
  process.exit(1);
}
const OUT = /[/\\]$/.test(outDirArg) ? outDirArg : outDirArg + "/";
const ADET = Number(adetArg) || 25;

const KESIN = "Kesin doğrulandı";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

/** Sitede marka sayfası olan makine markaları. Başkası için uyumluluk yazılmaz. */
const SITE_MARKALARI = new Map([
  ["AMMANN", "AMMANN"], ["BOMAG", "BOMAG"], ["CATERPILLAR", "CATERPILLAR"],
  ["CHAMPION", "CHAMPION"], ["HAMM", "HAMM"], ["HIDROMEK", "HIDROMEK"],
  ["HİDROMEK", "HIDROMEK"], ["KOMATSU", "KOMATSU"], ["VOLVO", "VOLVO"],
]);
const siteMarkasi = (m) => SITE_MARKALARI.get(m.trim().toUpperCase()) ?? null;

const wb = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const A = sh("A Yayın Adayları");
const UY = sh("Makine Uyumluluğu");
const OEM = sh("OEM ve Muadil");
const CEL = sh("Çelişkili Kayıtlar");
const MUK = sh("Mükerrer Adayları");

const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map(); for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const oemByKod = new Map(); for (const r of OEM) push(oemByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const celKod = new Set(CEL.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const mukKod = new Set(MUK.map((r) => N(S(r, "Orijinal Ürün Kodu"))));

const okMap = new Map(); for (const r of A) push(okMap, N(S(r, "Orijinal Ürün Kodu")), S(r, "Orijinal Ürün Kodu"));
const okCakisan = new Set([...okMap.entries()].filter(([, l]) => new Set(l).size > 1).map(([k]) => k));
const krMap = new Map(); for (const r of A) { const k = N(S(r, "Katalog Referansı")); if (k) push(krMap, k, r); }
const krPaylasilan = new Set([...krMap.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));

/** Yayına uygun küme: hiçbir engel + en az 1 KESİN uyum + o uyumun markasının sayfası var. */
const uygun = [];
for (const r of A) {
  const ok = N(S(r, "Orijinal Ürün Kodu"));
  if (S(r, "Doğrulama Seviyesi") !== KESIN) continue;
  if (!S(r, "Katalog Referansı")) continue;
  if (!S(r, "Teknik Ad TR")) continue;
  if (krPaylasilan.has(N(S(r, "Katalog Referansı")))) continue;
  if (okCakisan.has(ok)) continue;
  if (celKod.has(ok)) continue;
  if (mukKod.has(ok)) continue;

  const uyKesin = (uyByKod.get(ok) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const uySayfali = uyKesin.filter((x) => siteMarkasi(S(x, "Makine Markası")));
  if (uySayfali.length === 0) continue;

  const oemKesin = (oemByKod.get(ok) ?? []).filter((x) => S(x, "Doğrulama Seviyesi") === KESIN);
  const olgu =
    S(r, "Teknik Açıklama").length + S(r, "Ölçü ve Özellik").length + S(r, "Malzeme").length +
    S(r, "Montaj Yeri").length + S(r, "Teknik Sistem").length +
    uySayfali.reduce((a, x) => a + [S(x, "Makine Markası"), S(x, "Makine Modeli"), S(x, "Seri"), S(x, "Seri Numarası Kapsamı")].filter(Boolean).join(" ").length, 0) +
    oemKesin.reduce((a, x) => a + (S(x, "OEM / OE Referansı") + S(x, "Referans Markası")).length, 0);

  uygun.push({ r, ok, uySayfali, oemKesin, olgu, anaMarka: siteMarkasi(S(uySayfali[0], "Makine Markası")) });
}

// Marka dağılımı dengeli ilk N: her turda her markadan en yüksek olguyu al.
const markaKovalari = new Map();
for (const u of [...uygun].sort((a, b) => b.olgu - a.olgu)) push(markaKovalari, u.anaMarka, u);
const secilen = [];
let tur = 0;
while (secilen.length < Math.min(ADET, uygun.length)) {
  let eklendi = false;
  for (const [, liste] of markaKovalari) {
    if (liste[tur]) { secilen.push(liste[tur]); eklendi = true; }
    if (secilen.length >= ADET) break;
  }
  if (!eklendi) break;
  tur++;
}

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "﻿" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(34)} ${String(rows.length).padStart(4)} satir`);
};

console.log(`Yayina uygun (97 beklenen) : ${uygun.length}`);
console.log(`Prova setine secilen       : ${secilen.length}`);
const markaDagilim = new Map();
for (const u of secilen) markaDagilim.set(u.anaMarka, (markaDagilim.get(u.anaMarka) ?? 0) + 1);
console.log(`Prova seti marka dagilimi  : ${[...markaDagilim.entries()].map(([k, n]) => `${k}=${n}`).join(" · ")}`);
console.log("");

// ── 07: yayina uygun tum kume ──
yaz("07_yayina_uygun.csv",
  uygun.map((u) => ({
    katalogReferansi: S(u.r, "Katalog Referansı"),
    logoStokKodu: S(u.r, "Orijinal Ürün Kodu"),
    teknikAdTR: S(u.r, "Teknik Ad TR"),
    anaMakineMarkasi: u.anaMarka,
    kesinUyum: u.uySayfali.length,
    kesinOem: u.oemKesin.length,
    olguUzunluk: u.olgu,
    aciklamaUzunluk: S(u.r, "Teknik Açıklama").length,
  })),
  ["katalogReferansi", "logoStokKodu", "teknikAdTR", "anaMakineMarkasi", "kesinUyum", "kesinOem", "olguUzunluk", "aciklamaUzunluk"]);

// ── 08: urun import dosyasi (products sablonunun kolon adlari) ──
// seoReady ve verified BILINCLI OLARAK YOK — import zaten reddeder.
// partManufacturer BOS — bagimsiz teyit yapilana kadar marka iddia edilmez.
// stockStatus BOS -> 'unknown'.
yaz("08_prova_25_urunler.csv",
  secilen.map((u) => ({
    partNumber: S(u.r, "Katalog Referansı"),
    name: S(u.r, "Teknik Ad TR"),
    description: "",
    condition: "new",
    stockStatus: "",
    partManufacturer: "",
    sourcingType: "",
    shortDescription: [S(u.r, "Ölçü ve Özellik"), S(u.r, "Malzeme")].filter(Boolean).join(" · "),
    longDescription: S(u.r, "Teknik Açıklama"),
    metaTitle: S(u.r, "SEO Başlığı TR"),
    metaDescription: S(u.r, "SEO Açıklaması"),
    inStock: "false",
    weight: "",
    category: "",
    notes: "",
    internalStockCode: S(u.r, "Orijinal Ürün Kodu"),
  })),
  ["partNumber", "name", "description", "condition", "stockStatus", "partManufacturer",
   "sourcingType", "shortDescription", "longDescription", "metaTitle", "metaDescription",
   "inStock", "weight", "category", "notes", "internalStockCode"]);

// ── 09: makine import dosyasi (machines sablonu) ──
const makineSet = new Map();
for (const u of secilen) {
  for (const x of u.uySayfali) {
    const marka = siteMarkasi(S(x, "Makine Markası"));
    const model = S(x, "Makine Modeli");
    if (!marka || !model) continue;
    const varyant = S(x, "Varyant");
    const kapsam = S(x, "Seri Numarası Kapsamı");
    const key = `${marka}|${model}|${varyant}`;
    if (!makineSet.has(key)) {
      makineSet.set(key, {
        manufacturer: marka, model, type: "",
        yearFrom: "", yearTo: "",
        variantName: varyant,
        engineModel: S(x, "Motor Tipi"),
        // "35000 ve uzeri" gibi serbest metin -> serialFrom/To'ya ELLE ayristirilir.
        serialFrom: "", serialTo: "",
        seriNoKapsamiHAM: kapsam,
        seri: S(x, "Seri"),
      });
    }
  }
}
yaz("09_prova_25_makineler.csv", [...makineSet.values()],
  ["manufacturer", "model", "type", "yearFrom", "yearTo", "variantName", "engineModel",
   "serialFrom", "serialTo", "seriNoKapsamiHAM", "seri"]);

// ── 10: uyumluluk import dosyasi (fitments sablonu) ──
const uyumRows = [];
for (const u of secilen) {
  for (const x of u.uySayfali) {
    const marka = siteMarkasi(S(x, "Makine Markası"));
    const model = S(x, "Makine Modeli");
    if (!marka || !model) continue;
    const kaynak = [S(x, "Kaynak Kimliği"), S(x, "Sayfa / Çizim / Kalem")].filter(Boolean).join(" · ");
    uyumRows.push({
      partNumber: S(u.r, "Katalog Referansı"),
      manufacturer: marka, model, type: "",
      variantName: S(x, "Varyant"),
      verified: "true",
      source: kaynak.slice(0, 255),
      notes: [S(x, "Seri") && `Seri: ${S(x, "Seri")}`,
              S(x, "Seri Numarası Kapsamı") && `Seri no: ${S(x, "Seri Numarası Kapsamı")}`,
              S(x, "Sistem") && `Sistem: ${S(x, "Sistem")}`,
              S(x, "Montaj Yeri") && `Montaj: ${S(x, "Montaj Yeri")}`].filter(Boolean).join(" | "),
    });
  }
}
yaz("10_prova_25_uyumluluk.csv", uyumRows,
  ["partNumber", "manufacturer", "model", "type", "variantName", "verified", "source", "notes"]);

// ── 11: OEM referanslari (toplu import UCNOKTASI HENUZ YOK — K3) ──
const oemRows = [];
for (const u of secilen) {
  const katRef = N(S(u.r, "Katalog Referansı"));
  for (const x of u.oemKesin) {
    const numara = S(x, "Muadil / Çapraz Referans") || S(x, "OEM / OE Referansı");
    if (!numara) continue;
    // Urunun KENDI numarasi OEM satiri olarak tekrar yazilmaz.
    if (N(numara) === katRef) continue;
    const iliski = S(x, "İlişki").toLocaleLowerCase("tr");
    let tip = "";
    if (iliski.includes("çelişkili")) continue;
    else if (iliski.includes("önceki")) tip = "superseded_by";
    else if (iliski.includes("sonraki")) tip = "supersedes";
    else if (iliski.includes("çapraz referans")) tip = "cross_ref";
    else if (iliski.includes("muadil")) tip = "alternate";
    else if (iliski.includes("oem") || iliski.includes("oe referansı") || iliski.includes("katalog numarası")) tip = "oem";
    else tip = "ESLESMEDI";
    oemRows.push({
      partNumber: S(u.r, "Katalog Referansı"),
      oemNumber: numara,
      type: tip,
      manufacturer: S(x, "Muadil Markası") || S(x, "Referans Markası"),
      verified: "true",
      source: [S(x, "Kaynak Kimliği")].filter(Boolean).join(" · ").slice(0, 255),
      note: `${S(x, "İlişki")}${S(x, "Kaynak URL") ? ` | ${S(x, "Kaynak URL")}` : ""}`,
    });
  }
}
yaz("11_prova_25_oem.csv", oemRows,
  ["partNumber", "oemNumber", "type", "manufacturer", "verified", "source", "note"]);

// ── 12: ceviriler (toplu import UCNOKTASI HENUZ YOK — K3) ──
yaz("12_prova_25_ceviriler.csv",
  secilen.filter((u) => S(u.r, "Teknik Ad EN")).map((u) => ({
    partNumber: S(u.r, "Katalog Referansı"),
    locale: "en",
    name: S(u.r, "Teknik Ad EN"),
    metaTitle: S(u.r, "SEO Başlığı EN"),
    published: "false",
  })),
  ["partNumber", "locale", "name", "metaTitle", "published"]);

const eslesmeyen = oemRows.filter((r) => r.type === "ESLESMEDI").length;
console.log("");
console.log(`UYARI: 'İlişki' eslesmesi yapilamayan OEM satiri: ${eslesmeyen} (import oncesi ELLE karara baglanir)`);
console.log(`BILGI: internalStockCode kolonu K3 ile DESTEKLENIYOR; ham deger aynen yazilir.`);
console.log(`BILGI: ayni stok kodu birden fazla urunde olabilir -> import UYARI verir, BIRLESTIRMEZ.`);
console.log(`UYARI: serialFrom/serialTo bos — 'Seri Numarasi Kapsami' serbest metin, ELLE ayristirilir.`);
console.log(`\nCikti dizini: ${OUT}`);
