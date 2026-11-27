/**
 * T2'de "ayni ad + ayni model" cikan iki cift icin AYRISTIRMA kaniti arar.
 * SALT OKUNUR.
 *
 * Ciftler:
 *   C5563-70144 <-> N3150-02800   (ikisi de "O-ring")
 *   62682-21500 <-> 60382-00900   (ikisi de "Asinma plakasi")
 *
 * Ayri parca olduklarini gosteren kanitlar:
 *   - farkli kaynak kalemi (cizim / bolum + kalem no)
 *   - farkli montaj yeri / sistem
 *   - farkli olcu alani
 *   - farkli OEM referansi
 *   - ayni cizimde AYNI ANDA yer almalari (bir cizimde iki ayri kalem)
 *
 * Kullanim: node scripts/faz3-t2-cift-ayrim.mjs
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const WK = sh("Web Katalog Adayları");
const A = sh("A Yayın Adayları");
const EK = sh("A Grubu Teknik Eksikler");
const UY = sh("Makine Uyumluluğu");
const KAY = sh("Araştırma Kaynakları");
const TUM = XLSX.utils.sheet_to_json(wb.Sheets["Tüm Ürünler"], { raw: true, defval: "" });

const wkByKod = new Map(WK.map((r) => [N(S(r, "Orijinal Logo Stok Kodu")), r]));
const aByKod = new Map(A.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const ekByKod = new Map(EK.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const tumByKod = new Map(TUM.map((r) => [N(r["Orijinal Ürün Kodu"]), r]));
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map();
for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const kayByKod = new Map();
for (const r of KAY) push(kayByKod, N(S(r, "Orijinal Ürün Kodu")), r);

const CIFTLER = [
  ["C5563-70144", "N3150-02800"],
  ["62682-21500", "60382-00900"],
];

const bilgi = (kod) => {
  const k = N(kod);
  const wk = wkByKod.get(k);
  const a = aByKod.get(k);
  const kesin = (uyByKod.get(k) ?? []).filter((x) => S(x, "Uyum Kanıtı") === "Kesin doğrulandı");
  const kay = kayByKod.get(k) ?? [];
  return {
    kod,
    katalog: wk ? S(wk, "Katalog Referansı") : "",
    teknikAd: wk ? S(wk, "Teknik Ad TR") : "",
    teknikAdEN: a ? S(a, "Teknik Ad EN") : "",
    kategori: wk ? S(wk, "Teknik Kategori") : "",
    sistem: a ? S(a, "Teknik Sistem") : "",
    montaj: a ? S(a, "Montaj Yeri") : "",
    olcu: a ? S(a, "Ölçü ve Özellik") : "",
    malzeme: a ? S(a, "Malzeme") : "",
    oem: wk ? S(wk, "OEM Referansları") : "",
    muadil: wk ? S(wk, "Muadil Referansları") : "",
    kaynakURL: wk ? S(wk, "Kaynak URL") : "",
    logoAdi: String(tumByKod.get(k)?.["Orijinal Ürün Adı"] ?? "").trim(),
    logoAdet: tumByKod.get(k)?.["Gerçek Stok Miktarı"] ?? "",
    modeller: kesin.map((x) => `${S(x, "Makine Markası")} ${S(x, "Makine Modeli")}`),
    kalemler: kesin.map((x) => S(x, "Sayfa / Çizim / Kalem")),
    montajYerleri: kesin.map((x) => S(x, "Montaj Yeri")),
    sistemler: kesin.map((x) => S(x, "Sistem")),
    uyumKaynakURL: [...new Set(kesin.map((x) => S(x, "Kaynak URL")))],
    kaynakKalemleri: kay.map((x) => `${S(x, "Kaynak Başlığı") || S(x, "Kaynak Kimliği")} :: ${S(x, "Sayfa / Çizim / Kalem") || S(x, "Kanıt Alıntısı")}`),
    ek: ekByKod.get(k) ? S(ekByKod.get(k), "Eksik Bilgiler") : "",
  };
};

console.log("=== T2 CIFTLERI: AYRI PARCA MI, AYNI PARCA MI? ===\n");
for (const [a, b] of CIFTLER) {
  const x = bilgi(a), y = bilgi(b);
  console.log(`${"=".repeat(78)}`);
  console.log(`CIFT: ${a}  <->  ${b}\n`);
  const alanlar = [
    ["Katalog referansi", "katalog"], ["Teknik ad TR", "teknikAd"], ["Teknik ad EN", "teknikAdEN"],
    ["Kategori", "kategori"], ["Sistem", "sistem"], ["Montaj yeri", "montaj"],
    ["Olcu ve ozellik", "olcu"], ["Malzeme", "malzeme"], ["OEM", "oem"], ["Muadil", "muadil"],
    ["Logo adi", "logoAdi"], ["Logo adet", "logoAdet"], ["Kaynak URL", "kaynakURL"],
  ];
  for (const [etiket, alan] of alanlar) {
    const vx = String(x[alan] ?? ""), vy = String(y[alan] ?? "");
    const isaret = vx === vy ? "=" : "X";
    console.log(`  ${isaret} ${etiket.padEnd(18)} | ${(vx || "(bos)").slice(0, 44).padEnd(44)} | ${(vy || "(bos)").slice(0, 44)}`);
  }
  console.log(`\n  -- ${a} kesin uyumlari --`);
  x.modeller.forEach((m, i) => console.log(`     ${m}  ::  kalem="${x.kalemler[i]}"  montaj="${x.montajYerleri[i]}"  sistem="${x.sistemler[i]}"`));
  console.log(`  -- ${b} kesin uyumlari --`);
  y.modeller.forEach((m, i) => console.log(`     ${m}  ::  kalem="${y.kalemler[i]}"  montaj="${y.montajYerleri[i]}"  sistem="${y.sistemler[i]}"`));

  const kalemX = new Set(x.kalemler), kalemY = new Set(y.kalemler);
  const ortakKalem = [...kalemX].filter((k) => kalemY.has(k));
  console.log(`\n  kaynak kalemi ortak mi? ${ortakKalem.length ? "EVET -> " + ortakKalem.join(" | ") : "HAYIR (farkli kalemler)"}`);
  console.log(`  uyum kaynak URL'leri ayni mi? ${JSON.stringify(x.uyumKaynakURL) === JSON.stringify(y.uyumKaynakURL) ? "EVET (ayni belge)" : "HAYIR"}`);
  console.log(`  ${a} kaynak kayitlari:`);
  x.kaynakKalemleri.forEach((k) => console.log(`     ${k}`));
  console.log(`  ${b} kaynak kayitlari:`);
  y.kaynakKalemleri.forEach((k) => console.log(`     ${k}`));
  console.log("");
}
