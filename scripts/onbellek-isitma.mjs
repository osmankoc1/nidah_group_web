#!/usr/bin/env node
/**
 * KONTROLLÜ ÖNBELLEK ISITMA (cache warming)
 * ============================================================================
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────────
 * Ürün ve blog yazı sayfaları "istek üzerine ISR" ile üretilir: bir sayfanın
 * İLK isteği render edilir (ve Neon'a iner), sonraki bütün istekler CDN'den
 * karşılanır (`x-vercel-cache: HIT`, Neon'a inmez).
 *
 * Bu, normal trafikte doğru davranıştır. Ama 5.000–50.000 ürün YAYINLANDIĞI
 * anda tehlikeli bir yan etkisi olur: Google bu sayfaları günlere/haftalara
 * yayarak tarar. Her ilk render Neon compute'unu uyandırır ve 5 dakikalık
 * boşta-kalma sayacını sıfırlar. Tarama penceresi 5 dakikadan sık istek
 * üretirse compute HİÇ UYUMAZ ve ücretsiz paketin 100 CU-saatlik kotası
 * günler içinde tükenir.
 *
 * Çözüm: yayından hemen sonra, KONTROLLÜ ve DAR bir pencerede sayfaları bir
 * kez ısıtmak. Böylece Google taramaya başladığında her sayfa zaten CDN'de
 * olur ve tarama Neon'a hiç inmez.
 *
 * ── TEMEL TASARIM KARARI: SITEMAP TEK OTORİTEDİR ────────────────────────────
 * Script veritabanına BAĞLANMAZ. URL listesini `/sitemap.xml`'den okur, çünkü
 * sitemap zaten iki kapıdan geçmiş URL'leri içerir:
 *   1. Admin sayfa toggle'ı açık (kapalı sayfa gerçek 404 döner, sitemap'e
 *      girmez — bkz. proje CLAUDE.md §3)
 *   2. Ürün için `seo_ready = true` (insan onayı verilmiş içerik)
 * Yani ısıtılan küme ile Google'a bildirilen küme BİREBİR aynıdır. Kendi
 * sorgumuzu yazsaydık bu iki kapı sessizce ayrışabilirdi.
 *
 * ── ÇOK DİLLİLİK (ölçülmüş durum, 2026-11-25) ───────────────────────────────
 * `src/lib/product-url.ts` ürün başına TEK yol üretir (`/parca-katalog/<seg>`);
 * ürünlerin yerel ayar varyantı YOKTUR. Çoklayan tek yüzey blogdur ve blog
 * çevirilerinin slug'ları TR slug'ından TÜRETİLEMEZ (`blogPostTranslations`
 * kendi slug'ını taşır) — bu yüzden dil varyantları uydurulmaz, sitemap'ten
 * okunur. `--diller` yalnızca SÜZGEÇtir. Ürünler ileride dil önekli URL
 * kazanırsa sitemap'e girer girmez bu script onları kendiliğinden kapsar.
 *
 * ── GÜVENLİK SINIRLARI ──────────────────────────────────────────────────────
 * Dört bağımsız tavan vardır ve hangisi önce dolarsa çalışma TEMİZ biter
 * (durum dosyası yazılır, `--devam` ile kaldığı yerden sürer):
 *   --max-istek       toplam istek sayısı
 *   --max-sure-dk     duvar saati süresi
 *   --max-cu-saat     TAHMİNİ Neon tüketimi (aşağıdaki modele göre)
 *   --max-hata-orani  başarısız/gönderilen oranı (varsayılan %2)
 *
 * ── ÖLÇÜLEN VERİM (2026-11-25, yerel `next start`, 145 ürün sayfası) ────────
 * Eşzamanlılık · verim · ort yanıt · yanlış 404
 *      1       · 19,4 istek/sn ·  51 ms ·  0/145
 *      3       · 18,3 istek/sn · 162 ms ·  1/145
 *      6       · 21,5 istek/sn · 274 ms · 11/145
 *
 * İKİ SONUÇ:
 * 1. Verim ~20 istek/sn'de DOYUYOR. Eşzamanlılığı artırmak işi hızlandırmaz,
 *    yalnızca gecikmeyi ve hata oranını büyütür. Darboğaz tek Node süreci.
 * 2. Yüksek eşzamanlılıkta `site_settings` okuması düşüyor ve fail-closed
 *    AÇIK sayfaları 404 yapıyor. Varsayılan eşzamanlılık bu yüzden 2'dir.
 *
 * İlk ısıtmada sayfa başına ~5,7 veritabanı sorgusu ölçüldü (826 sorgu /
 * 145 sayfa). İkinci koşuda 145 sayfa için 4–20 sorgu, yani sayfa başına
 * ~0: ısıtma işini yapıyor.
 *
 * ── CU-SAAT MODELİ (tahmin, ölçüm değil) ────────────────────────────────────
 * Neon CU-saat = compute boyutu (CU) × UYANIK geçen süre. Isıtma sırasında
 * compute kesintisiz uyanık kabul edilir, artı bitişten sonra 5 dakikalık
 * boşta-kalma penceresi:
 *
 *     CU-saat ≈ (geçen_dakika + 5) / 60 × CU
 *
 * Projede min 0.25 CU / max 2 CU autoscaling vardır. Script bu yüzden İKİ
 * sayı üretir: iyimser (0.25 CU) ve kötümser (2 CU). `--max-cu-saat`
 * KÖTÜMSER değere göre uygulanır — tavan, en kötü senaryoyu kesmelidir.
 * Bu bir MODELdir; gerçek tüketim yalnızca Neon konsolundan okunabilir.
 *
 * ── KULLANIM ────────────────────────────────────────────────────────────────
 *   # 1) Önce DAİMA prova (hiç istek göndermez, planı ve tahmini yazar)
 *   node scripts/onbellek-isitma.mjs --taban https://ornek --prova
 *
 *   # 2) Gerçek çalışma
 *   node scripts/onbellek-isitma.mjs --taban https://ornek --eszamanlilik 3
 *
 *   # 3) Yarıda kaldıysa
 *   node scripts/onbellek-isitma.mjs --taban https://ornek --devam
 *
 * Production'da toplu ısıtma AYRI ONAY gerektirir (OSKO CLAUDE.md §2).
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

// ── Ayarlar ─────────────────────────────────────────────────────────────────

const { values: ham } = parseArgs({
  options: {
    taban:               { type: "string" },
    kaynak:              { type: "string", default: "sitemap" }, // sitemap | dosya
    dosya:               { type: "string" },
    suzgec:              { type: "string", default: "urun-blog" }, // urun | blog | urun-blog | tumu
    diller:              { type: "string", default: "tr,en,ru,ar" },
    // ÖLÇÜLDÜ (2026-11-25, yerel `next start`, 145 ürün sayfası):
    // verim eşzamanlılık 1/3/6'da sırasıyla 19,4 / 18,3 / 21,5 istek/sn —
    // yani verim DOYMUŞ durumdadır, eşzamanlılığı artırmak yalnızca gecikmeyi
    // ve HATA oranını büyütür. Aynı ölçümde eşzamanlılık 6'da 145 sayfanın
    // 11'i YANLIŞ 404 döndü: yük altında `site_settings` okuması düştü ve
    // fail-closed devreye girdi (logda 41 kez "ayarlar okunamadı"), 1'de
    // sıfır. Bu yüzden varsayılan EN GÜVENLİ değerde tutulur: 1.
    // (Kullanıcı kararı 2026-11-26: eşzamanlılık 1 ölçümlerde tek güvenilir
    // değer, verim farkı anlamlı değil — 19,4 vs 21,5 istek/sn.)
    eszamanlilik:        { type: "string", default: "1" },
    "istek-araligi-ms":  { type: "string", default: "200" },
    "zaman-asimi-ms":    { type: "string", default: "30000" },
    prova:               { type: "boolean", default: false },
    devam:               { type: "boolean", default: false },
    durum:               { type: "string", default: ".onbellek-isitma/durum.json" },
    rapor:               { type: "string", default: ".onbellek-isitma/rapor" },
    "max-istek":         { type: "string", default: "60000" },
    "max-sure-dk":       { type: "string", default: "90" },
    "max-cu-saat":       { type: "string", default: "1.5" },
    "yeniden-isitma-saat": { type: "string", default: "24" },
    "max-hata-orani":    { type: "string", default: "0.02" },
    "en-az-ornek":       { type: "string", default: "25" },
    "cu-min":            { type: "string", default: "0.25" },
    "cu-max":            { type: "string", default: "2" },
    "bos-kalma-dk":      { type: "string", default: "5" },
    yontem:              { type: "string", default: "GET" }, // GET | HEAD
    sessiz:              { type: "boolean", default: false },
  },
});

const AYAR = {
  taban:            (ham.taban ?? "").replace(/\/+$/, ""),
  kaynak:           ham.kaynak,
  dosya:            ham.dosya,
  suzgec:           ham.suzgec,
  diller:           new Set(ham.diller.split(",").map((d) => d.trim()).filter(Boolean)),
  eszamanlilik:     Math.max(1, Math.min(16, Number(ham.eszamanlilik) || 1)),
  istekAraligiMs:   Math.max(0, Number(ham["istek-araligi-ms"]) || 0),
  zamanAsimiMs:     Math.max(1000, Number(ham["zaman-asimi-ms"]) || 30000),
  prova:            ham.prova,
  devam:            ham.devam,
  durumYolu:        ham.durum,
  raporOnEk:        ham.rapor,
  maxIstek:         Math.max(1, Number(ham["max-istek"]) || 1),
  maxSureMs:        Math.max(1, Number(ham["max-sure-dk"]) || 1) * 60_000,
  maxCuSaat:        Math.max(0.01, Number(ham["max-cu-saat"]) || 0.01),
  yenidenIsitmaMs:  Math.max(0, Number(ham["yeniden-isitma-saat"]) || 0) * 3_600_000,
  maxHataOrani:     Math.max(0, Math.min(1, Number(ham["max-hata-orani"]) ?? 0.02)),
  enAzOrnek:        Math.max(1, Number(ham["en-az-ornek"]) || 25),
  cuMin:            Number(ham["cu-min"]) || 0.25,
  cuMax:            Number(ham["cu-max"]) || 2,
  bosKalmaDk:       Number(ham["bos-kalma-dk"]) || 5,
  yontem:           ham.yontem.toUpperCase() === "HEAD" ? "HEAD" : "GET",
  sessiz:           ham.sessiz,
};

if (!AYAR.taban) {
  console.error("HATA: --taban zorunlu (örn. --taban https://ornek.com)");
  process.exit(2);
}
if (!/^https?:\/\//.test(AYAR.taban)) {
  console.error("HATA: --taban http(s) ile başlamalı.");
  process.exit(2);
}

const yaz = (...a) => { if (!AYAR.sessiz) console.log(...a); };

// ── CU-saat modeli ──────────────────────────────────────────────────────────

/** Geçen süreden TAHMİNİ CU-saat. Bitişten sonraki boşta-kalma penceresi dahil. */
function cuSaatTahmini(gecenMs, cu) {
  const dk = gecenMs / 60_000 + AYAR.bosKalmaDk;
  return (dk / 60) * cu;
}

