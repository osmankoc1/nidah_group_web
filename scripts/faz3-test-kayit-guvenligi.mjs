/**
 * Sentetik TEST kayıtlarını SİLMEDEN yayına kapatır. Development'a yazar.
 *
 * NEDEN GEREKLİ: kayıtların 11'i `seo_ready=false` olduğu için sitemap'e
 * girmiyordu, AMA marka sayfaları ve public ürün API'si yalnızca
 * `is_active = true` filtresi uyguluyor — `seo_ready`'ye BAKMIYOR.
 * Yani katalog toggle'ı açıldığı anda 12 test kaydının tamamı marka
 * sayfalarında ve public API'de görünürdü. `TEST-FAZ2B-0001` ayrıca
 * `seo_ready=true` ve `stock_status=in_stock` olduğu için sitemap'e de girerdi.
 *
 * TEK ANAHTAR `is_active=false`: public API, marka sayfası, arama ve sitemap
 * dördünü birden kapatır. Kayıt SİLİNMEZ, yönetim panelinde görünmeye devam
 * eder ve tek tıkla geri açılabilir.
 *
 * TESPİT: parça numarası VEYA ürün adı TEST/ATOM/DUMMY/SAMPLE/ORNEK/DENEME
 * deseniyle eşleşenler. Desen, `0012345` gibi farklı numaralı kayıtları da
 * yakalar (adı "TEST Bastaki Sifir"). Doğruluğu KÜME FARKIYLA kanıtlanır:
 * desenle eşleşmeyen her ürün, bilinen gerçek ürün listesinde olmalıdır.
 *
 * Kullanım:
 *   node scripts/faz3-test-kayit-guvenligi.mjs dry-run
 *   node scripts/faz3-test-kayit-guvenligi.mjs apply
 */
import { readFileSync, writeFileSync } from "node:fs";

const MODE = process.argv[2];
if (!["dry-run", "apply"].includes(MODE)) {
  console.error("Kullanim: node scripts/faz3-test-kayit-guvenligi.mjs <dry-run|apply>");
  process.exit(1);
}
const BASE = "http://localhost:3001";
const VERI = "C:/Users/HP/Desktop/OSKO_PLANLAMA/nidah_faz3_veri";
const ENVANTER = "C:/Users/HP/AppData/Local/Temp/claude/3bcdba3fb67e503e/11fd42a8-2323-4827-8a1c-113d7797a5b6/scratchpad/envanter_oncesi.txt";

const SENTETIK = /(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)/i;
const sentetikMi = (p) => SENTETIK.test(p.partNumber ?? "") || SENTETIK.test(p.name ?? "");

