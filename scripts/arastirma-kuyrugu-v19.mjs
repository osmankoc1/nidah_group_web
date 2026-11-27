/**
 * ARAŞTIRMA KUYRUĞU v19 — sürümlü ve izlenebilir. SALT OKUNUR.
 *
 * v18 kuyruğunu KORUR (A 104 + B 1407) ve bu oturumda ÖLÇÜLEREK ortaya çıkan
 * yeni boşlukları ekler. Her kalem; kaynağını, neyin eksik olduğunu ve
 * hangi belgede hangi koordinata bakılacağını taşır.
 *
 * YENİ KALEM TÜRLERİ:
 *   U1  uyumluluk-kaniti-yok   — aktarılan üründe hiç kanıtlı makine modeli yok
 *   U2  uyumluluk-dogrulanmamis— fitment yazıldı ama "Güçlü eşleşme"; teyit bekliyor
 *   A1  ad-ayrimi-yok          — aynı adı taşıyan ürünler, ayırt edici veri yok
 *   D1  aciklama-yok           — açıklaması olmayan aktarılmış ürün
 *   F1  fotograf-sorunlu       — yüklü görsel ürün fotoğrafı değil
 *
 * ÇIKTI: scripts/veri/arastirma-kuyrugu-v19.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

function baglanti(dosya, anahtar) {
  for (const s of readFileSync(join(homedir(), ".osko", dosya), "utf-8").split(/\r?\n/)) {
    const i = s.indexOf("=");
    if (i > 0 && s.slice(0, i).trim() === anahtar) {
      return s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("env anahtari yok");
}
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));

const S = (r, c) => String(r[c] ?? "").trim();
const wb = XLSX.read(readFileSync("C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx"), { type: "buffer" });
const UY = XLSX.utils.sheet_to_json(wb.Sheets["Makine Uyumluluğu"], { raw: false, defval: "" });
const volvoMu = (s) => /volvo|champion/i.test(s);

const v18 = JSON.parse(readFileSync("scripts/veri/arastirma-kuyrugu.json", "utf-8"));
const adPlani = JSON.parse(readFileSync("scripts/veri/ad-ayristirma-plani.json", "utf-8"));

// ── Production'dan ölçülen boşluklar ──────────────────────────────────────
const bosluk = await sql`
  SELECT p.part_number, p.name,
    length(coalesce(p.long_description, '')) AS aciklama_uz,
    (SELECT count(*)::int FROM fitments f WHERE f.product_id = p.id) AS uyum,
    (SELECT count(*)::int FROM fitments f WHERE f.product_id = p.id AND f.verified) AS uyum_dogrulanmis,
    (SELECT count(*)::int FROM product_images i WHERE i.product_id = p.id) AS gorsel,
    (SELECT count(*)::int FROM product_images i WHERE i.product_id = p.id AND i.verified) AS gorsel_dogrulanmis
  FROM products p
  WHERE NOT p.is_active AND NOT p.seo_ready
  ORDER BY p.part_number`;
console.log("pasif urun: " + bosluk.length);

/** Hangi kaynak belgeye bakılacak — v18'in kendi kaynak kaydından. */
const kaynakByPn = new Map();
for (const r of UY) {
  const pn = S(r, "Katalog Referansı");
  if (!pn || kaynakByPn.has(pn)) continue;
  kaynakByPn.set(pn, {
    kaynakKimligi: S(r, "Kaynak Kimliği"),
    kaynakUrl: S(r, "Kaynak URL"),
    koordinat: S(r, "Sayfa / Çizim / Kalem"),
    marka: S(r, "Makine Markası"),
    seri: S(r, "Seri"),
  });
}

const kalemler = [];
const ekle = (tur, pn, ad, eksik, ek) => {
  const k = kaynakByPn.get(pn) ?? {};
  kalemler.push({
    tur, partNumber: pn, ad, eksik,
    bakilacakKaynak: k.kaynakUrl || "", kaynakKimligi: k.kaynakKimligi || "",
    katalogKoordinati: k.koordinat || "", makineMarkasi: k.marka || "", seri: k.seri || "",
    oncelik: volvoMu((k.marka || "") + " " + pn + " " + ad) ? 1 : 2,
    ...ek,
  });
};

for (const b of bosluk) {
  if (b.uyum === 0) ekle("U1", b.part_number, b.name, "kanitli makine uyumlulugu");
  else if (b.uyum_dogrulanmis === 0) ekle("U2", b.part_number, b.name, "uyumluluk teyidi (kayit 'Guclu eslesme')");
  if (Number(b.aciklama_uz) === 0) ekle("D1", b.part_number, b.name, "teknik aciklama");
  if (b.gorsel > 0 && b.gorsel_dogrulanmis === 0) {
    ekle("F1", b.part_number, b.name, "gorsel dogrulamasi", { gorselSayisi: b.gorsel });
  }
}
for (const c of adPlani.cozulemeyen) {
  for (const pn of c.partNumbers) {
    ekle("A1", pn, c.ad, "ayni adli urunleri ayiran olcu/teknik ozellik", { kumeAdedi: c.adet });
  }
}

const turSay = new Map();
for (const k of kalemler) turSay.set(k.tur, (turSay.get(k.tur) ?? 0) + 1);
console.log("\n=== v19 YENI KALEMLER");
for (const [t, v] of [...turSay].sort()) console.log("  " + t + " : " + v);
console.log("  Volvo/Champion oncelikli: " + kalemler.filter((k) => k.oncelik === 1).length);

const cikti = {
  surum: "v19",
  uretildi: new Date().toISOString(),
  temelAlinan: { surum: "v18", dosya: "scripts/veri/arastirma-kuyrugu.json", a: v18.a.length, b: v18.b.length },
  kaynak: "NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx + production olcumu",
  aciklama:
    "v18 kuyrugu KORUNDU (a, b). yeniBosluklar, 27.11.2026 oturumunda " +
    "production'dan olculen eksikleri tasir. Ayni urun birden cok turde " +
    "gecebilir (ornegin hem D1 hem U1).",
  a: v18.a,
  b: v18.b,
  yeniBosluklar: kalemler.sort((x, y) => x.oncelik - y.oncelik || x.tur.localeCompare(y.tur) || x.partNumber.localeCompare(y.partNumber)),
};
writeFileSync("scripts/veri/arastirma-kuyrugu-v19.json", JSON.stringify(cikti, null, 1), "utf-8");
console.log("\nyazildi: scripts/veri/arastirma-kuyrugu-v19.json");
console.log("  v18 A: " + v18.a.length + " | v18 B: " + v18.b.length + " | yeni bosluk kalemi: " + kalemler.length);
console.log("\n=== ILK 10 KALEM (Volvo/Champion onde)");
for (const k of cikti.yeniBosluklar.slice(0, 10)) {
  console.log("  " + k.tur + " " + k.partNumber.padEnd(16) + "| " + k.eksik.padEnd(42) +
    "| " + (k.katalogKoordinati || "-"));
}
