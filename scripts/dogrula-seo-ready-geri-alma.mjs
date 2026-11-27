/**
 * `seo_ready` otomatik geri alma — UÇTAN UCA DOĞRULAMA (yalnızca DEVELOPMENT).
 *
 * Kullanıcı onayı 2026-11-17 ile gelen altı koşulu CANLI veritabanında ölçer.
 * `tests/seo-ready-revoke.spec.ts` kararı ve üretilen SQL'i kilitler; bu betik
 * gerçek HTTP uçları ve gerçek satırlar üzerinde davranışı doğrular.
 *
 *   1. Son doğrulanmış fotoğraf silinince / doğrulaması kalkınca seo_ready=false
 *   2. Ürün bilgileri, açıklamalar, uyumluluklar ve stok DEĞİŞMEZ
 *   3. Fotoğraf yeniden doğrulanınca seo_ready kendiliğinden true OLMAZ
 *   4. Geri alma sonrası public API / detay sayfası / marka sayfası / sitemap
 *   5. Eşzamanlı isteklerde değişmez bozulmaz
 *   6. (bu betik otomatik testin kendisidir)
 *
 * GÜVENLİK
 *   · Hedef veritabanı KİMLİĞİ doğrulanır; production imzası görülürse durur.
 *   · Test boyunca BİR ürün geçici olarak yayına alınır ve sonunda yayından
 *     indirilir. Bu bilinçlidir: "yayındaki ürün" davranışı başka türlü
 *     ölçülemez. Development'ta kalır; production'a hiçbir etkisi yoktur.
 *   · Eklenen görsel satırları sonunda SİLİNİR; ürün satırının seo_ready /
 *     seo_ready_at / updated_at dışındaki TÜM kolonları md5 ile karşılaştırılır.
 *
 * Kullanım (dev sunucusu http://localhost:3001 ayakta olmalı):
 *   node scripts/dogrula-seo-ready-geri-alma.mjs
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3001";
const OSKO = process.env.USERPROFILE + "/.osko/a3-dev.env";
const ETIKET = "TEST-GERIALMA";

function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(anahtar + "="));
  if (!satir) throw new Error(`${anahtar} bulunamadi`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

/**
 * SQL — owner bağlantısıyla, Neon HTTP ucu üzerinden.
 *
 * NEDEN DOCKER/psql DEĞİL: her `docker run psql` yeni bir oturum açıyor ve
 * `execFileSync` olay döngüsünü saniyelerce BLOKLUYOR. Dev sunucusu da aynı
 * bağlantı bütçesini kullandığı için limit zorlanıyor; ilk denemede ETIMEDOUT
 * ve ECONNRESET alındı — ikisi de test koşumunun yan etkisiydi, uygulama
 * hatası değil. HTTP ucu durumsuzdur: sorgu biter bitmez bağlantı bırakılır
 * ve çağrı asenkrondur.
 *
 * TEK İFADE kuralı: HTTP ucu çoklu ifade kabul etmez; her çağrı tek sorgudur.
 * Değerler parametre olarak bağlanır, SQL'e gömülmez.
 */
const ownerSql = neon(env(OSKO, "DEV_OWNER_URL"));
const sorgu = (metin, params = []) => ownerSql.query(metin, params);

/** Tek satırın tek kolonunu döner. */
async function tek(metin, params = []) {
  const satirlar = await sorgu(metin, params);
  return satirlar.length === 0 ? null : Object.values(satirlar[0])[0];
}

let gecti = 0, kaldi = 0;
const basarisizlar = [];
function kontrol(ad, kosul, ayrinti = "") {
  if (kosul) { gecti++; console.log(`   ✓ ${ad}`); }
  else { kaldi++; basarisizlar.push(ad); console.log(`   ✗ ${ad}${ayrinti ? "  → " + ayrinti : ""}`); }
}

