/**
 * 57 aday için içe aktarma dosyalarını üretir. SALT OKUNUR (DB'ye yazmaz).
 *
 * Girdi:
 *   · A3_taslaklar_57.json  — doğrulanmış açıklama taslakları + uyumluluklar
 *   · V18                   — SEO başlıkları, İngilizce adlar
 *   · envanter_oncesi.txt   — veritabanının AKTARIM ÖNCESİ durumu
 *
 * Çıktı (önceki aktarımlarla aynı şema):
 *   B1_57_urunler.csv · B2_57_makineler.csv · B3_57_uyumluluk.csv · B4_57_ceviriler.csv
 *
 * Kurallar:
 *   · `stockStatus` AÇIKÇA "unknown" yazılır (varsayılana güvenilmez).
 *   · `inStock` false. `seo_ready` içe aktarma kolonu DEĞİLDİR, varsayılanı false.
 *   · Çevirilerde `published=false`.
 *   · Veritabanında ZATEN olan makine dosyaya alınmaz (mükerrer önlemi).
 *   · Aynı parça+makine çiftinin farklı seri/kaynak notları BİRLEŞTİRİLİR,
 *     hiçbir satır atılmaz.
 *   · Üretici adı, veritabanındaki MEVCUT yazımına eşlenir (HİDROMEK -> HIDROMEK),
 *     böylece ikinci bir üretici kaydı oluşmaz.
 *   · `notes` alanına, elle karar bekleyen ürünler için gerekçe yazılır.
 *
 * Kullanım: node scripts/faz3-57-set.mjs <envanter_oncesi.txt> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-57-set.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

// -- Elle karar bekleyen urunlerin notlari -----------------------------------
const NOTLAR = {
  "R6020-11521-0":
    "YAYIN BLOKELI (2026-11-16): teknik ad yalnizca 'Hat' / 'Line'. Kaynak " +
    "(HMK6 · Z041.00.01, kalem 5) parca turunu belirtmiyor; hortum / boru / " +
    "boru takimi ayrimi yapilamiyor. is_active=false ve seo_ready=false " +
    "birlikte tutulur. Depoda parca gorulup turu yazilana kadar yayimlanmaz.",
  "61963-00900":
    "KALINLIK TEYIDI BEKLIYOR (2026-11-16): arastirma kaydinda 1 mm yaziyor, " +
    "ancak numara-kalinlik eslesmesini dogrulayan IKINCI bir kayit yok " +
    "(Logo adi ucunde de sadece 'SHIM', cizim kalemi ucunde de ayni). " +
    "Kalinlik aciklamaya YAZILMADI. MG530 opsiyonel parca katalogundan teyit edilmeli.",
  "61963-01100":
    "KALINLIK TEYIDI BEKLIYOR (2026-11-16): arastirma kaydinda 0,5 mm yaziyor, " +
    "ancak numara-kalinlik eslesmesini dogrulayan IKINCI bir kayit yok. " +
    "Kalinlik aciklamaya YAZILMADI. MG530 opsiyonel parca katalogundan teyit edilmeli.",
  "61963-01200":
    "KALINLIK TEYIDI BEKLIYOR (2026-11-16): arastirma kaydinda 0,2 mm yaziyor, " +
    "ancak numara-kalinlik eslesmesini dogrulayan IKINCI bir kayit yok. " +
    "Kalinlik aciklamaya YAZILMADI. MG530 opsiyonel parca katalogundan teyit edilmeli.",
};

/** Aktarim sonrasi is_active=false yapilacak urunler. */
export const YAYIN_BLOKELI = ["R6020-11521-0"];

// -- Mevcut envanter ---------------------------------------------------------
const envanter = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcutUrunNorm = new Set(
  envanter.filter((l) => l.startsWith("URUN|")).map((l) => N(l.split("|")[1])),
);
const mevcutStokKodu = new Set(
  envanter.filter((l) => l.startsWith("URUN|")).map((l) => (l.split("|")[3] ?? "").trim()).filter(Boolean),
);
const mevcutMakine = new Set(
  envanter.filter((l) => l.startsWith("MAKINE|")).map((l) => {
    const [, mf, mod, tp] = l.split("|");
    return `${N(mf)}|${N(mod)}|${N(tp)}`;
  }),
);
/** Veritabanindaki uretici yazimi: normalize ad -> gercek ad. */
const ureticiYazimi = new Map(
  envanter.filter((l) => l.startsWith("URETICI|")).map((l) => {
    const [, ad] = l.split("|");
    return [N(ad), ad];
  }),
);

