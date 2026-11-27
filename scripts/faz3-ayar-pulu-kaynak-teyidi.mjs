/**
 * Üç kavrama ayar pulunun kalınlık eşleşmesini ÜRETİCİ KATALOĞUNDAN teyit eder
 * ve açıklamaları ayrıştırır. SALT OKUNUR (yalnızca taslak dosyasını yazar).
 *
 * KAYNAK: Mitsubishi MG530 Optional Parts Catalogue 98160-45930,
 *         Grup 63 "BLADE SLIP CLUTCH", çizim 160459-02, katalog sayfası -173-
 *         (PDF sayfa 198). Sayfa GÖRÜNTÜ olarak okunarak doğrulandı.
 *
 * NEDEN GÖRÜNTÜ: `pdftotext -layout` çıktısı bu sayfada bir satır KAYMIŞTI —
 * açıklama sütunu parça numarası sütunuyla hizalanmıyordu. Metne güvenilseydi
 * T=1 değeri 61963-00300'e (ROLLER) atanırdı. Sayfanın kendisi tabloyu kesin
 * olarak gösteriyor.
 *
 * SAYFADAKİ TABLO (REF 9, üç kalınlık kademesi aynı kalemi paylaşır):
 *
 *   REF  PART NO.      NAME            DESC        QTY
 *    1   61963-00100   ROLLER                       1
 *    2   61963-00200   HUB                          1
 *    3   61963-00300   COVER                        1
 *    4   61963-10400   PLATE                        2
 *    5   61963-10500   PLATE                        4
 *    6   61963-00600   PLATE                        5
 *    7   61963-00700   SPRING                       1
 *    8   61963-00800   PLATE                        2
 *    9   61963-00900   SHIM            A/R T=1      4   <--
 *        61963-01100   SHIM            A/R T=0.5    2   <--
 *        61963-01200   SHIM            A/R T=0.2    6   <--
 *   10   F1035-10030   BOLT                         8
 *   11   F2515-10000   WASHER, SPRING               8
 *
 * V18'in kaydı (1 / 0,5 / 0,2 mm) bu tabloyla BİREBİR ÖRTÜŞÜYOR.
 *
 * Eklenen cümle, değeri bir ÖLÇÜM olarak değil KATALOG KAYDI olarak verir ve
 * bunu açıkça yazar — fiziksel ölçüm yapılmış gibi gösterilmez.
 *
 * Kullanım: node scripts/faz3-ayar-pulu-kaynak-teyidi.mjs <taslaklar.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu] = process.argv;
if (!taslakYolu) {
  console.error("Kullanim: node scripts/faz3-ayar-pulu-kaynak-teyidi.mjs <taslaklar.json>");
  process.exit(1);
}

/** Katalog sayfasindan BIREBIR okunan degerler. */
const KATALOG = {
  "61963-00900": { kalinlik: "1 mm", ham: "A/R T=1", adet: 4 },
  "61963-01100": { kalinlik: "0,5 mm", ham: "A/R T=0.5", adet: 2 },
  "61963-01200": { kalinlik: "0,2 mm", ham: "A/R T=0.2", adet: 6 },
};
const KAYNAK = "98160-45930 numarali MG530 opsiyonel parca katalogu, Grup 63 " +
  "\"Blade Slip Clutch\", cizim 160459-02, sayfa 173, kalem 9";

const veri = JSON.parse(readFileSync(taslakYolu, "utf-8"));

let degisen = 0;
for (const kayit of veri) {
  const k = KATALOG[kayit.pn];
  if (!k) continue;

  // Dosyadaki arastirma kaydi ile katalog sayfasi ORTUSUYOR mu?
  const beklenen = String(kayit.olcu ?? "").trim();
  if (beklenen !== k.kalinlik) {
    console.error(`DURDURULDU — ${kayit.pn}: arastirma kaydi "${beklenen}", katalog "${k.kalinlik}". Ortusmuyor.`);
    process.exit(1);
  }

  const cumle =
    `Üretici kataloğu bu referansı ${k.kalinlik} kalınlık kademesiyle listeler ` +
    `(98160-45930, Grup 63 "Blade Slip Clutch", çizim 160459-02, kalem 9); ` +
    `çizimde bu kademeden ${k.adet} adet kullanılır. ` +
    `Değer üretici kataloğundan alınmıştır, parça üzerinde ölçülmemiştir.`;

  /*
   * Varsayilan son cumle ("Ayar pullari ... bize bildirin") UC URUNDE DE
   * birebir ayniydi ve artik yeni cumleyle anlamca ortusuyor. Kademe adini
   * tasiyan bir yonlendirmeyle degistirilir: hem tekrar kalkar hem de her
   * urun kendi kademesini anar.
   */
  const yeniSon =
    `Sipariş öncesinde ölçülen boşluk değerini ve makine modelini bize bildirin; ` +
    `${k.kalinlik} yerine başka bir kademe gerekiyorsa doğru referansı birlikte belirleyelim.`;

  const parcalar = kayit.taslak.split(/(?<=\.)\s+/);
  parcalar.pop(); // tekrar eden genel cumle atilir
  kayit.taslak = [...parcalar, cumle, yeniSon].join(" ");
  kayit.uzunluk = kayit.taslak.length;
  kayit.kalinlikKaynagi = KAYNAK;
  degisen++;
}

if (degisen !== Object.keys(KATALOG).length) {
  console.error(`HATA: ${Object.keys(KATALOG).length} urun beklenirken ${degisen} tanesi bulundu.`);
  process.exit(1);
}

writeFileSync(taslakYolu, JSON.stringify(veri, null, 1), "utf8");

// -- Kontrol -----------------------------------------------------------------
const kelimeler = (s) =>
  new Set(s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean));
const jaccard = (a, b) => {
  const A = kelimeler(a), B = kelimeler(b);
  const kesisim = [...A].filter((x) => B.has(x)).length;
  return kesisim / (A.size + B.size - kesisim);
};

const grup = veri.filter((v) => KATALOG[v.pn]);
console.log("=== KAYNAK TEYIDI SONRASI ===\n");
for (const g of grup) {
  console.log(`--- ${g.pn}  (${g.uzunluk} karakter, katalog: ${KATALOG[g.pn].ham}) ---`);
  console.log(g.taslak);
  console.log("");
}
console.log("benzerlik (Jaccard):");
let yuksek = 0;
for (let i = 0; i < grup.length; i++) {
  for (let j = i + 1; j < grup.length; j++) {
    const o = jaccard(grup[i].taslak, grup[j].taslak);
    if (o >= 0.85) yuksek++;
    console.log(`  ${grup[i].pn} <-> ${grup[j].pn}  %${(o * 100).toFixed(1)}  ${o >= 0.85 ? "<-- hala yuksek" : "tamam"}`);
  }
}
console.log(`\n%85 ustu cift: ${yuksek}/3`);
console.log(`300 karakter esigini gecen: ${grup.filter((g) => g.uzunluk >= 300).length}/3`);
console.log(`"olculmemistir" ifadesi geciyor: ${grup.filter((g) => /ölçülmemiştir/.test(g.taslak)).length}/3`);
console.log(`\n${degisen} taslak guncellendi -> ${taslakYolu}`);
