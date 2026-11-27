/**
 * 284 yeni ürün için v18 MAKİNE UYUMLULUKLARINI aktarır.
 *
 * KANIT AYRIMI (ölçüldü, scripts/v18-uyumluluk-kesif.mjs):
 *   v18'de bir ürünün uyumluluk kanıtı üç düzeyde olabilir —
 *   "Kesin doğrulandı", "Güçlü eşleşme", "Olası eşleşme".
 *   Aktarılan 284 ürünün yalnızca 33'ünde "Kanıtlı Makine Modelleri"
 *   alanı dolu; bunların 5'i "Kesin doğrulandı", 28'i "Güçlü eşleşme".
 *
 *   KURAL: `verified = true` YALNIZCA "Kesin doğrulandı" kaydı olan ve
 *   "Çelişkili" kaydı OLMAYAN ürünlere yazılır. Diğerleri kayda geçer ama
 *   DOĞRULANMAMIŞ kalır: yayın kapısını geçemezler, sayfada kesin bilgi
 *   olarak sunulmazlar. Kaynağı olmayan hiçbir uyumluluk UYDURULMAZ.
 *
 * YAZILAN: manufacturers (eksikse), machines (eksikse), fitments.
 * DEĞİŞMEYEN: products tablosu hiç dokunulmaz.
 *
 * Varsayılan dry-run; yazma yalnızca --apply ile.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function baglanti(dosya, anahtar) {
  for (const s of readFileSync(join(homedir(), ".osko", dosya), "utf-8").split(/\r?\n/)) {
    const i = s.indexOf("=");
    if (i > 0 && s.slice(0, i).trim() === anahtar) {
      return s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("env anahtari yok");
}

const APPLY = process.argv.includes("--apply");
const YEDEK = "scripts/veri/geri-donus/uyumluluk-284";
const sql = neon(baglanti("a3-prod.env", "NIDAH_WEB_PROD_URL"));
const kayitlar = JSON.parse(readFileSync("scripts/veri/v18-uyumluluk-284.json", "utf-8"));

/**
 * Marka adlarını ASCII'ye katlayıp büyütür.
 *
 * NEDEN: v18 "Hidromek" yazar, Türkçe büyütme "HİDROMEK" (noktalı İ) üretir,
 * veritabanındaki mevcut kayıt ise "HIDROMEK"tir (noktasız I). Türkçe
 * büyütmeyle eşleşme TUTMAZ ve MÜKERRER üretici kaydı oluşur — provada
 * ölçüldü. Bu yüzden eşleştirme de yazma da ASCII katlamasıyla yapılır.
 */
const markaNorm = (s) =>
  s.replace(/ı/g, "i").replace(/İ/g, "I").replace(/ş/g, "s").replace(/Ş/g, "S")
   .replace(/ğ/g, "g").replace(/Ğ/g, "G").replace(/ü/g, "u").replace(/Ü/g, "U")
   .replace(/ö/g, "o").replace(/Ö/g, "O").replace(/ç/g, "c").replace(/Ç/g, "C")
   .toUpperCase();

/** "Komatsu WA320-3MC" -> { marka: "KOMATSU", model: "WA320-3MC" } */
function ayristir(ham) {
  const p = ham.trim().split(/\s+/);
  if (p.length < 2) return null;
  return { marka: markaNorm(p[0]), model: p.slice(1).join(" ") };
}
const slugla = (s) =>
  s.toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ── 1. Hedef çiftleri çıkar ────────────────────────────────────────────────
const ciftler = [];
for (const k of kayitlar) {
  const kesin = k.kanitTurleri.includes("Kesin doğrulandı");
  const celiskili = k.kanitTurleri.includes("Çelişkili");
  const dogrulanmis = kesin && !celiskili;
  for (const ham of k.modeller) {
    const a = ayristir(ham);
    if (!a) { console.log("  ATLANDI (tek kelime model): " + k.partNumber + " -> '" + ham + "'"); continue; }
    ciftler.push({
      partNumber: k.partNumber,
      marka: a.marka,
      model: a.model,
      verified: dogrulanmis,
      kaynak: "v18 arastirma" + (k.kimlik ? " / " + k.kimlik : ""),
      not: [k.seriKapsami && ("Seri kapsami: " + k.seriKapsami),
            k.kaynakUrl && ("Kaynak: " + k.kaynakUrl),
            "Kanit duzeyi: " + (k.kanitTurleri.join(", ") || "yok")]
            .filter(Boolean).join(" | ").slice(0, 2000),
    });
  }
}
console.log("hedef (urun, makine) cifti: " + ciftler.length +
  " | dogrulanmis: " + ciftler.filter((c) => c.verified).length +
  " | dogrulanmamis: " + ciftler.filter((c) => !c.verified).length);

