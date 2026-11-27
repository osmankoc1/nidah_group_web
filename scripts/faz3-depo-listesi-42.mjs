/**
 * 42 şüpheli ürün için TEK, ÖNCELİK SIRALI depo kontrol listesi. SALT OKUNUR.
 *
 * Öncelik grupları (kullanıcı kararı):
 *   P1 — Daire ayar pulları (CH 12119-10 / -16 / -20): aynı çizim kalemi,
 *        kalınlık ölçülmeden AYIRT EDİLEMEZ
 *   P2 — Beş O-ring: ölçü yok, O-ring yalnızca ölçüsüyle tanımlanır
 *   P3 — Şanzıman ve diferansiyel plakaları: aynı aile, ölçü yok
 *   P4 — Logo ↔ katalog isim uyuşmazlığı (3 kesin + 10 olası)
 *   P5 — Diğer benzer açıklamalı ürünler
 *
 * Çıktı: tek CSV (Excel'de doldurulur) + tek yazdırılabilir MD.
 *
 * Kullanım: node scripts/faz3-depo-listesi-42.mjs <tum97.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , veriYolu, outArg] = process.argv;
if (!veriYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-depo-listesi-42.mjs <tum97.json> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(veriYolu, "utf-8"));
const byPn = new Map(veri.map((v) => [v.pn, v]));

const csvOku = (ad) => {
  const metin = readFileSync(OUT + ad, "utf-8").replace(/^﻿/, "").trim();
  const satirlar = metin.split(/\r?\n/);
  const baslik = satirlar[0].split(";").map((h) => h.replace(/^"|"$/g, ""));
  return satirlar.slice(1).map((s) => {
    const h = s.split(";").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(baslik.map((b, i) => [b, h[i] ?? ""]));
  });
};

const supheli = csvOku("62_supheli_urunler.csv");
const isim = new Map(csvOku("70_isim_eslesme_sonucu.csv").map((r) => [r.partNumber, r]));
const supheliPn = new Set(supheli.map((s) => s.partNumber));

// ── Öncelik grupları ─────────────────────────────────────────────────────────
const AYAR_PULU = ["CH 12119-10", "CH 12119-16", "CH 12119-20"];
const ORINGLER = ["60463-00400", "C5563-70280", "N3153-05500", "N3153-06500", "N3153-13000"];
const PLAKALAR = ["58822-32300", "60325-01300", "60425-01800", "69241-03403", "69404-02600",
  "60332-00700", "60332-00801", "60532-00100"];

function oncelik(pn) {
  const i = isim.get(pn);
  if (AYAR_PULU.includes(pn)) return { p: "P1", baslik: "Daire ayar pulu — AYIRT EDİLEMEZ" };
  if (ORINGLER.includes(pn)) return { p: "P2", baslik: "O-ring — ölçü yok" };
  if (PLAKALAR.includes(pn)) return { p: "P3", baslik: "Şanzıman / diferansiyel plakası" };
  if (i?.durum === "DEPO KONTROLU GEREKLI") return { p: "P4", baslik: "İsim uyuşmazlığı — KESİN" };
  if (i?.durum === "OLASI - TERMINOLOJI FARKI") return { p: "P4", baslik: "İsim uyuşmazlığı — olası" };
  return { p: "P5", baslik: "Benzer açıklama" };
}

/** Ürüne özgü, depoda ne yapılacağını söyleyen tek satır. */
function neYapilacak(pn, p) {
  const o = byPn.get(pn);
  if (p === "P1") return "KALINLIĞI ölç (mm, kumpasla). Üç pul aynı çizim kaleminde; kalınlık olmadan hangisinin hangisi olduğu belirlenemez.";
  if (p === "P2") return "İÇ ÇAP ve KESİT KALINLIĞI ölç (mm). O-ring başka hiçbir bilgiyle tanımlanamaz.";
  if (p === "P3") return "DIŞ ÇAP, İÇ ÇAP, KALINLIK ve varsa DİŞ/KAMA SAYISI ölç. Plaka tipini (çelik / kağıtlı / baskı) parçaya bakarak yaz.";
  if (p === "P4") return `Parça üzerindeki ADI ve NUMARAYI olduğu gibi yaz. Logo'da "${o?.logoAdi ?? ""}", katalogda "${o?.adTR ?? ""}" — hangisi doğru?`;
  return "Parçayı gör, ölçüsünü al, üzerindeki adı ve numarayı yaz.";
}