// ── Durum dosyası ───────────────────────────────────────────────────────────

function durumYukle() {
  const bos = { taban: AYAR.taban, baslatma: null, tamamlanan: {} };
  if (!AYAR.devam) return bos;
  try {
    const d = JSON.parse(fs.readFileSync(AYAR.durumYolu, "utf8"));
    if (d.taban !== AYAR.taban) {
      console.error(
        `HATA: durum dosyası farklı bir tabana ait (${d.taban}). ` +
        "Yanlış ortamı ısıtmayı önlemek için çıkılıyor. " +
        "Yeni bir --durum yolu ver veya --devam'ı kaldır."
      );
      process.exit(2);
    }
    return { ...bos, ...d, tamamlanan: d.tamamlanan ?? {} };
  } catch (e) {
    if (e.code === "ENOENT") {
      yaz("· Durum dosyası yok, sıfırdan başlanıyor.");
      return bos;
    }
    throw e;
  }
}

function durumKaydet(durum) {
  if (AYAR.prova) return;
  fs.mkdirSync(path.dirname(AYAR.durumYolu), { recursive: true });
  fs.writeFileSync(AYAR.durumYolu, JSON.stringify(durum, null, 2), "utf8");
}

// ── URL kaynağı ─────────────────────────────────────────────────────────────