// ── 2. Mevcut üretici / makine / ürün kimlikleri ──────────────────────────
const markalar = [...new Set(ciftler.map((c) => c.marka))];
const pnler = [...new Set(ciftler.map((c) => c.partNumber))];

// TÜM üreticiler okunur ve ASCII katlamasıyla eşleştirilir (tablo küçük).
const mevcutMarka = await sql`SELECT id, name FROM manufacturers`;
const markaId = new Map();
for (const m of mevcutMarka) markaId.set(markaNorm(m.name), m.id);
const eksikMarka = markalar.filter((m) => !markaId.has(m));
console.log("uretici: mevcut " + markaId.size + " | eklenecek " + eksikMarka.length +
  (eksikMarka.length ? " -> " + eksikMarka.join(", ") : ""));

const urunler = await sql`
  SELECT id, part_number FROM products WHERE part_number = ANY(${pnler})`;
const urunId = new Map(urunler.map((u) => [u.part_number, u.id]));
const eksikUrun = pnler.filter((p) => !urunId.has(p));
if (eksikUrun.length) {
  console.error("DURDURULDU: su urunler DB'de yok -> " + eksikUrun.join(", "));
  process.exit(1);
}
console.log("urun: " + urunId.size + "/" + pnler.length + " eslesti");

if (!APPLY) {
  console.log("\nPROVA — yazma yapilmadi. Ornekler:");
  for (const c of ciftler.slice(0, 12)) {
    console.log("  " + c.partNumber.padEnd(16) + "| " + c.marka + " " + c.model +
      " | verified=" + c.verified);
  }
  const uDagilim = new Map();
  for (const c of ciftler) uDagilim.set(c.marka, (uDagilim.get(c.marka) ?? 0) + 1);
  console.log("  marka dagilimi: " + JSON.stringify(Object.fromEntries(uDagilim)));
  process.exit(0);
}

// ── 3. Eksik üreticiler ───────────────────────────────────────────────────
mkdirSync(YEDEK, { recursive: true });
if (eksikMarka.length) {
  const eklenen = await sql`
    INSERT INTO manufacturers (name, slug)
    SELECT t.ad, t.slug FROM unnest(${eksikMarka}::text[], ${eksikMarka.map(slugla)}::text[]) AS t(ad, slug)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id, name`;
  for (const m of eklenen) markaId.set(m.name.toLocaleUpperCase("tr-TR"), m.id);
  // slug çakışması nedeniyle eklenmeyenleri tekrar oku
  const tekrar = await sql`SELECT id, name FROM manufacturers`;
  for (const m of tekrar) markaId.set(markaNorm(m.name), m.id);
  console.log("uretici eklendi: " + eklenen.length);
}

// ── 4. Makineler ──────────────────────────────────────────────────────────
const makineAnahtar = (marka, model) => marka + "\u0000" + model.toLocaleUpperCase("tr-TR");
const istenenMakine = new Map();
for (const c of ciftler) istenenMakine.set(makineAnahtar(c.marka, c.model), c);

const mevcutMakine = await sql`
  SELECT m.id, m.model, mf.name AS marka FROM machines m
  JOIN manufacturers mf ON mf.id = m.manufacturer_id
  WHERE mf.id = ANY(${[...markaId.values()]})`;
const makineId = new Map();
for (const m of mevcutMakine) {
  makineId.set(makineAnahtar(markaNorm(m.marka), m.model), m.id);
}
const eksikMakine = [...istenenMakine.entries()].filter(([k]) => !makineId.has(k)).map(([, c]) => c);
console.log("makine: mevcut eslesme " + (istenenMakine.size - eksikMakine.length) +
  " | eklenecek " + eksikMakine.length);

