/**
 * `db.batch` ATOMİKLİK KANITI — neon-http sürücüsü.
 *
 * Soru: `db.batch([...])` gerçekten TEK TRANSACTION mı, yoksa ifadeleri
 * sırayla mı çalıştırıyor? Toplu import'un "hepsi ya da hiçbiri" güvencesi
 * tamamen buna dayanıyor, bu yüzden varsayılmaz — ÖLÇÜLÜR.
 *
 * Deney: iki ifadelik bir batch. Birincisi geçerli bir INSERT, ikincisi
 * KESİN başarısız (var olmayan üreticiye FK). Batch hata vermeli VE birinci
 * ifadenin satırı veritabanında OLMAMALI.
 *
 * Yalnızca development veritabanında çalıştırılır; sentetik veri kullanır ve
 * kendi artığını temizler. Tek bağlantı açar.
 *
 * Kullanım: node scripts/batch-atomiklik-kaniti.mjs
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { manufacturers, machines } from "../src/lib/db/schema.ts";

const SLUG = "test-atomiklik-kaniti";
const YOK_UUID = "00000000-0000-0000-0000-0000000000ff"; // var olmayan uretici

function devUrl() {
  const env = readFileSync(".env.local", "utf-8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error(".env.local icinde DATABASE_URL yok");
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

const db = drizzle(neon(devUrl()));

const sayim = async () =>
  (await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, SLUG))).length;

async function temizle() {
  await db.delete(manufacturers).where(eq(manufacturers.slug, SLUG));
}

// Hedefin development oldugunu dogrula — production'a asla.
const [{ rol, ayar }] = await db.execute(
  sql`SELECT current_user AS rol, (SELECT count(*) FROM site_settings) AS ayar`
).then((r) => r.rows ?? r);
if (rol !== "nidah_dev") {
  console.error(`DURDURULDU: beklenen rol nidah_dev, bulunan "${rol}". Production olabilir.`);
  process.exit(1);
}
console.log(`hedef dogrulandi: rol=${rol} site_settings=${ayar} -> DEVELOPMENT\n`);

await temizle();
console.log(`baslangic: "${SLUG}" satir sayisi = ${await sayim()}`);

// ── DENEY 1: batch icinde ikinci ifade basarisiz ────────────────────────────
let hata = null;
try {
  await db.batch([
    db.insert(manufacturers).values({ name: "TEST Atomiklik", slug: SLUG }),
    // FK ihlali: boyle bir uretici yok
    db.insert(machines).values({ manufacturerId: YOK_UUID, model: "TEST-ATOMIK", type: "TEST" }),
  ]);
} catch (e) {
  hata = e;
}

const kalan = await sayim();
console.log(`\nDENEY 1 — batch(gecerli INSERT + FK ihlali)`);
console.log(`  hata firlatildi mi : ${hata ? "EVET" : "HAYIR"}`);
if (hata) {
  const kok = hata.cause?.message ?? hata.message;
  console.log(`  hata               : ${String(kok).slice(0, 110)}`);
}
console.log(`  1. ifadenin satiri : ${kalan === 0 ? "YAZILMADI" : "YAZILDI (" + kalan + ")"}`);
console.log(`  SONUC              : ${hata && kalan === 0 ? "ATOMIK — hepsi ya da hicbiri" : "ATOMIK DEGIL — KISMI YAZMA RISKI"}`);

await temizle();

// ── DENEY 2: tamami gecerli batch gercekten yaziyor mu ──────────────────────
await db.batch([
  db.insert(manufacturers).values({ name: "TEST Atomiklik", slug: SLUG }),
]);
const yazildi = await sayim();
console.log(`\nDENEY 2 — batch(tamami gecerli)`);
console.log(`  satir yazildi mi   : ${yazildi === 1 ? "EVET" : "HAYIR (" + yazildi + ")"}`);

await temizle();
console.log(`\ntemizlik tamam: "${SLUG}" satir sayisi = ${await sayim()}`);

// ── DENEY 3: batch icinde SIRA ve TRANSACTION ICI GORUNURLUK ───────────────
// Tasarimin dayandigi varsayim: 2. ifade, 1. ifadenin AYNI transaction icinde
// yazdigi satiri gorebilmeli. Goremezse FK ihlali olur.
const MFR_ID = "11111111-2222-3333-4444-555555555555";
let hata3 = null;
try {
  await db.batch([
    db.insert(manufacturers).values({ id: MFR_ID, name: "TEST Atomiklik", slug: SLUG }),
    db.insert(machines).values({ manufacturerId: MFR_ID, model: "TEST-SIRA", type: "TEST" }),
  ]);
} catch (e) {
  hata3 = e;
}
const machSay = async () =>
  (await db.select({ id: machines.id }).from(machines).where(eq(machines.model, "TEST-SIRA"))).length;
const mfrVar = await sayim();
const machVar = await machSay();
console.log(`\nDENEY 3 — batch(uretici INSERT -> ona FK ile makine INSERT)`);
console.log(`  hata firlatildi mi : ${hata3 ? "EVET -> " + String(hata3.cause?.message ?? hata3.message).slice(0, 80) : "HAYIR"}`);
console.log(`  uretici yazildi    : ${mfrVar === 1 ? "EVET" : "HAYIR"}`);
console.log(`  makine yazildi     : ${machVar === 1 ? "EVET" : "HAYIR"}`);
console.log(`  SONUC              : ${!hata3 && mfrVar === 1 && machVar === 1 ? "SIRA KORUNUYOR, ayni transaction icinde GORUNUR (uygulanan tasarimin dayanagi)" : "VARSAYIM GECERSIZ"}`);

await db.delete(machines).where(eq(machines.model, "TEST-SIRA"));
await temizle();
console.log(`\nson temizlik: uretici=${await sayim()} makine=${await machSay()}`);