async function sitemapUrlleri() {
  const u = `${AYAR.taban}/sitemap.xml`;
  const y = await fetch(u, { headers: { "user-agent": ISITMA_AJANI } });
  if (!y.ok) throw new Error(`sitemap okunamadı: ${u} → HTTP ${y.status}`);
  const xml = await y.text();
  const bulunan = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  // Sitemap görsel URL'leri de taşır (<image:loc>); <loc> dışındakiler alınmaz.
  return [...new Set(bulunan)];
}

function dosyaUrlleri() {
  if (!AYAR.dosya) throw new Error("--kaynak dosya ile birlikte --dosya zorunlu.");
  return [...new Set(
    fs.readFileSync(AYAR.dosya, "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"))
  )];
}

/** Yoldan yerel ayarı çıkarır. Ürün yolları ve TR blog "tr" sayılır. */
function dilBelirle(yol) {
  const m = yol.match(/^\/blog\/(en|ru|ar)(\/|$)/);
  return m ? m[1] : "tr";
}

function turBelirle(yol) {
  if (/^\/parca-katalog\/[^/]+$/.test(yol)) return "urun";
  if (/^\/blog\/(?:en\/|ru\/|ar\/)?[^/]+$/.test(yol) &&
      !/^\/blog\/(?:en|ru|ar)$/.test(yol) &&
      !/^\/blog\/(kategori|etiket|category|tag)\//.test(yol)) return "blog";
  return "diger";
}

function suzgecGecer(tur) {
  switch (AYAR.suzgec) {
    case "urun":      return tur === "urun";
    case "blog":      return tur === "blog";
    case "urun-blog": return tur === "urun" || tur === "blog";
    case "tumu":      return true;
    default:          return tur === "urun" || tur === "blog";
  }
}

const ISITMA_AJANI = "nidah-cache-warmer/1.0 (+kontrollu onbellek isitma)";

// ── Tek URL ısıtma ──────────────────────────────────────────────────────────

const GECICI_DURUMLAR = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);

