/**
 * 284 yeni ürün için TEKNİK AÇIKLAMA besteleyicisi.
 *
 * ── KAYNAK ────────────────────────────────────────────────────────────────
 * Yalnızca v18'de KAYITLI alanlar kullanılır:
 *   Teknik Ad TR · Sistem · Montaj Yeri · Makine Markası · Seri ·
 *   Seri Numarası Kapsamı · Sayfa / Çizim / Kalem · Kaynak Kimliği
 * Hiçbir ölçü, malzeme, üretici markası veya temin niteliği UYDURULMAZ.
 *
 * ── UYUMLULUK DİLİ ────────────────────────────────────────────────────────
 * v18'de uyum kanıtı üç düzeydedir. Metin, kanıt düzeyinden FAZLASINI
 * iddia etmez:
 *   · "Kesin doğrulandı"  -> makine modeli doğrudan yazılır.
 *   · "Güçlü eşleşme"     -> makineye uygunluk İDDİA EDİLMEZ; yalnızca
 *                            parçanın HANGİ KATALOGDA, hangi grup/sayfa/
 *                            kalem konumunda kayıtlı olduğu yazılır. Bu,
 *                            kaynak belge hakkında doğrulanabilir bir
 *                            olgudur, uyumluluk garantisi değildir.
 *   · "Olası eşleşme" / "Çelişkili" -> METİN ÜRETİLMEZ.
 *
 * ── ŞABLON DENETİMİ ───────────────────────────────────────────────────────
 * Her metin, aynı katalog sayfasındaki KOMŞU kalemlere atıfla
 * bireyselleştirilir (Grup 1-5'te kullanılan yöntem). Üretilen metinler
 * ikişerli benzerlik denetiminden geçer; TAVAN'ı aşan metin YAZILMAZ.
 *
 * ÇIKTI: scripts/veri/v18-aciklama-<n>.json  (aciklama-yaz-db.mjs girdisi)
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

/**
 * ŞABLON TAVANI — ölçümle belirlendi, keyfi değil.
 *
 * Kullanıcının ONAYLADIĞI 42 elle yazılmış açıklamanın ikişerli bigram
 * benzerliği ölçüldü: medyan %53, EN YÜKSEK %85 (CH 12119-10 ↔ CH 12119-16;
 * aynı çizim kaleminde, yalnızca kalınlığı farklı iki pul). Yani %85'e kadar
 * benzerlik kullanıcı tarafından kabul edilmiş durumda.
 *
 * Tavan bunun ALTINA, %80'e çekildi: onaylanmış en yüksek değerden düşük,
 * medyanın üstünde. Aynı iskeleti paylaşıp yalnızca parça numarası değişen
 * metinler (%100'e yakın) bu tavanı geçemez.
 */
const TAVAN = 0.80;
const S = (r, c) => String(r[c] ?? "").trim();
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const UY = sh("Makine Uyumluluğu");
const WK = sh("Web Katalog Adayları");

const yeni = new Set(
  JSON.parse(readFileSync("scripts/veri/geri-donus/v18-284/olusan.json", "utf-8")).partNumbers
);
/** Ad ayrıştırmasından sonra DB'deki güncel adlar. */
const adPlani = new Map(
  JSON.parse(readFileSync("scripts/veri/ad-ayristirma-plani.json", "utf-8"))
    .plan.map((p) => [p.partNumber, p.yeniAd])
);

const wkByPn = new Map();
for (const r of WK) {
  const pn = S(r, "Katalog Referansı");
  if (yeni.has(pn) && !wkByPn.has(pn)) wkByPn.set(pn, r);
}

