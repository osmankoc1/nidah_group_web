/**
 * Çalışma kitabı profilleyici — SALT OKUNUR.
 *
 * Faz 3 hazırlığı: araştırma çalışma kitabının kolonları ÖNCEDEN VARSAYILMAZ.
 * Bu araç dosyayı okur ve yapısını raporlar; eşleme kararları rapora bakılarak
 * verilir.
 *
 * Kullanım:
 *   node scripts/inspect-workbook.mjs "<dosya-yolu>" [--rows N]
 *
 * Yazma yapmaz, veritabanına dokunmaz, dosyayı değiştirmez.
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { normalizePartNumber } from "../src/lib/part-number.ts";

const [, , filePath, ...rest] = process.argv;
if (!filePath) {
  console.error('Kullanim: node scripts/inspect-workbook.mjs "<dosya-yolu>" [--rows N]');
  process.exit(1);
}
const sampleCount = Number(rest[rest.indexOf("--rows") + 1]) || 3;

const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: true });

console.log("DOSYA     :", filePath.split(/[\\/]/).pop());
console.log("SAYFALAR  :", wb.SheetNames.join(" · "));
console.log("");

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const typed = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });
  const text = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" });
  const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })[0] ?? [];
  const headers = headerRow.map((h) => String(h ?? "").trim()).filter(Boolean);

  console.log("=".repeat(76));
  console.log(`SAYFA: ${sheetName}`);
  console.log(`  satir (baslik haric): ${typed.length}   kolon: ${headers.length}   aralik: ${ws["!ref"] ?? "-"} (${range.e.r + 1} satir)`);
  console.log("");
  console.log("  KOLON PROFILI");
  console.log("  " + "-".repeat(72));
  console.log(
    "  " +
      "#".padEnd(4) +
      "kolon".padEnd(30) +
      "dolu".padEnd(7) +
      "tip".padEnd(14) +
      "ornek"
  );

  headers.forEach((h, i) => {
    const vals = typed.map((r) => r[h]);
    const dolu = vals.filter((v) => v !== "" && v !== null && v !== undefined).length;
    const tipler = new Set(
      vals
        .filter((v) => v !== "" && v !== null && v !== undefined)
        .map((v) => (v instanceof Date ? "date" : typeof v))
    );
    // SAYI TIPI UYARISI: parca numarasi kolonu sayi ise bastaki sifirlar KAYIP.
    const sayiUyarisi = tipler.has("number") ? " ⚠sayi" : "";
    const ornek = text
      .map((r) => String(r[h] ?? "").trim())
      .find((v) => v.length > 0);
    console.log(
      "  " +
        String(i + 1).padEnd(4) +
        h.slice(0, 29).padEnd(30) +
        `${dolu}/${typed.length}`.padEnd(7) +
        ([...tipler].join(",") + sayiUyarisi).padEnd(14) +
        (ornek ?? "").slice(0, 40)
    );
  });

  // Parca numarasi adayi kolonlar: benzersizlik ve normalize cakismasi
  const adaylar = headers.filter((h) =>
    /part|parca|parça|no|number|kod|code|stok|sku|ref/i.test(h)
  );
  if (adaylar.length > 0) {
    console.log("");
    console.log("  PARCA NUMARASI ADAYLARI (benzersizlik + normalize cakismasi)");
    console.log("  " + "-".repeat(72));
    for (const h of adaylar) {
      const raw = text.map((r) => String(r[h] ?? "").trim()).filter(Boolean);
      const benzersiz = new Set(raw).size;
      const norm = raw.map(normalizePartNumber).filter(Boolean);
      const normBenzersiz = new Set(norm).size;
      const sayiTipli = typed.filter((r) => typeof r[h] === "number").length;
      console.log(
        `  ${h.slice(0, 28).padEnd(29)} dolu=${String(raw.length).padEnd(5)} benzersiz=${String(benzersiz).padEnd(5)} normalize-benzersiz=${String(normBenzersiz).padEnd(5)} sayi-tipli=${sayiTipli}${sayiTipli > 0 ? " ⚠" : ""}`
      );
      if (benzersiz !== normBenzersiz) {
        const sayac = new Map();
        raw.forEach((v) => {
          const k = normalizePartNumber(v);
          if (!k) return;
          sayac.set(k, (sayac.get(k) ?? []).concat ? [...(sayac.get(k) ?? []), v] : [v]);
        });
        const cakisan = [...sayac.entries()].filter(([, list]) => new Set(list).size > 1).slice(0, 5);
        for (const [k, list] of cakisan) {
          console.log(`      ⚠ normalize cakismasi "${k}": ${[...new Set(list)].slice(0, 4).join(" | ")}`);
        }
      }
    }
  }

  console.log("");
  console.log(`  ILK ${sampleCount} SATIR (metin gorunumu)`);
  console.log("  " + "-".repeat(72));
  text.slice(0, sampleCount).forEach((r, i) => {
    console.log(`  --- satir ${i + 2} ---`);
    for (const h of headers) {
      const v = String(r[h] ?? "").trim();
      if (v) console.log(`      ${h.slice(0, 26).padEnd(27)}: ${v.slice(0, 90)}`);
    }
  });
  console.log("");
}