async function urlIsit(url, denemeler = 3) {
  let sonHata = null;
  for (let deneme = 1; deneme <= denemeler; deneme++) {
    const t0 = Date.now();
    const iptal = AbortSignal.timeout(AYAR.zamanAsimiMs);
    try {
      const y = await fetch(url, {
        method: AYAR.yontem,
        redirect: "manual",
        signal: iptal,
        headers: { "user-agent": ISITMA_AJANI, "accept-encoding": "gzip" },
      });
      // Gövde okunmazsa bağlantı açık kalabilir; ISR yazması gövdeyi
      // üretmeyi gerektirir, bu yüzden gövde SONUNA KADAR tüketilir.
      if (AYAR.yontem === "GET") await y.arrayBuffer();
      const sure = Date.now() - t0;
      const onbellek =
        y.headers.get("x-vercel-cache") ??
        y.headers.get("x-nextjs-cache") ??
        "-";

      if (y.status === 429 || (y.status >= 500 && GECICI_DURUMLAR.has(y.status))) {
        const retryAfter = Number(y.headers.get("retry-after"));
        const bekle = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30_000, 1000 * 2 ** (deneme - 1));
        sonHata = `HTTP ${y.status}`;
        if (deneme < denemeler) {
          await uyu(bekle);
          continue;
        }
        return { durum: "basarisiz", kod: y.status, sure, onbellek, hata: sonHata, deneme };
      }

      return {
        durum: y.status >= 200 && y.status < 400 ? "basarili" : "basarisiz",
        kod: y.status,
        sure,
        onbellek,
        hata: y.status >= 400 ? `HTTP ${y.status}` : null,
        deneme,
      };
    } catch (e) {
      // Hata MESAJI loglanmaz (bağlantı adresi sızabilir) — yalnızca adı.
      sonHata = e?.name ?? "Hata";
      if (deneme < denemeler) {
        await uyu(Math.min(30_000, 1000 * 2 ** (deneme - 1)));
        continue;
      }
      return { durum: "basarisiz", kod: 0, sure: Date.now() - t0, onbellek: "-", hata: sonHata, deneme };
    }
  }
  return { durum: "basarisiz", kod: 0, sure: 0, onbellek: "-", hata: sonHata ?? "bilinmiyor", deneme: denemeler };
}

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Ana akış ────────────────────────────────────────────────────────────────

