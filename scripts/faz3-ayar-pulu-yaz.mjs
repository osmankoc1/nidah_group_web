/**
 * Üç kavrama ayar pulunun DEVELOPMENT veritabanındaki açıklamasını ve notunu
 * günceller. Yalnızca bu üç ürüne, yalnızca iki alana dokunur.
 *
 * Güvenlik:
 *   · Hedefin development olduğu doğrulanmadan hiçbir şey yazılmaz.
 *   · Yazmadan ÖNCE mevcut değerler geri dönüş dosyasına kaydedilir.
 *   · Her yazımdan sonra kaydın TEK TEK yan etki kontrolü yapılır:
 *     seo_ready, stock_status, is_active, part_number değişmemiş olmalı.
 *   · `dry-run` modunda hiçbir istek POST/PATCH edilmez.
 *
 * Kullanım:
 *   node scripts/faz3-ayar-pulu-yaz.mjs dry-run
 *   node scripts/faz3-ayar-pulu-yaz.mjs apply
 */
import { readFileSync, writeFileSync } from "node:fs";

const MODE = process.argv[2];
if (!["dry-run", "apply"].includes(MODE)) {
  console.error("Kullanim: node scripts/faz3-ayar-pulu-yaz.mjs <dry-run|apply>");
  process.exit(1);
}
const BASE = "http://localhost:3001";
const VERI = "C:/Users/HP/Desktop/OSKO_PLANLAMA/nidah_faz3_veri";
const HEDEFLER = ["61963-00900", "61963-01100", "61963-01200"];

const NOT = (kalinlik) =>
  `KALINLIK TEYIT EDILDI (2026-11-16): ureticinin MG530 opsiyonel parca ` +
  `katalogu 98160-45930, Grup 63 "Blade Slip Clutch", cizim 160459-02, ` +
  `sayfa 173, kalem 9 -> bu referans ${kalinlik}. Katalog sayfasi goruntu ` +
  `olarak okunarak dogrulandi (pdftotext metni bir satir kaymisti). ` +
  `Deger katalogdan alinmistir, parca uzerinde OLCULMEMISTIR.`;

const KALINLIK = {
  "61963-00900": "1 mm (A/R T=1)",
  "61963-01100": "0,5 mm (A/R T=0.5)",
  "61963-01200": "0,2 mm (A/R T=0.2)",
};

function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8").split(/\r?\n/).find((l) => l.startsWith(anahtar + "="));
  if (!satir) throw new Error(`${dosya} icinde ${anahtar} yok`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

const girisYanit = await fetch(`${BASE}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: env(".env.development.local", "ADMIN_USERNAME"),
    password: env(".env.development.local", "ADMIN_PASSWORD"),
  }),
});
if (!girisYanit.ok) {
  console.error(`Giris basarisiz (${girisYanit.status}). Dev sunucusu calisiyor mu?`);
  process.exit(1);
}
const cookie = (girisYanit.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
const api = (yol, init = {}) =>
  fetch(`${BASE}${yol}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });

// -- Hedef development mi? ---------------------------------------------------
const testArama = await (await api("/api/admin/products?search=TEST&limit=100")).json();
const sentetik = (testArama.data ?? []).filter((p) => /^(TEST|ATOM)[-\s]/i.test(p.partNumber)).length;
if (sentetik === 0) {
  console.error("DURDURULDU: sentetik TEST kaydi yok — bu development olmayabilir.");
  process.exit(1);
}
console.log(`hedef: ${BASE} | sentetik TEST kaydi=${sentetik} | mod: ${MODE}\n`);

// -- Taslaklar ---------------------------------------------------------------
const taslaklar = JSON.parse(readFileSync(`${VERI}/A3_taslaklar_57.json`, "utf-8"));
const taslakByPn = new Map(taslaklar.map((t) => [t.pn, t]));

for (const pn of HEDEFLER) {
  const t = taslakByPn.get(pn);
  if (!t) { console.error(`DURDURULDU: ${pn} taslak dosyasinda yok.`); process.exit(1); }
  if (!/ölçülmemiştir/.test(t.taslak)) {
    console.error(`DURDURULDU: ${pn} taslaginda "olculmemistir" ibaresi yok.`);
    process.exit(1);
  }
  if (t.taslak.length < 300) { console.error(`DURDURULDU: ${pn} taslagi 300 karakterden kisa.`); process.exit(1); }
}

