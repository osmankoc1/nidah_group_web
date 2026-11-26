/**
 * ONAYLI AÇIKLAMALARI BELGEDEN ÇIKARIR — tek kaynak: 17-ACIKLAMA-TASLAKLARI-42.md
 *
 * Neden belgeden: 28 metin kullanıcı onayından geçti ve Grup 2/3'ün onaylı
 * düzeltmeleri bu dosyaya geri yazıldı (bkz. 22-GRUP3-TASLAKLAR.md §Düzeltme).
 * Grup 4'ün 7 metni HENÜZ ONAYSIZ olduğu için 23-GRUP4-TASLAKLAR.md buraya
 * DAHİL EDİLMEZ; `--grup4` ile ayrı bir dosyaya çıkarılır.
 *
 * SAĞLAMA: her bölüm, belgede yazılı karakter sayısını taşır. Çıkarılan metnin
 * uzunluğu o sayıyla BİREBİR eşleşmezse script düşer — yani kopyalama hatası
 * veritabanına gidemez.
 *
 * Kullanım:
 *   node scripts/aciklama-cikar.mjs            # 28 onaylı -> scripts/veri/onayli-aciklamalar-28.json
 *   node scripts/aciklama-cikar.mjs --grup4    # 7 taslak  -> scripts/veri/grup4-taslak-7.json
 *   node scripts/aciklama-cikar.mjs --grup5    # 7 taslak  -> scripts/veri/grup5-taslak-7.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const G4 = process.argv.includes("--grup4");
const G5 = process.argv.includes("--grup5");
const DOC = "docs/admin-master-plan/";

function onayli28() {
  const metin = readFileSync(DOC + "17-ACIKLAMA-TASLAKLARI-42.md", "utf-8");
  const satirlar = metin.split(/\r?\n/);
  const kayitlar = [];
  let aktif = null;

  const kapat = () => {
    if (!aktif) return;
    if (!aktif.longDescription) throw new Error(`${aktif.partNumber}: açıklama bulunamadı`);
    if (aktif.beklenenKarakter == null) throw new Error(`${aktif.partNumber}: karakter sayısı bulunamadı`);
    kayitlar.push(aktif);
    aktif = null;
  };

  for (const s of satirlar) {
    const bas = s.match(/^## `([^`]+)` — (.+)$/);
    if (bas) { kapat(); aktif = { partNumber: bas[1], ad: bas[2].trim(), longDescription: null, beklenenKarakter: null }; continue; }
    if (!aktif) continue;
    const kar = s.match(/^\|\s*\*\*(?:ONAYLI|Önerilen)\*\*\s*\|\s*\*\*(\d+) karakter\*\*/);
    if (kar) { aktif.beklenenKarakter = Number(kar[1]); continue; }
    if (s.startsWith("> ")) {
      if (aktif.longDescription) throw new Error(`${aktif.partNumber}: birden fazla alıntı bloğu`);
      aktif.longDescription = s.slice(2).trim();
    }
  }
  kapat();
  return kayitlar;
}

function tabloda(dosya) {
  const metin = readFileSync(DOC + dosya, "utf-8");
  const kayitlar = [];
  for (const s of metin.split(/\r?\n/)) {
    // | `PN` | Ad | `Çizim` · Kalem | Kar. | Nihai açıklama |
    const m = s.match(/^\|\s*`([A-Z0-9][A-Z0-9.\-\/ ]*)`\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m) continue;
    kayitlar.push({ partNumber: m[1].trim(), ad: m[2].trim(), beklenenKarakter: Number(m[3]), longDescription: m[4].trim() });
  }
  return kayitlar;
}

const kayitlar = G4 ? tabloda("23-GRUP4-TASLAKLAR.md")
  : G5 ? tabloda("31-GRUP5-TASLAKLAR.md")
  : onayli28();
const beklenenAdet = G4 || G5 ? 7 : 28;

// ── Doğrulamalar (hiçbiri atlanamaz) ────────────────────────────────────────
const hatalar = [];
if (kayitlar.length !== beklenenAdet) hatalar.push(`adet ${kayitlar.length}, beklenen ${beklenenAdet}`);
const gorulen = new Set();
for (const k of kayitlar) {
  if (gorulen.has(k.partNumber)) hatalar.push(`${k.partNumber}: mükerrer`);
  gorulen.add(k.partNumber);
  if (k.longDescription.length !== k.beklenenKarakter) {
    hatalar.push(`${k.partNumber}: ${k.longDescription.length} karakter, belgede ${k.beklenenKarakter}`);
  }
  if (/^(TEST|ATOM)[-\s]/i.test(k.partNumber)) hatalar.push(`${k.partNumber}: sentetik kayıt`);
  if (/^>|\|/.test(k.longDescription)) hatalar.push(`${k.partNumber}: metinde biçim kalıntısı`);
}
if (hatalar.length) {
  console.error("DURDURULDU — çıkarma doğrulaması düştü:");
  for (const h of hatalar) console.error("  · " + h);
  process.exit(1);
}

const cikti = G4 ? "scripts/veri/grup4-taslak-7.json"
  : G5 ? "scripts/veri/grup5-taslak-7.json"
  : "scripts/veri/onayli-aciklamalar-28.json";
writeFileSync(cikti, JSON.stringify(kayitlar, null, 1) + "\n", "utf8");
const uz = kayitlar.map((k) => k.longDescription.length);
console.log(`${cikti} yazıldı`);
console.log(`kayıt: ${kayitlar.length} · karakter: min ${Math.min(...uz)} / ort ${Math.round(uz.reduce((a, b) => a + b, 0) / uz.length)} / maks ${Math.max(...uz)}`);
console.log(`300+ karakter: ${uz.filter((u) => u >= 300).length} · 300 altı: ${uz.filter((u) => u < 300).length}`);
