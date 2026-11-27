/**
 * Pilot 10 ürün için DEPO KONTROL LİSTESİ üretir. SALT OKUNUR.
 *
 * Çıktı iki biçimde:
 *   · CSV  — Excel'de açılıp doldurulur (bilinenler önceden dolu, boşlar doldurulacak)
 *   · MD   — yazdırılıp elde doldurulacak biçim
 *
 * TASARIM KURALI: "fiziksel stokta yok" bir ELEME ölçütü DEĞİLDİR.
 * Listede eleme kolonu yoktur; bunun yerine `siparisUzerineTeminEdilebilir`
 * sorulur. Stokta olmayan ürün sipariş üzerine satılabilir.
 *
 * Kullanım: node scripts/faz3-pilot-kontrol-listesi.mjs <pilot10.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , veriYolu, outArg] = process.argv;
if (!veriYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-pilot-kontrol-listesi.mjs <pilot10.json> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(veriYolu, "utf-8"));

/** Ürüne özgü kontrol notları — her biri ölçülmüş bir gerekçeye dayanır. */
const OZEL = {
  "328-9669": "Logo miktari -1 (NEGATIF). Katalog olcusu: ic cap 261,77 mm / kalinlik 6,97 mm — OLCUMLE TEYIT ET.",
  "CH 19629": "Logo adi 'DANA GOZU (GE 35)'. Katalog 35 mm nominal olcu diyor. Ic capin 35 mm oldugunu TEYIT ET.",
  "324-0386": "!! LOGO ADI UYUSMUYOR: Logo 'Arka Kova Toplayici Bom Tm. Tk.', katalog 'hidrolik silindir kece takimi'. Parcanin hangisi oldugunu TEYIT ET.",
  "351-0925": "Logo adi 'Fren Balatasi', katalog 'fren surtunme diski'. Katalog olcusu: dis cap 355 mm — OLCUMLE TEYIT ET.",
  "CH 50A-1864ZI": "Civata: anahtar agzi, dis olcusu (M..x..) ve toplam uzunluk olculecek.",
  "VOE 12749768": "Ayar pulu: KALINLIK olculecek (cizim kalem 6).",
  "CH 12119-10": "!! AYRISTIRMA: CH 12119-16 ile ayni cizim kaleminde (kalem 7), ayni ad, ayni modeller. KALINLIK olculmeden ikisi ayirt EDILEMEZ.",
  "CH 12119-16": "!! AYRISTIRMA: CH 12119-10 ile ayni cizim kaleminde (kalem 7), ayni ad, ayni modeller. KALINLIK olculmeden ikisi ayirt EDILEMEZ.",
  "714-16-19730": "Logo miktari -52 (NEGATIF). Ayirici plaka: dis cap, ic cap, kalinlik ve varsa dis/kama sayisi olculecek.",
  "714-12-19710": "Logo miktari -38 (NEGATIF). Debriyaj diski: dis cap, ic cap, kalinlik ve dis/kama sayisi olculecek.",
};

const DOLDURULACAK = [
  "fizikenBulundu_EH", "sayilanAdet", "rafKonumu",
  "fotoCekildi_EH", "fotoAdedi",
  "disCap_mm", "icCap_mm", "kalinlik_mm", "uzunluk_mm", "digerOlcu",
  "malzeme", "agirlik_kg",
  "parcaUzerindekiUretici", "parcaUzerindekiNumara",
  "ambalajVar_EH", "ambalajUzerindekiNumara",
  "siparisUzerineTeminEdilebilir_EH", "tedarikciNotu",
  "kontrolEden", "kontrolTarihi", "notlar",
];

const rows = veri.map((v, i) => {
  const r = {
    sira: i + 1,
    partNumber: v.pn,
    logoStokKodu: v.logo,
    teknikAd: v.teknikAdTR,
    logoStokAdi: v.logoStok?.logoAdi ?? "",
    logoKayitliMiktar: v.logoStok?.adet ?? "",
    sistemGrubu: v.teknikSistem,
    montajYeri: v.montajYeri || "(kayitli degil)",
    kaynakKalem: v.ek?.kaynakKalem ?? "",
    katalogOlcuDegeri: v.olcuOzellik || "(katalogda yok)",
    ozelKontrol: OZEL[v.pn] ?? "",
  };
  for (const k of DOLDURULACAK) r[k] = "";
  return r;
});