const DOLDURULACAK = ["fizikenBulundu_EH", "sayilanAdet", "rafKonumu",
  "fotoCekildi_EH", "disCap_mm", "icCap_mm", "kalinlik_mm", "kesitKalinligi_mm",
  "disKamaSayisi", "malzeme", "agirlik_kg",
  "parcaUzerindekiAd", "parcaUzerindekiUretici", "parcaUzerindekiNumara",
  "siparisUzerineTeminEdilebilir_EH", "tedarikciNotu", "karar", "kontrolEden", "kontrolTarihi", "notlar"];

const SIRA = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 };
const rows = [...supheliPn].map((pn) => {
  const o = byPn.get(pn);
  const { p, baslik } = oncelik(pn);
  const i = isim.get(pn);
  const r = {
    oncelik: p, oncelikBasligi: baslik,
    partNumber: pn, logoStokKodu: o?.logo ?? "",
    teknikAdTR: o?.adTR ?? "", teknikAdEN: o?.adEN ?? "",
    logoAdi: o?.logoAdi ?? "", logoMiktar: o?.logoMiktar ?? "",
    kategori: o?.kategori ?? "", kaynakKalem: o?.kaynakKalem ?? "",
    isimEslesmesi: i?.durum ?? "", katalogOlcuDegeri: o?.olcu || "(katalogda yok)",
    NE_YAPILACAK: neYapilacak(pn, p),
  };
  for (const k of DOLDURULACAK) r[k] = "";
  return r;
}).sort((a, b) => (SIRA[a.oncelik] - SIRA[b.oncelik]) || a.partNumber.localeCompare(b.partNumber));

const COLS = Object.keys(rows[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "80_depo_kontrol_listesi_42.csv", "﻿" + csv(rows, COLS), "utf8");

// ── Yazdırılabilir sürüm ─────────────────────────────────────────────────────
let md = `# NİDAH GROUP — Depo Kontrol Listesi (42 ürün)

**Tarih:** ____________________  **Kontrol eden:** ____________________

## Kurallar

1. **Bulamadığın ürünü eleme.** "Fiziken bulundu" kutusuna **H** yaz, sonra
   "Sipariş üzerine temin edilebilir mi?" sorusunu yanıtla.
2. Ölçüleri **kumpasla** al, **mm** cinsinden yaz. Emin değilsen **boş bırak** — tahmin yazma.
3. Parça üzerindeki **adı, üreticiyi ve numarayı olduğu gibi kopyala**; katalogdan farklıysa da yaz.
4. Fotoğrafı nötr zeminde, en az 2 açıdan çek; dosya adına parça numarasını yaz.

> Boş bıraktığın alan "bilinmiyor" sayılır ve ürün sayfasına yazılmaz.

`;

let sonOncelik = "";
for (const r of rows) {
  if (r.oncelik !== sonOncelik) {
    const grup = rows.filter((x) => x.oncelik === r.oncelik);
    md += `\n---\n\n# ${r.oncelik} · ${r.oncelikBasligi} — ${grup.length} ürün\n`;
    sonOncelik = r.oncelik;
  }
  md += `
## ${r.partNumber}

| | |
|---|---|
| Teknik ad | **${r.teknikAdTR}** |
| Logo kodu / adı | \`${r.logoStokKodu}\` · ${r.logoAdi || "-"} |
| Logo kayıtlı miktar | ${r.logoMiktar === "" ? "-" : r.logoMiktar}${typeof r.logoMiktar === "number" && r.logoMiktar < 0 ? " ⚠ NEGATİF" : ""} |
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

md += `
---

## Kontrol sonrası

1. Ölçü, malzeme ve ağırlık bilgileri açıklamalara **eklenecek**.
2. P1 ve P2 grupları kalınlık/çap değerlerine göre **ayrıştırılacak**.
3. Parça üzerindeki üretici, \`part_manufacturer\` alanının **doğrulanmış** değeri olacak.
4. P4'teki isim uyuşmazlıkları, parça üzerindeki ada göre karara bağlanacak.
5. **Hiçbir ürünün \`seo_ready\` değeri bu aşamada true yapılmayacak.**
`;

writeFileSync(OUT + "81_depo_kontrol_listesi_42.md", md, "utf8");

const dag = new Map();
for (const r of rows) dag.set(`${r.oncelik} · ${r.oncelikBasligi}`, (dag.get(`${r.oncelik} · ${r.oncelikBasligi}`) ?? 0) + 1);
console.log(`liste: ${rows.length} urun × ${COLS.length} kolon (${COLS.length - DOLDURULACAK.length} dolu, ${DOLDURULACAK.length} doldurulacak)`);
console.log(`\noncelik dagilimi:`);
for (const [k, v] of [...dag.entries()].sort()) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`\n80_depo_kontrol_listesi_42.csv · 81_depo_kontrol_listesi_42.md yazildi -> ${OUT}`);
