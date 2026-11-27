/**
 * Faz 3 aday analizi — SALT OKUNUR.
 *
 * V8 araştırma çalışma kitabından:
 *   · huni sayıları (A grubu → kesin uyumlu → engelsiz güvenilir küme)
 *   · güvenilir küme için alan doluluk envanteri
 *   · doğrulanmış OLGU malzemesi uzunluğu (açıklama uzatma kapasitesi)
 *   · manuel inceleme kuyrukları (normalize çakışması, paylaşılan referans, çelişkili)
 *
 * Veritabanına dokunmaz, çalışma kitabını değiştirmez. Yalnızca CSV üretir.
 *
 * Kullanım:
 *   node scripts/faz3-aday-analizi.mjs "<xlsx-yolu>" "<cikti-dizini>"
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , xlsxPath, outDirArg] = process.argv;
if (!xlsxPath || !outDirArg) {
  console.error('Kullanim: node scripts/faz3-aday-analizi.mjs "<xlsx>" "<cikti-dizini>"');
  process.exit(1);
}
const OUT = outDirArg.endsWith("/") || outDirArg.endsWith("\\") ? outDirArg : outDirArg + "/";

const KESIN = "Kesin dogrulandi".replace("dogrulandi", "doğrulandı");
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const wb = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });

const A = sh("A Yayın Adayları");
const UY = sh("Makine Uyumluluğu");
const OEM = sh("OEM ve Muadil");
const CEL = sh("Çelişkili Kayıtlar");
const MUK = sh("Mükerrer Adayları");
const KAY = sh("Araştırma Kaynakları");

const push = (map, key, row) => {
  const list = map.get(key);
  if (list) list.push(row);
  else map.set(key, [row]);
};

const uyByKod = new Map();
const oemByKod = new Map();
const kayByKod = new Map();
for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
for (const r of OEM) push(oemByKod, N(S(r, "Orijinal Ürün Kodu")), r);
for (const r of KAY) push(kayByKod, N(S(r, "Orijinal Ürün Kodu")), r);

const celKod = new Set(CEL.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const mukKod = new Set(MUK.map((r) => N(S(r, "Orijinal Ürün Kodu"))));

// A grubu içinde orijinal kodun normalize çakışması
const okMap = new Map();
for (const r of A) push(okMap, N(S(r, "Orijinal Ürün Kodu")), S(r, "Orijinal Ürün Kodu"));
const okCakisan = new Set(
  [...okMap.entries()].filter(([, l]) => new Set(l).size > 1).map(([k]) => k)
);

// Aynı katalog referansı birden fazla stok kartında mı
const krMap = new Map();
for (const r of A) {
  const k = N(S(r, "Katalog Referansı"));
  if (k) push(krMap, k, r);
}
const krPaylasilan = new Set([...krMap.entries()].filter(([, l]) => l.length > 1).map(([k]) => k));

const adaylar = [];
for (const r of A) {
  const ok = N(S(r, "Orijinal Ürün Kodu"));
  const uy = uyByKod.get(ok) ?? [];
  const uyKesin = uy.filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const oemAll = oemByKod.get(ok) ?? [];
  const oemKesin = oemAll.filter((x) => S(x, "Doğrulama Seviyesi") === KESIN);
  const ta = S(r, "Teknik Açıklama");

  // Doğrulanmış uyumluluk ve OEM satırlarından türetilebilecek OLGU malzemesi.
  // Bu bitmiş metin DEĞİL — uydurma olmadan yazılabilecek ham olgu hacmi.
  let uyMetin = 0;
  const modeller = new Set();
  for (const x of uyKesin) {
    uyMetin += [
      S(x, "Makine Markası"),
      S(x, "Makine Modeli"),
      S(x, "Seri"),
      S(x, "Seri Numarası Kapsamı"),
      S(x, "Varyant"),
    ]
      .filter(Boolean)
      .join(" ").length;
    if (S(x, "Makine Modeli")) modeller.add(`${S(x, "Makine Markası")} ${S(x, "Makine Modeli")}`);
  }
  let oemMetin = 0;
  for (const x of oemKesin) {
    oemMetin += (S(x, "OEM / OE Referansı") + S(x, "Referans Markası")).length;
  }

  const olguUzunluk =
    ta.length +
    S(r, "Ölçü ve Özellik").length +
    S(r, "Malzeme").length +
    S(r, "Montaj Yeri").length +
    S(r, "Teknik Sistem").length +
    uyMetin +
    oemMetin;

  const engeller = [];
  if (S(r, "Doğrulama Seviyesi") !== KESIN) engeller.push("urun-dogrulama-kesin-degil");
  if (uyKesin.length === 0) engeller.push("kesin-makine-uyumu-yok");
  if (!S(r, "Katalog Referansı")) engeller.push("katalog-referansi-yok");
  if (krPaylasilan.has(N(S(r, "Katalog Referansı")))) engeller.push("katalog-referansi-paylasilan");
  if (okCakisan.has(ok)) engeller.push("normalize-cakismasi");
  if (celKod.has(ok)) engeller.push("celiskili-kayit");
  if (!S(r, "Teknik Ad TR")) engeller.push("teknik-ad-yok");
  if (mukKod.has(ok)) engeller.push("mukerrer-adayi");

  adaylar.push({
    arastirmaKimligi: S(r, "Araştırma Kimliği"),
    logoKodu: S(r, "Orijinal Ürün Kodu"),
    katalogReferansi: S(r, "Katalog Referansı"),
    teknikAdTR: S(r, "Teknik Ad TR"),
    teknikAdEN: S(r, "Teknik Ad EN"),
    parcaUreticisi: oemKesin[0]
      ? S(oemKesin[0], "Referans Markası")
      : oemAll[0]
        ? S(oemAll[0], "Referans Markası")
        : "",
    urunDogrulama: S(r, "Doğrulama Seviyesi"),
    uyumToplam: uy.length,
    uyumKesin: uyKesin.length,
    modelSayisi: modeller.size,
    oemToplam: oemAll.length,
    oemKesin: oemKesin.length,
    kaynakSayisi: (kayByKod.get(ok) ?? []).length,
    aciklamaUzunluk: ta.length,
    olguUzunluk,
    olcuVar: S(r, "Ölçü ve Özellik") ? 1 : 0,
    malzemeVar: S(r, "Malzeme") ? 1 : 0,
    montajVar: S(r, "Montaj Yeri") ? 1 : 0,
    seoBaslikVar: S(r, "SEO Başlığı TR") ? 1 : 0,
    engeller: engeller.join(";") || "-",
  });
}

const kesinUyumlu = adaylar.filter((a) => a.uyumKesin > 0);
const temiz = adaylar.filter((a) => a.engeller === "-");

console.log("=== HUNI ===");
console.log(`A grubu toplam                      : ${A.length}`);
console.log(`  urun duzeyi "Kesin dogrulandi"    : ${adaylar.filter((a) => a.urunDogrulama === KESIN).length}`);
console.log(`  >=1 KESIN makine uyumu olan       : ${kesinUyumlu.length}`);
console.log(`  katalog referansi dolu            : ${adaylar.filter((a) => a.katalogReferansi).length}`);
console.log(`  HICBIR ENGELI OLMAYAN (guvenilir) : ${temiz.length}`);

console.log("\n=== 139 kesin-uyumlu kume icinde engel dagilimi ===");
const engelSay = new Map();
for (const a of kesinUyumlu) {
  for (const e of a.engeller.split(";")) {
    if (e !== "-") engelSay.set(e, (engelSay.get(e) ?? 0) + 1);
  }
}
for (const [k, n] of [...engelSay.entries()].sort((x, y) => y[1] - x[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}
console.log(`  ${String(kesinUyumlu.filter((a) => a.engeller === "-").length).padStart(4)}  (engelsiz)`);

const g = temiz;
const pct = (n) => `${n}/${g.length}`;
console.log("\n=== GUVENILIR KUME: alan doluluk ===");
console.log(`  Teknik Ad EN            : ${pct(g.filter((a) => a.teknikAdEN).length)}`);
console.log(`  Parca ureticisi (marka) : ${pct(g.filter((a) => a.parcaUreticisi).length)}`);
console.log(`  SEO Basligi TR          : ${pct(g.filter((a) => a.seoBaslikVar).length)}`);
console.log(`  Olcu ve Ozellik         : ${pct(g.filter((a) => a.olcuVar).length)}`);
console.log(`  Malzeme                 : ${pct(g.filter((a) => a.malzemeVar).length)}`);
console.log(`  Montaj Yeri             : ${pct(g.filter((a) => a.montajVar).length)}`);
console.log(`  >=2 kesin makine uyumu  : ${pct(g.filter((a) => a.uyumKesin >= 2).length)}`);
console.log(`  >=1 kesin OEM referansi : ${pct(g.filter((a) => a.oemKesin >= 1).length)}`);

const med = (arr) => arr[Math.floor(arr.length / 2)];
const au = g.map((a) => a.aciklamaUzunluk).sort((x, y) => x - y);
const ou = g.map((a) => a.olguUzunluk).sort((x, y) => x - y);
console.log(`\n  Mevcut aciklama uzunlugu  : min=${au[0]} medyan=${med(au)} max=${au[au.length - 1]} | >=300 olan: ${au.filter((x) => x >= 300).length}`);
console.log(`  Dogrulanmis OLGU malzemesi: min=${ou[0]} medyan=${med(ou)} max=${ou[ou.length - 1]}`);
console.log(`     >=300 karakterlik olgu malzemesi olan : ${ou.filter((x) => x >= 300).length}/${g.length}`);
console.log(`     >=400 karakterlik olgu malzemesi olan : ${ou.filter((x) => x >= 400).length}/${g.length}`);

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = [
  "arastirmaKimligi", "logoKodu", "katalogReferansi", "teknikAdTR", "teknikAdEN",
  "parcaUreticisi", "urunDogrulama", "uyumKesin", "uyumToplam", "modelSayisi",
  "oemKesin", "oemToplam", "kaynakSayisi", "aciklamaUzunluk", "olguUzunluk",
  "olcuVar", "malzemeVar", "montajVar", "seoBaslikVar", "engeller",
];
const byOlgu = (a, b) => b.olguUzunluk - a.olguUzunluk;

writeFileSync(OUT + "01_guvenilir_kume.csv", "﻿" + csv([...g].sort(byOlgu), COLS), "utf8");
writeFileSync(OUT + "02_kesin_uyumlu_tum.csv", "﻿" + csv([...kesinUyumlu].sort(byOlgu), COLS), "utf8");
writeFileSync(OUT + "03_engelli_kayitlar.csv", "﻿" + csv(adaylar.filter((a) => a.engeller !== "-"), COLS), "utf8");

const q1 = [];
for (const [k, l] of okMap) {
  if (new Set(l).size > 1) {
    for (const v of new Set(l)) q1.push({ normalizeAnahtar: k, hamKod: v });
  }
}
const q2 = [];
for (const [k, l] of krMap) {
  if (l.length > 1) {
    for (const r of l) {
      q2.push({
        normalizeAnahtar: k,
        katalogReferansi: S(r, "Katalog Referansı"),
        logoKodu: S(r, "Orijinal Ürün Kodu"),
        logoAdi: S(r, "Orijinal Ürün Adı"),
        teknikAdTR: S(r, "Teknik Ad TR"),
        dogrulama: S(r, "Doğrulama Seviyesi"),
      });
    }
  }
}
writeFileSync(OUT + "04_manuel_normalize_cakismasi.csv", "﻿" + csv(q1, ["normalizeAnahtar", "hamKod"]), "utf8");
writeFileSync(
  OUT + "05_manuel_paylasilan_katalog_referansi.csv",
  "﻿" + csv(q2, ["normalizeAnahtar", "katalogReferansi", "logoKodu", "logoAdi", "teknikAdTR", "dogrulama"]),
  "utf8"
);
writeFileSync(
  OUT + "06_manuel_celiskili.csv",
  "﻿" +
    csv(
      CEL.map((r) => ({
        logoKodu: S(r, "Orijinal Ürün Kodu"),
        logoAdi: S(r, "Orijinal Ürün Adı"),
        katalogReferansi: S(r, "Katalog Referansı"),
        kaynaktaKimlik: S(r, "Kaynakta Teknik Kimlik"),
        yayinci: S(r, "Yayıncı"),
        sonrakiKontrol: S(r, "Sonraki Kontrol"),
      })),
      ["logoKodu", "logoAdi", "katalogReferansi", "kaynaktaKimlik", "yayinci", "sonrakiKontrol"]
    ),
  "utf8"
);

console.log("\n=== MANUEL INCELEME KUYRUKLARI ===");
console.log(`  normalize cakismasi (A)          : ${q1.length} satir / ${new Set(q1.map((x) => x.normalizeAnahtar)).size} kume`);
console.log(`  paylasilan katalog referansi (A) : ${q2.length} satir / ${new Set(q2.map((x) => x.normalizeAnahtar)).size} kume`);
console.log(`  celiskili kayit                  : ${CEL.length} satir`);
console.log(`\nCSV yazildi -> ${OUT}`);
