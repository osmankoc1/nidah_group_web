/**
 * Faz 3 — 97 katalog adayının hazırlık grupları. SALT OKUNUR.
 *
 * Üç soruyu ayrı ayrı yanıtlar:
 *   1. Fiziksel stok teyidi gereken ürünler (ve aciliyet sırası)
 *   2. Fotoğrafı eksik olanlar
 *   3. Teknik açıklaması 300 karaktere UYDURMADAN çıkarılabilecek olanlar
 *
 * "Olgu malzemesi", uydurma olmadan yazılabilecek ham olgu hacmidir:
 * mevcut teknik açıklama + ölçü + malzeme + montaj yeri + teknik sistem +
 * DOĞRULANMIŞ uyumluluk satırlarındaki marka/model/seri metni + doğrulanmış
 * OEM referansları. Bitmiş metin DEĞİLDİR.
 *
 * Kullanım:
 *   node scripts/faz3-hazirlik-gruplari.mjs <dev-urun-listesi> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , devListe, outArg] = process.argv;
if (!devListe || !outArg) {
  console.error("Kullanim: node scripts/faz3-hazirlik-gruplari.mjs <dev-liste> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V17 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v17.xlsx";

const KESIN = "Kesin doğrulandı";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const dev = readFileSync(devListe, "utf-8").split(/\r?\n/)
  .filter((l) => l.startsWith("URUN|"))
  .map((l) => { const [, pn, kod] = l.split("|"); return { partNumber: (pn ?? "").trim(), logoKodu: (kod ?? "").trim() }; })
  .filter((d) => d.partNumber && !/^(TEST|ATOM)[-\s]/i.test(d.partNumber) && d.partNumber !== "0012345");

const wb = XLSX.read(readFileSync(V17), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const shRaw = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: true, defval: "" });
const A = sh("A Yayın Adayları");
const TUM = shRaw("Tüm Ürünler");
const UY = sh("Makine Uyumluluğu");
const OEM = sh("OEM ve Muadil");

const aByLogo = new Map();
for (const r of A) aByLogo.set(N(S(r, "Orijinal Ürün Kodu")), r);
const stokByLogo = new Map();
for (const r of TUM) stokByLogo.set(N(r["Orijinal Ürün Kodu"]), Number(r["Gerçek Stok Miktarı"]));
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByLogo = new Map();
const oemByLogo = new Map();
for (const r of UY) push(uyByLogo, N(S(r, "Orijinal Ürün Kodu")), r);
for (const r of OEM) push(oemByLogo, N(S(r, "Orijinal Ürün Kodu")), r);

const kayitlar = [];
for (const d of dev) {
  const lk = N(d.logoKodu);
  const r = aByLogo.get(lk);
  if (!r) { kayitlar.push({ partNumber: d.partNumber, logoKodu: d.logoKodu, hata: "v17 A grubunda bulunamadi" }); continue; }

  const ta = S(r, "Teknik Açıklama");
  const olcu = S(r, "Ölçü ve Özellik");
  const malzeme = S(r, "Malzeme");
  const montaj = S(r, "Montaj Yeri");
  const sistem = S(r, "Teknik Sistem");
  const uyKesin = (uyByLogo.get(lk) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const oemKesin = (oemByLogo.get(lk) ?? []).filter((x) => S(x, "Doğrulama Seviyesi") === KESIN);

  let uyMetin = 0;
  const modeller = new Set();
  for (const x of uyKesin) {
    uyMetin += [S(x, "Makine Markası"), S(x, "Makine Modeli"), S(x, "Seri"), S(x, "Seri Numarası Kapsamı")]
      .filter(Boolean).join(" ").length;
    if (S(x, "Makine Modeli")) modeller.add(`${S(x, "Makine Markası")} ${S(x, "Makine Modeli")}`);
  }
  const oemMetin = oemKesin.reduce((a, x) => a + (S(x, "OEM / OE Referansı") + S(x, "Referans Markası")).length, 0);
  const olgu = ta.length + olcu.length + malzeme.length + montaj.length + sistem.length + uyMetin + oemMetin;

  const stok = stokByLogo.get(lk);
  const stokDurumu = !Number.isFinite(stok) ? "bilinmiyor"
    : stok < 0 ? "NEGATIF (Logo hatasi)"
    : stok === 0 ? "sifir"
    : "pozitif";

  // Aciklama tamamlanabilirlik katmani
  const katman = olgu >= 300 ? "A - mevcut olgularla ulasilabilir"
    : olgu >= 250 ? "B - az ek olcum yeterli"
    : "C - olcum ve fotograf sart";

  kayitlar.push({
    partNumber: d.partNumber,
    logoKodu: d.logoKodu,
    teknikAdTR: S(r, "Teknik Ad TR"),
    // 1. STOK
    logoStokMiktari: Number.isFinite(stok) ? stok : "",
    stokDurumu,
    stokTeyidiGerekli: "EVET",
    // 2. FOTOGRAF
    fotografURL: S(r, "Doğrulanmış Fotoğraf URL") || "(YOK)",
    fotografEksik: S(r, "Doğrulanmış Fotoğraf URL") ? "hayir" : "EVET",
    // 3. ACIKLAMA
    aciklamaUzunluk: ta.length,
    eksikKarakter: Math.max(0, 300 - ta.length),
    olguMalzemesi: olgu,
    tamamlanabilirlikKatmani: katman,
    // Olgu kaynaklari
    olcuVar: olcu ? "evet" : "hayir",
    malzemeVar: malzeme ? "evet" : "hayir",
    montajVar: montaj ? "evet" : "hayir",
    kesinUyumSayisi: uyKesin.length,
    farkliModelSayisi: modeller.size,
    kesinOemSayisi: oemKesin.length,
  });
}

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = ["partNumber", "logoKodu", "teknikAdTR", "logoStokMiktari", "stokDurumu", "stokTeyidiGerekli",
  "fotografURL", "fotografEksik", "aciklamaUzunluk", "eksikKarakter", "olguMalzemesi",
  "tamamlanabilirlikKatmani", "olcuVar", "malzemeVar", "montajVar", "kesinUyumSayisi",
  "farkliModelSayisi", "kesinOemSayisi"];

writeFileSync(OUT + "32_hazirlik_gruplari.csv", "\uFEFF" + csv(
  [...kayitlar].sort((a, b) => (b.olguMalzemesi ?? 0) - (a.olguMalzemesi ?? 0)), COLS), "utf8");

const say = (f) => kayitlar.filter(f).length;
console.log("=== 1. FIZIKSEL STOK TEYIDI ===");
console.log(`  teyit gereken urun : ${kayitlar.length}/97  (hepsi — stock_status=unknown)`);
for (const d of ["pozitif", "sifir", "NEGATIF (Logo hatasi)", "bilinmiyor"]) {
  const n = say((k) => k.stokDurumu === d);
  if (n) console.log(`     ${String(n).padStart(3)}  Logo stok: ${d}`);
}
console.log("\n=== 2. FOTOGRAF ===");
console.log(`  fotografi EKSIK    : ${say((k) => k.fotografEksik === "EVET")}/97`);
console.log(`  fotografi olan     : ${say((k) => k.fotografEksik === "hayir")}/97`);

console.log("\n=== 3. ACIKLAMA TAMAMLANABILIRLIGI ===");
for (const t of ["A - mevcut olgularla ulasilabilir", "B - az ek olcum yeterli", "C - olcum ve fotograf sart"]) {
  console.log(`  ${String(say((k) => k.tamamlanabilirlikKatmani === t)).padStart(3)}  ${t}`);
}
const olgular = kayitlar.map((k) => k.olguMalzemesi).filter(Number.isFinite).sort((a, b) => a - b);
console.log(`  olgu malzemesi: min=${olgular[0]} medyan=${olgular[Math.floor(olgular.length / 2)]} max=${olgular[olgular.length - 1]}`);
console.log(`  toplam eksik karakter: ${kayitlar.reduce((a, k) => a + (k.eksikKarakter ?? 0), 0)}`);

console.log("\n=== OLGU KAYNAKLARININ DOLULUGU ===");
console.log(`  olcu bilgisi olan     : ${say((k) => k.olcuVar === "evet")}/97`);
console.log(`  malzeme bilgisi olan  : ${say((k) => k.malzemeVar === "evet")}/97`);
console.log(`  montaj yeri olan      : ${say((k) => k.montajVar === "evet")}/97`);
console.log(`  >=2 kesin uyumu olan  : ${say((k) => k.kesinUyumSayisi >= 2)}/97`);
console.log(`  >=4 kesin uyumu olan  : ${say((k) => k.kesinUyumSayisi >= 4)}/97`);

console.log("\n=== EN YUKSEK OLGU MALZEMESI OLAN 10 URUN (once bunlar) ===");
for (const k of [...kayitlar].sort((a, b) => b.olguMalzemesi - a.olguMalzemesi).slice(0, 10)) {
  console.log(`  ${k.partNumber.padEnd(16)} olgu=${String(k.olguMalzemesi).padStart(3)} aciklama=${String(k.aciklamaUzunluk).padStart(3)} eksik=${String(k.eksikKarakter).padStart(3)} uyum=${String(k.kesinUyumSayisi).padStart(2)} model=${String(k.farkliModelSayisi).padStart(2)} | ${k.teknikAdTR.slice(0, 26)}`);
}
console.log(`\n32_hazirlik_gruplari.csv yazildi -> ${OUT}`);
