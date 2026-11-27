/**
 * Faz 3 — 25 ürünlük prova aktarımı (development).
 *
 * Prova CSV'lerini yönetim paneli import uç noktalarına, GERÇEK akış üzerinden
 * gönderir. Tarayıcıdan dosya eklenemediği için bu araç kullanılır; uç
 * noktalar, doğrulamalar ve atomiklik aynen devrededir.
 *
 * ZORUNLU SIRA (yabancı anahtar bağımlılığı):
 *   1. makineler  2. ürünler  3. uyumluluk  4. çeviriler
 *
 * Çeviriler için toplu uç nokta YOKTUR; ürün başına mevcut ve test edilmiş
 * `/api/admin/products/[id]/translations` kullanılır ve `published=false`
 * olarak yazılır.
 *
 * Kullanım:
 *   node scripts/faz3-prova-aktarim.mjs dry-run
 *   node scripts/faz3-prova-aktarim.mjs apply
 *
 * `apply` yalnızca açık onayla çalıştırılır. Hedefin development olduğu
 * doğrulanmadan hiçbir şey gönderilmez.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const MODE = process.argv[2];
if (!["dry-run", "apply", "ceviri"].includes(MODE)) {
  console.error("Kullanim: node scripts/faz3-prova-aktarim.mjs <dry-run|apply|ceviri>");
  console.error("  ceviri = yalnizca 4. asamayi (cevirileri) calistirir");
  process.exit(1);
}
/** Import uc noktalarina gonderilecek mod. `ceviri` modunda 1-3 atlanir. */
const IMPORT_MODE = MODE === "ceviri" ? "apply" : MODE;
/** Yazma yapilacak mi? */
const YAZ = MODE === "apply" || MODE === "ceviri";

const BASE = "http://localhost:3001";
const VERI = "C:/Users/HP/Desktop/OSKO_PLANLAMA/nidah_faz3_veri";

/**
 * Dosya setleri. Varsayilan ilk 25 urunluk prova; `--set kalan` ile kalan
 * 72 urunluk set calisir. Dosya adlari TEK YERDE tutulur ki iki set
 * yanlislikla karismasin.
 */
const SETLER = {
  ilk25: {
    ad: "ilk 25 urun",
    urunler: "08_prova_25_urunler.csv",
    makineler: "09_prova_25_makineler.csv",
    uyumluluk: "10_prova_25_uyumluluk.csv",
    ceviriler: "12_prova_25_ceviriler.csv",
  },
  kalan: {
    ad: "kalan 72 urun",
    urunler: "20_kalan_urunler.csv",
    makineler: "21_kalan_makineler.csv",
    uyumluluk: "22_kalan_uyumluluk.csv",
    ceviriler: "23_kalan_ceviriler.csv",
  },
  // 2026-11-16 — V18'den gelen 57 yeni aday (T1 8 + T2 18 + T3 31).
  aday57: {
    ad: "57 yeni aday",
    urunler: "B1_57_urunler.csv",
    makineler: "B2_57_makineler.csv",
    uyumluluk: "B3_57_uyumluluk.csv",
    ceviriler: "B4_57_ceviriler.csv",
  },
};
const setAdi = process.argv.includes("--set")
  ? process.argv[process.argv.indexOf("--set") + 1]
  : "ilk25";
const SET = SETLER[setAdi];
if (!SET) {
  console.error(`Bilinmeyen set: ${setAdi}. Secenekler: ${Object.keys(SETLER).join(", ")}`);
  process.exit(1);
}

function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(anahtar + "="));
  if (!satir) throw new Error(`${path.basename(dosya)} icinde ${anahtar} yok`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

// ── Giriş ────────────────────────────────────────────────────────────────────
const kullanici = env(".env.development.local", "ADMIN_USERNAME");
const parola = env(".env.development.local", "ADMIN_PASSWORD");

const girisYanit = await fetch(`${BASE}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: kullanici, password: parola }),
});
if (!girisYanit.ok) {
  console.error(`Giris basarisiz (${girisYanit.status}). Dev sunucusu calisiyor mu?`);
  process.exit(1);
}
const cookie = (girisYanit.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0])
  .join("; ");
if (!cookie) {
  console.error("Oturum cookie'si alinamadi.");
  process.exit(1);
}

const api = (yol, init = {}) =>
  fetch(`${BASE}${yol}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });

