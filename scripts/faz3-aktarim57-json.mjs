/**
 * T1 + T2 + T3 aday kümesini açıklama besteleyicisinin beklediği JSON
 * biçimine çevirir. SALT OKUNUR (yalnızca dosya yazar).
 *
 * Kaynak: 90_75aday_denetim.csv (tüm alanlar) + 94_75aday_siniflandirma.csv
 * (kademe bilgisi). Çıktı `93_aktarilabilir.json` ile BİREBİR aynı şemadadır,
 * böylece mevcut besteleyici ve doğrulayıcı değiştirilmeden kullanılabilir.
 *
 * Kullanım: node scripts/faz3-aktarim57-json.mjs <cikti-dizini> [kademeler]
 *   kademeler: virgulle ayrilmis, varsayilan "T1,T2,T3"
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , outArg, kademeArg] = process.argv;
if (!outArg) {
  console.error("Kullanim: node scripts/faz3-aktarim57-json.mjs <cikti-dizini> [kademeler]");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const KADEMELER = new Set((kademeArg ?? "T1,T2,T3").split(",").map((s) => s.trim()));

const oku = (p) => {
  const t = readFileSync(p, "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const h = t[0].split(";").map((x) => x.replace(/^"|"$/g, ""));
  return t.slice(1).map((l) => {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(h.map((b, i) => [b, c[i] ?? ""]));
  });
};

// Uyumluluk satırları DOĞRUDAN V18'den okunur.
// (Denetim CSV'sindeki `makineler` kolonu yalnızca SİTEDE SAYFASI OLAN
//  markaları içerir; T3 ürünlerinin markaları orada boş görünür.)
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const UY = XLSX.utils.sheet_to_json(wb.Sheets["Makine Uyumluluğu"], { raw: false, defval: "" });
const uyByKod = new Map();
for (const r of UY) {
  if (S(r, "Uyum Kanıtı") !== "Kesin doğrulandı") continue;
  const k = N(S(r, "Orijinal Ürün Kodu"));
  if (!uyByKod.has(k)) uyByKod.set(k, []);
  uyByKod.get(k).push(r);
}

const sinif = oku(OUT + "94_75aday_siniflandirma.csv");
const secili = sinif.filter((r) => KADEMELER.has(r.kademe));

// Küme içi mükerrer parça numaralarını ASLA otomatik birleştirme:
// aynı numara iki kez geçiyorsa ikisi de dışarıda bırakılır ve bildirilir.
const sayac = new Map();
for (const r of secili) sayac.set(r.partNumber, (sayac.get(r.partNumber) ?? 0) + 1);
const tekrarlayan = [...sayac.entries()].filter(([, n]) => n > 1).map(([k]) => k);
if (tekrarlayan.length) {
  console.log(`UYARI — kume icinde tekrarlayan parca numarasi (disarida birakildi): ${tekrarlayan.join(", ")}`);
}

const kayitlar = secili.filter((r) => !tekrarlayan.includes(r.partNumber));

const json = kayitlar.map((k) => ({
  pn: k.partNumber,
  logo: k.logoKodu,
  adTR: k.teknikAdTR,
  adEN: k.teknikAdEN,
  sistem: k.teknikSistem,
  montaj: k.montajYeri,
  kategori: k.teknikKategori,
  olcu: k.olcu,
  malzeme: k.malzeme,
  oem: k.oem,
  muadil: k.muadil,
  seriKapsami: k.seriKapsami,
  kaynakKalem: k.kaynakKalem,
  markaIpucu: "",
  logoAdi: k.logoAdi,
  logoMiktar: k.logoMiktar === "" ? "" : Number(k.logoMiktar),
  kademe: k.kademe,
  uyumluluk: (() => {
    const satirlar = uyByKod.get(N(k.logoKodu)) ?? [];
    const gorulen = new Set();
    const out = [];
    for (const r of satirlar) {
      const marka = S(r, "Makine Markası");
      const model = S(r, "Makine Modeli");
      const anahtar = `${N(marka)}|${N(model)}`;
      if (!marka || !model || gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      out.push({
        marka,
        model,
        seri: S(r, "Seri"),
        seriNo: S(r, "Seri Numarası Kapsamı"),
        montaj: S(r, "Montaj Yeri"),
        kaynak: `${S(r, "Kaynak Kimliği")} · ${S(r, "Sayfa / Çizim / Kalem")}`.trim(),
      });
    }
    return out;
  })(),
}));

const dag = new Map();
for (const j of json) dag.set(j.kademe, (dag.get(j.kademe) ?? 0) + 1);
console.log("kademe dagilimi:", [...dag.entries()].sort().map(([k, v]) => `${k}=${v}`).join("  "));
console.log(`toplam: ${json.length} urun`);

const uyumsuz = json.filter((j) => j.uyumluluk.length === 0);
if (uyumsuz.length) console.log(`UYARI — uyumluluk satiri bos: ${uyumsuz.map((u) => u.pn).join(", ")}`);

const markalar = new Map();
for (const j of json) for (const u of j.uyumluluk) markalar.set(u.marka, (markalar.get(u.marka) ?? 0) + 1);
console.log("uyumluluk markalari:", [...markalar.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(" "));

writeFileSync(OUT + "A2_aktarim_adaylari.json", JSON.stringify(json, null, 1), "utf8");
console.log(`\nA2_aktarim_adaylari.json yazildi -> ${OUT}`);
