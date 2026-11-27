/**
 * Üç kavrama ayar pulunun açıklamalarını BİRBİRİNDEN AYIRIR. SALT OKUNUR
 * (yalnızca taslak dosyasını yeniden yazar; veritabanına dokunmaz).
 *
 * SORUN: üçü de aynı çizim kalemine (Grup 63, kalem 9) bağlı ve aynı üç
 * makinede kullanılıyor. Kalınlık yazılmayınca açıklamalar %96,6 aynı çıkıyor.
 *
 * KALINLIK NEDEN YAZILMIYOR: "1 mm / 0,5 mm / 0,2 mm" değerleri V18'de
 * YALNIZCA TEK bir alanda ("Ölçü ve Özellik") bulunuyor. Logo'daki ürün adı
 * üçünde de sadece "SHİM"; çizim kalemi üçünde de aynı. Yani hangi numaranın
 * hangi kalınlığa karşılık geldiğini doğrulayan İKİNCİ bir kayıt YOK.
 * Yanlış eşleşme yanlış parça sevkiyatı demek olduğundan değer yazılmaz.
 *
 * BUNUN YERİNE: her açıklama, aynı kalemdeki DİĞER referansları adıyla anar.
 * Bu bilgi tamamen kaynaklıdır (üçü de aynı katalog kalemindedir), ölçü
 * iddiası içermez ve her ürün için farklı bir metin üretir.
 *
 * Kullanım: node scripts/faz3-ayar-pulu-ayristir.mjs <taslaklar.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu] = process.argv;
if (!taslakYolu) {
  console.error("Kullanim: node scripts/faz3-ayar-pulu-ayristir.mjs <taslaklar.json>");
  process.exit(1);
}

const GRUP = ["61963-00900", "61963-01100", "61963-01200"];
const veri = JSON.parse(readFileSync(taslakYolu, "utf-8"));

const liste = (arr) =>
  arr.length === 1 ? arr[0] : arr.slice(0, -1).join(", ") + " ve " + arr[arr.length - 1];

let degisen = 0;
for (const kayit of veri) {
  if (!GRUP.includes(kayit.pn)) continue;
  const kardesler = GRUP.filter((p) => p !== kayit.pn);

  // Varsayılan taslağın SON cümlesi zaten bir "sipariş öncesi" yönlendirmesi.
  // Ayırt edici cümle ondan ÖNCE eklenir, metin akışı korunur.
  const cumle =
    `Üretici bu kalem altında birden çok kalınlık kademesi listeler; ` +
    `aynı uygulamanın diğer referansları ${liste(kardesler)}. ` +
    `Hangi kademeye ihtiyacınız olduğunu birlikte belirleyebilmemiz için ` +
    `montajdaki boşluk değerini bize bildirin.`;

  const parcalar = kayit.taslak.split(/(?<=\.)\s+/);
  const son = parcalar.pop();
  kayit.taslak = [...parcalar, cumle, son].join(" ");
  kayit.uzunluk = kayit.taslak.length;
  kayit.ayristirmaNotu =
    "Aynı katalog kalemindeki kardeş referanslar anıldı. Kalınlık değeri " +
    "YAZILMADI: numara-kalınlık eşleşmesini doğrulayan ikinci kayıt yok.";
  degisen++;
}

if (degisen !== GRUP.length) {
  console.error(`HATA: ${GRUP.length} urun beklenirken ${degisen} tanesi bulundu.`);
  process.exit(1);
}

writeFileSync(taslakYolu, JSON.stringify(veri, null, 1), "utf8");

// --- Kontrol ----------------------------------------------------------------
const kelimeler = (s) =>
  new Set(
    s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean),
  );
const jaccard = (a, b) => {
  const A = kelimeler(a), B = kelimeler(b);
  const kesisim = [...A].filter((x) => B.has(x)).length;
  return kesisim / (A.size + B.size - kesisim);
};

const grup = veri.filter((v) => GRUP.includes(v.pn));
console.log("=== UC AYAR PULU — AYRISTIRMA SONRASI ===\n");
for (const g of grup) {
  console.log(`--- ${g.pn} (${g.uzunluk} karakter) ---`);
  console.log(g.taslak);
  console.log("");
}
console.log("benzerlik (Jaccard):");
for (let i = 0; i < grup.length; i++) {
  for (let j = i + 1; j < grup.length; j++) {
    const o = jaccard(grup[i].taslak, grup[j].taslak);
    console.log(`  ${grup[i].pn} <-> ${grup[j].pn}  %${(o * 100).toFixed(1)}  ${o >= 0.85 ? "<-- HALA YUKSEK" : "tamam"}`);
  }
}
const olcuKacak = grup.filter((g) => /\b\d+([.,]\d+)?\s*mm\b/i.test(g.taslak));
console.log(`\nmetne olcu degeri sizdi mi? ${olcuKacak.length === 0 ? "HAYIR" : "EVET -> " + olcuKacak.map((g) => g.pn).join(", ")}`);
console.log(`\n${degisen} taslak guncellendi -> ${taslakYolu}`);
