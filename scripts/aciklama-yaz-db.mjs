/**
 * ONAYLI AÇIKLAMALARI VERİTABANINA TOPLU YAZAR — doğrudan bağlantı yolu.
 *
 * NEDEN API DEĞİL: `aciklama-yaz.mjs` admin API'sini kullanır ve production
 * admin kimliği bu makinede BULUNMUYOR (`~/.osko/a3-prod.env` yalnızca
 * sınırlı `nidah_web` rolünün bağlantısını taşır). Bu script o rolle
 * doğrudan yazar.
 *
 * ÖNBELLEK NOTU: doğrudan yazma `revalidateProducts()` ÇAĞIRMAZ. Bu yüzden
 * script hedef ürünlerin **pasif** (`is_active = false`) ve **yayın dışı**
 * (`seo_ready = false`) olmasını ŞART koşar — o durumda public yüzeyde
 * önbellekten servis edilen bir içerik yoktur, dolayısıyla tazeleme
 * gerekmez. Yayında bir ürüne yazmak için `--canli-kabul` gerekir ve o
 * durumda yazmadan sonra deploy ya da panelden bir ayar değişikliği ile
 * tazeleme ZORUNLUDUR.
 *
 * SIRA (hiçbiri atlanamaz):
 *   1. Hedef doğrulanır (yerel değilse `--production` zorunlu).
 *   2. Listedeki her parça numarasının veritabanında bulunduğu doğrulanır.
 *   3. Sentetik (TEST/ATOM) kayıt listede varsa HİÇ yazma yapılmaz.
 *   4. Karakter sağlaması (`beklenenKarakter`) tutmalıdır.
 *   5. Aktif/yayında ürün varsa durulur (`--canli-kabul` ile geçilir).
 *   6. Mevcut değerler GERİ DÖNÜŞ dosyasına yazılır — yazma ancak dosya
 *      diske indikten sonra başlar.
 *   7. TEK ifadede toplu UPDATE (atomik).
 *   8. Yazdıktan sonra 28'in tamamı tek tek okunup metin eşitliği doğrulanır.
 *
 * GERİ ALMA:
 *   node scripts/aciklama-yaz-db.mjs --baglanti <dosya>:<ANAHTAR> \
 *     --geri-al <geri-donus.json> --apply --production
 *
 * GİZLİLİK: bağlantı dizesi hiçbir çıktıya yazılmaz; hata çıktısında
 * yalnızca hata ADI ve kodu geçer.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

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
if (!envDosya || !envAnahtar) dur("--baglanti bicimi: <env-dosyasi>:<ANAHTAR>");
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
if (!YEREL && !PRODUCTION) dur(`hedef yerel degil. Yazmak icin --production bayragi ZORUNLU.`);

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
const liste = ham.map((k) => ({
  partNumber: k.partNumber,
  longDescription: GERI_AL ? k.eskiLongDescription ?? null : k.longDescription,
  beklenenKarakter: GERI_AL ? null : k.beklenenKarakter ?? null,
}));
console.log(`hedef : ${YEREL ? "yerel" : "PRODUCTION"}`);
console.log(`liste : ${liste.length} kayit${GERI_AL ? " (GERI ALMA)" : ""}`);

// ── Mevcut durum ────────────────────────────────────────────────────────────
const pnler = liste.map((k) => k.partNumber);
const mevcut = await sorgu(
  `SELECT part_number AS pn, long_description AS aciklama, is_active, seo_ready
     FROM products WHERE part_number = ANY($1)`,
  [pnler]
);
const byPn = new Map(mevcut.map((r) => [r.pn, r]));

// ── Ön doğrulamalar ─────────────────────────────────────────────────────────
const sorun = [];
if (BEKLENEN != null && liste.length !== BEKLENEN) sorun.push(`liste ${liste.length}, beklenen ${BEKLENEN}`);
const gorulen = new Set();
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
  if (!GERI_AL) {
    if (typeof k.longDescription !== "string" || !k.longDescription.trim()) {
      sorun.push(`${k.partNumber}: aciklama bos`);
    } else if (k.beklenenKarakter != null && k.longDescription.length !== k.beklenenKarakter) {
      sorun.push(`${k.partNumber}: ${k.longDescription.length} karakter, beklenen ${k.beklenenKarakter}`);
    }
  }
  if ((r.is_active || r.seo_ready) && !CANLI_KABUL) {
    sorun.push(`${k.partNumber}: CANLI (is_active=${r.is_active}, seo_ready=${r.seo_ready}) — --canli-kabul gerekir`);
  }
}
if (sorun.length) {
  console.error(`\nON DOGRULAMA DUSTU (${sorun.length}) — hicbir yazma yapilmadi:`);
  for (const s of sorun) console.error("  - " + s);
  process.exit(1);
}
console.log("on dogrulama: TAMAM (adet, mukerrer, sentetik, varlik, karakter, canli degil)");

// ── Geri dönüş dosyası ──────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const geriDonus = liste.map((k) => ({
  partNumber: k.partNumber,
  eskiLongDescription: byPn.get(k.partNumber).aciklama ?? null,
}));
const geriYol = OUT + (GERI_AL ? "geri-alma-oncesi.json" : "geri-donus-eski-aciklamalar.json");
writeFileSync(geriYol, JSON.stringify(geriDonus, null, 1) + "\n", "utf8");
console.log(`geri donus dosyasi: ${geriYol}`);

if (!APPLY) {
  console.log("\nPROVA — yazma yapilmadi. Ozet:");
  for (const k of liste) {
    const r = byPn.get(k.partNumber);
    console.log(
      `  ${k.partNumber.padEnd(16)} ${String((r.aciklama ?? "").length).padStart(4)} -> ` +
        `${String((k.longDescription ?? "").length).padStart(4)} karakter`
    );
  }
  process.exit(0);
}

// ── TEK ifadede toplu UPDATE (atomik) ───────────────────────────────────────
const metinler = liste.map((k) => k.longDescription);
const yazilan = await sorgu(
  `UPDATE products AS p
      SET long_description = v.aciklama,
          updated_at = now()
     FROM (SELECT unnest($1::text[]) AS pn, unnest($2::text[]) AS aciklama) AS v
    WHERE p.part_number = v.pn
  RETURNING p.part_number AS pn`,
  [pnler, metinler]
);
console.log(`\ntoplu UPDATE: ${yazilan.length} satir etkilendi`);

// ── Yazma sonrası doğrulama ─────────────────────────────────────────────────
const sonra = await sorgu(
  `SELECT part_number AS pn, long_description AS aciklama, is_active, seo_ready
     FROM products WHERE part_number = ANY($1)`,
  [pnler]
);
const sonraByPn = new Map(sonra.map((r) => [r.pn, r]));
const hatalar = [];
for (const k of liste) {
  const r = sonraByPn.get(k.partNumber);
  if (!r) hatalar.push(`${k.partNumber}: yazma sonrasi okunamadi`);
  else if ((r.aciklama ?? null) !== (k.longDescription ?? null)) {
    hatalar.push(`${k.partNumber}: metin UYUSMADI (${(r.aciklama ?? "").length} karakter)`);
  } else if (r.is_active !== byPn.get(k.partNumber).is_active || r.seo_ready !== byPn.get(k.partNumber).seo_ready) {
    hatalar.push(`${k.partNumber}: YAN ETKI — is_active/seo_ready degisti`);
  }
}
if (hatalar.length) {
  console.error(`\nDOGRULAMA DUSTU (${hatalar.length}):`);
  for (const h of hatalar) console.error("  - " + h);
  console.error(`\nGeri alma: node scripts/aciklama-yaz-db.mjs --baglanti ${BAGLANTI} --geri-al ${geriYol} --apply${PRODUCTION ? " --production" : ""}`);
  process.exit(1);
}
console.log(`dogrulama: ${liste.length}/${liste.length} metin BIREBIR dogru, yan etki 0`);
