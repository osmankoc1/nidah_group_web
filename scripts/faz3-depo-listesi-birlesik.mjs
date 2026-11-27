/**
 * BİRLEŞİK depo kontrol listesi. SALT OKUNUR.
 *
 * İki kaynağı tek listede toplar:
 *   · Mevcut 42 şüpheli ürün (P1–P5) — 80_depo_kontrol_listesi_42.csv
 *   · 2026-11-16'da aktarılan 57 üründen fiziksel doğrulama gerekenler (P6–P9)
 *
 * YENİ ÖNCELİKLER
 *   P6 — Ayırt edilemeyen çiftler (6 ürün)
 *        Aynı teknik ad, ölçü yok, aynı ya da komşu çizim kalemi. Kimlikleri
 *        katalogda AYRI, ama depoda elle ayırt edilemezler.
 *   P7 — Teknik kimliği belirsiz (1 ürün)
 *        R6020-11521-0 "Hat". Yayın BLOKELİ (is_active=false). Parçanın türü
 *        görülmeden açılmaz.
 *   P8 — Kalınlık kademesi eşleşmesi (3 ürün)
 *        Üç kavrama ayar pulu. Kalınlıklar üretici kataloğundan TEYİTLİ
 *        (1 / 0,5 / 0,2 mm); depoda hangi fiziksel pulun hangi numara olduğu
 *        doğrulanacak.
 *   P9 — Fiziksel varlık taraması (kalan 47 ürün)
 *        57 ürünün HİÇBİRİNDE Logo stoğu pozitif değil (40 negatif, 17 sıfır).
 *        Kimlik sorunu yok; yalnızca "var mı / tedarik edilebilir mi" sorusu.
 *
 * Kullanım:
 *   node scripts/faz3-depo-listesi-birlesik.mjs <taslaklar57.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu, outArg] = process.argv;
if (!taslakYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-depo-listesi-birlesik.mjs <taslaklar57.json> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";

const csvAyristir = (metin) => {
  const satirlar = [];
  let alan = "", satir = [], tirnak = false;
  const t = metin.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (tirnak) {
      if (c === '"') { if (t[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; }
      else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ";") { satir.push(alan); alan = ""; }
    else if (c === "\n") { satir.push(alan); satirlar.push(satir); satir = []; alan = ""; }
    else if (c !== "\r") alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar.filter((s) => s.some((x) => x !== ""));
};
const oku = (p) => {
  const s = csvAyristir(readFileSync(p, "utf-8"));
  return s.slice(1).map((c) => Object.fromEntries(s[0].map((b, i) => [b, c[i] ?? ""])));
};

const eski42 = oku(OUT + "80_depo_kontrol_listesi_42.csv");
const yeni57 = JSON.parse(readFileSync(taslakYolu, "utf-8"));

// -- Yeni oncelik gruplari ----------------------------------------------------
const CIFTLER = [
  { urunler: ["60382-00900", "62682-21500"], ad: "Aşınma plakası", kanit: "Aynı çizim (D030.00.01), komşu kalemler 8 ve 9" },
  { urunler: ["C5563-70144", "N3150-02800"], ad: "O-ring", kanit: "Farklı çizimler (E080.00.01 kalem 30 / E110.00.01 kalem 28)" },
  { urunler: ["62631-04700", "62631-04900"], ad: "Dingil O-ring contası", kanit: "Aynı çizim (31-02), komşu kalemler 11 ve 12" },
];
const AYAR_PULU = {
  "61963-00900": "1 mm (A/R T=1, çizimde 4 adet)",
  "61963-01100": "0,5 mm (A/R T=0.5, çizimde 2 adet)",
  "61963-01200": "0,2 mm (A/R T=0.2, çizimde 6 adet)",
};
const BLOKELI = "R6020-11521-0";

function neYapilacak(p, pn) {
  if (p === "P6") {
    const c = CIFTLER.find((x) => x.urunler.includes(pn));
    const digeri = c.urunler.find((x) => x !== pn);
    return `DIŞ ÇAP, İÇ ÇAP ve KALINLIĞI ölç (mm, kumpasla). ${digeri} ile birlikte ölç ve ikisini KARŞILAŞTIR — katalogda ayrı parçalar (${c.kanit}) ama ölçü kaydı yok, elle ayırt edilemiyorlar.`;
  }
  if (p === "P7") {
    return "Parçayı GÖR ve türünü yaz: hidrolik HORTUM mu, çelik BORU mu, boru-bağlantı TAKIMI mı? Katalogdaki adı yalnızca \"Line/Hat\". Bu bilgi gelmeden ürün yayımlanmayacak.";
  }
  if (p === "P8") {
    return `KALINLIĞI ölç (mm, kumpasla) ve katalog değeriyle karşılaştır: ${AYAR_PULU[pn]}. Kalınlık katalogdan teyitli; burada fiziksel pulun doğru numarada olduğu doğrulanacak.`;
  }
  return "Parça fiziken var mı? Yoksa sipariş üzerine temin edilebilir mi? Varsa ölçüsünü al, üzerindeki adı ve numarayı yaz.";
}

const BASLIKLAR = {
  P6: "Ayırt edilemeyen çift — ÖLÇÜM ŞART",
  P7: "Teknik kimliği belirsiz — YAYIN BLOKELİ",
  P8: "Kalınlık kademesi eşleşmesi",
  P9: "Fiziksel varlık taraması",
};

const ciftPn = new Set(CIFTLER.flatMap((c) => c.urunler));
const pulPn = new Set(Object.keys(AYAR_PULU));

function oncelikYeni(pn) {
  if (ciftPn.has(pn)) return "P6";
  if (pn === BLOKELI) return "P7";
  if (pulPn.has(pn)) return "P8";
  return "P9";
}

const DOLDURULACAK = ["fizikenBulundu_EH", "sayilanAdet", "rafKonumu",
  "fotoCekildi_EH", "disCap_mm", "icCap_mm", "kalinlik_mm", "kesitKalinligi_mm",
  "disKamaSayisi", "malzeme", "agirlik_kg",
  "parcaUzerindekiAd", "parcaUzerindekiUretici", "parcaUzerindekiNumara",
  "siparisUzerineTeminEdilebilir_EH", "tedarikciNotu", "karar", "kontrolEden", "kontrolTarihi", "notlar"];

const yeniSatirlar = yeni57.map((t) => {
  const p = oncelikYeni(t.pn);
  const r = {
    oncelik: p,
    oncelikBasligi: BASLIKLAR[p],
    partNumber: t.pn,
    logoStokKodu: t.logo,
    teknikAdTR: t.adTR,
    teknikAdEN: t.adEN,
    logoAdi: t.logoAdi ?? "",
    logoMiktar: t.logoMiktar ?? "",
    kategori: t.kategori ?? "",
    kaynakKalem: t.kaynakKalem ?? "",
    isimEslesmesi: "",
    katalogOlcuDegeri: t.olcu || "(katalogda yok)",
    NE_YAPILACAK: neYapilacak(p, t.pn),
  };
  for (const k of DOLDURULACAK) r[k] = "";
  return r;
});

// -- Birlestirme --------------------------------------------------------------
const SIRA = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, P8: 8, P9: 9 };
const hepsi = [...eski42, ...yeniSatirlar].sort(
  (a, b) => (SIRA[a.oncelik] - SIRA[b.oncelik]) || a.partNumber.localeCompare(b.partNumber),
);

const COLS = Object.keys(yeniSatirlar[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "82_depo_kontrol_listesi_birlesik.csv", "﻿" + csv(hepsi, COLS), "utf8");

// -- Yazdirilabilir surum -----------------------------------------------------
const dag = new Map();
for (const r of hepsi) dag.set(r.oncelik, (dag.get(r.oncelik) ?? 0) + 1);

let md = `# NİDAH GROUP — Depo Kontrol Listesi (birleşik)

**Tarih:** ____________________  **Kontrol eden:** ____________________

Toplam **${hepsi.length} ürün** · P1–P5 önceki şüpheli küme (${eski42.length}) · P6–P9 yeni aktarılan 57 ürün (${yeniSatirlar.length})

| Öncelik | Konu | Ürün |
|---|---|---:|
${[...dag.entries()].sort((a, b) => SIRA[a[0]] - SIRA[b[0]])
  .map(([k, v]) => `| **${k}** | ${hepsi.find((r) => r.oncelik === k).oncelikBasligi} | ${v} |`).join("\n")}

## Kurallar

1. **Bulamadığın ürünü eleme.** "Fiziken bulundu" kutusuna **H** yaz, sonra
   "Sipariş üzerine temin edilebilir mi?" sorusunu yanıtla.
2. Ölçüleri **kumpasla** al, **mm** cinsinden yaz. Emin değilsen **boş bırak** — tahmin yazma.
3. Parça üzerindeki **adı, üreticiyi ve numarayı olduğu gibi kopyala**; katalogdan farklıysa da yaz.
4. Fotoğrafı nötr zeminde, en az 2 açıdan çek; dosya adına parça numarasını yaz.
5. **P6 çiftlerini yan yana koyup birlikte ölç.** Tek tek ölçmek ayırt etmeye yetmez.

> Boş bıraktığın alan "bilinmiyor" sayılır ve ürün sayfasına yazılmaz.
> Logo'daki miktarların tamamı negatif ya da sıfırdır; **bu sayılara güvenme**, fiilen say.

`;

let sonOncelik = "";
for (const r of hepsi) {
  if (r.oncelik !== sonOncelik) {
    const grup = hepsi.filter((x) => x.oncelik === r.oncelik);
    md += `\n---\n\n# ${r.oncelik} · ${r.oncelikBasligi} — ${grup.length} ürün\n`;
    sonOncelik = r.oncelik;
  }
  // P9 kompakt tablo olarak yazilir; kart basina sayfa harcanmaz.
  if (r.oncelik === "P9") continue;
  md += `
## ${r.partNumber}

| | |
|---|---|
| Teknik ad | **${r.teknikAdTR}** |
| Logo kodu / adı | \`${r.logoStokKodu}\` · ${r.logoAdi || "-"} |
| Logo kayıtlı miktar | ${r.logoMiktar === "" ? "-" : r.logoMiktar}${Number(r.logoMiktar) < 0 ? " ⚠ NEGATİF" : ""} |
| Kaynak kalemi | ${r.kaynakKalem || "-"} |
| Katalog ölçüsü | ${r.katalogOlcuDegeri} |

> **NE YAPILACAK:** ${r.NE_YAPILACAK}

| Soru | Yanıt |
|---|---|
| Fiziken bulundu mu? | ☐ E  ☐ H |
| Sayılan adet / raf | ______ / ____________ |
| Fotoğraf çekildi mi? | ☐ E  ☐ H |
| Dış çap / İç çap (mm) | ______ / ______ |
| Kalınlık / kesit (mm) | ______ / ______ |
| Diş veya kama sayısı | ______ |
| Malzeme | ____________________ |
| Ağırlık (kg) | ______ |
| **Parça üzerindeki ad** | ____________________ |
| **Parça üzerindeki üretici** | ____________________ |
| **Parça üzerindeki numara** | ____________________ |
| **Sipariş üzerine temin edilebilir mi?** | ☐ E  ☐ H |
| Karar / notlar | ____________________ |
`;
}

// P9 kompakt tablo
const p9 = hepsi.filter((r) => r.oncelik === "P9");
md += `
Bu grupta kimlik sorunu yok — yalnızca **var mı / temin edilebilir mi** sorusu.
Her satır için iki kutuyu işaretle, varsa adedi ve rafı yaz.

| # | Parça no | Teknik ad | Logo adedi | Var mı | Adet / Raf | Temin edilebilir mi |
|---:|---|---|---:|---|---|---|
${p9.map((r, i) => `| ${i + 1} | \`${r.partNumber}\` | ${r.teknikAdTR} | ${r.logoMiktar} | ☐ E ☐ H | ____ / ______ | ☐ E ☐ H |`).join("\n")}
`;

md += `
---

## Kontrol sonrası

1. Ölçü, malzeme ve ağırlık bilgileri açıklamalara **eklenecek**.
2. **P6** çiftleri ölçülere göre ayrıştırılacak; ayrışmazsa ikisi de yayımlanmayacak.
3. **P7** (\`R6020-11521-0\`) türü yazılmadan \`is_active\` **açılmayacak**.
4. **P8** pullarında fiziksel kalınlık katalog değeriyle uyuşmazsa **katalog kaydı yeniden incelenecek**.
5. Parça üzerindeki üretici, \`part_manufacturer\` alanının **doğrulanmış** değeri olacak.
6. **Hiçbir ürünün \`seo_ready\` değeri bu aşamada true yapılmayacak.**
`;

writeFileSync(OUT + "83_depo_kontrol_listesi_birlesik.md", md, "utf8");

console.log(`birlesik liste: ${hepsi.length} urun (eski ${eski42.length} + yeni ${yeniSatirlar.length})`);
console.log(`\noncelik dagilimi:`);
for (const [k, v] of [...dag.entries()].sort((a, b) => SIRA[a[0]] - SIRA[b[0]])) {
  console.log(`  ${k}  ${String(v).padStart(3)}  ${hepsi.find((r) => r.oncelik === k).oncelikBasligi}`);
}
console.log(`\nyazildi -> 82_depo_kontrol_listesi_birlesik.csv · 83_depo_kontrol_listesi_birlesik.md`);