function env(dosya, anahtar) {
  const satir = readFileSync(dosya, "utf-8").split(/\r?\n/).find((l) => l.startsWith(anahtar + "="));
  if (!satir) throw new Error(`${dosya} icinde ${anahtar} yok`);
  return satir.slice(anahtar.length + 1).trim().replace(/^["']|["']$/g, "");
}

// -- Giris -------------------------------------------------------------------
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

// -- Tum urunleri sayfalayarak cek -------------------------------------------
async function tumUrunler() {
  const hepsi = [];
  for (let sayfa = 1; sayfa <= 20; sayfa++) {
    const j = await (await api(`/api/admin/products?limit=100&page=${sayfa}`)).json();
    const d = j.data ?? [];
    hepsi.push(...d);
    const toplam = j.meta?.total ?? d.length;
    if (hepsi.length >= toplam || d.length === 0) break;
  }
  return hepsi;
}
const urunler = await tumUrunler();
console.log(`hedef: ${BASE} | panelden okunan urun: ${urunler.length}`);

const sentetikler = urunler.filter(sentetikMi);
const digerleri = urunler.filter((p) => !sentetikMi(p));

// -- Kume farki kaniti --------------------------------------------------------
// Desenle ESLESMEYEN her urun, bilinen gercek urun listesinde olmali.
const envSatirlari = readFileSync(ENVANTER, "utf-8").split(/\r?\n/);
const eskiUrunler = envSatirlari.filter((l) => l.startsWith("URUN|")).map((l) => l.split("|")[1]);
const bilinenGercek = new Set([
  ...eskiUrunler.filter((pn) => !SENTETIK.test(pn)),
  ...readFileSync(`${VERI}/B1_57_urunler.csv`, "utf-8")
    .replace(/^\uFEFF/, "").split(/\r?\n/).slice(1)
    .map((l) => (l.split(";")[0] ?? "").replace(/^"|"$/g, "").trim()).filter(Boolean),
]);
// Eski envanterdeki "0012345" adiyla sentetikti ama numarasi desene uymuyor;
// bilinen gercek listesinden CIKARILIR.
bilinenGercek.delete("0012345");

const tanimsiz = digerleri.filter((p) => !bilinenGercek.has(p.partNumber));
console.log(`\n── KUME FARKI KANITI ───────────────────────────────────`);
console.log(`   desenle eslesen (sentetik)   : ${sentetikler.length}`);
console.log(`   desenle eslesmeyen           : ${digerleri.length}`);
console.log(`   bilinen gercek urun listesi  : ${bilinenGercek.size}`);
console.log(`   listede OLMAYAN (acikta)     : ${tanimsiz.length}${tanimsiz.length ? " -> " + tanimsiz.map((p) => p.partNumber).join(", ") : ""}`);
if (tanimsiz.length > 0) {
  console.error("\nDURDURULDU: siniflandirilamayan urun var. Elle incelenmeli.");
  process.exit(1);
}
const eksikGercek = [...bilinenGercek].filter((pn) => !digerleri.some((p) => p.partNumber === pn));
console.log(`   listede olup panelde olmayan : ${eksikGercek.length}${eksikGercek.length ? " -> " + eksikGercek.join(", ") : ""}`);

console.log(`\n── SENTETIK KAYITLAR (${sentetikler.length}) ──────────────────────`);
for (const p of sentetikler.sort((a, b) => a.partNumber.localeCompare(b.partNumber))) {
  const risk = [];
  if (p.isActive) risk.push("public API + marka sayfasi + arama");
  if (p.isActive && p.seoReady) risk.push("SITEMAP");
  if (p.stockStatus !== "unknown") risk.push(`stok "${p.stockStatus}" gosteriliyor`);
  console.log(`   ${p.partNumber.padEnd(17)} ${String(p.name).slice(0, 34).padEnd(36)} active=${String(p.isActive).padEnd(5)} seo=${String(p.seoReady).padEnd(5)} stock=${String(p.stockStatus).padEnd(9)} ${risk.length ? "RISK: " + risk.join(" | ") : "risk yok"}`);
}

// -- Yapilacak degisiklikler --------------------------------------------------
const islemler = sentetikler.map((p) => {
  const govde = {};
  if (p.isActive) govde.isActive = false;
  if (p.seoReady) govde.seoReady = false;
  if (p.stockStatus !== "unknown") govde.stockStatus = "unknown";
  if (p.inStock) govde.inStock = false;
  return { p, govde };
}).filter((x) => Object.keys(x.govde).length > 0);

console.log(`\n── YAPILACAK DEGISIKLIKLER (${islemler.length} kayit) ──────────`);
for (const { p, govde } of islemler) {
  console.log(`   ${p.partNumber.padEnd(17)} ${JSON.stringify(govde)}`);
}

if (MODE === "dry-run") {
  console.log("\ndry-run: hicbir yazma yapilmadi.");
  process.exit(0);
}

// -- Geri donus ---------------------------------------------------------------
const geriDonus = sentetikler.map((p) => ({
  partNumber: p.partNumber, id: p.id,
  isActive: p.isActive, seoReady: p.seoReady, stockStatus: p.stockStatus, inStock: p.inStock,
}));
writeFileSync(`${VERI}/A8_test_kayit_geri_donus.json`, JSON.stringify(geriDonus, null, 1), "utf8");
console.log(`\ngeri donus dosyasi yazildi: A8_test_kayit_geri_donus.json (${geriDonus.length} kayit)`);

// -- Gercek urunlerin ONCESI parmak izi ---------------------------------------
const gercekOncesi = new Map(digerleri.map((p) => [p.partNumber, `${p.isActive}|${p.seoReady}|${p.stockStatus}|${p.inStock}`]));

// -- Yazim --------------------------------------------------------------------
console.log(`\n── YAZIM ──────────────────────────────────────────────`);
let basarili = 0;
for (const { p, govde } of islemler) {
  const r = await api(`/api/admin/products/${p.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (r.status !== 200) {
    console.error(`   ${p.partNumber}  HATA HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
    continue;
  }
  console.log(`   ${p.partNumber.padEnd(17)} HTTP 200`);
  basarili++;
}

// -- Dogrulama ----------------------------------------------------------------
const sonrasi = await tumUrunler();
const sonSentetik = sonrasi.filter(sentetikMi);
const sonDiger = sonrasi.filter((p) => !sentetikMi(p));

const halaAcik = sonSentetik.filter((p) => p.isActive);
const halaSeo = sonSentetik.filter((p) => p.seoReady);
const halaStok = sonSentetik.filter((p) => p.stockStatus !== "unknown");

const degisenGercek = sonDiger.filter(
  (p) => gercekOncesi.get(p.partNumber) !== `${p.isActive}|${p.seoReady}|${p.stockStatus}|${p.inStock}`,
);

console.log(`\n── DOGRULAMA ──────────────────────────────────────────`);
console.log(`   yazilan kayit                      : ${basarili}/${islemler.length}`);
console.log(`   hala is_active=true sentetik       : ${halaAcik.length}${halaAcik.length ? " -> " + halaAcik.map((p) => p.partNumber).join(", ") : ""}`);
console.log(`   hala seo_ready=true sentetik       : ${halaSeo.length}`);
console.log(`   hala stock<>unknown sentetik       : ${halaStok.length}`);
console.log(`   DEGISEN gercek urun                : ${degisenGercek.length}${degisenGercek.length ? " -> " + degisenGercek.map((p) => p.partNumber).join(", ") : " (hicbiri degismedi)"}`);
console.log(`   gercek urun sayisi                 : ${sonDiger.length} (oncesi ${digerleri.length})`);

const temiz = halaAcik.length === 0 && halaSeo.length === 0 && halaStok.length === 0 && degisenGercek.length === 0;
console.log(`\nSONUC: ${temiz ? "TEMIZ — tum sentetik kayitlar yayina kapali, gercek urunler degismedi." : "SORUNLU — yukaridaki bulgulara bakin."}`);
if (!temiz) process.exit(1);
