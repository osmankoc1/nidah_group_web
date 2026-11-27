/**
 * R6020-11521-0 ("Hat" / "Line") teknik kimlik incelemesi + T1/T2/T3
 * kümesindeki AYNI TEKNİK ADA sahip grupların ayrıştırılması. SALT OKUNUR.
 *
 * İki iş:
 *   A) R6020-11521-0'ın V18'deki TÜM izlerini açar: hangi sayfada ne yazıyor,
 *      kaynak kalemi ne, aynı çizimde başka hangi kalemler var, numara
 *      ailesinde (R6020-*) başka ne var. Teknik adın neden "Hat" olduğunu
 *      ve ayırt edici bilgi bulunup bulunmadığını gösterir.
 *
 *   B) Aktarım kümesindeki (T1+T2+T3) aynı teknik ada sahip her grup için,
 *      T2 çiftlerinde kullanılan ayrıştırma testini uygular:
 *      kaynak kalemi farklı mı? aynı çizimde komşu kalem mi? ölçü var mı?
 *
 * Kullanım: node scripts/faz3-r6020-inceleme.mjs <cikti-dizini>
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , outArg] = process.argv;
if (!outArg) {
  console.error("Kullanim: node scripts/faz3-r6020-inceleme.mjs <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const KESIN = "Kesin doğrulandı";
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

const oku = (p) => {
  const t = readFileSync(p, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const h = t[0].split(";").map((x) => x.replace(/^"|"$/g, ""));
  return t.slice(1).map((l) => {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(h.map((b, i) => [b, c[i] ?? ""]));
  });
};

// ============================================================ A) R6020-11521-0
const HEDEF = "R6020-11521-0";
const hk = N(HEDEF);
console.log("=".repeat(78));
console.log(`A) ${HEDEF} — TEKNIK KIMLIK INCELEMESI`);
console.log("=".repeat(78));

for (const [ad, rows] of [
  ["Web Katalog Adayları", WK],
  ["A Yayın Adayları", A],
  ["A Grubu Teknik Eksikler", EK],
  ["Araştırma Kaynakları", KAY],
]) {
  const bulunan = rows.filter(
    (r) => N(S(r, "Orijinal Logo Stok Kodu")) === hk || N(S(r, "Orijinal Ürün Kodu")) === hk,
  );
  console.log(`\n-- ${ad} (${bulunan.length} kayit) --`);
  for (const r of bulunan) {
    for (const [k, v] of Object.entries(r)) {
      if (String(v).trim()) console.log(`   ${k}: ${String(v).trim().slice(0, 160)}`);
    }
  }
}

const hedefUyum = UY.filter((r) => N(S(r, "Orijinal Ürün Kodu")) === hk);
console.log(`\n-- Makine Uyumluluğu (${hedefUyum.length} kayit) --`);
for (const r of hedefUyum) {
  console.log(`   ${S(r, "Makine Markası")} ${S(r, "Makine Modeli")} | kanit=${S(r, "Uyum Kanıtı")} | kalem=${S(r, "Sayfa / Çizim / Kalem")} | sistem=${S(r, "Sistem")} | montaj=${S(r, "Montaj Yeri")} | seri=${S(r, "Seri Numarası Kapsamı")}`);
}

const logoKaydi = TUM.filter((r) => N(r["Orijinal Ürün Kodu"]) === hk);
console.log(`\n-- Tüm Ürünler / Logo kaydi (${logoKaydi.length}) --`);
for (const r of logoKaydi) {
  for (const [k, v] of Object.entries(r)) {
    if (String(v).trim() !== "") console.log(`   ${k}: ${String(v).trim().slice(0, 160)}`);
  }
}

// Ayni cizimde baska hangi kalemler var?
const hedefKalemler = [...new Set(hedefUyum.map((r) => S(r, "Sayfa / Çizim / Kalem")))];
const cizimleri = [...new Set(hedefKalemler.map((k) => k.split(",")[0].trim()).filter(Boolean))];
console.log(`\n-- Ayni cizimdeki diger kalemler (${cizimleri.join(", ")}) --`);
const wkByKod = new Map(WK.map((r) => [N(S(r, "Orijinal Logo Stok Kodu")), r]));
for (const ciz of cizimleri) {
  const komsular = UY.filter(
    (r) => S(r, "Sayfa / Çizim / Kalem").startsWith(ciz) && N(S(r, "Orijinal Ürün Kodu")) !== hk,
  );
  for (const r of komsular) {
    const wk = wkByKod.get(N(S(r, "Orijinal Ürün Kodu")));
    console.log(`   ${S(r, "Sayfa / Çizim / Kalem").padEnd(26)} ${S(r, "Orijinal Ürün Kodu").padEnd(16)} ${wk ? S(wk, "Teknik Ad TR") : "(katalog adayi degil)"}`);
  }
  if (!komsular.length) console.log("   (ayni cizimde baska kayit yok)");
}

// Numara ailesi
console.log(`\n-- R6020-* numara ailesi --`);
const aile = WK.filter((r) => /^R6020/i.test(S(r, "Katalog Referansı")));
for (const r of aile) {
  console.log(`   ${S(r, "Katalog Referansı").padEnd(18)} sev=${S(r, "Seviye")} ${S(r, "Teknik Ad TR").padEnd(28)} kategori=${S(r, "Teknik Kategori")}`);
}

// ====================================================== B) Ayni teknik ad grup
console.log(`\n\n${"=".repeat(78)}`);
console.log("B) AKTARIM KUMESINDE AYNI TEKNIK ADA SAHIP GRUPLAR");
console.log("=".repeat(78));

const kume = [
  ...oku(OUT + "95_T1.csv").map((r) => ({ ...r, kademe: "T1" })),
  ...oku(OUT + "95_T2.csv").map((r) => ({ ...r, kademe: "T2" })),
  ...oku(OUT + "95_T3.csv").map((r) => ({ ...r, kademe: "T3" })),
];
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map();
for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const aByKod = new Map(A.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));

const adGruplari = new Map();
for (const u of kume) push(adGruplari, u.teknikAdTR.toLocaleLowerCase("tr"), u);

const raporSatirlari = [];
for (const [, grup] of [...adGruplari.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (grup.length < 2) continue;
  console.log(`\n"${grup[0].teknikAdTR}" — ${grup.length} urun`);
  const kalemHaritasi = new Map();
  for (const u of grup) {
    const kod = N(u.logoKodu);
    const kesin = (uyByKod.get(kod) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
    const kalemler = [...new Set(kesin.map((x) => S(x, "Sayfa / Çizim / Kalem")))];
    const a = aByKod.get(kod);
    const olcu = a ? S(a, "Ölçü ve Özellik") : "";
    for (const k of kalemler) push(kalemHaritasi, k, u.partNumber);
    console.log(`   ${u.partNumber.padEnd(16)} [${u.kademe}] kalem=${kalemler.join(" | ") || "(yok)"}  olcu=${olcu || "(yok)"}`);
    raporSatirlari.push({
      teknikAd: grup[0].teknikAdTR, partNumber: u.partNumber, kademe: u.kademe,
      kalemler: kalemler.join(" | "), olcu: olcu || "",
    });
  }
  const ayniKalem = [...kalemHaritasi.entries()].filter(([, l]) => new Set(l).size > 1);
  const cizimler = [...new Set([...kalemHaritasi.keys()].map((k) => k.split(",")[0].trim()))];
  if (ayniKalem.length) {
    console.log(`   >> UYARI: ayni kaynak kalemini paylasan urunler: ${ayniKalem.map(([k, l]) => `${k} -> ${[...new Set(l)].join(", ")}`).join(" ; ")}`);
  } else if (cizimler.length === 1) {
    console.log(`   >> Ayni cizim (${cizimler[0]}), FARKLI kalemler -> uretici cizimi bunlari ayri parca sayiyor`);
  } else {
    console.log(`   >> Farkli cizimler (${cizimler.join(", ")}) -> ayri parcalar`);
  }
  const olcusuz = grup.filter((u) => {
    const a = aByKod.get(N(u.logoKodu));
    return !a || !S(a, "Ölçü ve Özellik");
  });
  if (olcusuz.length === grup.length) {
    console.log(`   >> Hicbirinde olcu yok -> depoda fiziksel ayirt etme icin OLCUM gerekir`);
  }
}