const COLS = Object.keys(rows[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "50_pilot10_depo_kontrol_listesi.csv", "﻿" + csv(rows, COLS), "utf8");

// ── Yazdirilabilir surum ─────────────────────────────────────────────────────
let md = `# NİDAH GROUP — Pilot 10 Ürün · Depo Kontrol Listesi

**Tarih:** ____________________  **Kontrol eden:** ____________________

## Nasıl doldurulur

1. Parçayı rafta bul. **Bulamazsan ürünü eleme** — "Fiziken bulundu" kutusuna **H** yaz
   ve "Sipariş üzerine temin edilebilir mi?" sorusunu yanıtla.
2. Fotoğrafı **nötr zeminde**, en az 2 açıdan çek. Dosya adına parça numarasını yaz.
3. Ölçüleri **kumpasla** al, mm cinsinden yaz. Emin değilsen boş bırak, tahmin yazma.
4. **Parça üzerindeki üretici adını ve numarasını** olduğu gibi kopyala — farklıysa da yaz.
5. Katalog ölçüsü verilen ürünlerde ölçümün katalogla **uyuşup uyuşmadığını** not et.

> Boş bıraktığın alan "bilinmiyor" sayılır ve ürün sayfasına yazılmaz. **Tahmin yazmayın.**

---
`;

for (const [i, v] of veri.entries()) {
  const stok = v.logoStok?.adet;
  const uyari = typeof stok === "number" && stok < 0 ? ` ⚠ NEGATİF (${stok})` : "";
  md += `
## ${i + 1} · ${v.pn}

| | |
|---|---|
| Teknik ad | **${v.teknikAdTR}** |
| Logo stok kodu | \`${v.logo}\` |
| Logo'daki ad | ${v.logoStok?.logoAdi ?? "-"} |
| Logo kayıtlı miktar | ${stok ?? "-"}${uyari} |
| Sistem / montaj | ${v.teknikSistem}${v.montajYeri ? " · " + v.montajYeri : ""} |
| Kaynak kalemi | ${v.ek?.kaynakKalem ?? "-"} |
| **Katalog ölçüsü** | ${v.olcuOzellik || "(katalogda yok)"} |

${OZEL[v.pn] ? `> **Özel kontrol:** ${OZEL[v.pn]}\n` : ""}
| Soru | Yanıt |
|---|---|
| Fiziken bulundu mu? (E/H) | ☐ E  ☐ H |
| Sayılan adet | __________ |
| Raf konumu | __________ |
| Fotoğraf çekildi mi? (E/H) | ☐ E  ☐ H · adet: ______ |
| Dış çap (mm) | __________ |
| İç çap (mm) | __________ |
| Kalınlık (mm) | __________ |
| Uzunluk (mm) | __________ |
| Diğer ölçü | ____________________________ |
| Malzeme | ____________________________ |
| Ağırlık (kg) | __________ |
| **Parça üzerindeki üretici** | ____________________________ |
| **Parça üzerindeki numara** | ____________________________ |
| Ambalaj var mı? (E/H) | ☐ E  ☐ H |
| Ambalaj üzerindeki numara | ____________________________ |
| **Sipariş üzerine temin edilebilir mi?** (E/H) | ☐ E  ☐ H |
| Tedarikçi notu | ____________________________ |
| Notlar | ____________________________ |

---
`;
}

md += `
## Kontrol sonrası

Doldurulan liste bana iletildiğinde:

1. Ölçü, malzeme ve ağırlık bilgileri açıklama taslaklarına **eklenecek**.
2. \`CH 12119-10\` ve \`CH 12119-16\` kalınlıklarına göre **ayrıştırılacak**.
3. Parça üzerindeki üretici adı, \`part_manufacturer\` alanının **doğrulanmış** değeri olacak.
4. Fotoğraflar Cloudinary'ye yüklenecek (ayrı onayla).
5. Fiziken bulunan ürünlerin \`stock_status\` değeri \`in_stock\`, sipariş üzerine temin
   edilebilenlerin \`on_order\` olarak işaretlenecek — **hiçbiri otomatik yapılmaz**.
6. **Hiçbir ürünün \`seo_ready\` değeri bu aşamada true yapılmayacak.**
`;

writeFileSync(OUT + "51_pilot10_depo_kontrol_listesi.md", md, "utf8");

console.log(`50_pilot10_depo_kontrol_listesi.csv  : ${rows.length} satir × ${COLS.length} kolon`);
console.log(`   onceden dolu kolon  : ${COLS.length - DOLDURULACAK.length}`);
console.log(`   doldurulacak kolon  : ${DOLDURULACAK.length}`);
console.log(`51_pilot10_depo_kontrol_listesi.md   : yazdirilabilir surum`);
console.log(`\nCikti dizini: ${OUT}`);