async function main() {
  const baslangic = Date.now();
  const durum = durumYukle();
  durum.baslatma ??= new Date().toISOString();

  yaz("── KONTROLLÜ ÖNBELLEK ISITMA ──────────────────────────────────────────");
  yaz(`  taban        : ${AYAR.taban}`);
  yaz(`  kaynak       : ${AYAR.kaynak}${AYAR.dosya ? ` (${AYAR.dosya})` : ""}`);
  yaz(`  süzgeç       : ${AYAR.suzgec}   diller: ${[...AYAR.diller].join(",")}`);
  yaz(`  eşzamanlılık : ${AYAR.eszamanlilik}   aralık: ${AYAR.istekAraligiMs}ms   yöntem: ${AYAR.yontem}`);
  yaz(`  tavanlar     : ${AYAR.maxIstek} istek · ${AYAR.maxSureMs / 60000} dk · ${AYAR.maxCuSaat} CU-saat (kötümser)`);
  yaz(`  kip          : ${AYAR.prova ? "PROVA (istek gönderilmez)" : "GERÇEK"}${AYAR.devam ? " · devam" : ""}`);
  yaz("");

  // 1) URL listesi
  const hamUrller = AYAR.kaynak === "dosya" ? dosyaUrlleri() : await sitemapUrlleri();
  yaz(`· Kaynaktan ${hamUrller.length} URL okundu.`);

  // 2) Süzme
  const sayac = { tur: {}, dil: {} };
  const aday = [];
  let tabanDisi = 0;
  for (const u of hamUrller) {
    let yol;
    if (u.startsWith("/")) {
      // Düz yol (`--kaynak dosya` listeleri böyle yazılabilir) — doğrudan
      // `--taban`a bağlanır.
      yol = u.split("#")[0];
    } else {
      try {
        const url = new URL(u);
        if (`${url.protocol}//${url.host}` !== AYAR.taban.replace(/^(https?:\/\/[^/]+).*$/, "$1")) {
          // Farklı host — sitemap production host'unu taşır, yerelde ısıtırken
          // yol KORUNUR ve --taban'a yeniden bağlanır.
          tabanDisi++;
        }
        yol = url.pathname;
      } catch { continue; }
    }

    const tur = turBelirle(yol);
    const dil = dilBelirle(yol);
    sayac.tur[tur] = (sayac.tur[tur] ?? 0) + 1;
    if (!suzgecGecer(tur)) continue;
    if (!AYAR.diller.has(dil)) continue;
    sayac.dil[dil] = (sayac.dil[dil] ?? 0) + 1;
    aday.push({ yol, tur, dil, url: `${AYAR.taban}${yol}` });
  }
  if (tabanDisi > 0) {
    yaz(`· ${tabanDisi} URL kaynakta farklı host taşıyordu; yol korunup --taban'a bağlandı.`);
  }
  yaz(`· Tür dağılımı (süzgeçten önce): ${JSON.stringify(sayac.tur)}`);
  yaz(`· Süzgeçten geçen: ${aday.length}   dil dağılımı: ${JSON.stringify(sayac.dil)}`);

  // 3) Gereksiz yeniden ısıtmayı engelle
  const simdi = Date.now();
  const sira = [];
  let atlananTaze = 0;
  for (const kayit of aday) {
    const onceki = durum.tamamlanan[kayit.url];
    if (
      onceki &&
      onceki.durum === "basarili" &&
      AYAR.yenidenIsitmaMs > 0 &&
      simdi - new Date(onceki.t).getTime() < AYAR.yenidenIsitmaMs
    ) {
      atlananTaze++;
      continue;
    }
    sira.push(kayit);
  }
  if (atlananTaze > 0) {
    yaz(`· ${atlananTaze} URL son ${AYAR.yenidenIsitmaMs / 3_600_000} saat içinde ısıtılmış → ATLANDI.`);
  }
  yaz(`· Isıtılacak: ${sira.length} URL`);

  if (sira.length > AYAR.maxIstek) {
    yaz(`· UYARI: liste --max-istek (${AYAR.maxIstek}) tavanını aşıyor; ilk ${AYAR.maxIstek} URL işlenecek, gerisi --devam ile sürer.`);
  }

  // 4) Prova
  if (AYAR.prova) {
    // Sıralı hız tahmini: eşzamanlılık × (ortalama yanıt + aralık)
    const varsayilanRenderMs = 700; // ölçülmemiş varsayım — gerçek çalışma ölçer
    const etkinHiz = AYAR.eszamanlilik / ((varsayilanRenderMs + AYAR.istekAraligiMs) / 1000);
    const tahminiSn = sira.length / Math.max(0.001, etkinHiz);
    yaz("");
    yaz("── PROVA TAHMİNİ ─────────────────────────────────────────────────────");
    yaz(`  istek sayısı        : ${Math.min(sira.length, AYAR.maxIstek)}`);
    yaz(`  varsayılan render   : ${varsayilanRenderMs} ms (ÖLÇÜLMEMİŞ varsayım)`);
    yaz(`  tahmini hız         : ${etkinHiz.toFixed(1)} istek/sn`);
    yaz(`  tahmini süre        : ${(tahminiSn / 60).toFixed(1)} dk`);
    yaz(`  tahmini CU-saat     : ${cuSaatTahmini(tahminiSn * 1000, AYAR.cuMin).toFixed(3)} (iyimser, ${AYAR.cuMin} CU)`);
    yaz(`                      : ${cuSaatTahmini(tahminiSn * 1000, AYAR.cuMax).toFixed(3)} (kötümser, ${AYAR.cuMax} CU)`);
    yaz(`  tahmini ISR yazması : ${Math.min(sira.length, AYAR.maxIstek)} (her MISS = 1 ISR yazması)`);
    yaz("");
    yaz("  NOT: bu sayılar MODELdir. Render süresi ve gerçek CU tüketimi ancak");
    yaz("  gerçek çalışmada (ve Neon konsolunda) ölçülür.");
    yaz("  Örnek ilk 5 URL:");
    for (const k of sira.slice(0, 5)) yaz(`    ${k.tur.padEnd(5)} ${k.dil}  ${k.url}`);
    raporYaz({ ...ozetIskelet(), prova: true, planlanan: sira.length, tahminiDk: tahminiSn / 60 }, [], []);
    return 0;
  }

  if (sira.length === 0) {
    yaz("· Isıtılacak URL yok. Çıkılıyor.");
    return 0;
  }

  // 5) Gerçek çalışma
  const hedefler = sira.slice(0, AYAR.maxIstek);
  const basarili = [];
  const basarisiz = [];
  const onbellekDagilimi = {};
  let gonderilen = 0;
  let sonrakiIndeks = 0;
  let durdurmaNedeni = null;
  let toplamSure = 0;

  const tavanAsildiMi = () => {
    const gecen = Date.now() - baslangic;
    if (gonderilen >= AYAR.maxIstek) return `istek tavanı (${AYAR.maxIstek})`;
    if (gecen >= AYAR.maxSureMs) return `süre tavanı (${AYAR.maxSureMs / 60000} dk)`;
    const cu = cuSaatTahmini(gecen, AYAR.cuMax);
    if (cu >= AYAR.maxCuSaat) return `CU-saat tavanı (tahmini ${cu.toFixed(3)} ≥ ${AYAR.maxCuSaat})`;

    // ── HATA ORANI TAVANI (2026-11-25, ÖLÇÜMDEN doğdu) ──────────────────────
    // Yük altında `site_settings` okuması düşerse `isPageEnabled()` fail-closed
    // davranır ve AÇIK bir sayfa 404 döndürür. Ölçümde eşzamanlılık 6'da 145
    // sayfanın 11'i (%7,6) böyle 404 verdi. Bu durumda ısıtmaya DEVAM ETMEK
    // yanlıştır: sitemap'ten gelen bir URL'nin 404 vermesi ya ısıtmanın
    // sunucuyu zorladığını ya da bir yapılandırma sorununu gösterir; her iki
    // hâlde de o an isteyen bir tarayıcı/bot da 404 görür.
    //
    // Yerel ölçümde bu 404'lerin ÖNBELLEĞE YAZILMADIĞI doğrulandı (sonraki
    // istek 200 döndü). Vercel'in ISR deposunda aynı davranış DOĞRULANMADI,
    // bu yüzden kural temkinlidir: eşik aşılırsa dur.
    if (gonderilen >= AYAR.enAzOrnek) {
      const oran = basarisiz.length / gonderilen;
      if (oran > AYAR.maxHataOrani) {
        return `hata oranı tavanı (${(oran * 100).toFixed(1)}% > ${(AYAR.maxHataOrani * 100).toFixed(1)}%) ` +
               `— eşzamanlılığı düşür ve nedeni araştır`;
      }
    }
    return null;
  };

  async function isci() {
    while (true) {
      if (durdurmaNedeni) return;
      const neden = tavanAsildiMi();
      if (neden) { durdurmaNedeni = neden; return; }

      const indeks = sonrakiIndeks++;
      if (indeks >= hedefler.length) return;
      const kayit = hedefler[indeks];

      gonderilen++;
      const sonuc = await urlIsit(kayit.url);
      toplamSure += sonuc.sure;
      onbellekDagilimi[sonuc.onbellek] = (onbellekDagilimi[sonuc.onbellek] ?? 0) + 1;

      const satir = {
        url: kayit.url, tur: kayit.tur, dil: kayit.dil,
        kod: sonuc.kod, sure: sonuc.sure, onbellek: sonuc.onbellek,
        deneme: sonuc.deneme, hata: sonuc.hata,
      };
      if (sonuc.durum === "basarili") {
        basarili.push(satir);
        durum.tamamlanan[kayit.url] = { t: new Date().toISOString(), durum: "basarili", kod: sonuc.kod, onbellek: sonuc.onbellek };
      } else {
        basarisiz.push(satir);
        // Başarısız URL durum dosyasına "başarılı" yazılmaz → --devam tekrar dener.
        delete durum.tamamlanan[kayit.url];
      }

      if (gonderilen % 25 === 0) {
        const gecen = (Date.now() - baslangic) / 1000;
        yaz(
          `  ${String(gonderilen).padStart(6)}/${hedefler.length}  ` +
          `${(gonderilen / Math.max(1, gecen)).toFixed(1)} istek/sn  ` +
          `ort ${(toplamSure / gonderilen).toFixed(0)}ms  ` +
          `hata ${basarisiz.length}  ` +
          `CU~${cuSaatTahmini(Date.now() - baslangic, AYAR.cuMax).toFixed(3)}`
        );
        durumKaydet(durum);
      }

      if (AYAR.istekAraligiMs > 0) await uyu(AYAR.istekAraligiMs);
    }
  }

  const kapat = () => { durdurmaNedeni ??= "kullanıcı kesmesi (SIGINT)"; };
  process.on("SIGINT", kapat);

  await Promise.all(Array.from({ length: AYAR.eszamanlilik }, () => isci()));
  durumKaydet(durum);

  // 6) Özet
  const gecenMs = Date.now() - baslangic;
  const ozet = {
    ...ozetIskelet(),
    bitis: new Date().toISOString(),
    gecenDk: +(gecenMs / 60000).toFixed(2),
    planlanan: sira.length,
    gonderilen,
    basarili: basarili.length,
    basarisiz: basarisiz.length,
    atlananTaze,
    ortalamaYanitMs: gonderilen ? Math.round(toplamSure / gonderilen) : 0,
    istekSn: +(gonderilen / Math.max(1, gecenMs / 1000)).toFixed(2),
    onbellekDagilimi,
    tahminiCuSaatIyimser: +cuSaatTahmini(gecenMs, AYAR.cuMin).toFixed(4),
    tahminiCuSaatKotumser: +cuSaatTahmini(gecenMs, AYAR.cuMax).toFixed(4),
    isrYazmasiTahmini: (onbellekDagilimi.MISS ?? 0) + (onbellekDagilimi.STALE ?? 0),
    durdurmaNedeni,
  };

  yaz("");
  yaz("── SONUÇ ─────────────────────────────────────────────────────────────");
  yaz(`  gönderilen        : ${ozet.gonderilen}`);
  yaz(`  başarılı          : ${ozet.basarili}`);
  yaz(`  başarısız         : ${ozet.basarisiz}`);
  yaz(`  atlanan (taze)    : ${ozet.atlananTaze}`);
  yaz(`  süre              : ${ozet.gecenDk} dk   (${ozet.istekSn} istek/sn, ort ${ozet.ortalamaYanitMs} ms)`);
  yaz(`  önbellek başlıkları: ${JSON.stringify(onbellekDagilimi)}`);
  yaz(`  tahmini CU-saat   : ${ozet.tahminiCuSaatIyimser} (iyimser ${AYAR.cuMin} CU) · ${ozet.tahminiCuSaatKotumser} (kötümser ${AYAR.cuMax} CU)`);
  yaz(`  tahmini ISR yazma : ${ozet.isrYazmasiTahmini}`);
  if (durdurmaNedeni) yaz(`  DURDURULDU        : ${durdurmaNedeni}  → --devam ile sürdürülebilir`);

  // ── 404'ler AYRI ele alınır ─────────────────────────────────────────────
  // Sitemap'ten gelen bir URL 404 veremez: sitemap yalnızca toggle'ı açık ve
  // (ürün için) `seo_ready` olan sayfaları listeler. Buradaki 404 bir ÇELİŞKİdir.
  const dortYuzDort = basarisiz.filter((s) => s.kod === 404);
  if (dortYuzDort.length > 0) {
    yaz("");
    yaz(`  ⚠️  ${dortYuzDort.length} URL 404 DÖNDÜ.`);
    if (AYAR.kaynak === "sitemap") {
      yaz("      Kaynak sitemap olduğu için bu bir ÇELİŞKİDİR: sitemap yalnızca");
      yaz("      açık ve yayına hazır sayfaları listeler. Olası nedenler:");
      yaz("      · yük altında ayar okuması düştü → fail-closed 404 (eşzamanlılığı düşür)");
      yaz("      · sayfa toggle'ı ısıtma sırasında kapatıldı");
      yaz("      · ürün ısıtma sırasında silindi/pasifleştirildi");
      yaz("      YAPILMASI GEREKEN: nedeni gider, sonra bu URL'leri --devam ile");
      yaz("      yeniden ısıt. Önbellekte 404 kaldıysa admin yazma yolu zaten");
      yaz("      revalidatePath() çağırır; emin olmak için ilgili ürünü kaydet.");
    }
  }

  if (basarisiz.length) {
    yaz("  ilk 10 başarısız:");
    for (const s of basarisiz.slice(0, 10)) yaz(`    ${s.kod} ${s.hata ?? ""}  ${s.url}`);
  }

  raporYaz(ozet, basarili, basarisiz);
  return basarisiz.length > 0 ? 1 : 0;
}