// -- Mevcut durum ve geri donus ----------------------------------------------
const geriDonus = [];
const islemler = [];
for (const pn of HEDEFLER) {
  const q = await (await api(`/api/admin/products?search=${encodeURIComponent(pn)}&limit=10`)).json();
  const liste = (q.data ?? []).filter((p) => p.partNumber === pn);
  if (liste.length !== 1) {
    console.error(`DURDURULDU: ${pn} icin ${liste.length} kayit bulundu (1 bekleniyordu).`);
    process.exit(1);
  }
  const ozet = liste[0];
  const tam = await (await api(`/api/admin/products/${ozet.id}`)).json();
  const urun = tam.data ?? tam;
  geriDonus.push({
    partNumber: pn,
    id: ozet.id,
    longDescription: urun.longDescription ?? null,
    notes: urun.notes ?? null,
  });
  islemler.push({
    pn, id: ozet.id,
    eskiUzunluk: (urun.longDescription ?? "").length,
    yeniUzunluk: taslakByPn.get(pn).taslak.length,
    eskiNot: (urun.notes ?? "").slice(0, 40),
    oncesi: { seoReady: ozet.seoReady, stockStatus: ozet.stockStatus, isActive: ozet.isActive },
  });
}

console.log("── YAZILACAKLAR ──────────────────────────────────────────");
for (const i of islemler) {
  console.log(`  ${i.pn}  aciklama ${i.eskiUzunluk} -> ${i.yeniUzunluk} karakter | eski not: "${i.eskiNot}…"`);
}
console.log("");

if (MODE === "dry-run") {
  console.log("dry-run: hicbir yazma yapilmadi.");
  process.exit(0);
}

writeFileSync(`${VERI}/A7_ayar_pulu_geri_donus.json`, JSON.stringify(geriDonus, null, 1), "utf8");
console.log(`geri donus dosyasi yazildi: A7_ayar_pulu_geri_donus.json (${geriDonus.length} kayit)\n`);

// -- Yazim -------------------------------------------------------------------
let basarili = 0;
for (const i of islemler) {
  const t = taslakByPn.get(i.pn);
  const r = await api(`/api/admin/products/${i.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longDescription: t.taslak, notes: NOT(KALINLIK[i.pn]) }),
  });
  if (r.status !== 200) {
    console.error(`  ${i.pn}  HATA HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    continue;
  }
  // Yan etki kontrolu
  const q = await (await api(`/api/admin/products?search=${encodeURIComponent(i.pn)}&limit=10`)).json();
  const s = (q.data ?? []).find((p) => p.partNumber === i.pn);
  const tam = await (await api(`/api/admin/products/${i.id}`)).json();
  const urun = tam.data ?? tam;
  const sorunlar = [];
  if (s.seoReady !== i.oncesi.seoReady) sorunlar.push("seoReady DEGISTI");
  if (s.stockStatus !== i.oncesi.stockStatus) sorunlar.push("stockStatus DEGISTI");
  if (s.isActive !== i.oncesi.isActive) sorunlar.push("isActive DEGISTI");
  if ((urun.longDescription ?? "").length !== i.yeniUzunluk) sorunlar.push("aciklama uzunlugu tutmadi");
  if (!/ölçülmemiştir/.test(urun.longDescription ?? "")) sorunlar.push("olculmemistir ibaresi yok");
  if (!/KALINLIK TEYIT EDILDI/.test(urun.notes ?? "")) sorunlar.push("not yazilmadi");

  console.log(`  ${i.pn}  HTTP 200  aciklama=${(urun.longDescription ?? "").length} kr  ` +
    `seoReady=${s.seoReady} stock=${s.stockStatus} isActive=${s.isActive}  ` +
    (sorunlar.length ? `!! ${sorunlar.join(", ")}` : "yan etki yok"));
  if (!sorunlar.length) basarili++;
}

console.log(`\nSONUC: ${basarili}/${HEDEFLER.length} kayit temiz yazildi.`);
if (basarili !== HEDEFLER.length) process.exit(1);
