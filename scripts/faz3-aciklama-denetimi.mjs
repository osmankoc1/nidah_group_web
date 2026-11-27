/**
 * 97 ürünün açıklama ve kimlik denetimi. SALT OKUNUR.
 *
 * Dört denetim:
 *   1. MÜKERRER / BENZER AÇIKLAMA — taslaklar arası benzerlik (Jaccard, kelime
 *      kümesi). %85 ve üzeri çiftler yinelenen içerik riskidir.
 *   2. BELİRSİZ PARÇA KİMLİĞİ — aynı teknik ad + aynı kaynak kalemi (aynı
 *      çizimin aynı kalemi) + ölçü/malzeme yok ⇒ ürünler birbirinden
 *      ayırt edilemez.
 *   3. LOGO ↔ KATALOG İSİM UYUŞMAZLIĞI — Logo stok adı ile teknik adın
 *      (TR ve EN) hiç ortak kelimesi yoksa uyuşmazlık adayıdır.
 *   4. BENZER PARÇALAR — aynı teknik ad farklı parça numaralarında.
 *
 * Kullanım:
 *   node scripts/faz3-aciklama-denetimi.mjs <60_taslaklar_87.json> <pilot-md> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu, pilotMd, outArg] = process.argv;
if (!taslakYolu || !pilotMd || !outArg) {
  console.error("Kullanim: node scripts/faz3-aciklama-denetimi.mjs <taslaklar.json> <pilot.md> <cikti>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(taslakYolu, "utf-8"));

// ── Pilot taslaklarını markdown'dan al ───────────────────────────────────────
const md = readFileSync(pilotMd, "utf-8");
const pilotTaslak = new Map();
for (const m of md.matchAll(/^> ((?:328-9669|CH 19629|324-0386|351-0925|CH 50A-1864ZI|VOE 12749768|CH 12119-10|CH 12119-16|714-16-19730|714-12-19710)[^\n]*)$/gm)) {
  const metin = m[1].replace(/\s*\[K\d\](\[K\d\])*/g, "").trim();
  const pn = veri.find((v) => metin.startsWith(v.pn))?.pn;
  if (pn) pilotTaslak.set(pn, metin);
}

const kayitlar = veri.map((v) => ({
  ...v,
  metin: v.taslak ?? pilotTaslak.get(v.pn) ?? "",
  kaynak: v.taslak ? "bestelendi" : "pilot (elle)",
}));
const eksikMetin = kayitlar.filter((k) => !k.metin);
console.log(`denetlenen urun : ${kayitlar.length}`);
console.log(`  bestelenen    : ${kayitlar.filter((k) => k.kaynak === "bestelendi").length}`);
console.log(`  pilot (elle)  : ${kayitlar.filter((k) => k.kaynak === "pilot (elle)").length}`);
if (eksikMetin.length) console.log(`  !! metni ALINAMAYAN: ${eksikMetin.map((k) => k.pn).join(", ")}`);

// ── 1. Benzerlik ─────────────────────────────────────────────────────────────
const kelimeler = (s) => new Set(
  s.toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşü0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
);
const jaccard = (a, b) => {
  let kesisim = 0;
  for (const w of a) if (b.has(w)) kesisim++;
  return kesisim / (a.size + b.size - kesisim);
};
const kelimeKumesi = new Map(kayitlar.map((k) => [k.pn, kelimeler(k.metin)]));

const benzerCiftler = [];
for (let i = 0; i < kayitlar.length; i++) {
  for (let j = i + 1; j < kayitlar.length; j++) {
    const a = kayitlar[i], b = kayitlar[j];
    if (!a.metin || !b.metin) continue;
    const skor = jaccard(kelimeKumesi.get(a.pn), kelimeKumesi.get(b.pn));
    if (skor >= 0.85) {
      benzerCiftler.push({
        urunA: a.pn, urunB: b.pn, benzerlik: Math.round(skor * 1000) / 10,
        adA: a.adTR, adB: b.adTR,
        ayniAd: a.adTR === b.adTR ? "EVET" : "hayir",
        ayniKaynakKalem: a.kaynakKalem === b.kaynakKalem ? "EVET" : "hayir",
        olcuEksik: (!a.olcu && !b.olcu) ? "EVET" : "hayir",
      });
    }
  }
}
benzerCiftler.sort((x, y) => y.benzerlik - x.benzerlik);