// ── HTTP yardımcıları ────────────────────────────────────────────────────────
// `connection: close` + tek seferlik yeniden deneme: dev sunucusu derleme
// sırasında keep-alive soketini kapatabiliyor.
async function istek(url, init = {}) {
  const secenek = { ...init, headers: { ...(init.headers ?? {}), connection: "close" } };
  try {
    return await fetch(url, secenek);
  } catch (err) {
    if (String(err?.cause?.code ?? "") !== "ECONNRESET") throw err;
    await new Promise((r) => setTimeout(r, 400));
    return await fetch(url, secenek);
  }
}

// ── Hedef doğrulaması ────────────────────────────────────────────────────────
console.log("── 0. HEDEF DOGRULAMASI ────────────────────────────────");
const [imza] = await sorgu(
  `select current_user as rol,
          (select count(*)::int from products) as urun,
          (select count(*)::int from site_settings) as ayar`
);
console.log(`   rol=${imza.rol} | urun=${imza.urun} | site_settings=${imza.ayar}`);
if (Number(imza.urun) < 100 || Number(imza.ayar) !== 0) {
  console.error("DURDURULDU: development imzasi degil (beklenen urun>=100, site_settings=0).");
  process.exit(1);
}
kontrol("development veritabani", true);

// ── Giriş ────────────────────────────────────────────────────────────────────
const girisYanit = await istek(`${BASE}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: env(".env.local", "ADMIN_USERNAME"),
    password: env(".env.local", "ADMIN_PASSWORD"),
  }),
});
if (!girisYanit.ok) {
  console.error(`Giris basarisiz (${girisYanit.status}). Dev sunucusu calisiyor mu?`);
  process.exit(1);
}
const cookie = (girisYanit.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
const api = (yol, init = {}) =>
  istek(`${BASE}${yol}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });
const nocache = (yol) => istek(`${BASE}${yol}`, { cache: "no-store" });

// ── Hedef ürün ───────────────────────────────────────────────────────────────
const [hedef] = await sorgu(
  `select id, part_number as pn,
          md5((to_jsonb(p) - 'seo_ready' - 'seo_ready_at' - 'updated_at')::text) as parmak
     from products p
    where is_active
      and not (part_number ~* '(TEST|ATOM)' or name ~* '(TEST|ATOM)')
      and length(coalesce(long_description, '')) >= 300
      and exists (select 1 from fitments f where f.product_id = p.id and f.verified)
    order by part_number
    limit 1`
);
if (!hedef) {
  console.error("DURDURULDU: yayin olcutlerini saglayan aktif gercek urun bulunamadi.");
  process.exit(1);
}
const urunId = hedef.id;
const pn = hedef.pn;
const parmakIziOnce = hedef.parmak;
const slug = pn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
console.log(`   hedef urun: ${pn}`);

const SAYILAR = `select (select count(*)::int from products) as urun,
       (select count(*)::int from fitments) as uyum,
       (select count(*)::int from product_translations) as ceviri,
       (select count(*)::int from oem_numbers) as oem,
       (select count(*)::int from machines) as makine`;
const [sayilarOnce] = await sorgu(SAYILAR);

/** Görsel ekler, kimliğini döner. */
async function gorselEkle(ek, dogrulanmis = true) {
  return await tek(
    `insert into product_images
       (product_id, cloudinary_id, cloudinary_url, sort_order, is_primary,
        verified, verified_at, alt_text, source_note)
     values ($1, $2, $3, $4, $5, $6,
             case when $6 then now() else null end,
             $7, 'gecici test')
     returning id`,
    [
      urunId,
      `${ETIKET}-${ek}`,
      `https://res.cloudinary.com/nidah-test-gecici/image/upload/geri-alma-${ek}.jpg`,
      ek,
      ek === 0,
      dogrulanmis,
      `Gecici geri alma testi gorseli ${ek}`,
    ]
  );
}

async function durum() {
  const [d] = await sorgu(
    `select seo_ready, seo_ready_at,
            (select count(*)::int from product_images
              where product_id = $1 and verified) as dogrulanmis
       from products where id = $1`,
    [urunId]
  );
  return {
    seoReady: d.seo_ready === true,
    seoReadyAt: d.seo_ready_at == null ? "NULL" : String(d.seo_ready_at),
    dogrulanmis: Number(d.dogrulanmis),
  };
}

