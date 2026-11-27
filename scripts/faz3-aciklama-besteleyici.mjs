/**
 * Türkçe teknik açıklama taslaklarını DOĞRULANMIŞ OLGULARDAN besteler.
 * SALT OKUNUR — veritabanına yazmaz, yalnızca dosya üretir.
 *
 * ── TASARIM İLKESİ ──────────────────────────────────────────────────────────
 * Bu bir "şablon doldurucu" DEĞİLDİR. Her cümle, o ürün için GERÇEKTEN kayıtlı
 * olan olgudan kurulur; olgu yoksa cümle de yoktur.
 *
 * UYDURMA YOK: ölçü, malzeme, ağırlık ve fiili üretici hiçbir cümlede geçmez —
 * bunlar henüz doğrulanmadı (kullanıcı kararı).
 *
 * ── ÇEŞİTLİLİK ──────────────────────────────────────────────────────────────
 * İlk sürüm 11 teknik kategoriye göre tek bir yönlendirme cümlesi kuruyordu;
 * denetim 174 çift ≥%85 benzerlik buldu (farklı teknik adlara sahip ürünler
 * bile birbirine benziyordu). Bu sürümde açıklamalar şu ÜRÜNE ÖZGÜ ve
 * DOĞRULANMIŞ alanlarla farklılaşır:
 *   · teknik adın ALT TİPİ (plaka / keçe / dişli / burç / pul / cıvata / …)
 *   · adın konum belirteci (sol / sağ / iç / dış / ön / arka)
 *   · İngilizce teknik ad
 *   · OEM referansı (parça numarasından farklıysa)
 *   · kaynak künyesinin biçimi (çizim mi, katalog bölümü mü)
 *   · doğrulanmış model sayısı ve seri kapsamı
 *
 * Kullanım: node scripts/faz3-aciklama-besteleyici.mjs <tum97.json> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , veriYolu, outArg] = process.argv;
if (!veriYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-aciklama-besteleyici.mjs <tum97.json> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const veri = JSON.parse(readFileSync(veriYolu, "utf-8"));

/** Pilotta elle yazılan 10 ürün — DOKUNULMAZ. */
const PILOT = new Set(["328-9669", "CH 19629", "324-0386", "351-0925", "CH 50A-1864ZI",
  "VOE 12749768", "CH 12119-10", "CH 12119-16", "714-16-19730", "714-12-19710"]);

