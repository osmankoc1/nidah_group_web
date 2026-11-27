/**
 * V18'deki 75 yeni Seviye 1 adayının ayrıntılı incelemesi. SALT OKUNUR.
 *
 * Yapılanlar:
 *   1. Teknik kimlik, katalog numarası, Logo stok kodu, uyumluluk ve kaynak
 *      alanlarının eksiksizliği denetlenir.
 *   2. Mevcut 109 kayıtla ÜÇ ANAHTAR üzerinden çakışma aranır:
 *      katalog numarası · normalize katalog numarası · Logo stok kodu
 *   3. Küme İÇİ mükerrerler aranır.
 *   4. 97 üründe kullanılan güvenilirlik ölçütleri aynen uygulanır.
 *   5. Güvenilir olanlar için açıklama taslağı bestelenir (ayrı script).
 *
 * Hiçbir kayıt otomatik birleştirilmez; çakışan kayıt AKTARILMAZ, ayrı listelenir.
 *
 * Kullanım:
 *   node scripts/faz3-75aday-inceleme.mjs <mevcut109.txt> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-75aday-inceleme.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";

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
const satirlar = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcut = satirlar.filter((l) => l.startsWith("URUN|")).map((l) => {
  const [, pn, kod, norm, uzunluk] = l.split("|");
  return { pn: (pn ?? "").trim(), kod: (kod ?? "").trim(), norm: (norm ?? "").trim(), uzunluk: Number(uzunluk) || 0 };
});
const mevcutPn = new Set(mevcut.map((m) => N(m.pn)));
const mevcutStok = new Set(mevcut.filter((m) => m.norm).map((m) => m.norm));
const mevcutMakine = new Set(satirlar.filter((l) => l.startsWith("MAKINE|")).map((l) => {
  const [, mf, mod, tp] = l.split("|");
  return `${N(mf)}|${N(mod)}|${N(tp)}`;
}));

// ── V18 ──────────────────────────────────────────────────────────────────────
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const shRaw = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: true, defval: "" });
const WK = sh("Web Katalog Adayları");
const A = sh("A Yayın Adayları");
const EK = sh("A Grubu Teknik Eksikler");
const UY = sh("Makine Uyumluluğu");
const KAY = sh("Araştırma Kaynakları");
const CEL = sh("Çelişkili Kayıtlar");
const MUK = sh("Mükerrer Adayları");
const TUM = shRaw("Tüm Ürünler");

const seviye1 = WK.filter((r) => S(r, "Seviye") === "1");
const aByKod = new Map(A.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const ekByKod = new Map(EK.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map(); for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const kayByKod = new Map(); for (const r of KAY) push(kayByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const celKod = new Set(CEL.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const mukKod = new Set(MUK.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const stokBy = new Map(TUM.map((r) => [N(r["Orijinal Ürün Kodu"]),
  { adet: Number(r["Gerçek Stok Miktarı"]), ad: String(r["Orijinal Ürün Adı"] ?? "").trim() }]));

// A grubu ici normalize cakismasi ve paylasilan katalog referansi
const okMap = new Map();
for (const r of A) push(okMap, N(S(r, "Orijinal Ürün Kodu")), S(r, "Orijinal Ürün Kodu"));
const okCakisan = new Set([...okMap.entries()].filter(([, l]) => new Set(l).size > 1).map(([k]) => k));
const krMap = new Map();
for (const r of A) { const k = N(S(r, "Katalog Referansı")); if (k) push(krMap, k, r); }
const krPaylasilan = new Set([...krMap.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));

// ── Yeni adaylar: Seviye 1'de olup dev'de OLMAYANLAR ─────────────────────────
const yeniler = seviye1.filter((r) =>
  !mevcutPn.has(N(S(r, "Katalog Referansı"))) && !mevcutStok.has(N(S(r, "Orijinal Logo Stok Kodu")))
);
console.log(`V18 Seviye 1              : ${seviye1.length}`);
console.log(`dev'de zaten olan         : ${seviye1.length - yeniler.length}`);
console.log(`YENI ADAY                 : ${yeniler.length}`);

// Kume ici mukerrer
const iciPn = new Map(), iciStok = new Map();
for (const r of yeniler) {
  push(iciPn, N(S(r, "Katalog Referansı")), S(r, "Katalog Referansı"));
  push(iciStok, N(S(r, "Orijinal Logo Stok Kodu")), S(r, "Katalog Referansı"));
}
const iciPnMukerrer = new Set([...iciPn.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));
const iciStokMukerrer = new Set([...iciStok.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));

// ── Denetim ──────────────────────────────────────────────────────────────────
const kayitlar = [];
for (const w of yeniler) {
  const katRef = S(w, "Katalog Referansı");
  const logo = S(w, "Orijinal Logo Stok Kodu");
  const a = aByKod.get(N(logo));
  const ek = ekByKod.get(N(logo));
  const uyKesin = (uyByKod.get(N(logo)) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const uySayfali = uyKesin.filter((x) => siteMarkasi(S(x, "Makine Markası")));
  const kaynaklar = kayByKod.get(N(logo)) ?? [];
  const stok = stokBy.get(N(logo));

  const engeller = [];
  // Kimlik eksiksizligi
  if (!katRef) engeller.push("katalog-referansi-yok");
  if (!logo) engeller.push("logo-stok-kodu-yok");
  if (!a) engeller.push("A-grubunda-bulunamadi");
  if (a && !S(a, "Teknik Ad TR")) engeller.push("teknik-ad-yok");
  if (a && S(a, "Doğrulama Seviyesi") !== KESIN) engeller.push("urun-dogrulama-kesin-degil");
  if (!ek) engeller.push("teknik-eksikler-kaydi-yok");
  if (ek && S(ek, "Teknik Kimlik") !== "Kesin · mevcut kanıt") engeller.push(`teknik-kimlik: ${S(ek, "Teknik Kimlik")}`);
  // Kaynak
  if (!S(w, "Kaynak URL")) engeller.push("kaynak-URL-yok");
  if (!ek || !S(ek, "Kaynak / Kalem")) engeller.push("kaynak-kalemi-yok");
  if (kaynaklar.length === 0) engeller.push("kaynak-kaydi-yok");
  // Uyumluluk
  if (uyKesin.length === 0) engeller.push("kesin-makine-uyumu-yok");
  else if (uySayfali.length === 0) engeller.push("sayfali-markada-kesin-uyum-yok");
  // Celiskili / mukerrer
  if (celKod.has(N(logo))) engeller.push("celiskili-kayit");
  if (mukKod.has(N(logo))) engeller.push("mukerrer-adayi");
  if (okCakisan.has(N(logo))) engeller.push("normalize-cakismasi");
  if (krPaylasilan.has(N(katRef))) engeller.push("katalog-referansi-paylasilan");
  // Cakisma (mevcut 109)
  if (mevcutPn.has(N(katRef))) engeller.push("CAKISMA: parca numarasi mevcut");
  if (mevcutStok.has(N(logo))) engeller.push("CAKISMA: Logo stok kodu mevcut");
  // Kume ici
  if (iciPnMukerrer.has(N(katRef))) engeller.push("kume-ici mukerrer parca numarasi");
  if (iciStokMukerrer.has(N(logo))) engeller.push("kume-ici mukerrer Logo stok kodu");

  const makineler = [...new Set(uySayfali.map((x) => `${siteMarkasi(S(x, "Makine Markası"))} ${S(x, "Makine Modeli")}`.trim()))];
  const yeniMakine = makineler.filter((m) => {
    const [marka, ...mod] = m.split(" ");
    return !mevcutMakine.has(`${N(marka)}|${N(mod.join(" "))}|`);
  });

  kayitlar.push({
    partNumber: katRef, logoKodu: logo,
    teknikAdTR: a ? S(a, "Teknik Ad TR") : "", teknikAdEN: a ? S(a, "Teknik Ad EN") : "",
    teknikKategori: S(w, "Teknik Kategori"), teknikSistem: a ? S(a, "Teknik Sistem") : "",
    montajYeri: a ? S(a, "Montaj Yeri") : "",
    dogrulamaSeviyesi: a ? S(a, "Doğrulama Seviyesi") : "",
    teknikKimlik: ek ? S(ek, "Teknik Kimlik") : "",
    fiiliUretici: ek ? S(ek, "Fiili Üretici") : "",
    kaynakKalem: ek ? S(ek, "Kaynak / Kalem") : "",
    kaynakSayisi: kaynaklar.length,
    kaynakURL: S(w, "Kaynak URL").slice(0, 80),
    kesinUyum: uyKesin.length, sayfaliUyum: uySayfali.length,
    makineler: makineler.join(" | "),
    yeniMakineSayisi: yeniMakine.length, yeniMakineler: yeniMakine.join(" | "),
    seriKapsami: S(w, "Seri Kapsamı"),
    oem: S(w, "OEM Referansları"), muadil: S(w, "Muadil Referansları"),
    eksikBilgiler: S(w, "Eksik Bilgiler"),
    logoAdi: stok?.ad ?? "", logoMiktar: Number.isFinite(stok?.adet) ? stok.adet : "",
    olcu: a ? S(a, "Ölçü ve Özellik") : "", malzeme: a ? S(a, "Malzeme") : "",
    eskiAciklama: a ? S(a, "Teknik Açıklama") : "",
    engelSayisi: engeller.length,
    engeller: engeller.join(" ; ") || "-",
    durum: engeller.length === 0 ? "AKTARILABILIR" : "SUPHELI",
  });
}

const aktarilabilir = kayitlar.filter((k) => k.durum === "AKTARILABILIR");
const supheli = kayitlar.filter((k) => k.durum === "SUPHELI");

console.log(`\n=== DENETIM ===`);
console.log(`  AKTARILABILIR : ${aktarilabilir.length}`);
console.log(`  SUPHELI       : ${supheli.length}`);

const engelSay = new Map();
for (const k of supheli) for (const e of k.engeller.split(" ; ")) engelSay.set(e, (engelSay.get(e) ?? 0) + 1);
console.log(`\n  engel dagilimi:`);
for (const [e, n] of [...engelSay.entries()].sort((a, b) => b[1] - a[1])) console.log(`     ${String(n).padStart(3)}  ${e}`);

console.log(`\n=== CAKISMA OZETI ===`);
console.log(`  mevcut parca numarasiyla cakisan : ${kayitlar.filter((k) => k.engeller.includes("parca numarasi mevcut")).length}`);
console.log(`  mevcut Logo stok koduyla cakisan : ${kayitlar.filter((k) => k.engeller.includes("Logo stok kodu mevcut")).length}`);
console.log(`  kume ici mukerrer                : ${kayitlar.filter((k) => k.engeller.includes("kume-ici")).length}`);

console.log(`\n=== AKTARILABILIR ${aktarilabilir.length} URUNUN PROFILI ===`);
const kat = new Map();
for (const k of aktarilabilir) kat.set(k.teknikKategori, (kat.get(k.teknikKategori) ?? 0) + 1);
for (const [c, n] of [...kat.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${c}`);
const uyumlar = aktarilabilir.map((k) => k.sayfaliUyum).sort((a, b) => a - b);
console.log(`  kesin uyum: min=${uyumlar[0]} medyan=${uyumlar[Math.floor(uyumlar.length / 2)]} max=${uyumlar[uyumlar.length - 1]}`);
console.log(`  seri kapsami olan : ${aktarilabilir.filter((k) => k.seriKapsami).length}/${aktarilabilir.length}`);
console.log(`  olcu bilgisi olan : ${aktarilabilir.filter((k) => k.olcu).length}/${aktarilabilir.length}`);
console.log(`  malzeme olan      : ${aktarilabilir.filter((k) => k.malzeme).length}/${aktarilabilir.length}`);
console.log(`  YENI makine gerektiren : ${aktarilabilir.filter((k) => k.yeniMakineSayisi > 0).length}`);
const tumYeniMakine = new Set();
for (const k of aktarilabilir) for (const m of k.yeniMakineler.split(" | ").filter(Boolean)) tumYeniMakine.add(m);
console.log(`  eklenecek BENZERSIZ yeni makine : ${tumYeniMakine.size}${tumYeniMakine.size ? " -> " + [...tumYeniMakine].slice(0, 8).join(", ") : ""}`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = Object.keys(kayitlar[0] ?? {});
writeFileSync(OUT + "90_75aday_denetim.csv", "\uFEFF" + csv(kayitlar, COLS), "utf8");
writeFileSync(OUT + "91_aktarilabilir.csv", "\uFEFF" + csv(aktarilabilir, COLS), "utf8");
writeFileSync(OUT + "92_supheli.csv", "\uFEFF" + csv(supheli, COLS), "utf8");
writeFileSync(OUT + "93_aktarilabilir.json", JSON.stringify(aktarilabilir.map((k) => ({
  pn: k.partNumber, logo: k.logoKodu, adTR: k.teknikAdTR, adEN: k.teknikAdEN,
  sistem: k.teknikSistem, montaj: k.montajYeri, kategori: k.teknikKategori,
  olcu: k.olcu, malzeme: k.malzeme, oem: k.oem, muadil: k.muadil,
  seriKapsami: k.seriKapsami, kaynakKalem: k.kaynakKalem,
  markaIpucu: "", logoAdi: k.logoAdi, logoMiktar: k.logoMiktar,
  uyumluluk: k.makineler.split(" | ").filter(Boolean).map((m) => {
    const [marka, ...mod] = m.split(" ");
    return { marka, model: mod.join(" "), seri: "", seriNo: "", montaj: "", kaynak: k.kaynakKalem };
  }),
})), null, 1), "utf8");

console.log(`\n90_75aday_denetim.csv (${kayitlar.length}) · 91_aktarilabilir.csv (${aktarilabilir.length}) · 92_supheli.csv (${supheli.length}) · 93_aktarilabilir.json yazildi`);