/** Tüm uyumluluk satırları — komşu kalem bulmak için 284 ile sınırlı DEĞİL. */
const uyByPn = new Map();
const sayfaDizini = new Map(); // "kaynak|grup|sayfa" -> [{pn, kalem, ad}]
const sayfaAyristir = (s) => {
  const grup = /Grup\s*([0-9A-Za-z.\-]+)/i.exec(s)?.[1] ?? "";
  const sayfa = /s\.\s*([0-9]+)/i.exec(s)?.[1] ?? "";
  const kalem = /kalem\s*([0-9]+)/i.exec(s)?.[1] ?? "";
  return { grup, sayfa, kalem };
};
const adByPnTum = new Map();
for (const r of WK) {
  const pn = S(r, "Katalog Referansı");
  if (pn && !adByPnTum.has(pn)) adByPnTum.set(pn, S(r, "Teknik Ad TR"));
}
for (const r of UY) {
  const pn = S(r, "Katalog Referansı");
  if (!pn) continue;
  if (yeni.has(pn)) {
    if (!uyByPn.has(pn)) uyByPn.set(pn, []);
    uyByPn.get(pn).push(r);
  }
  const ref = S(r, "Sayfa / Çizim / Kalem");
  const { grup, sayfa, kalem } = sayfaAyristir(ref);
  if (!sayfa || !kalem) continue;
  const anahtar = S(r, "Kaynak Kimliği") + "|" + grup + "|" + sayfa;
  if (!sayfaDizini.has(anahtar)) sayfaDizini.set(anahtar, new Map());
  sayfaDizini.get(anahtar).set(pn, { pn, kalem: Number(kalem), ad: adByPnTum.get(pn) ?? "" });
}

const kucuk = (s) => s.charAt(0).toLocaleLowerCase("tr-TR") + s.slice(1);

/** "<söz>dür/dır/dir/dur" — Türkçe ünlü uyumu ve ünsüz yumuşaması. */
function dir(soz) {
  const t = soz.trim();
  const unluler = [...t.toLocaleLowerCase("tr-TR")].filter((c) => "aeıioöuü".includes(c));
  const son = unluler[unluler.length - 1] ?? "e";
  const ek = "aı".includes(son) ? "dır" : "ei".includes(son) ? "dir"
           : "ou".includes(son) ? "dur" : "dür";
  const sert = "fstkçşhp".includes(t.slice(-1).toLocaleLowerCase("tr-TR"));
  return t + (sert ? ek.replace(/^d/, "t") : ek);
}
/** "güç aktarımı" -> "güç aktarımı grubuna ait"; "... grubu" -> "... grubuna ait" */
function grupIfadesi(sistem) {
  const k = kucuk(sistem.trim());
  return /grubu$/i.test(k) ? k + "na ait" : k + " grubuna ait";
}
const KATALOG_ADI = {
  Volvo: "Volvo CE yedek parça kataloğu",
  Champion: "Champion greyder yedek parça kataloğu",
  Komatsu: "Komatsu yedek parça kataloğu",
  JCB: "JCB yedek parça kataloğu",
  Doosan: "Doosan yedek parça kataloğu",
  Mitsubishi: "Mitsubishi yedek parça kataloğu",
  HİDROMEK: "HİDROMEK yedek parça kataloğu",
  Hidromek: "HİDROMEK yedek parça kataloğu",
};

const uretilen = [];
const atlanan = [];