// ── Hedef doğrulaması ────────────────────────────────────────────────────────
// Dev imzası: TEST kayıtları var ve bu uç nokta localhost'ta çalışıyor.
/*
 * 2026-11-16 duzeltmesi: eski kontrol `?limit=200` ile TUM urunleri cekip
 * icinde TEST kaydi ariyordu. Uc nokta `limit`'i 100'de sinirliyor; urun
 * sayisi 100'u gecince TEST kayitlari listeye hic girmeyebiliyor ve kontrol
 * "bu development degil" diyerek YANLIS yere duruyordu. Artik dogrudan
 * ARANIYOR — urun sayisindan bagimsiz.
 */
const mevcut = await (await api("/api/admin/products?limit=100")).json();
const testArama = await (await api("/api/admin/products?search=TEST&limit=100")).json();
const atomArama = await (await api("/api/admin/products?search=ATOM&limit=100")).json();
const testKayitSayisi = [...(testArama.data ?? []), ...(atomArama.data ?? [])].filter((p) =>
  /^(TEST|ATOM)[-\s]/i.test(p.partNumber) || /^(TEST|ATOM)[-\s]/i.test(p.name ?? "")
).length;
console.log(`hedef: ${BASE} | toplam urun=${mevcut.meta?.total ?? "?"} | sentetik TEST kaydi=${testKayitSayisi}`);
if (testKayitSayisi === 0) {
  console.error("DURDURULDU: sentetik TEST kaydi yok — bu development veritabani olmayabilir.");
  process.exit(1);
}
console.log(`mod: ${MODE}\n`);

// ── Dosya gönderimi ──────────────────────────────────────────────────────────
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tek gönderim. Geçici BAĞLANTI hatalarında bir kez yeniden dener.
 *
 * Neon'a arka arkaya gelen istekler `ETIMEDOUT` ile düşebiliyor; bu bir kod
 * hatası değil. Veritabanının REDDETTİĞİ bir istek (satır hatası, kısıt
 * ihlali) yeniden DENENMEZ — yalnızca bağlanamama durumunda tekrar denenir.
 */
async function gonder(tip, dosya) {
  const icerik = readFileSync(path.join(VERI, dosya));
  const fd = new FormData();
  fd.append("file", new File([icerik], dosya, { type: "text/csv" }));
  const r = await api(`/api/admin/import/${tip}?mode=${IMPORT_MODE}`, { method: "POST", body: fd });
  const metin = await r.text();
  let j = null;
  try { j = JSON.parse(metin); } catch { /* bos ya da HTML yanit */ }
  return { status: r.status, summary: j?.summary ?? null, results: j?.results ?? null, error: j?.error ?? null, ham: j ? null : metin.slice(0, 200) };
}

async function importEt(tip, dosya) {
  let r = await gonder(tip, dosya);
  // Bos govdeli 500 = baglanti sorunu olasiligi. Bir kez bekleyip yeniden dene.
  if (r.status === 500 && !r.error) {
    console.log(`   (gecici hata, 6 sn sonra yeniden deneniyor: ${tip})`);
    await bekle(6000);
    r = await gonder(tip, dosya);
  }
  return r;
}

function rapor(ad, r) {
  console.log(`── ${ad} ${"─".repeat(Math.max(0, 54 - ad.length))}`);
  console.log(`   HTTP ${r.status}`);
  if (r.error) console.log(`   HATA: ${r.error}`);
  if (r.ham) console.log(`   HAM YANIT: ${r.ham}`);
  if (r.summary) {
    const s = r.summary;
    console.log(`   toplam=${s.total} insert=${s.insert} update=${s.update} skip=${s.skip} error=${s.error}` +
      (s.applied !== undefined ? ` applied=${s.applied}` : ""));
    if (s.writableColumns) console.log(`   yazilacak kolonlar : ${s.writableColumns.join(", ") || "(yok)"}`);
    if (s.ignoredColumns?.length) console.log(`   YOK SAYILAN kolon  : ${s.ignoredColumns.join(", ")}`);
    if (s.stockCodeWarnings?.length) {
      console.log(`   stok kodu uyarisi  : ${s.stockCodeWarnings.length} adet (BIRLESTIRME YAPILMAZ)`);
      for (const u of s.stockCodeWarnings.slice(0, 5)) {
        console.log(`      ${u.normalized} -> satir ${u.rows.join(",")}` +
          (u.existingPartNumbers ? ` | mevcut: ${u.existingPartNumbers.join(", ")}` : ""));
      }
      if (s.stockCodeWarnings.length > 5) console.log(`      … ${s.stockCodeWarnings.length - 5} uyari daha`);
    }
  }
  const hatali = (r.results ?? []).filter((x) => x.action === "error");
  if (hatali.length) {
    console.log(`   HATALI SATIRLAR (${hatali.length}):`);
    for (const h of hatali.slice(0, 12)) {
      console.log(`      satir ${h.row} ${h.partNumber ?? h.label ?? ""} -> ${h.reason}`);
    }
    if (hatali.length > 12) console.log(`      … ${hatali.length - 12} satir daha`);
  }
  console.log("");
  return hatali.length === 0 && r.status === 200;
}