// ── 2. Belirsiz kimlik ───────────────────────────────────────────────────────
const kalemGrup = new Map();
for (const k of kayitlar) {
  if (!k.kaynakKalem) continue;
  const anahtar = `${k.adTR}||${k.kaynakKalem}`;
  const l = kalemGrup.get(anahtar);
  if (l) l.push(k); else kalemGrup.set(anahtar, [k]);
}
const belirsizKimlik = [];
for (const [anahtar, grup] of kalemGrup) {
  if (grup.length < 2) continue;
  const [ad, kalem] = anahtar.split("||");
  const olcusuzHepsi = grup.every((g) => !g.olcu && !g.malzeme);
  belirsizKimlik.push({
    teknikAd: ad, kaynakKalem: kalem, urunSayisi: grup.length,
    urunler: grup.map((g) => g.pn).join(", "),
    hicbirindeOlcuYok: olcusuzHepsi ? "EVET" : "hayir",
    ayirtEdilebilir: olcusuzHepsi ? "HAYIR - olcum sart" : "kismen",
  });
}

// ── 3. Logo ↔ katalog isim uyuşmazlığı ───────────────────────────────────────
/*
 * Bu denetim ARTIK kendi karsilastirmasini yapmiyor.
 *
 * Ilk surum `toLocaleLowerCase("tr")` kullaniyordu; Turkce kuralinda buyuk `I`
 * noktasiz `i`'ya dustugu icin "BEARING" -> "bearing" olup katalogdaki
 * "bearing" ile ESLESMIYORDU. 47 uyusmazligin cogu bu yuzden YANLIS POZITIFTI.
 *
 * Dogru karsilastirma `scripts/faz3-isim-eslesme.mjs` icinde yapiliyor
 * (aksan katlama + Turkce govdeleme + alt dize + sozluk) ve sonucu
 * `70_isim_eslesme_sonucu.csv` dosyasina yaziliyor. Burada o sonuc OKUNUR.
 */
