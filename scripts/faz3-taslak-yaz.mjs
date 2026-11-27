/**
 * Doğrulanmış taslakları DEVELOPMENT veritabanına yazar.
 *
 * YALNIZCA `longDescription` alanı gönderilir. PATCH uç noktası istekte
 * BULUNMAYAN alana dokunmadığı için `seo_ready`, `stock_status`,
 * `part_manufacturer`, çeviriler ve uyumluluklar DEĞİŞMEZ.
 *
 * Güvenlik kontrolleri (her biri olmadan yazma yapılmaz):
 *   · hedefin development olduğu doğrulanır (sentetik TEST kaydı var mı)
 *   · yazılacak ürün listesi `73_yazilacak_taslaklar.json` dosyasından gelir;
 *     bu dosya yalnızca "temiz + kaynak doğrulamasından geçti" ürünleri içerir
 *   · sentetik TEST/ATOM kayıtlarına ASLA yazılmaz
 *   · yazmadan önce her ürünün MEVCUT açıklaması kaydedilir (geri dönüş)
 *   · yazdıktan sonra her ürün tek tek okunup doğrulanır
 *
 * Kullanım:
 *   node scripts/faz3-taslak-yaz.mjs <73_yazilacak_taslaklar.json> <cikti-dizini> [--apply]
 *
 * `--apply` olmadan YALNIZCA ne yazılacağını gösterir (prova).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , listeYolu, outArg] = process.argv;
const APPLY = process.argv.includes("--apply");
if (!listeYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-taslak-yaz.mjs <liste.json> <cikti-dizini> [--apply]");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const BASE = "http://localhost:3001";
const liste = JSON.parse(readFileSync(listeYolu, "utf-8"));

function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8").split(/\r?\n/).find((l) => l.startsWith(anahtar + "="));
  if (!satir) throw new Error(`${path.basename(dosya)} icinde ${anahtar} yok`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

const giris = await fetch(`${BASE}/api/admin/auth`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: env(".env.development.local", "ADMIN_USERNAME"),
    password: env(".env.development.local", "ADMIN_PASSWORD"),
  }),
});
if (!giris.ok) { console.error(`Giris basarisiz (${giris.status}). Dev sunucusu calisiyor mu?`); process.exit(1); }
const cookie = (giris.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) { console.error("Oturum cookie'si alinamadi."); process.exit(1); }
const api = (yol, init = {}) => fetch(`${BASE}${yol}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });

// ── Hedef doğrulaması ────────────────────────────────────────────────────────
/*
 * Uc nokta limiti 100'de siniri (Math.min(100, ...)); tek istek 109 urunun
 * tamamini getirmiyor. Sayfalama olmadan listenin sonundaki urunler
 * "veritabaninda yok" sayilirdi.
 */
const urunler = [];
for (let sayfa = 1; sayfa <= 20; sayfa++) {
  const y = await api(`/api/admin/products?limit=100&page=${sayfa}`);
  if (!y.ok) { console.error(`urun listesi okunamadi (sayfa ${sayfa}): ${y.status}`); process.exit(1); }
  const j = await y.json();
  const d = j.data ?? [];
  urunler.push(...d);
  if (d.length < 100) break;
}
const sentetik = urunler.filter((p) => /^(TEST|ATOM)[-\s]/i.test(p.partNumber)).length;
console.log(`hedef: ${BASE} | urun=${urunler.length} | sentetik TEST kaydi=${sentetik}`);
if (sentetik === 0) {
  console.error("DURDURULDU: sentetik TEST kaydi yok — bu development veritabani olmayabilir.");
  process.exit(1);
}
console.log(`mod: ${APPLY ? "APPLY (yazilacak)" : "PROVA (yazma yok)"}\n`);

const idByPn = new Map(urunler.map((p) => [p.partNumber, p.id]));

// ── Yazma ────────────────────────────────────────────────────────────────────
const geriDonus = [], sonuc = [];
let yazilan = 0, atlanan = 0, hatali = 0;

for (const kayit of liste) {
  const pn = kayit.partNumber;
  // Sentetik kayda ASLA yazilmaz.
  if (/^(TEST|ATOM)[-\s]/i.test(pn) || pn === "0012345") {
    sonuc.push({ partNumber: pn, durum: "ATLANDI - sentetik kayit" });
    atlanan++; continue;
  }
  const id = idByPn.get(pn);
  if (!id) { sonuc.push({ partNumber: pn, durum: "ATLANDI - veritabaninda yok" }); atlanan++; continue; }

  // Mevcut aciklamayi oku (geri donus kaydi)
  const mevcutYanit = await api(`/api/admin/products/${id}`);
  if (!mevcutYanit.ok) { sonuc.push({ partNumber: pn, durum: `HATA - okuma ${mevcutYanit.status}` }); hatali++; continue; }
  const mevcut = (await mevcutYanit.json()).data;
  geriDonus.push({ partNumber: pn, id, eskiLongDescription: mevcut.longDescription ?? null });

  if (!APPLY) {
    sonuc.push({
      partNumber: pn, durum: "PROVA",
      eskiUzunluk: (mevcut.longDescription ?? "").length,
      yeniUzunluk: kayit.longDescription.length,
      seoReady: mevcut.seoReady, stockStatus: mevcut.stockStatus,
    });
    continue;
  }

  // YALNIZCA longDescription gonderilir.
  const yanit = await api(`/api/admin/products/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longDescription: kayit.longDescription }),
  });
  if (!yanit.ok) {
    sonuc.push({ partNumber: pn, durum: `HATA - PATCH ${yanit.status}`, detay: (await yanit.text()).slice(0, 150) });
    hatali++; continue;
  }
  const d = (await yanit.json()).data;
  // Yazdiktan sonra DOGRULA
  const tamam = d.longDescription === kayit.longDescription;
  const yanEtkiVar = d.seoReady !== mevcut.seoReady || d.stockStatus !== mevcut.stockStatus
    || d.partManufacturer !== mevcut.partManufacturer || d.partNumber !== mevcut.partNumber;
  sonuc.push({
    partNumber: pn,
    durum: tamam && !yanEtkiVar ? "YAZILDI" : (yanEtkiVar ? "HATA - YAN ETKI" : "HATA - metin uyusmadi"),
    eskiUzunluk: (mevcut.longDescription ?? "").length,
    yeniUzunluk: (d.longDescription ?? "").length,
    seoReady: d.seoReady, stockStatus: d.stockStatus,
  });
  if (tamam && !yanEtkiVar) yazilan++; else hatali++;
}

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "74_yazma_sonucu.csv", "﻿" + csv(sonuc,
  ["partNumber","durum","eskiUzunluk","yeniUzunluk","seoReady","stockStatus","detay"]), "utf8");
if (APPLY) {
  writeFileSync(OUT + "75_geri_donus_eski_aciklamalar.json", JSON.stringify(geriDonus, null, 1), "utf8");
}

console.log(`liste  : ${liste.length}`);
console.log(`YAZILDI: ${yazilan}`);
console.log(`atlanan: ${atlanan}`);
console.log(`HATALI : ${hatali}`);
if (hatali) {
  console.log(`\n=== HATALILAR ===`);
  for (const s of sonuc.filter((x) => x.durum.startsWith("HATA"))) {
    console.log(`  ${s.partNumber.padEnd(16)} ${s.durum} ${s.detay ?? ""}`);
  }
}
console.log(`\n74_yazma_sonucu.csv yazildi${APPLY ? " · 75_geri_donus_eski_aciklamalar.json yazildi" : ""}`);