/**
 * Uretici adini veritabanindaki MEVCUT yazimina esler.
 * "HİDROMEK" -> N() ile "HDROMEK" olur ve "HIDROMEK" ile eslesmez; bu yuzden
 * once Turkce harfler ASCII'ye cevrilir.
 */
const trAscii = (s) =>
  String(s ?? "")
    .replace(/Ğ/g, "G").replace(/ğ/g, "g").replace(/Ü/g, "U").replace(/ü/g, "u")
    .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/İ/g, "I").replace(/ı/g, "i")
    .replace(/Ö/g, "O").replace(/ö/g, "o").replace(/Ç/g, "C").replace(/ç/g, "c");

function ureticiAdi(ham) {
  const buyuk = ham.trim().toUpperCase();
  // 1) Birebir mevcut yazim
  const birebir = ureticiYazimi.get(N(buyuk));
  if (birebir) return birebir;
  // 2) Turkce harfler ASCII'ye cevrilerek mevcut yazim (HİDROMEK -> HIDROMEK)
  const asciiEsleme = ureticiYazimi.get(N(trAscii(buyuk)));
  if (asciiEsleme) return asciiEsleme;
  // 3) Yeni uretici — V18'deki yazim buyuk harfe cevrilerek kullanilir
  return buyuk;
}

// -- V18 ---------------------------------------------------------------------
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const A = sh("A Yayın Adayları");
const aByKod = new Map(A.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));

// -- Taslaklar ---------------------------------------------------------------
const taslaklar = JSON.parse(readFileSync(OUT + "A3_taslaklar_57.json", "utf-8"));
console.log(`taslak: ${taslaklar.length} urun`);

// -- On kontrol: cakisma ------------------------------------------------------
const cakisanPn = taslaklar.filter((t) => mevcutUrunNorm.has(N(t.pn)));
const cakisanStok = taslaklar.filter((t) => mevcutStokKodu.has(N(t.logo)));
if (cakisanPn.length || cakisanStok.length) {
  console.error(`DURDURULDU — mevcut kayitla cakisma: parcaNo=${cakisanPn.map((t) => t.pn).join(",")} stokKodu=${cakisanStok.map((t) => t.pn).join(",")}`);
  process.exit(1);
}
console.log("cakisma kontrolu: mevcut parca numarasi 0, mevcut Logo stok kodu 0");

const pnSayaci = new Map();
for (const t of taslaklar) pnSayaci.set(N(t.pn), (pnSayaci.get(N(t.pn)) ?? 0) + 1);
const kumeIci = [...pnSayaci.entries()].filter(([, n]) => n > 1);
if (kumeIci.length) {
  console.error(`DURDURULDU — kume ici mukerrer parca numarasi: ${kumeIci.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
console.log("kume ici mukerrer parca numarasi: 0");

// -- 1. Urunler --------------------------------------------------------------
const urunler = taslaklar.map((t) => {
  const a = aByKod.get(N(t.logo));
  return {
    partNumber: t.pn,
    name: t.adTR,
    description: "",
    condition: "new",
    stockStatus: "unknown",
    partManufacturer: "",
    sourcingType: "",
    shortDescription: "",
    longDescription: t.taslak,
    metaTitle: a ? S(a, "SEO Başlığı TR") : "",
    metaDescription: a ? S(a, "SEO Açıklaması") : "",
    inStock: "false",
    weight: "",
    category: "",
    notes: NOTLAR[t.pn] ?? "",
    internalStockCode: t.logo,
  };
});

// -- 2. Makineler ------------------------------------------------------------
const makineSet = new Map();
let zatenVarMakine = 0;
for (const t of taslaklar) {
  for (const u of t.uyumluluk) {
    const marka = ureticiAdi(u.marka);
    const model = u.model.trim().toUpperCase();
    if (!marka || !model) continue;
    const anahtar = `${N(marka)}|${N(model)}|`;
    if (mevcutMakine.has(anahtar)) { zatenVarMakine++; continue; }
    const key = `${marka}|${model}`;
    if (!makineSet.has(key)) {
      makineSet.set(key, {
        manufacturer: marka, model, type: "", yearFrom: "", yearTo: "",
        variantName: "", engineModel: "", serialFrom: "", serialTo: "",
        seriNoKapsamiHAM: u.seriNo ?? "", seri: u.seri ?? "",
      });
    }
  }
}

// -- 3. Uyumluluk ------------------------------------------------------------
const uyumGrup = new Map();
for (const t of taslaklar) {
  for (const u of t.uyumluluk) {
    const marka = ureticiAdi(u.marka);
    const model = u.model.trim().toUpperCase();
    if (!marka || !model) continue;
    const key = `${t.pn}|${marka}|${model}`;
    const l = uyumGrup.get(key);
    if (l) l.push(u); else uyumGrup.set(key, [u]);
  }
}
let birlesen = 0;
const uyumRows = [...uyumGrup.entries()].map(([key, liste]) => {
  const [partNumber, manufacturer, model] = key.split("|");
  if (liste.length > 1) birlesen++;
  const notlar = [...new Set(liste.map((u) => [
    u.seri && `Seri: ${u.seri}`,
    u.seriNo && `Seri no: ${u.seriNo}`,
    u.montaj && `Montaj: ${u.montaj}`,
  ].filter(Boolean).join(" | ")).filter(Boolean))];
  const kaynaklar = [...new Set(liste.map((u) => u.kaynak).filter(Boolean))];
  return {
    partNumber, manufacturer, model, type: "", variantName: "",
    verified: "true",
    source: kaynaklar.join(" ; ").slice(0, 255),
    notes: notlar.join("  ||  "),
  };
});

// -- 4. Ceviriler ------------------------------------------------------------
const ceviriler = taslaklar.filter((t) => t.adEN).map((t) => {
  const a = aByKod.get(N(t.logo));
  return {
    partNumber: t.pn,
    locale: "en",
    name: t.adEN,
    metaTitle: a ? S(a, "SEO Başlığı EN") : "",
    published: "false",
  };
});

// -- Yazim -------------------------------------------------------------------
const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "\uFEFF" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(26)} ${String(rows.length).padStart(4)} satir`);
};

