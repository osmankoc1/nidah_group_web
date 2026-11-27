/**
 * Logo stok adı ↔ katalog teknik adı eşleşmesi — TÜRKÇE DUYARLI. SALT OKUNUR.
 *
 * ── ÖNCEKİ DENETİMDEKİ HATA ─────────────────────────────────────────────────
 * İlk denetim `toLocaleLowerCase("tr")` kullanıyordu. Türkçe kuralında büyük
 * `I` harfi NOKTASIZ `ı`'ya düşer:
 *     "BEARING".toLocaleLowerCase("tr") === "bearıng"
 * Bu da katalogdaki "bearing" (noktalı i) ile EŞLEŞMEZ. Sonuç: Logo adı büyük
 * harfle yazılmış her İngilizce kelime "uyuşmazlık" sayıldı. 47 uyuşmazlığın
 * önemli bir kısmı bu yüzden YANLIŞ POZİTİFTİ.
 *
 * ── BU SÜRÜM ────────────────────────────────────────────────────────────────
 *   1. Aksan katlama (ç→c, ğ→g, ı/I/İ→i, ö→o, ş→s, ü→u)
 *   2. Hafif Türkçe gövdeleme (burcu→burc, segmanı→segman, yatağı→yatak)
 *   3. Tireli kelimenin BİRLEŞİK hâli de belirteç olur (O-ring → oring)
 *   4. İngilizce bileşiklerde alt dize eşleşmesi (LAMP ⊂ headlamp)
 *   5. Bu veri kümesinde GÖRÜLEN TR↔EN sözlüğü (genel sözlük değil)
 *
 * Üç kademeli sonuç:
 *   · MASA BASINDA COZULDU      — ortak kelime veya alt dize var
 *   · OLASI - TERMINOLOJI FARKI — yalnızca sözlük karşılığı; parçaya bakılmalı
 *   · DEPO KONTROLU GEREKLI     — hiçbir kanıt yok
 *
 * Kullanım: node scripts/faz3-isim-eslesme.mjs <tum97.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , veriYolu, outArg] = process.argv;
if (!veriYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-isim-eslesme.mjs <tum97.json> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(veriYolu, "utf-8"));

const AKSAN = { "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "I": "i", "İ": "i",
  "ö": "o", "Ö": "o", "ş": "s", "Ş": "s", "ü": "u", "Ü": "u", "â": "a", "î": "i", "û": "u" };
const katla = (s) => String(s ?? "").split("").map((c) => AKSAN[c] ?? c).join("").toLowerCase();

const EKLER = ["lari", "leri", "sinin", "sinde", "sini", "siyle", "nin", "nun", "nun",
  "ler", "lar", "ndan", "nden", "dan", "den", "si", "su", "yi", "ye", "ya",
  "in", "un", "i", "u"];
function govde(k) {
  let w = k;
  for (const ek of EKLER) {
    if (w.length - ek.length >= 4 && w.endsWith(ek)) { w = w.slice(0, -ek.length); break; }
  }
  return w.replace(/g$/, "k").replace(/b$/, "p").replace(/d$/, "t");
}

/** Bu veri kümesinde GÖRÜLEN karşılıklar. Genel sözlük değil. */
const SOZLUK = new Map(Object.entries({
  bearing: ["rulman", "yatak", "mafsal"],
  bushing: ["burc"], bush: ["burc"],
  washer: ["pul", "rondela"],
  shim: ["pul", "sim"],
  disc: ["disk"], disk: ["disk"],
  plate: ["plaka", "pleyt"],
  screw: ["civata", "vida"], bolt: ["civata"],
  seal: ["kece", "sizdirmazlik"], gasket: ["conta"],
  ring: ["segman", "ring", "halka"],
  gear: ["disli", "pinyon"], pinion: ["pinyon", "disli"],
  spring: ["yay"], piston: ["piston"], valve: ["valf"], pump: ["pompa"],
  filter: ["filtre"], hose: ["hortum"], cover: ["kapak"],
  shaft: ["mil"], flange: ["flans"], pin: ["pim"], nut: ["somun"],
  wheel: ["cark"], whell: ["cark"],
  lamp: ["far", "lamba"], headlamp: ["far", "lamba"],
  slide: ["kizak"], kizak: ["slide"],
  member: ["eleman"], eleman: ["member"],
  friction: ["surtunme"], surtunme: ["friction"],
  mating: ["karsi"], pressure: ["baski"],
  outer: ["dis"], inner: ["ic"],
  clutch: ["debriyaj", "kavrama"],
  steel: ["celik"], celik: ["steel"],
  kagitli: ["paper", "friction"],
  segman: ["ring", "seal", "kece"],
  takim: ["kit"], kit: ["takim"],
  cylinder: ["silindir"], silindir: ["cylinder"],
  oring: ["oring", "ring"],
  reduksiyon: ["reduktor"],
}));

