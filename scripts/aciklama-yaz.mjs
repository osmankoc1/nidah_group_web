/**
 * ONAYLI AÇIKLAMALARI VERİTABANINA YAZAR — hedef bağımsız, geri alınabilir.
 *
 * `faz3-taslak-yaz.mjs`'in yerine geçer. Oradaki "development mı?" testi
 * SENTETİK TEST KAYDI VARLIĞINA bakıyordu; production'da da bir TEST kaydı
 * bulunduğu için (TEST-0000) o test GÜVENİLİR DEĞİL. Burada hedef AÇIKÇA
 * bildirilir:
 *
 *   --taban http://localhost:3001            → yerel, ek bayrak gerekmez
 *   --taban https://www.nidahgroup.com.tr    → PRODUCTION, `--production` ZORUNLU
 *
 * YALNIZCA `longDescription` gönderilir. PATCH ucu istekte bulunmayan alana
 * dokunmaz; `seo_ready`, `stock_status`, `part_manufacturer`, çeviriler ve
 * uyumluluklar DEĞİŞMEZ — ve bu, yazmadan SONRA tek tek doğrulanır.
 *
 * SIRA (hiçbiri atlanamaz):
 *   1. Ürün listesi okunur; listedeki her parça numarasının veritabanında
 *      bulunduğu doğrulanır. Bir tanesi eksikse HİÇ yazma yapılmaz.
 *   2. Sentetik (TEST/ATOM) kayıt listede varsa HİÇ yazma yapılmaz.
 *   3. `--beklenen` verilirse adet birebir eşleşmeli.
 *   4. TÜM ürünlerin mevcut açıklaması okunur ve geri dönüş dosyasına YAZILIR;
 *      yazma ancak bu dosya diske indikten sonra başlar.
 *   5. Her yazma sonrası metin eşitliği ve yan etki yokluğu doğrulanır;
 *      ilk hatada durulur (`--devam` ile sürdürülebilir).
 *
 * GERİ ALMA:
 *   node scripts/aciklama-yaz.mjs --taban <url> --kimlik <dosya> \
 *     --geri-al <geri-donus-eski-aciklamalar.json> --apply [--production]
 *
 * GİZLİLİK: kimlik dosyasının YOLU dışında hiçbir değer yazdırılmaz; hata
 * çıktısında yalnızca HTTP durum kodu ve gövdenin ilk 150 karakteri geçer.
 *
 * Kullanım:
 *   node scripts/aciklama-yaz.mjs --taban <url> --kimlik <env-dosyasi> \
 *     --liste scripts/veri/onayli-aciklamalar-28.json --beklenen 28 \
 *     --cikti <dizin> [--apply] [--production] [--devam]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

// ── Argümanlar ──────────────────────────────────────────────────────────────
const arg = (ad) => {
  const i = process.argv.indexOf(ad);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const bayrak = (ad) => process.argv.includes(ad);

const TABAN = arg("--taban");
const KIMLIK = arg("--kimlik");
const LISTE = arg("--liste");
const GERI_AL = arg("--geri-al");
const BEKLENEN = arg("--beklenen") ? Number(arg("--beklenen")) : null;
const CIKTI_ARG = arg("--cikti") ?? ".";
const APPLY = bayrak("--apply");
const PRODUCTION = bayrak("--production");
const DEVAM = bayrak("--devam");
const OUT = /[/\\]$/.test(CIKTI_ARG) ? CIKTI_ARG : CIKTI_ARG + "/";

const dur = (m) => {
  console.error("DURDURULDU: " + m);
  process.exit(1);
};

if (!TABAN) dur("--taban zorunlu (ör. http://localhost:3001)");
if (!KIMLIK) dur("--kimlik zorunlu (ADMIN_USERNAME / ADMIN_PASSWORD iceren dosya)");
if (!LISTE && !GERI_AL) dur("--liste veya --geri-al zorunlu");
if (LISTE && GERI_AL) dur("--liste ve --geri-al birlikte kullanilamaz");
if (!existsSync(KIMLIK)) dur("kimlik dosyasi bulunamadi: " + KIMLIK);

let host;
try {
  host = new URL(TABAN).hostname;
} catch {
  dur("--taban gecerli bir URL degil");
}
const YEREL = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
if (!YEREL && !PRODUCTION) {
  dur(`hedef yerel degil (${host}). Production'a yazmak icin --production bayragi ZORUNLU.`);
}
if (!YEREL && !APPLY) console.log("NOT: hedef production ama --apply yok -> yalnizca prova.\n");

// ── Kimlik (hiçbir değer yazdırılmaz) ───────────────────────────────────────
function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(anahtar + "="));
  if (!satir) dur(`${path.basename(dosya)} icinde ${anahtar} yok`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

const giris = await fetch(`${TABAN}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: env(KIMLIK, "ADMIN_USERNAME"),
    password: env(KIMLIK, "ADMIN_PASSWORD"),
  }),
});
if (!giris.ok) dur(`giris basarisiz (HTTP ${giris.status}). Sunucu ayakta mi, kimlik dogru mu?`);
const cookie = (giris.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) dur("oturum cookie'si alinamadi");
const api = (yol, init = {}) =>
  fetch(`${TABAN}${yol}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });

// ── 1. Ürün listesi ─────────────────────────────────────────────────────────
const urunler = [];
for (let sayfa = 1; sayfa <= 100; sayfa++) {
  const y = await api(`/api/admin/products?limit=100&page=${sayfa}`);
  if (!y.ok) dur(`urun listesi okunamadi (sayfa ${sayfa}): HTTP ${y.status}`);
  const d = (await y.json()).data ?? [];
  urunler.push(...d);
  if (d.length < 100) break;
}
const idByPn = new Map(urunler.map((p) => [p.partNumber, p.id]));
console.log(`hedef   : ${host}${YEREL ? " (yerel)" : " (PRODUCTION)"}`);
console.log(`veritabanindaki urun: ${urunler.length}`);

const liste = JSON.parse(readFileSync(GERI_AL ?? LISTE, "utf-8")).map((k) => ({
  partNumber: k.partNumber,
  longDescription: GERI_AL ? k.eskiLongDescription ?? null : k.longDescription,
  beklenenKarakter: k.beklenenKarakter ?? null,
}));
console.log(`liste   : ${liste.length} kayit${GERI_AL ? " (GERI ALMA)" : ""}`);

// ── 2. Ön doğrulamalar ──────────────────────────────────────────────────────
const sorun = [];
if (BEKLENEN != null && liste.length !== BEKLENEN) {
  sorun.push(`liste ${liste.length}, beklenen ${BEKLENEN}`);
}
const gorulen = new Set();
for (const k of liste) {
  if (gorulen.has(k.partNumber)) sorun.push(`${k.partNumber}: mukerrer`);
  gorulen.add(k.partNumber);
  if (/^(TEST|ATOM)[-\s]/i.test(k.partNumber) || k.partNumber === "0012345") {
    sorun.push(`${k.partNumber}: sentetik kayit`);
  }
  if (!idByPn.has(k.partNumber)) sorun.push(`${k.partNumber}: veritabaninda YOK`);
  if (!GERI_AL) {
    if (typeof k.longDescription !== "string" || !k.longDescription.trim()) {
      sorun.push(`${k.partNumber}: aciklama bos`);
    } else if (k.beklenenKarakter != null && k.longDescription.length !== k.beklenenKarakter) {
      sorun.push(`${k.partNumber}: ${k.longDescription.length} karakter, beklenen ${k.beklenenKarakter}`);
    }
  }
}
if (sorun.length) {
  console.error(`\nON DOGRULAMA DUSTU (${sorun.length}) — hicbir yazma yapilmadi:`);
  for (const s of sorun) console.error("  - " + s);
  process.exit(1);
}
console.log("on dogrulama: TAMAM (adet, mukerrer, sentetik, varlik, karakter)");
console.log(`mod     : ${APPLY ? "APPLY — YAZILACAK" : "PROVA — yazma yok"}\n`);

// ── 3. Mevcut durumu oku (geri dönüş) ───────────────────────────────────────
const mevcutlar = new Map();
for (const k of liste) {
  const y = await api(`/api/admin/products/${idByPn.get(k.partNumber)}`);
  if (!y.ok) dur(`${k.partNumber} okunamadi: HTTP ${y.status}`);
  mevcutlar.set(k.partNumber, (await y.json()).data);
}
const geriDonus = liste.map((k) => ({
  partNumber: k.partNumber,
  id: idByPn.get(k.partNumber),
  eskiLongDescription: mevcutlar.get(k.partNumber).longDescription ?? null,
}));
const geriYol = OUT + (GERI_AL ? "geri-alma-oncesi.json" : "geri-donus-eski-aciklamalar.json");
writeFileSync(geriYol, JSON.stringify(geriDonus, null, 1) + "\n", "utf8");
console.log(`geri donus dosyasi yazildi: ${geriYol}`);

// ── 4. Yazma ────────────────────────────────────────────────────────────────
const YAN_ETKI_ALANLARI = ["seoReady", "stockStatus", "partManufacturer", "partNumber", "name", "isActive"];
const sonuc = [];
let yazilan = 0;
let hatali = 0;

for (const k of liste) {
  const once = mevcutlar.get(k.partNumber);
  const eskiUz = (once.longDescription ?? "").length;
  const yeniUz = (k.longDescription ?? "").length;

  if (!APPLY) {
    sonuc.push({
      partNumber: k.partNumber, durum: "PROVA", eskiUzunluk: eskiUz, yeniUzunluk: yeniUz,
      seoReady: once.seoReady, stockStatus: once.stockStatus, isActive: once.isActive,
    });
    continue;
  }

  const y = await api(`/api/admin/products/${idByPn.get(k.partNumber)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longDescription: k.longDescription }),
  });
  if (!y.ok) {
    sonuc.push({
      partNumber: k.partNumber, durum: `HATA - PATCH ${y.status}`,
      detay: (await y.text()).slice(0, 150),
    });
    hatali++;
    if (!DEVAM) {
      console.error(`\nILK HATADA DURULDU: ${k.partNumber}`);
      break;
    }
    continue;
  }
  const sonra = (await y.json()).data;
  const metinTamam = (sonra.longDescription ?? null) === (k.longDescription ?? null);
  const yanEtki = YAN_ETKI_ALANLARI.filter((alan) => sonra[alan] !== once[alan]);
  const durum = metinTamam && yanEtki.length === 0
    ? "YAZILDI"
    : yanEtki.length
      ? `HATA - YAN ETKI: ${yanEtki.join(",")}`
      : "HATA - metin uyusmadi";
  sonuc.push({
    partNumber: k.partNumber, durum, eskiUzunluk: eskiUz,
    yeniUzunluk: (sonra.longDescription ?? "").length,
    seoReady: sonra.seoReady, stockStatus: sonra.stockStatus, isActive: sonra.isActive,
  });
  if (durum === "YAZILDI") {
    yazilan++;
  } else {
    hatali++;
    if (!DEVAM) {
      console.error(`\nILK HATADA DURULDU: ${k.partNumber} — ${durum}`);
      break;
    }
  }
}

const csv = (rows, cols) =>
  [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";")),
  ].join("\r\n");
const csvYol = OUT + "yazma-sonucu.csv";
writeFileSync(
  csvYol,
  "﻿" + csv(sonuc, ["partNumber", "durum", "eskiUzunluk", "yeniUzunluk", "seoReady", "stockStatus", "isActive", "detay"]),
  "utf8"
);

console.log(`\nliste  : ${liste.length}`);
if (APPLY) {
  console.log(`YAZILDI: ${yazilan}`);
  console.log(`HATALI : ${hatali}`);
} else {
  console.log("PROVA  : yazma yapilmadi");
}
console.log(`\n${csvYol} yazildi`);
if (hatali) {
  console.log("\n=== HATALILAR ===");
  for (const s of sonuc.filter((x) => String(x.durum).startsWith("HATA"))) {
    console.log(`  ${s.partNumber} ${s.durum} ${s.detay ?? ""}`);
  }
  console.log(`\nGeri alma: node scripts/aciklama-yaz.mjs --taban ${TABAN} --kimlik <dosya> --geri-al ${geriYol} --apply${PRODUCTION ? " --production" : ""}`);
  process.exit(1);
}