console.log("\n=== URETILEN DOSYALAR ===");
yaz("B1_57_urunler.csv", urunler,
  ["partNumber", "name", "description", "condition", "stockStatus", "partManufacturer",
   "sourcingType", "shortDescription", "longDescription", "metaTitle", "metaDescription",
   "inStock", "weight", "category", "notes", "internalStockCode"]);
yaz("B2_57_makineler.csv", [...makineSet.values()],
  ["manufacturer", "model", "type", "yearFrom", "yearTo", "variantName", "engineModel",
   "serialFrom", "serialTo", "seriNoKapsamiHAM", "seri"]);
yaz("B3_57_uyumluluk.csv", uyumRows,
  ["partNumber", "manufacturer", "model", "type", "variantName", "verified", "source", "notes"]);
yaz("B4_57_ceviriler.csv", ceviriler,
  ["partNumber", "locale", "name", "metaTitle", "published"]);

console.log(`\n  veritabaninda zaten olan makineye bagli uyumluluk satiri : ${zatenVarMakine}`);
console.log(`  ayni parca+makine icin birden fazla kaynak satiri        : ${birlesen} (notlar BIRLESTIRILDI, satir kaybi YOK)`);

// -- Ozet kontroller ----------------------------------------------------------
console.log("\n=== KONTROLLER ===");
console.log(`  tum urunlerde stockStatus=unknown : ${urunler.every((u) => u.stockStatus === "unknown")}`);
console.log(`  tum urunlerde inStock=false       : ${urunler.every((u) => u.inStock === "false")}`);
console.log(`  tum cevirilerde published=false   : ${ceviriler.every((c) => c.published === "false")}`);
console.log(`  tum uyumluluklarda verified=true  : ${uyumRows.every((u) => u.verified === "true")}`);
console.log(`  aciklamasi <300 olan urun         : ${urunler.filter((u) => u.longDescription.length < 300).length}`);
console.log(`  internalStockCode bos olan        : ${urunler.filter((u) => !u.internalStockCode).length}`);
console.log(`  notu olan urun                    : ${urunler.filter((u) => u.notes).length} (${urunler.filter((u) => u.notes).map((u) => u.partNumber).join(", ")})`);

const bastaSifir = urunler.filter((u) => /^0/.test(u.internalStockCode) || /^0/.test(u.partNumber));
console.log(`  bastaki sifiri olan kayit         : ${bastaSifir.length} (${bastaSifir.map((u) => `${u.partNumber}/${u.internalStockCode}`).join(", ") || "yok"})`);

const markaDag = new Map();
for (const m of makineSet.values()) markaDag.set(m.manufacturer, (markaDag.get(m.manufacturer) ?? 0) + 1);
console.log(`\n  yeni makine markalari: ${[...markaDag.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(" ")}`);
console.log(`\nCikti dizini: ${OUT}`);
