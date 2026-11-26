/**
 * ÜRÜN ALANLARINI TOPLU GÜNCELLER — doğrudan bağlantı, geri alınabilir.
 *
 * Yayın akışının tek aracı: ad düzeltme, aktifleştirme (`is_active`) ve yayın
 * onayı (`seo_ready`) aynı korumalardan geçer.
 *
 * İZİNLİ ALANLAR (başkası YAZILAMAZ): name · isActive · seoReady ·
 * longDescription. Listedeki bir kayıtta bulunmayan alana DOKUNULMAZ.
 *
 * ── ÖNBELLEK ───────────────────────────────────────────────────────────────
 * Doğrudan yazma `revalidateProducts()` ÇAĞIRMAZ. Yayın yüzeyini değiştiren
 * bir alan (`isActive`, `seoReady`) yazılırsa script bunu AÇIKÇA söyler ve
 * sonrasında tazeleme gerektiğini hatırlatır (deploy ya da panelden bir ayar
 * değişikliği). Pasif + yayın dışı ürünlere yazmak tazeleme gerektirmez.
 *
 * ── SIRA (hiçbiri atlanamaz) ───────────────────────────────────────────────
 *   1. Hedef yerel değilse `--production` ZORUNLU.
 *   2. Listedeki her parça numarası veritabanında bulunmalı.
 *   3. Sentetik (TEST/ATOM) kayıt listede varsa HİÇ yazma yapılmaz.
 *   4. `--beklenen` verilirse adet birebir eşleşmeli.
 *   5. `name` yazılıyorsa `adYeterli()` kuralından GEÇMELİ.
 *   6. `seoReady: true` yazılıyorsa ürün yayın kapısından GEÇMELİ
 *      (`evaluateSeoReadiness`) — veritabanından okunan gerçek değerlerle.
 *   7. Mevcut değerler GERİ DÖNÜŞ dosyasına yazılır; yazma ancak dosya
 *      diske indikten sonra başlar.
 *   8. Alan başına TEK ifadede toplu UPDATE (atomik).
 *   9. Yazma sonrası tüm satırlar okunup birebir doğrulanır.
 *
 * GERİ ALMA:
 *   node scripts/urun-guncelle-db.mjs --baglanti <dosya>:<ANAHTAR> \
 *     --geri-al <geri-donus.json> --apply --production [--canli-kabul]
 *
 * GİZLİLİK: bağlantı dizesi hiçbir çıktıya yazılmaz.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { adYeterli, evaluateSeoReadiness } from "../src/lib/seo-gate.ts";

const ALANLAR = ["name", "isActive", "seoReady", "longDescription"];
const KOLON = {
  name: "name",
  isActive: "is_active",
  seoReady: "seo_ready",
  longDescription: "long_description",
};
const TIP = { name: "text", isActive: "boolean", seoReady: "boolean", longDescription: "text" };

const arg = (ad) => {
  const i = process.argv.indexOf(ad);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const bayrak = (ad) => process.argv.includes(ad);
const dur = (m) => {
  console.error("DURDURULDU: " + m);
  process.exit(1);
};

const BAGLANTI = arg("--baglanti");
const LISTE = arg("--liste");
const GERI_AL = arg("--geri-al");
const BEKLENEN = arg("--beklenen") ? Number(arg("--beklenen")) : null;
const CIKTI = arg("--cikti") ?? ".";
const APPLY = bayrak("--apply");
const PRODUCTION = bayrak("--production");
const CANLI_KABUL = bayrak("--canli-kabul");
const OUT = /[/\\]$/.test(CIKTI) ? CIKTI : CIKTI + "/";

if (!BAGLANTI) dur("--baglanti zorunlu, bicim: <env-dosyasi>:<ANAHTAR>");
if (!LISTE && !GERI_AL) dur("--liste veya --geri-al zorunlu");
if (LISTE && GERI_AL) dur("--liste ve --geri-al birlikte kullanilamaz");

const ayirici = BAGLANTI.lastIndexOf(":");
const envDosya = BAGLANTI.slice(0, ayirici);
const envAnahtar = BAGLANTI.slice(ayirici + 1);
if (!existsSync(envDosya)) dur(`baglanti dosyasi bulunamadi: ${envDosya}`);
const envSatir = readFileSync(envDosya, "utf-8")
  .split(/\r?\n/)
  .find((l) => l.startsWith(envAnahtar + "="));
if (!envSatir) dur(`${path.basename(envDosya)} icinde ${envAnahtar} yok`);
const url = envSatir.slice(envAnahtar.length + 1).trim().replace(/^["']|["']$/g, "");

let host;
try {
  host = new URL(url).hostname;
} catch {
  dur("baglanti dizesi gecerli bir URL degil");
}
const YEREL = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
if (!YEREL && !PRODUCTION) dur("hedef yerel degil. Yazmak icin --production ZORUNLU.");

const { neon } = await import(
  "file:///C:/Users/HP/Desktop/nidah_group_web/node_modules/@neondatabase/serverless/index.mjs"
);
const sql = neon(url);
const sorgu = async (q, p) => {
  try {
    return await sql.query(q, p);
  } catch (e) {
    console.error("SORGU HATASI:", e?.name ?? "Error", e?.code ?? "");
    process.exit(1);
  }
};

// ── Liste ───────────────────────────────────────────────────────────────────
const ham = JSON.parse(readFileSync(GERI_AL ?? LISTE, "utf-8"));
const liste = ham.map((k) => {
  const kayit = { partNumber: k.partNumber };
  for (const a of ALANLAR) {
    const kaynak = GERI_AL ? k.eski ?? {} : k;
    if (Object.prototype.hasOwnProperty.call(kaynak, a)) kayit[a] = kaynak[a];
  }
  return kayit;
});
const yazilacakAlanlar = ALANLAR.filter((a) => liste.some((k) => a in k));
if (yazilacakAlanlar.length === 0) dur("listede izinli hicbir alan yok");

console.log(`hedef  : ${YEREL ? "yerel" : "PRODUCTION"}`);
console.log(`liste  : ${liste.length} kayit${GERI_AL ? " (GERI ALMA)" : ""}`);
console.log(`alanlar: ${yazilacakAlanlar.join(", ")}`);

// ── Mevcut durum ────────────────────────────────────────────────────────────
const pnler = liste.map((k) => k.partNumber);
const mevcut = await sorgu(
  `SELECT p.part_number AS pn, p.name, p.is_active, p.seo_ready,
          p.long_description AS aciklama,
          (SELECT COUNT(*)::int FROM product_images i WHERE i.product_id = p.id AND i.verified) AS gorsel,
          (SELECT COUNT(*)::int FROM fitments f WHERE f.product_id = p.id AND f.verified) AS uyum
     FROM products p WHERE p.part_number = ANY($1)`,
  [pnler]
);
const byPn = new Map(mevcut.map((r) => [r.pn, r]));

// ── Ön doğrulamalar ─────────────────────────────────────────────────────────
const sorun = [];
if (BEKLENEN != null && liste.length !== BEKLENEN) sorun.push(`liste ${liste.length}, beklenen ${BEKLENEN}`);
const gorulen = new Set();
const yayinYuzeyi = yazilacakAlanlar.some((a) => a === "isActive" || a === "seoReady");

for (const k of liste) {
  if (gorulen.has(k.partNumber)) sorun.push(`${k.partNumber}: mukerrer`);
  gorulen.add(k.partNumber);
  if (/^(TEST|ATOM)[-\s]/i.test(k.partNumber) || k.partNumber === "0012345") {
    sorun.push(`${k.partNumber}: sentetik kayit`);
  }
  const r = byPn.get(k.partNumber);
  if (!r) {
    sorun.push(`${k.partNumber}: veritabaninda YOK`);
    continue;
  }
  if ("name" in k) {
    if (typeof k.name !== "string" || !k.name.trim()) sorun.push(`${k.partNumber}: ad bos`);
    else if (!adYeterli(k.name, k.partNumber)) sorun.push(`${k.partNumber}: yeni ad "ad yeterli" kuralindan gecmiyor`);
  }
  if ("longDescription" in k && (typeof k.longDescription !== "string" || !k.longDescription.trim())) {
    sorun.push(`${k.partNumber}: aciklama bos`);
  }
  if (k.seoReady === true) {
    const kapi = evaluateSeoReadiness({
      isActive: "isActive" in k ? k.isActive : r.is_active,
      partNumber: k.partNumber,
      name: "name" in k ? k.name : r.name,
      verifiedImageCount: r.gorsel,
      longDescription: "longDescription" in k ? k.longDescription : r.aciklama,
      verifiedFitmentCount: r.uyum,
    });
    if (!kapi.eligible) sorun.push(`${k.partNumber}: YAYIN KAPISI GECMIYOR -> ${kapi.unmet.join(", ")}`);
  }
  // Canli bir urune dokunuluyorsa acik onay gerekir.
  if ((r.is_active || r.seo_ready) && !CANLI_KABUL) {
    sorun.push(`${k.partNumber}: CANLI (is_active=${r.is_active}, seo_ready=${r.seo_ready}) — --canli-kabul gerekir`);
  }
}
if (sorun.length) {
  console.error(`\nON DOGRULAMA DUSTU (${sorun.length}) — hicbir yazma yapilmadi:`);
  for (const s of sorun) console.error("  - " + s);
  process.exit(1);
}
console.log("on dogrulama: TAMAM");
if (yayinYuzeyi) {
  console.log("UYARI: yayin yuzeyi alani yaziliyor (is_active / seo_ready).");
  console.log("       Yazma sonrasi TAZELEME gerekir: deploy ya da panelden ayar degisikligi.");
}

// ── Geri dönüş ──────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const geriDonus = liste.map((k) => {
  const r = byPn.get(k.partNumber);
  const eski = {};
  for (const a of yazilacakAlanlar) {
    if (!(a in k)) continue;
    eski[a] =
      a === "name" ? r.name
      : a === "isActive" ? r.is_active
      : a === "seoReady" ? r.seo_ready
      : r.aciklama;
  }
  return { partNumber: k.partNumber, eski };
});
const geriYol = OUT + (GERI_AL ? "geri-alma-oncesi.json" : "geri-donus.json");
writeFileSync(geriYol, JSON.stringify(geriDonus, null, 1) + "\n", "utf8");
console.log(`geri donus dosyasi: ${geriYol}`);

if (!APPLY) {
  console.log("\nPROVA — yazma yapilmadi:");
  for (const k of liste) {
    const r = byPn.get(k.partNumber);
    const parcalar = [];
    if ("name" in k) parcalar.push(`ad: "${r.name}" -> "${k.name}"`);
    if ("isActive" in k) parcalar.push(`aktif: ${r.is_active} -> ${k.isActive}`);
    if ("seoReady" in k) parcalar.push(`yayin: ${r.seo_ready} -> ${k.seoReady}`);
    if ("longDescription" in k) parcalar.push(`aciklama: ${(r.aciklama ?? "").length} -> ${k.longDescription.length} karakter`);
    console.log(`  ${k.partNumber.padEnd(16)} ${parcalar.join(" | ")}`);
  }
  process.exit(0);
}

// ── Alan başına TEK toplu UPDATE ────────────────────────────────────────────
for (const alan of yazilacakAlanlar) {
  const hedefler = liste.filter((k) => alan in k);
  if (hedefler.length === 0) continue;
  const r = await sorgu(
    `UPDATE products AS p
        SET ${KOLON[alan]} = v.deger, updated_at = now()
       FROM (SELECT unnest($1::text[]) AS pn, unnest($2::${TIP[alan]}[]) AS deger) AS v
      WHERE p.part_number = v.pn
    RETURNING p.part_number`,
    [hedefler.map((k) => k.partNumber), hedefler.map((k) => k[alan])]
  );
  console.log(`UPDATE ${KOLON[alan]}: ${r.length} satir`);
}

// ── Doğrulama ───────────────────────────────────────────────────────────────
const sonra = await sorgu(
  `SELECT part_number AS pn, name, is_active, seo_ready, long_description AS aciklama
     FROM products WHERE part_number = ANY($1)`,
  [pnler]
);
const sonraByPn = new Map(sonra.map((r) => [r.pn, r]));
const hatalar = [];
for (const k of liste) {
  const r = sonraByPn.get(k.partNumber);
  if (!r) {
    hatalar.push(`${k.partNumber}: yazma sonrasi okunamadi`);
    continue;
  }
  if ("name" in k && r.name !== k.name) hatalar.push(`${k.partNumber}: ad uyusmadi`);
  if ("isActive" in k && r.is_active !== k.isActive) hatalar.push(`${k.partNumber}: is_active uyusmadi`);
  if ("seoReady" in k && r.seo_ready !== k.seoReady) hatalar.push(`${k.partNumber}: seo_ready uyusmadi`);
  if ("longDescription" in k && r.aciklama !== k.longDescription) hatalar.push(`${k.partNumber}: aciklama uyusmadi`);
  // Yazilmayan alanlarda yan etki olmamali.
  const once = byPn.get(k.partNumber);
  for (const a of ALANLAR) {
    if (a in k) continue;
    const o = a === "name" ? once.name : a === "isActive" ? once.is_active : a === "seoReady" ? once.seo_ready : once.aciklama;
    const y = a === "name" ? r.name : a === "isActive" ? r.is_active : a === "seoReady" ? r.seo_ready : r.aciklama;
    if (o !== y) hatalar.push(`${k.partNumber}: YAN ETKI — ${a} degisti`);
  }
}
if (hatalar.length) {
  console.error(`\nDOGRULAMA DUSTU (${hatalar.length}):`);
  for (const h of hatalar) console.error("  - " + h);
  console.error(`\nGeri alma: node scripts/urun-guncelle-db.mjs --baglanti ${BAGLANTI} --geri-al ${geriYol} --apply${PRODUCTION ? " --production" : ""}${CANLI_KABUL ? " --canli-kabul" : ""}`);
  process.exit(1);
}
console.log(`dogrulama: ${liste.length}/${liste.length} kayit birebir dogru, yan etki 0`);