function ozetIskelet() {
  return {
    taban: AYAR.taban,
    baslangic: new Date().toISOString(),
    ayar: {
      kaynak: AYAR.kaynak, suzgec: AYAR.suzgec, diller: [...AYAR.diller],
      eszamanlilik: AYAR.eszamanlilik, istekAraligiMs: AYAR.istekAraligiMs,
      yontem: AYAR.yontem,
      tavanlar: { maxIstek: AYAR.maxIstek, maxSureDk: AYAR.maxSureMs / 60000, maxCuSaat: AYAR.maxCuSaat },
      cu: { min: AYAR.cuMin, max: AYAR.cuMax, bosKalmaDk: AYAR.bosKalmaDk },
    },
  };
}

function raporYaz(ozet, basarili, basarisiz) {
  const dizin = path.dirname(AYAR.raporOnEk);
  fs.mkdirSync(dizin, { recursive: true });
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonYolu = `${AYAR.raporOnEk}-${damga}.json`;
  fs.writeFileSync(
    jsonYolu,
    JSON.stringify({ ozet, basarili, basarisiz }, null, 2),
    "utf8"
  );
  const basarisizYolu = `${AYAR.raporOnEk}-${damga}-basarisiz.txt`;
  if (basarisiz.length) {
    fs.writeFileSync(basarisizYolu, basarisiz.map((s) => `${s.kod}\t${s.hata ?? ""}\t${s.url}`).join("\n"), "utf8");
  }
  yaz("");
  yaz(`· Rapor: ${jsonYolu}`);
  if (basarisiz.length) yaz(`· Başarısız URL listesi: ${basarisizYolu}`);
}

// process.exit() Windows'ta stdout boşalmadan süreci kapatıp libuv assertion
// hatası üretiyordu; exitCode atanıp süreç kendiliğinden kapanıyor.
main()
  .then((kod) => { process.exitCode = kod; })
  .catch((e) => {
    console.error(`HATA: ${e?.name ?? "Hata"}: ${e?.message ?? ""}`);
    process.exitCode = 1;
  });
