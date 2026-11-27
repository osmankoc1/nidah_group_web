/**
 * T3'teki 31 ürünün makine uyumluluklarının ve kaynaklarının YENİDEN
 * doğrulanması. SALT OKUNUR.
 *
 * Soru: marka sayfası eksikliği TEK engel mi?
 *
 * Her ürün için ayrı ayrı kontrol edilir:
 *   1. En az 1 "Kesin doğrulandı" makine uyumu var mı?
 *   2. Her kesin uyumun kaynak kimliği, kaynak URL'si ve kalemi dolu mu?
 *   3. Kaynak, `Araştırma Kaynakları` sayfasında gerçekten kayıtlı mı?
 *   4. Ürün mükerrer kümesinde mi? (varsa türü)
 *   5. Çelişkili kayıtlar listesinde mi?
 *   6. Mevcut 109 kayıtla çakışıyor mu?
 *   7. Teknik kimlik "Kesin · mevcut kanıt" mı?
 *   8. Marka dışında BAŞKA bir engel var mı?
 *
 * Marka sayfası engeli DIŞINDA hiçbir bulgu yoksa ürün
 * "MARKA SAYFASI ACILINCA AKTARILABILIR" olarak sınıflanır.
 *
 * Kullanım: node scripts/faz3-t3-yeniden-dogrulama.mjs <mevcut109.txt> <cikti-dizini>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , envanterYolu, outArg] = process.argv;
if (!envanterYolu || !outArg) {
  console.error("Kullanim: node scripts/faz3-t3-yeniden-dogrulama.mjs <envanter> <cikti-dizini>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const KESIN = "Kesin doğrulandı";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

// -- Mevcut envanter ---------------------------------------------------------
const satirlar = readFileSync(envanterYolu, "utf-8").split(/\r?\n/);
const mevcut = satirlar.filter((l) => l.startsWith("URUN|")).map((l) => {
  const [, pn, kod, norm] = l.split("|");
  return { pn: (pn ?? "").trim(), kod: (kod ?? "").trim(), norm: (norm ?? "").trim() };
});
const mevcutPn = new Set(mevcut.map((m) => N(m.pn)));
const mevcutStok = new Set(mevcut.filter((m) => m.norm).map((m) => m.norm));
const mevcutMakine = new Set(
  satirlar.filter((l) => l.startsWith("MAKINE|")).map((l) => {
    const [, mf, mod] = l.split("|");
    return `${N(mf)}|${N(mod)}`;
  }),
);

// -- V18 ---------------------------------------------------------------------
const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const WK = sh("Web Katalog Adayları");
const A = sh("A Yayın Adayları");
const EK = sh("A Grubu Teknik Eksikler");
const UY = sh("Makine Uyumluluğu");
const KAY = sh("Araştırma Kaynakları");
const CEL = sh("Çelişkili Kayıtlar");
const MUK = sh("Mükerrer Adayları");

const wkByKod = new Map(WK.map((r) => [N(S(r, "Orijinal Logo Stok Kodu")), r]));
const aByKod = new Map(A.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const ekByKod = new Map(EK.map((r) => [N(S(r, "Orijinal Ürün Kodu")), r]));
const push = (m, k, v) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
const uyByKod = new Map();
for (const r of UY) push(uyByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const kayByKod = new Map();
for (const r of KAY) push(kayByKod, N(S(r, "Orijinal Ürün Kodu")), r);
const kayKimlikleri = new Set(KAY.map((r) => S(r, "Kaynak Kimliği")).filter(Boolean));
const celKod = new Set(CEL.map((r) => N(S(r, "Orijinal Ürün Kodu"))));
const mukTuru = new Map();
for (const r of MUK) {
  const k = N(S(r, "Orijinal Ürün Kodu"));
  if (!mukTuru.has(k)) mukTuru.set(k, new Set());
  mukTuru.get(k).add(S(r, "Karşılaştırma Türü"));
}

// -- T3 listesi --------------------------------------------------------------
const oku = (p) => {
  const t = readFileSync(p, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const h = t[0].split(";").map((x) => x.replace(/^"|"$/g, ""));
  return t.slice(1).map((l) => {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
    return Object.fromEntries(h.map((b, i) => [b, c[i] ?? ""]));
  });
};
const T3 = oku(OUT + "95_T3.csv");

const sonuc = [];
for (const u of T3) {
  const kod = N(u.logoKodu);
  const wk = wkByKod.get(kod);
  const a = aByKod.get(kod);
  const ek = ekByKod.get(kod);
  const kesin = (uyByKod.get(kod) ?? []).filter((x) => S(x, "Uyum Kanıtı") === KESIN);
  const bulgular = [];

  // 1 — kesin uyum
  if (kesin.length === 0) bulgular.push("kesin-makine-uyumu-yok");

  // 2 — her uyumun kaynagi tam mi
  const eksikKaynak = kesin.filter(
    (x) => !S(x, "Kaynak Kimliği") || !S(x, "Kaynak URL") || !S(x, "Sayfa / Çizim / Kalem"),
  );
  if (eksikKaynak.length) bulgular.push(`uyum-kaynagi-eksik(${eksikKaynak.length})`);

  // 3 — kaynak kimligi kayitli mi
  const tanimsizKaynak = [
    ...new Set(kesin.map((x) => S(x, "Kaynak Kimliği")).filter(Boolean)),
  ].filter((k) => !kayKimlikleri.has(k));
  if (tanimsizKaynak.length) bulgular.push(`kaynak-kayitli-degil(${tanimsizKaynak.join(",")})`);

  // 4 — urun duzeyi kaynak kaydi
  if (!(kayByKod.get(kod) ?? []).length) bulgular.push("urun-kaynak-kaydi-yok");

  // 5 — mukerrer / celiski
  const mt = [...(mukTuru.get(kod) ?? [])];
  if (mt.includes("Biçim farkı olan kod")) bulgular.push("bicim-farki-olan-kod");
  if (celKod.has(kod)) bulgular.push("celiskili-kayit");

  // 6 — mevcut 109 ile cakisma
  const katalogNorm = N(u.partNumber);
  if (mevcutPn.has(katalogNorm)) bulgular.push("mevcut-parca-numarasiyla-cakisiyor");
  if (mevcutStok.has(kod)) bulgular.push("mevcut-logo-koduyla-cakisiyor");

  // 7 — teknik kimlik
  if (!/Kesin/.test(u.teknikKimlik)) bulgular.push(`teknik-kimlik=${u.teknikKimlik}`);
  if (!S(wk ?? {}, "Katalog Referansı")) bulgular.push("katalog-referansi-yok");
  if (!S(wk ?? {}, "Teknik Ad TR")) bulgular.push("teknik-ad-yok");
  if (!a) bulgular.push("A-yayin-adaylarinda-yok");
  if (!ek) bulgular.push("teknik-eksikler-kaydi-yok");

  const markalar = [...new Set(kesin.map((x) => S(x, "Makine Markası")))];
  const modeller = [...new Set(kesin.map((x) => `${S(x, "Makine Markası")} ${S(x, "Makine Modeli")}`))];
  const yeniMakineler = modeller.filter((m) => {
    const [mf, ...rest] = m.split(" ");
    return !mevcutMakine.has(`${N(mf)}|${N(rest.join(" "))}`);
  });

  sonuc.push({
    partNumber: u.partNumber,
    logoKodu: u.logoKodu,
    teknikAdTR: u.teknikAdTR,
    teknikAdEN: u.teknikAdEN,
    teknikKategori: u.teknikKategori,
    markalar: markalar.join(", "),
    kesinUyumSayisi: kesin.length,
    modeller: modeller.join(" | "),
    yeniMakineSayisi: yeniMakineler.length,
    yeniMakineler: yeniMakineler.join(" | "),
    kaynakKalemleri: [...new Set(kesin.map((x) => S(x, "Sayfa / Çizim / Kalem")))].join(" | "),
    kaynakURL: [...new Set(kesin.map((x) => S(x, "Kaynak URL")))].join(" | "),
    kaynakKimlikleri: [...new Set(kesin.map((x) => S(x, "Kaynak Kimliği")))].join(", "),
    mukerrerTuru: mt.join(" + ") || "-",
    seriKapsami: wk ? S(wk, "Seri Kapsamı") : "",
    oem: wk ? S(wk, "OEM Referansları") : "",
    eksikBilgiler: wk ? S(wk, "Eksik Bilgiler") : "",
    markaDisiBulgu: bulgular.length,
    bulgular: bulgular.join("; ") || "-",
    karar: bulgular.length === 0 ? "MARKA SAYFASI ACILINCA AKTARILABILIR" : "EK BULGU VAR - BEKLET",
  });
}

// -- Çıktı -------------------------------------------------------------------
console.log("=== T3 - 31 URUNUN YENIDEN DOGRULAMASI ===\n");
const markaDag = new Map();
for (const s of sonuc) for (const m of s.markalar.split(", ").filter(Boolean)) markaDag.set(m, (markaDag.get(m) ?? 0) + 1);
console.log("Marka dagilimi:");
for (const [k, v] of [...markaDag.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

const temiz = sonuc.filter((s) => s.markaDisiBulgu === 0);
const kirli = sonuc.filter((s) => s.markaDisiBulgu > 0);
console.log(`\nMarka DISINDA hicbir bulgu olmayan: ${temiz.length}/${sonuc.length}`);
console.log(`Ek bulgusu olan                  : ${kirli.length}/${sonuc.length}`);
if (kirli.length) {
  console.log("\n-- ek bulgulu urunler --");
  for (const s of kirli) console.log(`  ${s.partNumber.padEnd(16)} ${s.teknikAdTR.padEnd(30)} ${s.bulgular}`);
}

console.log("\n-- temiz urunler --");
for (const s of temiz) {
  console.log(`  ${s.partNumber.padEnd(16)} ${s.teknikAdTR.padEnd(30)} ${s.markalar.padEnd(12)} uyum=${String(s.kesinUyumSayisi).padStart(2)} yeniMakine=${String(s.yeniMakineSayisi).padStart(2)}`);
}

const tumYeniMakineler = new Set();
for (const s of temiz) for (const m of s.yeniMakineler.split(" | ").filter(Boolean)) tumYeniMakineler.add(m);
console.log(`\nTemiz urunlerin gerektirdigi YENI makine kaydi: ${tumYeniMakineler.size}`);
for (const m of [...tumYeniMakineler].sort()) console.log(`  ${m}`);

const COLS = Object.keys(sonuc[0]);
const csv = (rs, cs) =>
  [cs.join(";"), ...rs.map((r) => cs.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
writeFileSync(OUT + "A1_T3_yeniden_dogrulama.csv", "\uFEFF" + csv(sonuc, COLS), "utf8");
console.log(`\nA1_T3_yeniden_dogrulama.csv yazildi -> ${OUT}`);
