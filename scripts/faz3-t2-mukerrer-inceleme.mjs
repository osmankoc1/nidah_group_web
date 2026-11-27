/**
 * T2'deki 18 ürünün GERÇEK mükerrerlik incelemesi. SALT OKUNUR.
 *
 * Soru: "Benzer ürün adı" sinyali gerçek bir mükerrer mi, yoksa yalnızca
 * aynı ada sahip FARKLI parçalar mı?
 *
 * Yöntem — her ürün için kendi mükerrer kümesini açar ve kümedeki her üyeyi
 * şu eksenlerde karşılaştırır:
 *   1. Katalog referansı (kanonik parça numarası) aynı mı?
 *   2. Normalize numara aynı mı?  -> aynıysa GERÇEK mükerrer riski
 *   3. Teknik ad aynı mı?
 *   4. Kesin doğrulanmış makine uyumları çakışıyor mu?
 *   5. Karşı üye nerede: development'ta mı, 75 adayda mı, hiçbirinde mi?
 *
 * Hiçbir kayıt otomatik birleştirilmez. Farklı katalog numarası taşıyan
 * iki kayıt, adları aynı olsa bile AYRI ÜRÜN kabul edilir.
 *
 * Kullanım: node scripts/faz3-t2-mukerrer-inceleme.mjs <mevcut109.txt> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-t2-mukerrer-inceleme.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const KESIN = "Kesin doğrulandı";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

// -- Mevcut envanter ---------------------------------------------------------
const satirlar = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcut = satirlar.filter((l) => l.startsWith("URUN|")).map((l) => {
  const [, pn, kod, norm] = l.split("|");
  return { pn: (pn ?? "").trim(), kod: (kod ?? "").trim(), norm: (norm ?? "").trim() };
});
const mevcutPn = new Set(mevcut.map((m) => N(m.pn)));
const mevcutStok = new Set(mevcut.filter((m) => m.norm).map((m) => m.norm));

// -- V18 ---------------------------------------------------------------------
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const WK = sh("Web Katalog Adayları");
const MUK = sh("Mükerrer Adayları");
const UY = sh("Makine Uyumluluğu");
const TUM = XLSX.utils.sheet_to_json(wb.Sheets["Tüm Ürünler"], { raw: true, defval: "" });

const wkByKod = new Map(WK.map((r) => [N(S(r, "Orijinal Logo Stok Kodu")), r]));
const uyByKod = new Map();
for (const r of UY) {
  const k = N(S(r, "Orijinal Ürün Kodu"));
  if (!uyByKod.has(k)) uyByKod.set(k, []);
  uyByKod.get(k).push(r);
}
const tumByKod = new Map(TUM.map((r) => [N(r["Orijinal Ürün Kodu"]), r]));

// Küme -> üyeler
const kumeUyeleri = new Map();
const kodKumeleri = new Map();
for (const r of MUK) {
  const kume = S(r, "Aday Küme");
  const kod = N(S(r, "Orijinal Ürün Kodu"));
  if (!kumeUyeleri.has(kume)) kumeUyeleri.set(kume, []);
  kumeUyeleri.get(kume).push(r);
  if (!kodKumeleri.has(kod)) kodKumeleri.set(kod, new Set());
  kodKumeleri.get(kod).add(kume);
}

// -- T2 listesi --------------------------------------------------------------
const oku = (p) => {
  const t = readFileSync(p, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const h = t[0].split(";").map((x) => x.replace(/^"|"$/g, ""));
  return t.slice(1).map((l) => {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(h.map((b, i) => [b, c[i] ?? ""]));
  });
};
const T2 = oku(OUT + "95_T2.csv");
const yeni75 = new Set(oku(OUT + "90_75aday_denetim.csv").map((r) => N(r.logoKodu)));

const kesinUyumlar = (kod) => (uyByKod.get(kod) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
const modelAnahtari = (x) => `${N(S(x, "Makine Markası"))}|${N(S(x, "Makine Modeli"))}`;

const sonuc = [];
const detay = [];

for (const u of T2) {
  const kod = N(u.logoKodu);
  const kumeler = [...(kodKumeleri.get(kod) ?? [])];
  const benimKatalog = N(u.partNumber);
  const benimModeller = new Set(kesinUyumlar(kod).map(modelAnahtari));

  const karsiliklar = [];
  for (const kume of kumeler) {
    for (const uye of kumeUyeleri.get(kume) ?? []) {
      const ukod = N(S(uye, "Orijinal Ürün Kodu"));
      if (ukod === kod) continue;
      const wk = wkByKod.get(ukod);
      const uKatalog = wk ? N(S(wk, "Katalog Referansı")) : "";
      const uModeller = new Set(kesinUyumlar(ukod).map(modelAnahtari));
      const ortak = [...benimModeller].filter((m) => uModeller.has(m));
      karsiliklar.push({
        kume,
        tur: S(uye, "Karşılaştırma Türü"),
        kod: S(uye, "Orijinal Ürün Kodu"),
        ad: S(uye, "Orijinal Ürün Adı"),
        katalog: wk ? S(wk, "Katalog Referansı") : "(katalog adayi degil)",
        katalogNorm: uKatalog,
        teknikAd: wk ? S(wk, "Teknik Ad TR") : "",
        seviye: wk ? S(wk, "Seviye") : "-",
        katalogAyni: uKatalog !== "" && uKatalog === benimKatalog,
        devdeMi: mevcutPn.has(uKatalog) || mevcutStok.has(ukod),
        yeni75teMi: yeni75.has(ukod),
        kesinUyum: uModeller.size,
        ortakModel: ortak.length,
        stokAdet: tumByKod.get(ukod)?.["Gerçek Stok Miktarı"] ?? "",
      });
    }
  }

  const gercekRisk = karsiliklar.filter((k) => k.katalogAyni);
  const bicimFarki = karsiliklar.filter((k) => k.tur === "Biçim farkı olan kod");
  const modelCakisan = karsiliklar.filter(
    (k) => k.ortakModel > 0 && k.teknikAd && k.teknikAd === u.teknikAdTR,
  );

  let karar, gerekce;
  if (gercekRisk.length > 0) {
    karar = "GERCEK MUKERRER RISKI";
    gerekce = `Ayni katalog numarasi: ${gercekRisk.map((k) => k.kod).join(", ")}`;
  } else if (bicimFarki.length > 0) {
    karar = "BICIM FARKI - ELLE KONTROL";
    gerekce = `Kod bicimi cakismasi: ${bicimFarki.map((k) => k.kod).join(", ")}`;
  } else if (modelCakisan.length > 0) {
    karar = "AYNI AD + AYNI MODEL - ELLE KONTROL";
    gerekce = `Ayni teknik ad ve ortak model: ${modelCakisan.map((k) => `${k.katalog} (${k.ortakModel} model)`).join(", ")}`;
  } else {
    karar = "AYRI URUN - AKTARILABILIR";
    gerekce = karsiliklar.length === 0
      ? "Kumede baska uye yok"
      : `Farkli katalog numarasi (${karsiliklar.map((k) => k.katalog).join(", ")}), model cakismasi yok`;
  }

  sonuc.push({
    partNumber: u.partNumber,
    logoKodu: u.logoKodu,
    teknikAdTR: u.teknikAdTR,
    teknikKategori: u.teknikKategori,
    kesinUyum: u.kesinUyum,
    makineler: u.makineler,
    kumeSayisi: kumeler.length,
    karsilikSayisi: karsiliklar.length,
    karsilikKodlari: karsiliklar.map((k) => k.kod).join(" | "),
    karsilikKataloglari: karsiliklar.map((k) => k.katalog).join(" | "),
    karsilikTeknikAdlari: karsiliklar.map((k) => k.teknikAd || "-").join(" | "),
    karsilikYerleri: karsiliklar.map((k) => (k.devdeMi ? "DEV" : k.yeni75teMi ? "75-aday" : "disarida")).join(" | "),
    ayniKatalogNumarasi: gercekRisk.length,
    bicimFarki: bicimFarki.length,
    ortakModelTasiyan: modelCakisan.length,
    karar,
    gerekce,
  });
  detay.push({ u, karsiliklar, karar, gerekce });
}

// -- Çıktı -------------------------------------------------------------------
console.log("=== T2 - 18 URUNUN GERCEK MUKERRERLIK INCELEMESI ===\n");
for (const d of detay) {
  console.log(`${d.u.partNumber.padEnd(16)} ${d.u.teknikAdTR}`);
  console.log(`   karar  : ${d.karar}`);
  console.log(`   gerekce: ${d.gerekce}`);
  for (const k of d.karsiliklar) {
    const yer = k.devdeMi ? "DEV" : k.yeni75teMi ? "75-aday" : "disarida";
    console.log(
      `     <-> ${k.kod.padEnd(14)} katalog=${(k.katalog || "-").padEnd(16)} ad="${k.ad}" teknikAd="${k.teknikAd || "-"}" [${k.tur}] yer=${yer} sev=${k.seviye} uyum=${k.kesinUyum} ortakModel=${k.ortakModel}`,
    );
  }
  console.log("");
}

const dag = new Map();
for (const s of sonuc) dag.set(s.karar, (dag.get(s.karar) ?? 0) + 1);
console.log("=== KARAR DAGILIMI ===");
for (const [k, v] of [...dag.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

const COLS = Object.keys(sonuc[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "A0_T2_mukerrer_inceleme.csv", "\uFEFF" + csv(sonuc, COLS), "utf8");
console.log(`\nA0_T2_mukerrer_inceleme.csv yazildi -> ${OUT}`);