const isimCsvYolu = OUT + "70_isim_eslesme_sonucu.csv";
let uyusmazlik = [];
try {
  const satirlar = readFileSync(isimCsvYolu, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const baslik = satirlar[0].split(";").map((h) => h.replace(/^"|"$/g, ""));
  for (const satir of satirlar.slice(1)) {
    const h = satir.split(";").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
    const r = Object.fromEntries(baslik.map((b, i) => [b, h[i] ?? ""]));
    if (r.durum === "MASA BASINDA COZULDU") continue;
    uyusmazlik.push({
      partNumber: r.partNumber, logoKodu: r.logoKodu, logoAdi: r.logoAdi,
      teknikAdTR: r.teknikAdTR, teknikAdEN: r.teknikAdEN,
      agirlik: r.durum === "DEPO KONTROLU GEREKLI" ? "YUKSEK" : "olasi",
      gerekce: r.gerekce,
    });
  }
} catch {
  console.log("  !! 70_isim_eslesme_sonucu.csv okunamadi — once faz3-isim-eslesme.mjs calistirilmali");
}

// ── 4. Aynı teknik ad, farklı parça numarası ─────────────────────────────────
const adGrup = new Map();
for (const k of kayitlar) {
  const l = adGrup.get(k.adTR);
  if (l) l.push(k); else adGrup.set(k.adTR, [k]);
}
const ayniAd = [...adGrup.entries()].filter(([, g]) => g.length > 1)
  .map(([ad, g]) => ({
    teknikAd: ad, urunSayisi: g.length, urunler: g.map((x) => x.pn).join(", "),
    farkliKaynakKalem: new Set(g.map((x) => x.kaynakKalem)).size,
    olcusuOlan: g.filter((x) => x.olcu).length,
  })).sort((a, b) => b.urunSayisi - a.urunSayisi);

// ── Rapor ────────────────────────────────────────────────────────────────────
console.log(`\n=== 1. BENZER / MUKERRER ACIKLAMA (Jaccard >= %85) ===`);
console.log(`  cift sayisi: ${benzerCiftler.length}`);
for (const c of benzerCiftler.slice(0, 12)) {
  console.log(`  %${c.benzerlik}  ${c.urunA} <-> ${c.urunB}  | ayni ad: ${c.ayniAd} | ayni kalem: ${c.ayniKaynakKalem} | olcu yok: ${c.olcuEksik}`);
}
if (benzerCiftler.length > 12) console.log(`  … ${benzerCiftler.length - 12} cift daha`);

console.log(`\n=== 2. BELIRSIZ PARCA KIMLIGI (ayni ad + ayni kaynak kalemi) ===`);
console.log(`  grup sayisi: ${belirsizKimlik.length}`);
for (const b of belirsizKimlik) {
  console.log(`  ${b.urunSayisi} urun | ${b.teknikAd} | ${b.kaynakKalem}`);
  console.log(`      ${b.urunler}  -> ayirt edilebilir: ${b.ayirtEdilebilir}`);
}

console.log(`\n=== 3. LOGO <-> KATALOG ISIM UYUSMAZLIGI (hic ortak kelime yok) ===`);
console.log(`  urun sayisi: ${uyusmazlik.length}`);
for (const u of uyusmazlik.slice(0, 15)) {
  console.log(`  [${u.agirlik}] ${u.partNumber.padEnd(16)} Logo: "${u.logoAdi}"  <->  "${u.teknikAdTR}" / "${u.teknikAdEN}"`);
}
if (uyusmazlik.length > 15) console.log(`  … ${uyusmazlik.length - 15} urun daha`);

console.log(`\n=== 4. AYNI TEKNIK AD, FARKLI PARCA NUMARASI ===`);
console.log(`  grup sayisi: ${ayniAd.length}`);
for (const a of ayniAd.slice(0, 10)) {
  console.log(`  ${a.urunSayisi} urun | ${a.teknikAd} | farkli kaynak kalemi: ${a.farkliKaynakKalem} | olcusu olan: ${a.olcusuOlan}`);
  console.log(`      ${a.urunler}`);
}

// ── Şüpheli ürün listesi ─────────────────────────────────────────────────────
const supheli = new Map();
const ekle = (pn, gerekce) => {
  const l = supheli.get(pn);
  if (l) { if (!l.includes(gerekce)) l.push(gerekce); } else supheli.set(pn, [gerekce]);
};
for (const c of benzerCiftler) { ekle(c.urunA, `aciklama %${c.benzerlik} benzer: ${c.urunB}`); ekle(c.urunB, `aciklama %${c.benzerlik} benzer: ${c.urunA}`); }
for (const b of belirsizKimlik) for (const pn of b.urunler.split(", ")) ekle(pn, `belirsiz kimlik: ${b.urunSayisi} urun ayni kalemde (${b.kaynakKalem})`);
for (const u of uyusmazlik) ekle(u.partNumber, `Logo-katalog isim uyusmazligi [${u.agirlik}]: "${u.logoAdi}" vs "${u.teknikAdTR}"`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const yaz = (ad, rows, cols) => {
  writeFileSync(OUT + ad, "﻿" + csv(rows, cols), "utf8");
  console.log(`  ${ad.padEnd(40)} ${String(rows.length).padStart(4)} satir`);
};

const sByPn = new Map(kayitlar.map((k) => [k.pn, k]));
const supheliRows = [...supheli.entries()].map(([pn, gerekceler]) => {
  const k = sByPn.get(pn);
  return {
    partNumber: pn, logoKodu: k?.logo ?? "", teknikAdTR: k?.adTR ?? "",
    logoAdi: k?.logoAdi ?? "", kategori: k?.kategori ?? "",
    kaynakKalem: k?.kaynakKalem ?? "",
    olcuVar: k?.olcu ? "evet" : "hayir", malzemeVar: k?.malzeme ? "evet" : "hayir",
    gerekceSayisi: gerekceler.length, gerekceler: gerekceler.join(" | "),
    // Doldurulacak
    depodaKontrolEdildi_EH: "", olculenKalinlik_mm: "", olculenDisCap_mm: "",
    parcaUzerindekiAd: "", parcaUzerindekiUretici: "", karar: "", kontrolEden: "", notlar: "",
  };
}).sort((a, b) => b.gerekceSayisi - a.gerekceSayisi);

console.log(`\n=== URETILEN DOSYALAR ===`);
yaz("62_supheli_urunler.csv", supheliRows, Object.keys(supheliRows[0] ?? { partNumber: "" }));
yaz("63_benzer_aciklamalar.csv", benzerCiftler, ["urunA","urunB","benzerlik","adA","adB","ayniAd","ayniKaynakKalem","olcuEksik"]);
yaz("64_belirsiz_kimlikler.csv", belirsizKimlik, ["teknikAd","kaynakKalem","urunSayisi","urunler","hicbirindeOlcuYok","ayirtEdilebilir"]);
yaz("65_logo_katalog_uyusmazlik.csv", uyusmazlik, ["partNumber","logoKodu","logoAdi","teknikAdTR","teknikAdEN","agirlik"]);
yaz("66_ayni_teknik_ad.csv", ayniAd, ["teknikAd","urunSayisi","urunler","farkliKaynakKalem","olcusuOlan"]);

console.log(`\n=== OZET ===`);
console.log(`  temiz (supheli degil) : ${kayitlar.length - supheli.size}/${kayitlar.length}`);
console.log(`  SUPHELI               : ${supheli.size}/${kayitlar.length}`);
