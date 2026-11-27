/**
 * Katalogda ÖLÇÜSÜ KAYITLI olan adaylar için AYIRT EDİCİ açıklama varyantı
 * üretir. SALT OKUNUR (yalnızca dosya yazar).
 *
 * Neden gerekli: "Kavrama ayar pulu" adını taşıyan üç ürün (61963-00900 /
 * -01100 / -01200) aynı çizim kalemine bağlıdır. Ölçü yazılmazsa üç ürünün
 * açıklaması %96,6 oranında aynı olur — hem müşteriye hiçbir şey anlatmaz
 * hem de arama motoru için mükerrer içerik üretir.
 *
 * Ölçü değeri ÜRETİCİ KATALOĞUNDAN gelir (fiziksel stok örneğinden DEĞİL).
 * Yine de kullanıcı kararı gerektiği için varsayılan taslak DEĞİŞTİRİLMEZ;
 * varyant ayrı dosyaya yazılır ve onaylanırsa kullanılır.
 *
 * Kullanım: node scripts/faz3-olcu-varyanti.mjs <taslaklar.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , taslakYolu, outArg] = process.argv;
if (!taslakYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-olcu-varyanti.mjs <taslaklar.json> <cikti>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(taslakYolu, "utf-8"));

const olculu = veri.filter((v) => String(v.olcu ?? "").trim());

// Aynı teknik adı paylaşan ürünler — varyantın gerçekten gerekli olduğu yer.
const adSayaci = new Map();
for (const v of veri) {
  const k = v.adTR.toLocaleLowerCase("tr");
  adSayaci.set(k, (adSayaci.get(k) ?? 0) + 1);
}

const satirlar = olculu.map((v) => {
  const ikizVar = (adSayaci.get(v.adTR.toLocaleLowerCase("tr")) ?? 0) > 1;
  const olcu = String(v.olcu).trim();

  // Varyant cümlesi: ölçüyü bir İDDİA olarak değil, KATALOG KAYDI olarak verir.
  const cumle = ikizVar
    ? `Üretici kataloğu bu referansı ${olcu} değeriyle listeler; aynı kalem altında farklı kademeler de bulunur, bu nedenle sipariş öncesinde ihtiyacınız olan kademeyi bize bildirin.`
    : `Üretici kataloğu bu referansı ${olcu} değeriyle listeler.`;

  // Varsayılan taslağın son cümlesi zaten bir "sipariş öncesi" yönlendirmesi
  // olduğu için varyant cümlesi ONDAN ÖNCE eklenir; metin akışı bozulmaz.
  const parcalar = v.taslak.split(/(?<=\.)\s+/);
  const son = parcalar.pop();
  const varyant = [...parcalar, cumle, son].join(" ");

  return {
    partNumber: v.pn,
    teknikAdTR: v.adTR,
    kademe: v.kademe,
    katalogOlcusu: olcu,
    ayniAdliUrunVar: ikizVar ? "EVET" : "hayir",
    varsayilanUzunluk: v.taslak.length,
    varyantUzunluk: varyant.length,
    varsayilanTaslak: v.taslak,
    olculuVaryant: varyant,
  };
});

console.log("=== KATALOG OLCUSU KAYITLI ADAYLAR ===\n");
for (const s of satirlar) {
  console.log(`${s.partNumber}  "${s.teknikAdTR}"  olcu=${s.katalogOlcusu}  ayniAdliIkiz=${s.ayniAdliUrunVar}`);
  console.log(`   varsayilan (${s.varsayilanUzunluk} kr): ${s.varsayilanTaslak.slice(-110)}`);
  console.log(`   VARYANT    (${s.varyantUzunluk} kr): ${s.olculuVaryant.slice(-200)}`);
  console.log("");
}

const COLS = Object.keys(satirlar[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "A5_olcu_karari_bekleyen.csv", "﻿" + csv(satirlar, COLS), "utf8");
console.log(`A5_olcu_karari_bekleyen.csv (${satirlar.length} urun) yazildi -> ${OUT}`);