function kelimeKumesi(s) {
  const temiz = katla(s).replace(/[^a-z0-9\s×x-]/g, " ");
  const ham = [];
  for (const parca of temiz.split(/\s+/).filter(Boolean)) {
    for (const w of parca.split("-")) if (w.length > 1) ham.push(w);
    const birlesik = parca.replace(/-/g, "");
    if (birlesik.length > 1) ham.push(birlesik);
  }
  const kume = new Set();
  for (const w of ham) {
    kume.add(w);
    kume.add(govde(w));
    const m = w.match(/^([a-z]?\d+)[×x](\d+)$/);
    if (m) { kume.add(m[1]); kume.add(m[2]); }
  }
  return kume;
}

function sozlukEslesmesi(logoKume, hedefKume) {
  const bulunan = [];
  for (const w of logoKume) {
    for (const k of SOZLUK.get(w) ?? []) {
      if (hedefKume.has(k) || hedefKume.has(govde(k))) bulunan.push(`${w}→${k}`);
    }
  }
  for (const [en, trler] of SOZLUK) {
    if (!hedefKume.has(en)) continue;
    for (const t of trler) if (logoKume.has(t) || logoKume.has(govde(t))) bulunan.push(`${t}→${en}`);
  }
  return [...new Set(bulunan)];
}

const sonuc = [];
for (const o of veri) {
  const logoAdi = String(o.logoAdi ?? "").trim();
  if (!logoAdi) continue;
  const L = kelimeKumesi(logoAdi);
  const hedef = new Set([...kelimeKumesi(o.adTR), ...kelimeKumesi(o.adEN)]);

  const dogrudan = [...L].filter((w) => hedef.has(w));
  const altDize = [];
  for (const w of L) {
    if (w.length < 4) continue;
    for (const h of hedef) {
      if (h === w || h.length <= w.length) continue;
      if (h.endsWith(w) || h.startsWith(w)) altDize.push(`${w} ⊂ ${h}`);
    }
  }
  const sozluk = sozlukEslesmesi(L, hedef);

  const kanitlar = [
    dogrudan.length ? `ortak kelime: ${dogrudan.slice(0, 4).join(", ")}` : null,
    altDize.length ? `alt dize: ${[...new Set(altDize)].slice(0, 3).join(", ")}` : null,
    sozluk.length ? `sozluk: ${sozluk.slice(0, 4).join(", ")}` : null,
  ].filter(Boolean);

  let durum, gerekce;
  if (dogrudan.length > 0 || altDize.length > 0) {
    durum = "MASA BASINDA COZULDU";
    gerekce = kanitlar.join(" | ");
  } else if (sozluk.length > 0) {
    durum = "OLASI - TERMINOLOJI FARKI";
    gerekce = kanitlar.join(" | ") + " — ortak kelime yok; parcaya bakilarak teyit edilmeli";
  } else {
    durum = "DEPO KONTROLU GEREKLI";
    gerekce = "Logo adi ile katalog adi arasinda hicbir ortak kelime veya sozluk karsiligi yok";
  }

  sonuc.push({
    partNumber: o.pn, logoKodu: o.logo, logoAdi,
    teknikAdTR: o.adTR, teknikAdEN: o.adEN, durum, gerekce,
    ortakKelime: dogrudan.length, altDizeSayisi: altDize.length, sozlukSayisi: sozluk.length,
  });
}

const cozulen = sonuc.filter((s) => s.durum === "MASA BASINDA COZULDU");
const olasi = sonuc.filter((s) => s.durum === "OLASI - TERMINOLOJI FARKI");
const kalan = sonuc.filter((s) => s.durum === "DEPO KONTROLU GEREKLI");

console.log(`Logo adi olan urun : ${sonuc.length}`);
console.log(`  MASA BASINDA COZULEN      : ${cozulen.length}`);
console.log(`  OLASI (terminoloji farki) : ${olasi.length}`);
console.log(`  DEPO KONTROLU GEREKEN     : ${kalan.length}`);

console.log(`\n=== OLASI (terminoloji farki) ===`);
for (const o of olasi) {
  console.log(`  ${o.partNumber.padEnd(16)} "${o.logoAdi}" ~ "${o.teknikAdTR}" / "${o.teknikAdEN}"`);
  console.log(`      ${o.gerekce}`);
}
console.log(`\n=== DEPO KONTROLU GEREKENLER ===`);
for (const k of kalan) {
  console.log(`  ${k.partNumber.padEnd(16)} "${k.logoAdi}"`);
  console.log(`      katalog: "${k.teknikAdTR}" / "${k.teknikAdEN}"`);
}

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = ["partNumber","logoKodu","logoAdi","teknikAdTR","teknikAdEN","durum","gerekce","ortakKelime","altDizeSayisi","sozlukSayisi"];
writeFileSync(OUT + "70_isim_eslesme_sonucu.csv", "﻿" + csv(sonuc, COLS), "utf8");
writeFileSync(OUT + "71_isim_depo_kontrolu.csv", "﻿" + csv([...kalan, ...olasi], COLS), "utf8");
console.log(`\n70_isim_eslesme_sonucu.csv (${sonuc.length}) · 71_isim_depo_kontrolu.csv (${kalan.length + olasi.length}) yazildi`);