// ── 0. ÖN KONTROL (çevrimdışı, veritabanına dokunmaz) ───────────────────────
//
// Uyumluluk ve çeviri aşamaları, ürünler YAZILMADAN dry-run edilemez: ikisi de
// ürünü parça numarasıyla arar ve bulamayınca her satır "Ürün bulunamadı"
// hatası verir. Bu zincirin yapısal bir özelliği, dosya hatası değil.
//
// Bu yüzden ilişkiler önce DOSYALAR ARASINDA doğrulanır: hiçbir yazma
// yapılmadan, her uyumluluk ve çeviri satırının karşılığının ürün ve makine
// dosyalarında bulunduğu kontrol edilir.
/**
 * Ger\u00E7ek CSV ayr\u0131\u015Ft\u0131r\u0131c\u0131 (RFC 4180, ayra\u00E7 ";").
 *
 * 2026-11-16 d\u00FCzeltmesi: eski naif `split(";")`, a\u00E7\u0131klama ve not alanlar\u0131ndaki
 * noktal\u0131 virg\u00FClde ("...\u00FCretilir; sipari\u015F \u00F6ncesinde...") kolonlar\u0131 kayd\u0131r\u0131yor
 * ve \u00C7EVR\u0130MDI\u015EI \u00F6n kontrolde sahte hata \u00FCretiyordu. G\u00F6nderilen dosya zaten
 * `parseUploadedFile` ile do\u011Fru ayr\u0131\u015Ft\u0131r\u0131l\u0131yordu; hata yaln\u0131zca \u00F6n kontroldeydi.
 */
const csvAyristir = (metin) => {
  const satirlar = [];
  let alan = "", satir = [], tirnakIcinde = false;
  const t = metin.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (tirnakIcinde) {
      if (c === '"') {
        if (t[i + 1] === '"') { alan += '"'; i++; }
        else tirnakIcinde = false;
      } else alan += c;
    } else if (c === '"') {
      tirnakIcinde = true;
    } else if (c === ";") {
      satir.push(alan); alan = "";
    } else if (c === "\n") {
      satir.push(alan); satirlar.push(satir); satir = []; alan = "";
    } else if (c !== "\r") {
      alan += c;
    }
  }
  if (alan !== "" || satir.length) { satir.push(alan); satirlar.push(satir); }
  return satirlar.filter((s) => s.some((x) => x !== ""));
};

const csvOku = (dosya) => {
  const satirlar = csvAyristir(readFileSync(path.join(VERI, dosya), "utf-8"));
  const baslik = satirlar[0].map((h) => h.trim());
  return satirlar.slice(1).map((h) =>
    Object.fromEntries(baslik.map((b, i) => [b, (h[i] ?? "").trim()])),
  );
};
const norm = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const dosyaUrun = csvOku(SET.urunler);
const dosyaMakine = csvOku(SET.makineler);
const dosyaUyum = csvOku(SET.uyumluluk);
const dosyaCeviri = csvOku(SET.ceviriler);

const urunKume = new Set(dosyaUrun.map((r) => norm(r.partNumber)));
/*
 * Makine kumesi = DOSYADAKI yeni makineler + VERITABANINDA ZATEN OLANLAR.
 *
 * Makine dosyasi bilerek yalnizca YENI makineleri icerir (mukerrer onlemi).
 * Yalnizca dosyaya bakan bir kontrol, veritabanindaki makineye isaret eden
 * her uyumluluk satirini yanlislikla "bulunamadi" sayardi.
 */