for (const [pn, satirlar] of uyByPn) {
  const wkr = wkByPn.get(pn);
  const ad = adPlani.get(pn) ?? S(wkr, "Teknik Ad TR");
  const kanitlar = new Set(satirlar.map((r) => S(r, "Uyum Kanıtı")));
  if (kanitlar.has("Çelişkili")) { atlanan.push([pn, "celiskili kayit"]); continue; }
  const kesin = kanitlar.has("Kesin doğrulandı");
  const guclu = kanitlar.has("Güçlü eşleşme");
  if (!kesin && !guclu) { atlanan.push([pn, "yalnizca olasi eslesme"]); continue; }

  // En iyi satır: kesin varsa o, yoksa güçlü; içlerinden en çok alanı dolu olan
  const aday = satirlar.filter((r) => S(r, "Uyum Kanıtı") === (kesin ? "Kesin doğrulandı" : "Güçlü eşleşme"));
  const puan = (r) => ["Sistem", "Montaj Yeri", "Seri", "Makine Modeli", "Seri Numarası Kapsamı"]
    .reduce((t, c) => t + (S(r, c) ? 1 : 0), 0);
  const r = aday.sort((a, b) => puan(b) - puan(a))[0];

  const marka = S(r, "Makine Markası");
  const katalog = KATALOG_ADI[marka] ?? (marka ? marka + " yedek parça kataloğu" : "üretici yedek parça kataloğu");
  const seri = S(r, "Seri");
  const model = S(r, "Makine Modeli");
  const sistem = S(r, "Sistem");
  const montaj = S(r, "Montaj Yeri");
  const kapsam = S(r, "Seri Numarası Kapsamı");
  const ref = S(r, "Sayfa / Çizim / Kalem");
  const { grup, sayfa, kalem } = sayfaAyristir(ref);
  if (!ref) { atlanan.push([pn, "katalog referansi yok"]); continue; }
  if (!sayfa || !kalem) { atlanan.push([pn, "eksik katalog koordinati"]); continue; }

  // ── Komşu kalemler: aynı kaynak + grup + sayfa, farklı kalem ────────────
  const anahtar = S(r, "Kaynak Kimliği") + "|" + grup + "|" + sayfa;
  const komsular = [...(sayfaDizini.get(anahtar)?.values() ?? [])]
    .filter((k) => k.pn !== pn && k.ad && Number.isFinite(k.kalem))
    .sort((a, b) => Math.abs(a.kalem - Number(kalem)) - Math.abs(b.kalem - Number(kalem)))
    .slice(0, 2);

  const c = [];
  // 1. cümle — parça ve konumu
  if (kesin && model) {
    c.push(ad + ", " + marka + " " + model + " için " +
      (sistem ? grupIfadesi(sistem).replace(/ ait$/, "nda") + " " : "") + "kayıtlı parçadır.");
  } else {
    c.push(ad + (sistem ? ", " + grupIfadesi(sistem) + " bir parçadır." : "."));
  }
  // 2. cümle — katalog koordinatı (her üründe farklı)
  const konum = [grup && "Grup " + grup, sayfa && "sayfa " + sayfa, kalem && kalem + ". kalem"]
    .filter(Boolean).join(", ");
  c.push(pn + " numarası " + (seri && !kesin ? marka + " " + seri + " serisi " : "") +
    katalog + "nda" + (konum ? " " + konum + " konumunda" : "") + " kayıtlıdır" +
    (montaj ? "; montaj yeri " + dir(kucuk(montaj)) + "." : "."));
  // 3. cümle — komşu kalemler (bireyselleştirir)
  if (komsular.length) {
    c.push("Aynı sayfada " + komsular.map((k) =>
      k.kalem + ". kalem " + k.pn + " " + kucuk(k.ad)).join(", ") + " yer alır.");
  }
  // 4. cümle — seri numarası kapsamı
  if (kapsam) {
    // "35000 ve üzeri · katalog kapsamı" gibi kuyrukları at.
    const temiz = kapsam.split("·")[0].trim();
    if (temiz) c.push("Katalog kapsamı " + temiz + " seri numaralarıdır.");
  }
  // 5. cümle — sipariş
  c.push("Sipariş " + pn + " numarasıyla verilir.");

  const metin = c.join(" ").replace(/\s+/g, " ").trim();
  if (metin.length < 150) { atlanan.push([pn, "metin cok kisa (" + metin.length + ")"]); continue; }
  uretilen.push({
    partNumber: pn, ad, marka, kanit: kesin ? "kesin" : "guclu",
    oncelik: /volvo|champion/i.test(marka + " " + S(wkr, "Marka İpucu")) ? 1 : 2,
    beklenenKarakter: metin.length, longDescription: metin,
  });
}

