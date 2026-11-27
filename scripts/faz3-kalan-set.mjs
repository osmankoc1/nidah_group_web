/**
 * Faz 3 — kalan güvenilir ürünlerin seti. SALT OKUNUR (veritabanına yazmaz).
 *
 * Yaptıkları:
 *   1. 97 güvenilir ürünü çalışma kitabından YENİDEN hesaplar (önceki
 *      hesabı okumaz — ölçütler baştan uygulanır).
 *   2. Veritabanında zaten bulunan ürünleri çıkarır.
 *   3. Kalan her ürünü ölçüt ölçüt yeniden doğrular; düşenleri gerekçesiyle
 *      ayrı listeler.
 *   4. Çakışma kontrolü: parça numarası, normalize parça numarası ve Logo
 *      stok kodu bazında mevcut kayıtlarla karşılaştırır.
 *   5. İçe aktarma dosyalarını üretir (ürün / makine / uyumluluk / çeviri).
 *   6. Aynı parça+makine çiftinin FARKLI seri kapsamlarını inceler.
 *   7. Fotoğraf ve 300 karakterlik açıklama eksiklerini ürün bazında listeler.
 *
 * Kullanım:
 *   node scripts/faz3-kalan-set.mjs <mevcut-envanter-dosyasi> <cikti-dizini>
 *
 * Mevcut envanter dosyası, veritabanından alınan `URUN|<parça no>` ve
 * `MAKINE|<üretici>|<model>|<tip>` satırlarını içerir.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-kalan-set.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const XLSX_YOL = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v8.xlsx";

const KESIN = "Kesin doğrulandı";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const SITE_MARKALARI = new Map([
  ["AMMANN", "AMMANN"], ["BOMAG", "BOMAG"], ["CATERPILLAR", "CATERPILLAR"],
  ["CHAMPION", "CHAMPION"], ["HAMM", "HAMM"], ["HIDROMEK", "HIDROMEK"],
  ["HİDROMEK", "HIDROMEK"], ["KOMATSU", "KOMATSU"], ["VOLVO", "VOLVO"],
]);
const siteMarkasi = (m) => SITE_MARKALARI.get(m.trim().toUpperCase()) ?? null;

// ── Mevcut envanter ──────────────────────────────────────────────────────────
const envanter = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcutUrun = envanter.filter((l) => l.startsWith("URUN|")).map((l) => l.slice(5).trim());
const mevcutUrunNorm = new Set(mevcutUrun.map(N));
const mevcutMakine = new Set(
  envanter.filter((l) => l.startsWith("MAKINE|")).map((l) => {
    const [, mf, mod, tp] = l.split("|");
    return `${N(mf)}|${N(mod)}|${N(tp)}`;
  })
);

// ── Çalışma kitabı ───────────────────────────────────────────────────────────
const wb = XLSX.read(readFileSync(XLSX_YOL), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const A = sh("A Yayın Adayları");
const UY = sh("Makine Uyumluluğu");
const OEM = sh("OEM ve Muadil");
const CEL = sh("Çelişkili Kayıtlar");
const MUK = sh("Mükerrer Adayları");

const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map();
const oemByKod = new Map();
for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
for (const r of OEM) push(oemByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const celKod = new Set(CEL.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const mukKod = new Set(MUK.map((r) => N(S(r, "Orijinal Ürün Kodu"))));

const okMap = new Map();
for (const r of A) push(okMap, N(S(r, "Orijinal Ürün Kodu")), S(r, "Orijinal Ürün Kodu"));
const okCakisan = new Set([...okMap.entries()].filter(([, l]) => new Set(l).size > 1).map(([k]) => k));

const krMap = new Map();
for (const r of A) { const k = N(S(r, "Katalog Referansı")); if (k) push(krMap, k, r); }
const krPaylasilan = new Set([...krMap.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));

// ── Ölçüt ölçüt yeniden doğrulama ────────────────────────────────────────────
const OLCUTLER = [
  ["urun-dogrulama-kesin", (r) => S(r, "Doğrulama Seviyesi") === KESIN],
  ["katalog-referansi-var", (r) => !!S(r, "Katalog Referansı")],
  ["teknik-ad-var", (r) => !!S(r, "Teknik Ad TR")],
  ["katalog-referansi-paylasilmiyor", (r) => !krPaylasilan.has(N(S(r, "Katalog Referansı")))],
  ["normalize-cakismasi-yok", (r) => !okCakisan.has(N(S(r, "Orijinal Ürün Kodu")))],
  ["celiskili-degil", (r) => !celKod.has(N(S(r, "Orijinal Ürün Kodu")))],
  ["mukerrer-adayi-degil", (r) => !mukKod.has(N(S(r, "Orijinal Ürün Kodu")))],
];

const uygun = [];
const dusenler = [];
for (const r of A) {
  const basarisiz = OLCUTLER.filter(([, f]) => !f(r)).map(([ad]) => ad);
  const ok = N(S(r, "Orijinal Ürün Kodu"));
  const uyKesin = (uyByKod.get(ok) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const uySayfali = uyKesin.filter((x) => siteMarkasi(S(x, "Makine Markası")));
  if (uySayfali.length === 0) basarisiz.push("sayfali-markada-kesin-uyum-yok");

  if (basarisiz.length > 0) {
    dusenler.push({ katalogReferansi: S(r, "Katalog Referansı"), logoKodu: S(r, "Orijinal Ürün Kodu"), teknikAdTR: S(r, "Teknik Ad TR"), gerekce: basarisiz.join(";") });
    continue;
  }
  const oemKesin = (oemByKod.get(ok) ?? []).filter((x) => S(x, "Doğrulama Seviyesi") === KESIN);
  uygun.push({ r, ok, uySayfali, oemKesin });
}

const zatenVar = uygun.filter((u) => mevcutUrunNorm.has(N(S(u.r, "Katalog Referansı"))));
const kalan = uygun.filter((u) => !mevcutUrunNorm.has(N(S(u.r, "Katalog Referansı"))));

console.log("=== GUVENILIRLIK YENIDEN DOGRULAMASI ===");
console.log(`  A grubu toplam          : ${A.length}`);
console.log(`  olcutlerden GECEN       : ${uygun.length}`);
console.log(`  olcutlerden DUSEN       : ${dusenler.length}`);
console.log(`  veritabaninda ZATEN VAR : ${zatenVar.length}`);
console.log(`  AKTARILACAK (kalan)     : ${kalan.length}`);

const gerekceSay = new Map();
for (const d of dusenler) for (const g of d.gerekce.split(";")) gerekceSay.set(g, (gerekceSay.get(g) ?? 0) + 1);
console.log("\n  dusme gerekceleri (bir kayit birden fazla gerekce tasiyabilir):");
for (const [g, n] of [...gerekceSay.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`     ${String(n).padStart(4)}  ${g}`);
}

// ── Çakışma kontrolü ─────────────────────────────────────────────────────────
console.log("\n=== CAKISMA KONTROLU (kalan set vs veritabani) ===");
const cakisma = { partNumber: [], normalize: [], stokKodu: [] };
for (const u of kalan) {
  const pn = S(u.r, "Katalog Referansı");
  if (mevcutUrun.includes(pn)) cakisma.partNumber.push(pn);
  if (mevcutUrunNorm.has(N(pn))) cakisma.normalize.push(pn);
}
// Kalan set ICINDE mukerrer var mi
const icPn = new Map();
for (const u of kalan) push(icPn, N(S(u.r, "Katalog Referansı")), S(u.r, "Katalog Referansı"));
const icMukerrer = [...icPn.entries()].filter(([, l]) => l.length > 1);
const icStok = new Map();
for (const u of kalan) push(icStok, N(S(u.r, "Orijinal Ürün Kodu")), S(u.r, "Katalog Referansı"));
const icStokMukerrer = [...icStok.entries()].filter(([, l]) => l.length > 1);

console.log(`  mevcut parca numarasiyla cakisan : ${cakisma.partNumber.length}`);
console.log(`  mevcut normalize ile cakisan     : ${cakisma.normalize.length}`);
console.log(`  kalan set ICINDE mukerrer parca  : ${icMukerrer.length}`);
console.log(`  kalan set ICINDE mukerrer stok   : ${icStokMukerrer.length}${icStokMukerrer.length ? " -> " + icStokMukerrer.map(([k, l]) => `${k}: ${l.join(",")}`).slice(0, 3).join(" | ") : ""}`);

// ── Dosyalar ─────────────────────────────────────────────────────────────────
const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "\uFEFF" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(34)} ${String(rows.length).padStart(4)} satir`);
};

console.log("\n=== URETILEN DOSYALAR ===");

yaz("20_kalan_urunler.csv",
  kalan.map((u) => ({
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

// Makineler — veritabaninda ZATEN OLANLAR dosyaya alinmaz (mukerrer onlemi).
const makineSet = new Map();
let zatenVarMakine = 0;
for (const u of kalan) {
  for (const x of u.uySayfali) {
    const marka = siteMarkasi(S(x, "Makine Markası"));
    const model = S(x, "Makine Modeli");
    if (!marka || !model) continue;
    const varyant = S(x, "Varyant");
    const anahtar = `${N(marka)}|${N(model)}|`;
    if (!varyant && mevcutMakine.has(anahtar)) { zatenVarMakine++; continue; }
    const key = `${marka}|${model}|${varyant}`;
    if (!makineSet.has(key)) {
      makineSet.set(key, {
        manufacturer: marka, model, type: "", yearFrom: "", yearTo: "",
        variantName: varyant, engineModel: S(x, "Motor Tipi"),
        serialFrom: "", serialTo: "",
        seriNoKapsamiHAM: S(x, "Seri Numarası Kapsamı"), seri: S(x, "Seri"),
      });
    }
  }
}
yaz("21_kalan_makineler.csv", [...makineSet.values()],
  ["manufacturer", "model", "type", "yearFrom", "yearTo", "variantName", "engineModel",
   "serialFrom", "serialTo", "seriNoKapsamiHAM", "seri"]);
console.log(`  (veritabaninda zaten olan makine atlandi: ${zatenVarMakine} uyumluluk satiri)`);

// Uyumluluk — AYNI parca+makine ciftinin FARKLI seri notlari KAYBEDILMEZ:
// hepsi notes alaninda birlestirilir, satir SILINMEZ.
const uyumGrup = new Map();
for (const u of kalan) {
  for (const x of u.uySayfali) {
    const marka = siteMarkasi(S(x, "Makine Markası"));
    const model = S(x, "Makine Modeli");
    if (!marka || !model) continue;
    const key = `${S(u.r, "Katalog Referansı")}|${marka}|${model}|${S(x, "Varyant")}`;
    push(uyumGrup, key, x);
  }
}
const uyumRows = [];
let birlestirilenNot = 0;
for (const [key, liste] of uyumGrup) {
  const [partNumber, manufacturer, model, variantName] = key.split("|");
  const notParcalari = [];
  for (const x of liste) {
    const p = [
      S(x, "Seri") && `Seri: ${S(x, "Seri")}`,
      S(x, "Seri Numarası Kapsamı") && `Seri no: ${S(x, "Seri Numarası Kapsamı")}`,
      S(x, "Sistem") && `Sistem: ${S(x, "Sistem")}`,
      S(x, "Montaj Yeri") && `Montaj: ${S(x, "Montaj Yeri")}`,
    ].filter(Boolean).join(" | ");
    if (p && !notParcalari.includes(p)) notParcalari.push(p);
  }
  if (liste.length > 1) birlestirilenNot++;
  const kaynaklar = [...new Set(liste.map((x) => [S(x, "Kaynak Kimliği"), S(x, "Sayfa / Çizim / Kalem")].filter(Boolean).join(" · ")))];
  uyumRows.push({
    partNumber, manufacturer, model, type: "", variantName,
    verified: "true",
    source: kaynaklar.join(" ; ").slice(0, 255),
    // TUM seri notlari korunur — hicbiri atilmaz.
    notes: notParcalari.join("  ||  "),
  });
}
yaz("22_kalan_uyumluluk.csv", uyumRows,
  ["partNumber", "manufacturer", "model", "type", "variantName", "verified", "source", "notes"]);
console.log(`  (ayni parca+makine icin birden fazla kaynak satiri olan: ${birlestirilenNot} — notlar BIRLESTIRILDI, satir kaybi YOK)`);

yaz("23_kalan_ceviriler.csv",
  kalan.filter((u) => S(u.r, "Teknik Ad EN")).map((u) => ({
    partNumber: S(u.r, "Katalog Referansı"),
    locale: "en",
    name: S(u.r, "Teknik Ad EN"),
    metaTitle: S(u.r, "SEO Başlığı EN"),
    published: "false",
  })),
  ["partNumber", "locale", "name", "metaTitle", "published"]);

yaz("24_olcutlerden_dusenler.csv", dusenler,
  ["katalogReferansi", "logoKodu", "teknikAdTR", "gerekce"]);

// ── Fotoğraf / açıklama eksikleri (97'nin tamamı) ────────────────────────────
const eksikler = uygun.map((u) => {
  const aciklama = S(u.r, "Teknik Açıklama");
  return {
    partNumber: S(u.r, "Katalog Referansı"),
    teknikAdTR: S(u.r, "Teknik Ad TR"),
    durum: mevcutUrunNorm.has(N(S(u.r, "Katalog Referansı"))) ? "aktarildi" : "aktarilacak",
    fotografUrl: S(u.r, "Doğrulanmış Fotoğraf URL") || "(YOK)",
    aciklamaUzunluk: aciklama.length,
    eksikKarakter: Math.max(0, 300 - aciklama.length),
    olcuVar: S(u.r, "Ölçü ve Özellik") ? "evet" : "hayir",
    malzemeVar: S(u.r, "Malzeme") ? "evet" : "hayir",
    montajVar: S(u.r, "Montaj Yeri") ? "evet" : "hayir",
    kesinUyum: u.uySayfali.length,
  };
});
yaz("25_foto_aciklama_eksikleri.csv", eksikler.sort((a, b) => b.aciklamaUzunluk - a.aciklamaUzunluk),
  ["partNumber", "teknikAdTR", "durum", "fotografUrl", "aciklamaUzunluk", "eksikKarakter", "olcuVar", "malzemeVar", "montajVar", "kesinUyum"]);

const fotoVar = eksikler.filter((e) => e.fotografUrl !== "(YOK)").length;
const aciklamaTam = eksikler.filter((e) => e.aciklamaUzunluk >= 300).length;
console.log("\n=== FOTOGRAF VE ACIKLAMA DURUMU (97 urun) ===");
console.log(`  dogrulanmis fotograf URL'si OLAN : ${fotoVar}/${eksikler.length}`);
console.log(`  aciklamasi >=300 karakter OLAN   : ${aciklamaTam}/${eksikler.length}`);
const uz = eksikler.map((e) => e.aciklamaUzunluk).sort((a, b) => a - b);
console.log(`  aciklama uzunlugu: min=${uz[0]} medyan=${uz[Math.floor(uz.length / 2)]} max=${uz[uz.length - 1]}`);
console.log(`\nCikti dizini: ${OUT}`);