const makineKume = new Set(
  dosyaMakine.map((r) => `${norm(r.manufacturer)}|${norm(r.model)}|${norm(r.type)}`)
);
const dbMakineler = await (await api("/api/admin/machines?limit=500")).json();
let dbMakineSayisi = 0;
for (const m of dbMakineler.data ?? []) {
  makineKume.add(`${norm(m.manufacturerName)}|${norm(m.model)}|${norm(m.type)}`);
  dbMakineSayisi++;
}
const varyantKume = new Set(
  dosyaMakine.filter((r) => r.variantName)
    .map((r) => `${norm(r.manufacturer)}|${norm(r.model)}|${norm(r.type)}|${norm(r.variantName)}`)
);

const ok = { uyumUrun: [], uyumMakine: [], uyumVaryant: [], ceviriUrun: [], kaynaksiz: [], yayinda: [] };
for (const [i, r] of dosyaUyum.entries()) {
  const satir = i + 2;
  if (!urunKume.has(norm(r.partNumber))) ok.uyumUrun.push(`${satir}: ${r.partNumber}`);
  const mk = `${norm(r.manufacturer)}|${norm(r.model)}|${norm(r.type)}`;
  if (!makineKume.has(mk)) ok.uyumMakine.push(`${satir}: ${r.manufacturer} ${r.model}`);
  if (r.variantName && !varyantKume.has(`${mk}|${norm(r.variantName)}`) && !makineKume.has(mk)) {
    ok.uyumVaryant.push(`${satir}: ${r.variantName}`);
  }
  // Dogrulanmis uyum KAYNAKSIZ olamaz (kullanici karari).
  if (String(r.verified).toLowerCase() === "true" && !String(r.source).trim()) {
    ok.kaynaksiz.push(`${satir}: ${r.partNumber}`);
  }
}
for (const [i, r] of dosyaCeviri.entries()) {
  const satir = i + 2;
  if (!urunKume.has(norm(r.partNumber))) ok.ceviriUrun.push(`${satir}: ${r.partNumber}`);
  // Ceviri varsayilan olarak YAYIN DISI olmak zorunda.
  if (String(r.published).toLowerCase() !== "false") ok.yayinda.push(`${satir}: ${r.partNumber}`);
}
// Urun dosyasinda dogrulanmamis URETICI iddiasi olmamali.
const ureticiIddiasi = dosyaUrun.filter((r) => String(r.partManufacturer).trim()).map((r) => r.partNumber);
// seo_ready / verified kolonu urun dosyasinda hic bulunmamali.
const yasakli = Object.keys(dosyaUrun[0] ?? {}).filter((k) => /seoReady|verified/i.test(k));

console.log(`── 0. ON KONTROL (cevrimdisi) ${"─".repeat(26)}`);
console.log(`   urun=${dosyaUrun.length} makine=${dosyaMakine.length} (dosya) + ${dbMakineSayisi} (veritabani) uyumluluk=${dosyaUyum.length} ceviri=${dosyaCeviri.length}`);
const satirlar = [
  ["uyumluluk -> urun dosyasinda bulunamayan", ok.uyumUrun],
  ["uyumluluk -> makine dosyasinda bulunamayan", ok.uyumMakine],
  ["uyumluluk -> varyant bulunamayan", ok.uyumVaryant],
  ["uyumluluk -> dogrulanmis ama KAYNAKSIZ", ok.kaynaksiz],
  ["ceviri -> urun dosyasinda bulunamayan", ok.ceviriUrun],
  ["ceviri -> published=false DEGIL", ok.yayinda],
  ["urun -> dogrulanmamis uretici iddiasi", ureticiIddiasi],
  ["urun -> yasakli kolon (seoReady/verified)", yasakli],
];
let onTemiz = true;
for (const [ad, liste] of satirlar) {
  const n = liste.length;
  if (n > 0) onTemiz = false;
  console.log(`   ${n === 0 ? "OK " : "!! "}${ad.padEnd(44)} ${n}${n ? " -> " + liste.slice(0, 4).join(" | ") : ""}`);
}
console.log("");