console.log("uretilen: " + uretilen.length + " | atlanan: " + atlanan.length);
const atlamaSay = new Map();
for (const [, n] of atlanan) atlamaSay.set(n, (atlamaSay.get(n) ?? 0) + 1);
for (const [n, v] of atlamaSay) console.log("  atlama nedeni: " + n + " -> " + v);

// ── Şablon denetimi ───────────────────────────────────────────────────────
function oran(a, b) {
  // Basit, deterministik bigram benzerliği (difflib yerine).
  const bg = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) ?? 0) + 1); } return m; };
  const A = bg(a), B = bg(b);
  let ortak = 0, toplam = 0;
  for (const [k, v] of A) { ortak += Math.min(v, B.get(k) ?? 0); toplam += v; }
  for (const v of B.values()) toplam += v;
  return toplam ? (2 * ortak) / toplam : 0;
}
uretilen.sort((a, b) => a.oncelik - b.oncelik || a.partNumber.localeCompare(b.partNumber));
const kabul = [];
const reddedilen = [];
for (const u of uretilen) {
  let enYuksek = 0, es = null;
  for (const k of kabul) {
    const o = oran(u.longDescription, k.longDescription);
    if (o > enYuksek) { enYuksek = o; es = k.partNumber; }
  }
  if (enYuksek > TAVAN) { reddedilen.push({ ...u, benzerlik: enYuksek, es }); }
  else kabul.push(u);
}
console.log("\nsablon denetimi (tavan %" + TAVAN * 100 + "):");
console.log("  KABUL  : " + kabul.length);
console.log("  REDDET : " + reddedilen.length + " (bir baska metne cok benziyor -> yazilmaz)");
console.log("  kabul edilenlerin " + kabul.filter((k) => k.oncelik === 1).length + " tanesi Volvo/Champion");
console.log("  kanit: kesin " + kabul.filter((k) => k.kanit === "kesin").length +
  " | guclu " + kabul.filter((k) => k.kanit === "guclu").length);

for (const k of kabul) {
  const t = k.longDescription;
  if (/grubu grubuna|grubu grubunda/.test(t)) { console.error("DURDURULDU: dilbilgisi hatasi -> " + k.partNumber); process.exit(1); }
  if (/tir\.|tır\.|sitir|sıtır/.test(t)) { console.error("DURDURULDU: ek hatasi -> " + k.partNumber); process.exit(1); }
  if (!t.includes(k.partNumber)) { console.error("DURDURULDU: parca numarasi yok -> " + k.partNumber); process.exit(1); }
  if (/OEM|orijinal|muadil|yan sanayi|aftermarket/i.test(t)) { console.error("DURDURULDU: temin niteligi iddiasi -> " + k.partNumber); process.exit(1); }
  if (/stokta|teslimat|gun icinde|garanti/i.test(t)) { console.error("DURDURULDU: stok/teslimat iddiasi -> " + k.partNumber); process.exit(1); }
}
console.log("kalite saglamalari: TAMAM (dilbilgisi, parca no, temin niteligi, stok iddiasi)");

const cikti = kabul.map((k) => ({
  partNumber: k.partNumber, ad: k.ad,
  beklenenKarakter: k.beklenenKarakter, longDescription: k.longDescription,
}));
writeFileSync("scripts/veri/v18-aciklama-" + cikti.length + ".json", JSON.stringify(cikti, null, 1), "utf-8");
writeFileSync("scripts/veri/v18-aciklama-reddedilen.json", JSON.stringify(reddedilen, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/v18-aciklama-" + cikti.length + ".json");
console.log("\n=== ORNEK 6 METIN");
for (const k of kabul.slice(0, 6)) console.log("  " + k.partNumber + " (" + k.beklenenKarakter + " kr)\n    " + k.longDescription);