if (eksikMakine.length) {
  const eklenen = await sql`
    INSERT INTO machines (manufacturer_id, model)
    SELECT t.mid::uuid, t.model FROM unnest(
      ${eksikMakine.map((c) => markaId.get(c.marka))}::text[],
      ${eksikMakine.map((c) => c.model)}::text[]
    ) AS t(mid, model)
    RETURNING id, model, manufacturer_id`;
  const tersMarka = new Map([...markaId].map(([k, v]) => [v, k]));
  for (const m of eklenen) {
    makineId.set(makineAnahtar(tersMarka.get(m.manufacturer_id), m.model), m.id);
  }
  console.log("makine eklendi: " + eklenen.length);
}

// ── 5. Fitment ────────────────────────────────────────────────────────────
const satirlar = ciftler.map((c) => ({
  urun: urunId.get(c.partNumber),
  makine: makineId.get(makineAnahtar(c.marka, c.model)),
  verified: c.verified,
  kaynak: c.kaynak.slice(0, 255),
  not: c.not,
}));
const eksikEslesme = satirlar.filter((s) => !s.urun || !s.makine);
if (eksikEslesme.length) {
  console.error("DURDURULDU: " + eksikEslesme.length + " cift eslestirilemedi");
  process.exit(1);
}

writeFileSync(join(YEDEK, "plan.json"),
  JSON.stringify({ tarih: new Date().toISOString(), ciftler }, null, 1), "utf-8");

const yazilan = await sql`
  INSERT INTO fitments (product_id, machine_id, verified, verified_at, source, notes)
  SELECT t.urun::uuid, t.makine::uuid, t.ver::boolean,
         CASE WHEN t.ver::boolean THEN now() ELSE NULL END, t.kaynak, t.not_
  FROM unnest(
    ${satirlar.map((s) => s.urun)}::text[],
    ${satirlar.map((s) => s.makine)}::text[],
    ${satirlar.map((s) => String(s.verified))}::text[],
    ${satirlar.map((s) => s.kaynak)}::text[],
    ${satirlar.map((s) => s.not)}::text[]
  ) AS t(urun, makine, ver, kaynak, not_)
  ON CONFLICT (product_id, machine_id) WHERE machine_variant_id IS NULL DO NOTHING
  RETURNING id, product_id, verified`;
console.log("fitment yazildi: " + yazilan.length + " (atlanan: " + (satirlar.length - yazilan.length) + ")");
writeFileSync(join(YEDEK, "olusan.json"),
  JSON.stringify({ tarih: new Date().toISOString(), ids: yazilan.map((r) => r.id) }, null, 1), "utf-8");
writeFileSync(join(YEDEK, "geri-al.sql"),
  "-- v18 uyumluluk aktarimini GERI AL.\nBEGIN;\nDELETE FROM fitments WHERE id IN (\n" +
  yazilan.map((r) => "  '" + r.id + "'").join(",\n") +
  "\n);\n-- Beklenen: " + yazilan.length + " satir.\nROLLBACK; -- dogruladiktan sonra COMMIT\n", "utf-8");

// ── 6. Doğrulama ──────────────────────────────────────────────────────────
const d = await sql`
  SELECT count(*)::int AS urun,
    count(*) FILTER (WHERE v.dogrulanmis > 0)::int AS dogrulanmis_uyumu_olan
  FROM (
    SELECT p.id, (SELECT count(*) FROM fitments f WHERE f.product_id = p.id AND f.verified) AS dogrulanmis
    FROM products p WHERE p.part_number = ANY(${pnler})
  ) v`;
console.log("aktarilan kumede dogrulanmis uyumu olan urun: " +
  d[0].dogrulanmis_uyumu_olan + " / " + d[0].urun);
const t = await sql`
  SELECT count(*)::int AS toplam, count(*) FILTER (WHERE verified)::int AS dogrulanmis FROM fitments`;
console.log("fitments tablosu toplam: " + JSON.stringify(t[0]));