const sonuclar = {};
sonuclar.onKontrol = onTemiz;
if (MODE === "ceviri") {
  console.log("   (1-3. asamalar atlandi - yalnizca ceviriler calistiriliyor)\n");
} else {
  sonuclar.makineler = rapor("1. MAKINELER", await importEt("machines", SET.makineler));
  await bekle(2500);
  sonuclar.urunler = rapor("2. URUNLER", await importEt("products", SET.urunler));
  await bekle(2500);
  sonuclar.uyumluluk = rapor("3. UYUMLULUK", await importEt("fitments", SET.uyumluluk));
  await bekle(2500);
}

// ── Çeviriler ────────────────────────────────────────────────────────────────
// Toplu uç nokta yok; ürün başına mevcut uç nokta kullanılır. Dry-run'da
// yalnızca eşleşme kontrol edilir, yazma yapılmaz.
console.log(`── 4. CEVIRILER ${"─".repeat(40)}`);
const ceviriMetin = readFileSync(path.join(VERI, SET.ceviriler), "utf-8");
const ceviriSatirlar = ceviriMetin.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
const ceviriBaslik = ceviriSatirlar[0].split(";").map((h) => h.trim().replace(/^"|"$/g, ""));
const ceviriler = ceviriSatirlar.slice(1).map((satir) => {
  const hucreler = satir.split(";").map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
  return Object.fromEntries(ceviriBaslik.map((h, i) => [h, hucreler[i] ?? ""]));
});

const urunler = await (await api("/api/admin/products?limit=200")).json();
const normalize = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const idByPn = new Map((urunler.data ?? []).map((p) => [normalize(p.partNumber), p.id]));

let eslesen = 0, eslesmeyen = [], yazilan = 0, ceviriHata = [];
for (const c of ceviriler) {
  const id = idByPn.get(normalize(c.partNumber));
  if (!id) { eslesmeyen.push(c.partNumber); continue; }
  eslesen++;
  if (!YAZ) continue;
  // UC NOKTA SOZLESMESI: PUT (POST degil). (productId, locale) uzerinde
  // UPSERT yapar — tekrar calistirmak MUKERRER KAYIT URETMEZ.
  const r = await api(`/api/admin/products/${id}/translations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locale: c.locale,
      name: c.name,
      metaTitle: c.metaTitle || null,
      // YAYIN DISI — kullanici karari. Ceviri hicbir sekilde otomatik yayina girmez.
      published: false,
    }),
  });
  if (r.ok) yazilan++;
  else ceviriHata.push(`${c.partNumber}: ${r.status} ${(await r.text()).slice(0, 120)}`);
}
console.log(`   dosyadaki ceviri   : ${ceviriler.length}`);
console.log(`   urunu bulunan      : ${eslesen}`);
console.log(`   urunu BULUNAMAYAN  : ${eslesmeyen.length}${eslesmeyen.length ? " -> " + eslesmeyen.slice(0, 8).join(", ") : ""}`);
if (YAZ) {
  console.log(`   yazilan (published=false): ${yazilan}`);
  if (ceviriHata.length) {
    console.log(`   HATA (${ceviriHata.length}):`);
    for (const h of ceviriHata.slice(0, 8)) console.log(`      ${h}`);
  }
}
if (YAZ) {
  sonuclar.ceviriler = eslesmeyen.length === 0 && ceviriHata.length === 0;
} else {
  // Dry-run'da urunler HENUZ YAZILMADIGI icin eslesmeme BEKLENEN durumdur;
  // bu asama pass/fail olarak sayilmaz, bilgi amaclidir.
  console.log("   NOT: dry-run'da urunler henuz yazilmadigi icin eslesmeme BEKLENIR.");
  sonuclar.ceviriler = true;
}
console.log("");

console.log("══ SONUC ══════════════════════════════════════════════════");
for (const [k, v] of Object.entries(sonuclar)) {
  console.log(`   ${k.padEnd(12)} ${v ? "TEMIZ" : "SORUNLU"}`);
}
const tumu = Object.values(sonuclar).every(Boolean);
console.log(`\n   ${tumu ? "Tum asamalar temiz." : "EN AZ BIR ASAMA SORUNLU — durulmali."}`);
process.exit(tumu ? 0 : 2);