const tr = (s) => String(s ?? "").trim();
const kucuk = (s) => s.toLocaleLowerCase("tr");
const sade = (x) => String(x ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

function modelleriGrupla(uyumluluk) {
  const g = new Map();
  for (const u of uyumluluk) {
    const marka = tr(u.marka), model = tr(u.model);
    if (!marka || !model) continue;
    const l = g.get(marka);
    if (l) { if (!l.includes(model)) l.push(model); } else g.set(marka, [model]);
  }
  return g;
}
const liste = (arr) => arr.length === 1 ? arr[0]
  : arr.slice(0, -1).join(", ") + " ve " + arr[arr.length - 1];

/**
 * Marka çözümü — GÜVENİLİRLİK SIRASI:
 *   1. `verified=true` uyumluluk satırındaki makine markası (en güvenilir)
 *   2. `Marka İpucu` — "Marka belirlenemedi" gibi YER TUTUCU değilse
 *   3. hiçbiri yoksa "üretici" (marka iddia edilmez)
 */
const YER_TUTUCU = /^(marka belirlenemedi|belirlenemedi|bilinmiyor|yok|-)$/i;
function markaCoz(o) {
  const ipucu = tr(o.markaIpucu);
  return tr(o.uyumluluk[0]?.marka)
    || (ipucu && !YER_TUTUCU.test(ipucu) ? ipucu : "")
    || "üretici";
}

/** Kaynak künyesinden kimlik cümlesi; biçimi kaynağın türüne göre değişir. */
function kimlikCumlesi(o) {
  const kalem = tr(o.kaynakKalem);
  const marka = markaCoz(o);
  /*
   * Adin ilk harfini kucultme — AMA ilk kelime tek harf ya da tamami buyuk
   * harfse DOKUNULMAZ. "F & 1 kademe planet dislisi" adi kucultuldugunde
   * "f ve 1 kademe..." gibi bozuluyordu; F burada ileri vitesi belirten bir
   * isarettir, cumle basi buyuk harfi degil.
   */
  const ilkKelime = o.adTR.split(/\s+/)[0] ?? "";
  const ad = (ilkKelime.length <= 2 || ilkKelime === ilkKelime.toLocaleUpperCase("tr"))
    ? o.adTR
    : kucuk(o.adTR.charAt(0)) + o.adTR.slice(1);
  const kalemNo = kalem.match(/kalem\s+(\d+)/i);
  if (/çizim/i.test(kalem)) {
    const m = kalem.match(/Çizim\s+([^,]+)/i);
    const cizim = m ? m[1].trim() : null;
    if (cizim && kalemNo) {
      return `${o.pn}, ${marka} parça çizimi ${cizim} üzerinde ${kalemNo[1]} numaralı kalem olarak ${ad} şeklinde tanımlanır`;
    }
    if (cizim) return `${o.pn}, ${marka} parça çiziminde (${cizim}) ${ad} olarak tanımlanır`;
  }
  if (/Bölüm|s\.\s*\d/i.test(kalem)) {
    return kalemNo
      ? `${o.pn}, ${marka} parça kataloğunda ${kalemNo[1]} numaralı kalem olarak ${ad} şeklinde tanımlanır`
      : `${o.pn}, ${marka} parça kataloğunda ${ad} olarak tanımlanır`;
  }
  return `${o.pn}, ${marka} parça kaydında ${ad} olarak tanımlanır`;
}

/** Adın konum belirteci varsa ayrıca vurgulanır — karşı taraf ayrı parçadır. */
function konumCumlesi(o) {
  const m = tr(o.adTR).match(/^(Sol|Sağ|İç|Dış|Ön|Arka|Üst|Alt)\b/i);
  if (!m) return null;
  return `Addaki "${kucuk(m[1])}" ibaresi parçanın montajdaki konumunu belirtir; karşı konum için ayrı parça numarası kullanılır`;
}

function yerCumlesi(o) {
  const sistem = tr(o.sistem) || tr(o.kategori);
  if (!sistem) return null;
  if (tr(o.montaj)) return `Parça, ${kucuk(sistem)} grubunun ${kucuk(o.montaj)} bölümünde yer alır`;
  return `Parça, ${kucuk(sistem)} grubuna aittir`;
}

/** OEM referansı parça numarasından FARKLI ise yazılır. */
function oemCumlesi(o) {
  const oem = tr(o.oem);
  if (!oem || sade(oem) === sade(o.pn)) return null;
  return `Kaynakta kayıtlı OEM referansı ${oem}`;
}

function uyumCumlesi(o) {
  const g = modelleriGrupla(o.uyumluluk);
  if (g.size === 0) return null;
  const parcalar = [...g.entries()].map(([marka, modeller]) => `${marka} ${liste(modeller.sort())}`);
  const tekModel = g.size === 1 && [...g.values()][0].length === 1;
  const bas = tekModel
    ? `Katalog uyumluluk kaydına göre ${parcalar[0]} makinesinde kullanılır`
    : `Katalog uyumluluk kaydına göre ${liste(parcalar)} modellerinde kullanılır`;
  const seri = tr(o.seriKapsami);
  if (seri) {
    const temiz = seri.replace(/\s*·\s*(katalog|belge) kapsamı/i, "").trim();
    return `${bas}. Kaynak, kapsamı ${temiz} olarak verir`;
  }
  return bas;
}

/** Birden fazla kaynak çizimi varsa bu ürüne özgü ek cümle. */
function kaynakCesitliligiCumlesi(o) {
  const kaynaklar = [...new Set(o.uyumluluk.map((u) => tr(u.kaynak)).filter(Boolean))];
  if (kaynaklar.length < 2) return null;
  const cizimler = [...new Set(kaynaklar.map((k) => {
    const m = k.match(/([A-Z0-9][A-Z0-9-]{4,})/);
    return m ? m[1] : null;
  }).filter(Boolean))];
  if (cizimler.length < 2) return null;
  return `Aynı uygulama için ${cizimler.length} ayrı montaj çizimi kayıtlıdır (${cizimler.slice(0, 4).join(", ")})`;
}

/** İngilizce teknik ad — her üründe farklı, doğrulanmış alan. */
function ingilizceAdCumlesi(o) {
  const en = tr(o.adEN);
  if (!en) return null;
  if (en.toLowerCase() === tr(o.adTR).toLowerCase()) return null;
  return `Parçanın katalogdaki İngilizce adı "${en}"`;
}

/**
 * ALT TİPE göre yönlendirme — teknik ADDAN türetilir.
 *
 * 11 kategoriye göre seçim, aynı kategorideki onlarca ürüne AYNI cümleyi
 * veriyordu. Teknik ad çok daha ince ayrım sağlar. Cümlelerdeki seçim
 * ölçütleri tanım gereği doğrudur ve ürüne dair İDDİA değil, müşteriden
 * bilgi TALEBİDİR.
 */
const ALT_TIP = [
  [/ayar pulu|şim\b/i, "Ayar pulları boşluk ayarı için kalınlık kademeleri hâlinde üretilir; sipariş öncesinde ölçülen boşluk değerini ve makine modelini bize bildirin"],
  [/(baskı|sürtünme|karşı|uç|ayırıcı)\s*plaka/i, "Debriyaj paketindeki baskı, sürtünme ve karşı plakalar birlikte çalıştığı için sipariş öncesinde paket için ihtiyacınız olan adedi ve makine seri numarasını bize bildirin"],
  [/debriyaj diski|sürtünme diski|fren diski/i, "Debriyaj ve fren diskleri takım hâlinde değiştirildiği için sipariş öncesinde takımdaki adedi ve makine seri numarasını bize bildirin"],
  [/o-?ring/i, "O-ring seçimi ölçüye bağlı olduğundan, sipariş öncesinde bağlantı ölçüsünü veya sökülen parçanın numarasını bize bildirin"],
  [/keçe|conta|sızdırmazlık|d-?ring/i, "Keçe ve conta ölçüsü montaj yerine göre değiştiğinden, sipariş öncesinde silindir konumunu ve varsa silindir üzerindeki numarayı bize bildirin"],
  [/dişli|redüktör|planet|kavrama/i, "Dişliler diş sayısı ve modülüne göre eşleştiği için sipariş öncesinde makine seri numarasını ve mümkünse sökülen dişlinin diş sayısını bize bildirin"],
  [/rulman|yatak|mafsal/i, "Rulman ve yataklar montaj ölçülerine göre seçildiğinden, sipariş öncesinde makine seri numarasını ve montaj konumunu bize bildirin"],
  [/burç/i, "Burçlar montaj ölçülerine göre seçildiğinden, sipariş öncesinde makine seri numarasını ve sökülen burcun ölçüsünü bize bildirin"],
  [/cıvata|saplama|somun|pim|segman|perçin|bağlantı elemanı/i, "Bağlantı elemanları diş ölçüsü ve uzunluğa göre seçildiğinden, sipariş öncesinde montaj konumunu ve ihtiyacınız olan adedi bize bildirin"],
  [/\byay\b|amortisör|gaz yayı/i, "Yay ve amortisörler boy ile bağlantı tipine göre değiştiğinden, sipariş öncesinde makine modelini ve sökülen parçanın boyunu bize bildirin"],
  [/filtre/i, "Filtreler bakım kalemine göre takım hâlinde değiştirildiğinden, sipariş öncesinde makine modelini ve bakım kalemini bize bildirin"],
  [/valf|pompa|silindir|hortum/i, "Hidrolik elemanlar bağlantı tipi ve basınç sınıfına göre değiştiğinden, sipariş öncesinde makine modelini ve bağlantı tipini bize bildirin"],
  [/sensör|şalter|röle|lamba|kablo|soket/i, "Elektrik parçaları besleme gerilimi ve konnektör tipine göre değiştiğinden, sipariş öncesinde makine modelini ve konnektör tipini bize bildirin"],
  [/kapak|muhafaza|kaput|kapı|panel/i, "Kaporta ve muhafaza parçaları montaj konumuna göre farklılaştığından, sipariş öncesinde makine modelini ve montaj konumunu bize bildirin"],
  [/flanş|mil\b|aks\b/i, "Mil ve flanş grubu parçaları bağlantı deliği düzenine göre eşleştiğinden, sipariş öncesinde makine seri numarasını ve montaj konumunu bize bildirin"],
];
const GENEL = "Sipariş öncesinde makine modelinizi ve seri numaranızı bize bildirin; parça numarasını birlikte doğrulayalım";

function yonlendirmeCumlesi(o) {
  for (const [kalip, cumle] of ALT_TIP) if (kalip.test(o.adTR)) return cumle;
  return GENEL;
}

// ── Besteleme ────────────────────────────────────────────────────────────────
const sonuc = [];
for (const o of veri) {
  if (PILOT.has(o.pn)) {
    sonuc.push({ ...o, taslak: null, uzunluk: null, durum: "pilot (elle yazildi, korundu)" });
    continue;
  }
  const cumleler = [
    kimlikCumlesi(o),
    konumCumlesi(o),
    yerCumlesi(o),
    oemCumlesi(o),
    uyumCumlesi(o),
    kaynakCesitliligiCumlesi(o),
    ingilizceAdCumlesi(o),
    yonlendirmeCumlesi(o),
  ].filter(Boolean);
  const taslak = cumleler.join(". ").replace(/\.\.+/g, ".") + ".";
  sonuc.push({
    ...o, taslak, uzunluk: taslak.length,
    kullanilanCumle: cumleler.length,
    durum: taslak.length >= 300 ? "hazir" : "300 ALTINDA",
  });
}

const yazilan = sonuc.filter((s) => s.taslak);
const uz = yazilan.map((s) => s.uzunluk).sort((a, b) => a - b);
console.log(`bestelenen taslak : ${yazilan.length}`);
console.log(`pilot (korunan)   : ${sonuc.length - yazilan.length}`);
console.log(`uzunluk: min=${uz[0]} medyan=${uz[Math.floor(uz.length / 2)]} max=${uz[uz.length - 1]}`);
console.log(`>=300 olan : ${uz.filter((x) => x >= 300).length}/${yazilan.length}`);
console.log(`<300 olan  : ${uz.filter((x) => x < 300).length}/${yazilan.length}`);
const cs = new Map();
for (const s of yazilan) cs.set(s.kullanilanCumle, (cs.get(s.kullanilanCumle) ?? 0) + 1);
console.log(`cumle sayisi dagilimi: ${[...cs.entries()].sort().map(([k, v]) => `${k} cumle: ${v}`).join(" · ")}`);

writeFileSync(OUT + "60_taslaklar_87.json", JSON.stringify(sonuc, null, 1), "utf8");
const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "61_taslaklar_87.csv", "﻿" + csv(
  yazilan.map((s) => ({
    partNumber: s.pn, logoKodu: s.logo, teknikAdTR: s.adTR, teknikAdEN: s.adEN,
    kategori: s.kategori, uzunluk: s.uzunluk, cumleSayisi: s.kullanilanCumle,
    durum: s.durum, taslak: s.taslak, kaynakKalem: s.kaynakKalem,
    kesinUyumSayisi: s.uyumluluk.length, seriKapsami: s.seriKapsami,
    montajYeri: s.montaj || "(kayitli degil)",
  })),
  ["partNumber","logoKodu","teknikAdTR","teknikAdEN","kategori","uzunluk","cumleSayisi","durum","taslak","kaynakKalem","kesinUyumSayisi","seriKapsami","montajYeri"]
), "utf8");
console.log(`\n60_taslaklar_87.json ve 61_taslaklar_87.csv yazildi -> ${OUT}`);
