/**
 * v18 adaylarından TOPLU AKTARIM dosyası hazırlar. SALT OKUNUR —
 * production'a yazmaz; yalnızca yerel dosya üretir.
 *
 * GİRDİ : scripts/veri/v18-aday-ham.json  (v18-aktarim-aday.mjs çıktısı)
 * ÇIKTI : scripts/veri/v18-aktarim-<N>.json   — aktarılacak satırlar
 *         scripts/veri/v18-aktarim-<N>.xlsx   — panelden yüklenecek dosya
 *         scripts/veri/v18-cakisma-raporu.json — ELLE karar bekleyen kümeler
 *
 * ── MÜKERRER KAYIT OLUŞTURMA KURALI ───────────────────────────────────────
 * Veritabanında normalize parça numarası BENZERSİZDİR (`uq_products_pn_norm`).
 * Aday kümesinde aynı normalize numaraya düşen birden çok Logo satırı varsa
 * bunlar TEK ürüne denk gelir ya da ayrı ürünlerdir — bu bir insan kararıdır
 * ve TAHMİN EDİLMEZ. Böyle kümelerin TAMAMI aktarımdan çıkarılır ve ayrı
 * raporlanır. Aktarım dosyası yalnızca tek Logo satırına karşılık gelen,
 * benzersiz numaralı ürünleri taşır.
 *
 * ── AÇIKLAMA METNİ AKTARILMAZ ─────────────────────────────────────────────
 * `Taslak Açıklama` yalnızca Seviye 1 satırlarında dolu ve ONAYLANMAMIŞ bir
 * taslaktır. Yayın metinleri tek tek onaydan geçer (docs/17, docs/34), bu
 * yüzden aktarım dosyasına açıklama kolonu HİÇ KONULMAZ: aktarım kaydı
 * oluşturur, yayını içerik onayı açar.
 *
 * Kullanım: node scripts/v18-aktarim-hazirla.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const aday = JSON.parse(readFileSync("scripts/veri/v18-aday-ham.json", "utf-8"));
console.log("aday: " + aday.length);

// ── 1. Ad ve numara bütünlüğü ─────────────────────────────────────────────
const adsiz = aday.filter((a) => !a.adTR);
const numarasiz = aday.filter((a) => !N(a.partNumber));
console.log("adi BOS olan: " + adsiz.length + " | numarasi bos olan: " + numarasiz.length);

const saglam = aday.filter((a) => a.adTR && N(a.partNumber));

// ── 2. Normalize numara çakışma kümeleri ──────────────────────────────────
const kumeler = new Map();
for (const a of saglam) {
  const k = N(a.partNumber);
  if (!kumeler.has(k)) kumeler.set(k, []);
  kumeler.get(k).push(a);
}
const cakisan = [...kumeler.entries()].filter(([, l]) => l.length > 1);
const cakismaSatiri = cakisan.reduce((t, [, l]) => t + l.length, 0);
console.log("cakisan kume: " + cakisan.length + " | bu kumelerdeki satir: " + cakismaSatiri);

const cakismaRaporu = cakisan.map(([norm, l]) => ({
  normalizeNumara: norm,
  satirSayisi: l.length,
  satirlar: l.map((a) => ({
    kimlik: a.kimlik,
    logoKodu: a.logoKodu,
    partNumber: a.partNumber,
    adTR: a.adTR,
    markaIpucu: a.markaIpucu,
    makineler: a.makineler,
  })),
  karar:
    "ELLE İNCELEME: aynı normalize numaraya düşen birden çok Logo satırı. " +
    "Tek ürün mü, ayrı ürünler mi olduğu kaynakla teyit edilmeli. " +
    "Otomatik birleştirme YAPILMADI, aktarıma alınmadı.",
}));
writeFileSync("scripts/veri/v18-cakisma-raporu.json", JSON.stringify(cakismaRaporu, null, 1), "utf-8");

// ── 3. Logo stok kodu çakışması (uyarı, dışlama değil) ────────────────────
const kodKume = new Map();
for (const a of saglam) {
  const k = N(a.logoKodu);
  if (!k) continue;
  if (!kodKume.has(k)) kodKume.set(k, []);
  kodKume.get(k).push(a.partNumber);
}
const kodCakisan = [...kodKume.entries()].filter(([, l]) => l.length > 1);
console.log("ayni Logo koduna dusen aday kumesi: " + kodCakisan.length);

// ── 4. Aktarım kümesi ─────────────────────────────────────────────────────
const aktarim = [...kumeler.entries()]
  .filter(([, l]) => l.length === 1)
  .map(([, [a]]) => a)
  .sort((x, y) => x.partNumber.localeCompare(y.partNumber, "tr"));

console.log("AKTARIM: " + aktarim.length + " urun");
const seviye = new Map();
const marka = new Map();
for (const a of aktarim) {
  seviye.set(a.seviye, (seviye.get(a.seviye) ?? 0) + 1);
  marka.set(a.markaIpucu || "(bos)", (marka.get(a.markaIpucu || "(bos)") ?? 0) + 1);
}
console.log("  seviye: " + JSON.stringify([...seviye]));
console.log("  marka:");
for (const [m, s] of [...marka].sort((a, b) => b[1] - a[1])) {
  console.log("    " + String(s).padStart(4) + "  " + m);
}

const ad = "scripts/veri/v18-aktarim-" + aktarim.length;
writeFileSync(ad + ".json", JSON.stringify(aktarim, null, 1), "utf-8");

/*
 * Panel dosyası — YALNIZCA üç kolon.
 *
 * `partNumber`         : görünen kanonik katalog referansı
 * `name`               : v18 "Teknik Ad TR" (kaynaklı teknik ad)
 * `internalStockCode`  : orijinal Logo stok kodu (İÇ KULLANIM, public değil)
 *
 * Açıklama, marka, temin niteliği ve stok kolonları BİLİNÇLİ OLARAK YOK:
 * dosyada olmayan kolon mevcut kayıtlara dokunmaz ve doğrulanmamış iddia
 * taşımaz. `is_active` ve `seo_ready` import yüzeyinde zaten yoktur.
 */
const satirlar = aktarim.map((a) => ({
  partNumber: a.partNumber,
  name: a.adTR,
  internalStockCode: a.logoKodu,
}));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), "Urunler");
XLSX.writeFile(wb, ad + ".xlsx");
console.log("yazildi: " + ad + ".json  ve  " + ad + ".xlsx");
console.log("yazildi: scripts/veri/v18-cakisma-raporu.json (" + cakismaRaporu.length + " kume)");