/** Ürünü yayına alır; kapı reddederse hata fırlatır. */
async function yayinaAl() {
  const r = await api(`/api/admin/products/${urunId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seoReady: true }),
  });
  if (r.status !== 200) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`yayina alinamadi (HTTP ${r.status}): ${JSON.stringify(j.reasons ?? j)}`);
  }
}

try {
  // ── 1. YAYINDAKİ DURUM ────────────────────────────────────────────────────
  console.log("\n── 1. URUN GECICI OLARAK YAYINA ALINIYOR ───────────────");
  const gorsel1 = await gorselEkle(0);
  await yayinaAl();
  const y0 = await durum();
  kontrol("urun yayinda (seo_ready=true)", y0.seoReady, JSON.stringify(y0));
  kontrol("seo_ready_at damgasi yazildi", y0.seoReadyAt !== "NULL", y0.seoReadyAt);

  const sitemapOnce = await (await nocache("/sitemap.xml")).text();
  kontrol("sitemap urunu iceriyor", sitemapOnce.includes(`/parca-katalog/${slug}`));
  kontrol("sitemap gorseli iceriyor", sitemapOnce.includes("geri-alma-0.jpg"));

  const sayfaOnce = await (await nocache(`/parca-katalog/${slug}`)).text();
  kontrol("sayfa noindex DEGIL", !sayfaOnce.includes("noindex"), "noindex bulundu");

  // ── 2. ŞART 1: SON DOGRULANMIS FOTOGRAF SILINIYOR ─────────────────────────
  console.log("\n── 2. SART 1 — SON FOTOGRAF SILININCE GERI ALINIR ──────");
  const silme = await api(`/api/admin/products/${urunId}/images/${gorsel1}`, { method: "DELETE" });
  const silmeJson = await silme.json().catch(() => ({}));
  kontrol("silme 200", silme.status === 200, `HTTP ${silme.status}`);
  kontrol("yanit seoReadyRevoked: true bildiriyor", silmeJson.seoReadyRevoked === true, JSON.stringify(silmeJson));

  const y1 = await durum();
  kontrol("seo_ready = false", y1.seoReady === false, JSON.stringify(y1));
  kontrol("seo_ready_at temizlendi", y1.seoReadyAt === "NULL", y1.seoReadyAt);
  kontrol("dogrulanmis gorsel 0", y1.dogrulanmis === 0, String(y1.dogrulanmis));

  // ── 3. ŞART 4: PUBLIC YUZEY ───────────────────────────────────────────────
  console.log("\n── 3. SART 4 — GERI ALMA SONRASI PUBLIC YUZEY ──────────");
  const sitemapSonra = await (await nocache("/sitemap.xml")).text();
  kontrol("sitemap'te urun URL'si YOK", !sitemapSonra.includes(`/parca-katalog/${slug}`));
  kontrol("sitemap'te gorsel YOK", !sitemapSonra.includes("geri-alma-0.jpg"));

  const sayfaYanit = await nocache(`/parca-katalog/${slug}`);
  const sayfaSonra = await sayfaYanit.text();
  kontrol("detay sayfasi 200 (pasiflesmedi)", sayfaYanit.status === 200, `HTTP ${sayfaYanit.status}`);
  kontrol("detay sayfasi NOINDEX", sayfaSonra.includes("noindex"), "noindex yok");
  kontrol("detay sayfasinda silinen gorsel YOK", !sayfaSonra.includes("geri-alma-0.jpg"));
  kontrol("detay sayfasinda temsili kart var", sayfaSonra.includes("HAZIRLANIYOR"));

  const detayApi = await (await nocache(`/api/products/${encodeURIComponent(pn)}`)).json();
  kontrol("public detay API urunu veriyor (aktif)", detayApi.data?.partNumber === pn);
  kontrol("public detay API gorselsiz", detayApi.data?.images?.length === 0);

  const listeApi = await (await nocache(`/api/products?search=${encodeURIComponent(pn)}`)).json();
  const listeKayit = (listeApi.data ?? []).find((p) => p.partNumber === pn);
  kontrol("public liste API gorselsiz", listeKayit != null && !listeKayit.imageUrl);

  const markaAdi = await tek(
    `select lower(m.name) from fitments f
       join machines mc on mc.id = f.machine_id
       join manufacturers m on m.id = mc.manufacturer_id
      where f.product_id = $1 limit 1`,
    [urunId]
  );
  const markaYanit = await nocache(`/parca-katalog/${String(markaAdi).replace(/[^a-z0-9]+/g, "-")}`);
  if (markaYanit.status === 200) {
    const markaHtml = await markaYanit.text();
    kontrol("marka sayfasinda silinen gorsel YOK", !markaHtml.includes("geri-alma-0.jpg"));
  } else {
    console.log(`   · marka sayfasi atlandi (HTTP ${markaYanit.status})`);
  }

  // ── 4. ŞART 2: DIGER KOLONLAR DEGISMEDI ───────────────────────────────────
  console.log("\n── 4. SART 2 — URUN VERISI DEGISMEDI ───────────────────");
  const parmakIziSonra = await tek(
    `select md5((to_jsonb(p) - 'seo_ready' - 'seo_ready_at' - 'updated_at')::text)
       from products p where id = $1`,
    [urunId]
  );
  kontrol(
    "seo_ready/seo_ready_at/updated_at DISINDAKI tum kolonlar ayni",
    parmakIziOnce === parmakIziSonra,
    `${parmakIziOnce} -> ${parmakIziSonra}`
  );

  const [sayilarSonra] = await sorgu(SAYILAR);
  for (const alan of ["urun", "uyum", "ceviri", "oem", "makine"]) {
    kontrol(
      `${alan} sayisi ayni`,
      sayilarOnce[alan] === sayilarSonra[alan],
      `${sayilarOnce[alan]} -> ${sayilarSonra[alan]}`
    );
  }

  const [stokSatiri] = await sorgu(
    `select stock_status, in_stock, is_active from products where id = $1`,
    [urunId]
  );
  kontrol("stock_status degismedi (unknown)", stokSatiri.stock_status === "unknown", stokSatiri.stock_status);
  kontrol("in_stock degismedi (false)", stokSatiri.in_stock === false, String(stokSatiri.in_stock));
  kontrol("is_active degismedi (true)", stokSatiri.is_active === true, String(stokSatiri.is_active));

  // ── 5. ŞART 3: YENIDEN DOGRULAMA YAYINA ALMAZ ─────────────────────────────
  console.log("\n── 5. SART 3 — YENIDEN DOGRULAMA YAYINA ALMAZ ──────────");
  const gorsel2 = await gorselEkle(1, false);
  const yenidenDogrula = await api(`/api/admin/products/${urunId}/images/${gorsel2}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verified: true,
      altText: "Gecici geri alma testi ikinci gorsel",
      sourceNote: "gecici test",
    }),
  });
  kontrol("yeniden dogrulama 200", yenidenDogrula.status === 200, `HTTP ${yenidenDogrula.status}`);

  const y2 = await durum();
  kontrol("dogrulanmis gorsel 1", y2.dogrulanmis === 1, String(y2.dogrulanmis));
  kontrol("seo_ready HALA false — otomatik yayin YOK", y2.seoReady === false, JSON.stringify(y2));
  kontrol("seo_ready_at hala NULL", y2.seoReadyAt === "NULL", y2.seoReadyAt);

  const sitemapYeniden = await (await nocache("/sitemap.xml")).text();
  kontrol("sitemap urunu HALA icermiyor", !sitemapYeniden.includes(`/parca-katalog/${slug}`));

  // ── 6. ŞART 1b: DOGRULAMA GERI ALINMASI ───────────────────────────────────
  console.log("\n── 6. SART 1b — DOGRULAMA GERI ALININCA DA CALISIR ─────");
  await yayinaAl();
  kontrol("urun tekrar yayinda (yonetici karariyla)", (await durum()).seoReady === true);

  const dogrulamaKaldir = await api(`/api/admin/products/${urunId}/images/${gorsel2}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verified: false }),
  });
  const kaldirJson = await dogrulamaKaldir.json().catch(() => ({}));
  kontrol("dogrulama kaldirma 200", dogrulamaKaldir.status === 200, `HTTP ${dogrulamaKaldir.status}`);
  kontrol("yanit seoReadyRevoked: true", kaldirJson.seoReadyRevoked === true, JSON.stringify(kaldirJson));

  const y3 = await durum();
  kontrol("seo_ready = false", y3.seoReady === false, JSON.stringify(y3));
  kontrol("gorsel SILINMEDI, yalnizca dogrulamasi kalkti", y3.dogrulanmis === 0);
  const gorselSayisi = await tek(
    `select count(*)::int from product_images where product_id = $1`, [urunId]
  );
  kontrol("gorsel satiri duruyor", Number(gorselSayisi) === 1, String(gorselSayisi));

  // ── 7. ŞART 5: ESZAMANLILIK ───────────────────────────────────────────────
  console.log("\n── 7. SART 5 — ESZAMANLI ISTEKLER ──────────────────────");
  let ihlal = 0;
  let silmeKazandi = 0;
  let dogrulamaKazandi = 0;
  const TUR = 10;
  for (let t = 0; t < TUR; t++) {
    await sorgu(`delete from product_images where product_id = $1`, [urunId]);
    const a = await gorselEkle(0, true);
    const b = await gorselEkle(2, false);
    await yayinaAl();

    // A: tek doğrulanmış görseli sil.  B: aynı anda diğerini doğrula.
    const silmeIstegi = () =>
      api(`/api/admin/products/${urunId}/images/${a}`, { method: "DELETE" });
    const dogrulamaIstegi = () =>
      api(`/api/admin/products/${urunId}/images/${b}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verified: true,
          altText: "Eszamanlilik testi gorseli",
          sourceNote: "gecici test",
        }),
      });

    // Sira DEGISTIRILIR: tek turlarda silme once baslatilir, cift turlarda
    // dogrulama. Gercek interleaving sunucuya kalmistir; amac iki yonu de
    // zorlamaktir.
    await Promise.all(
      t % 2 === 0
        ? [silmeIstegi(), dogrulamaIstegi()]
        : [dogrulamaIstegi(), silmeIstegi()]
    );

    const d = await durum();
    // DEĞİŞMEZ: yayindaki urunun DOGRULANMIS fotografi OLMAK ZORUNDA.
    const bozuk = d.seoReady && d.dogrulanmis === 0;
    if (bozuk) ihlal++;
    if (d.seoReady) dogrulamaKazandi++;
    else silmeKazandi++;
    console.log(
      `   tur ${t + 1}: seo_ready=${d.seoReady} dogrulanmis=${d.dogrulanmis}` +
      (bozuk ? "  ← DEGISMEZ BOZULDU" : "")
    );
  }
  console.log(
    `   gozlenen siralama: dogrulama once ${dogrulamaKazandi} tur, ` +
    `geri alma once ${silmeKazandi} tur`
  );
  kontrol(`${TUR} turda degismez hic bozulmadi`, ihlal === 0, `${ihlal} ihlal`);

  // ── 7b. TERS SIRALAMA (geri alma ONCE biter) ──────────────────────────────
  // Yukaridaki 10 turda hep dogrulama kazandi: silme yolu once Cloudinary'ye
  // gidiyor ve bu onu yavaslatiyor. Diger interleaving'i de OLCMEK icin
  // dogrulama bilerek geciktirilir. Beklenen sonuc kullanici sarti 3'tur:
  // geri alma olur, sonraki dogrulama urunu yayina GERI DONDURMEZ.
  console.log("\n── 7b. TERS SIRALAMA — GERI ALMA ONCE BITER ────────────");
  let tersIhlal = 0;
  let tersYayindaKaldi = 0;
  const TERS_TUR = 3;
  for (let t = 0; t < TERS_TUR; t++) {
    await sorgu(`delete from product_images where product_id = $1`, [urunId]);
    const a = await gorselEkle(0, true);
    const b = await gorselEkle(2, false);
    await yayinaAl();

    const silmeSozu = api(`/api/admin/products/${urunId}/images/${a}`, { method: "DELETE" });
    await new Promise((r) => setTimeout(r, 1200)); // geri alma bitsin
    const araDurum = await durum();

    await api(`/api/admin/products/${urunId}/images/${b}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verified: true,
        altText: "Ters siralama testi gorseli",
        sourceNote: "gecici test",
      }),
    });
    await silmeSozu;

    const d = await durum();
    const bozuk = d.seoReady && d.dogrulanmis === 0;
    if (bozuk) tersIhlal++;
    if (d.seoReady) tersYayindaKaldi++;
    console.log(
      `   tur ${t + 1}: geri alma sonrasi seo_ready=${araDurum.seoReady} → ` +
      `dogrulama sonrasi seo_ready=${d.seoReady} dogrulanmis=${d.dogrulanmis}`
    );
  }
  kontrol("ters siralamada degismez bozulmadi", tersIhlal === 0, `${tersIhlal} ihlal`);
  kontrol(
    "geri alma sonrasi dogrulama urunu yayina DONDURMEDI",
    tersYayindaKaldi === 0,
    `${tersYayindaKaldi} turda urun yayina dondu`
  );

} catch (err) {
  kaldi++;
  basarisizlar.push("beklenmeyen hata");
  console.error("\n✗ BEKLENMEYEN HATA: " + (err?.message ?? err));
} finally {
  // ── 8. TEMIZLIK ───────────────────────────────────────────────────────────
  console.log("\n── 8. TEMIZLIK VE BUTUNLUK ─────────────────────────────");
  await sorgu(`delete from product_images where cloudinary_id like $1`, [`${ETIKET}%`]);
  await sorgu(
    `update products set seo_ready = false, seo_ready_at = null
      where id = $1 and seo_ready`,
    [urunId]
  );

  const sonParmakIzi = await tek(
    `select md5((to_jsonb(p) - 'seo_ready' - 'seo_ready_at' - 'updated_at')::text)
       from products p where id = $1`,
    [urunId]
  );
  kontrol("hedef urunun diger kolonlari DEGISMEDI", sonParmakIzi === parmakIziOnce);

  const [son] = await sorgu(
    `select (select count(*)::int from products) as urun,
            (select count(*)::int from fitments) as uyum,
            (select count(*)::int from product_translations) as ceviri,
            (select count(*)::int from product_images) as gorsel,
            (select count(*)::int from products where is_active and seo_ready) as yayinda,
            (select count(*)::int from products
               where is_active and (part_number ~* '(TEST|ATOM)' or name ~* '(TEST|ATOM)')) as aktif_sentetik`
  );
  console.log(
    `   urun=${son.urun} | uyum=${son.uyum} | ceviri=${son.ceviri} | ` +
    `gorsel=${son.gorsel} | yayinda=${son.yayinda} | aktif_sentetik=${son.aktif_sentetik}`
  );
  kontrol("gorsel tablosu temiz", Number(son.gorsel) === 0, String(son.gorsel));
  kontrol("yayinda urun 0", Number(son.yayinda) === 0, String(son.yayinda));
  kontrol("aktif sentetik 0", Number(son.aktif_sentetik) === 0, String(son.aktif_sentetik));

  console.log(`\n═══ SONUC: ${gecti} gecti, ${kaldi} kaldi ═══`);
  if (kaldi > 0) console.log("Basarisiz: " + basarisizlar.join(" · "));
}

process.exit(kaldi === 0 ? 0 : 1);
