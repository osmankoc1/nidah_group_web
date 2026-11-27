/**
 * 75 adayın KARAR ODAKLI sınıflandırması. SALT OKUNUR.
 *
 * İlk denetim 8 "aktarılabilir", 67 "şüpheli" verdi. Ama şüphelilerin 59'u
 * TEK engel taşıyor ve bu engellerin çoğu VERİ sorunu değil, KARAR sorunu:
 *
 *   · "sayfali-markada-kesin-uyum-yok" (31) → Mitsubishi / Çukurova / Hitachi
 *     markalarının sitede sayfası yok. Veri eksik değil; marka kararı eksik.
 *   · "mukerrer-adayi" (23) → araştırmanın `Mükerrer Adayları` sayfasında
 *     geçiyor. Ama 18'i YALNIZCA "Benzer ürün adı" ile işaretli; bu, teyit
 *     edilmiş bir mükerrer değil, incelenmesi istenen zayıf bir sinyal.
 *     "Biçim farkı olan kod" ise gerçek mükerrer riskidir.
 *
 * Bu script adayları beş kademeye ayırır ki hangi engelin KARARLA, hangisinin
 * VERİYLE kalktığı görünsün.
 *
 * Kullanım: node scripts/faz3-75aday-siniflandirma.mjs <denetim.csv> <cikti>
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const [, , denetimCsv, outArg] = process.argv;
if (!denetimCsv || !outArg) {
  console.error("Kullanim: node scripts/faz3-75aday-siniflandirma.mjs <denetim.csv> <cikti>");
  process.exit(1);
}
const OUT = /[/\\]$/.test(outArg) ? outArg : outArg + "/";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const wb = XLSX.read(readFileSync("C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx"), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const MUK = sh("Mükerrer Adayları");
const UY = sh("Makine Uyumluluğu");

const mukByKod = new Map();
for (const r of MUK) {
  const k = N(S(r, "Orijinal Ürün Kodu"));
  const l = mukByKod.get(k); if (l) l.push(r); else mukByKod.set(k, [r]);
}
const uyByKod = new Map();
for (const r of UY) {
  const k = N(S(r, "Orijinal Ürün Kodu"));
  const l = uyByKod.get(k); if (l) l.push(r); else uyByKod.set(k, [r]);
}

const metin = readFileSync(denetimCsv, "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
const baslik = metin[0].split(";").map((h) => h.replace(/^"|"$/g, ""));
const kayitlar = metin.slice(1).map((l) => {
  const c = l.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"'));
  return Object.fromEntries(baslik.map((b, i) => [b, c[i] ?? ""]));
});

const KADEME = {
  T1: "T1 - AKTARILABILIR (engel yok)",
  T2: "T2 - KARAR: zayif mukerrer sinyali (yalnizca 'Benzer urun adi')",
  T3: "T3 - KARAR: marka sayfasi yok",
  T4: "T4 - VERI: dogrulanmis makine uyumu yok",
  T5: "T5 - COKLU ENGEL / gercek mukerrer riski",
};

for (const k of kayitlar) {
  // CSV gidis-donusunde alanlarda bosluk kalabiliyor; bosluk yuzunden
  // engel adi kaliplarla eslesmezse kayit yanlislikla T5'e dusuyordu.
  const engeller = k.engeller === "-" ? []
    : k.engeller.split(";").map((x) => x.trim()).filter(Boolean);
  const n = engeller.length;

  // Mukerrer sinyalinin turu
  const mukKayitlari = mukByKod.get(N(k.logoKodu)) ?? [];
  const turler = new Set(mukKayitlari.map((m) => S(m, "Karşılaştırma Türü")));
  k.mukerrerTuru = [...turler].join(" + ") || "-";
  const zayifMukerrer = turler.size > 0 && !turler.has("Biçim farkı olan kod");

  // Sayfasiz markalar
  const kesinUyumlar = (uyByKod.get(N(k.logoKodu)) ?? []).filter((x) => S(x, "Uyum Kanıtı") === "Kesin doğrulandı");
  k.gercekMarkalar = [...new Set(kesinUyumlar.map((x) => S(x, "Makine Markası")))].join(", ");
  k.gercekModeller = [...new Set(kesinUyumlar.map((x) => `${S(x, "Makine Markası")} ${S(x, "Makine Modeli")}`.trim()))].slice(0, 6).join(" | ");

  if (n === 0) { k.kademe = "T1"; k.kararNotu = "Aktarima hazir"; continue; }
  if (n === 1 && engeller[0] === "mukerrer-adayi" && zayifMukerrer) {
    k.kademe = "T2";
    k.kararNotu = `Yalnizca "Benzer urun adi" sinyali (${k.mukerrerTuru}). Teyit edilmis mukerrer DEGIL.`;
    continue;
  }
  if (n === 1 && engeller[0] === "sayfali-markada-kesin-uyum-yok") {
    k.kademe = "T3";
    k.kararNotu = `Dogrulanmis uyum VAR ama markanin site sayfasi yok: ${k.gercekMarkalar}`;
    continue;
  }
  if (n === 1 && engeller[0] === "kesin-makine-uyumu-yok") {
    k.kademe = "T4";
    k.kararNotu = "Hic dogrulanmis makine uyumu yok — SEO kapisi zaten gecirmez";
    continue;
  }
  k.kademe = "T5";
  k.kararNotu = `${n} engel: ${k.engeller}`;
}

const grup = new Map();
for (const k of kayitlar) {
  const l = grup.get(k.kademe); if (l) l.push(k); else grup.set(k.kademe, [k]);
}

console.log("=== 75 ADAYIN KARAR ODAKLI SINIFLANDIRMASI ===\n");
for (const t of ["T1", "T2", "T3", "T4", "T5"]) {
  const g = grup.get(t) ?? [];
  console.log(`${KADEME[t]}`);
  console.log(`  ${g.length} urun`);
  if (t === "T3") {
    const m = new Map();
    for (const k of g) for (const x of k.gercekMarkalar.split(", ").filter(Boolean)) m.set(x, (m.get(x) ?? 0) + 1);
    console.log(`     markalar: ${[...m.entries()].map(([a, b]) => `${a} (${b})`).join(", ")}`);
  }
  if (t === "T5") {
    for (const k of g) console.log(`     ${k.partNumber.padEnd(16)} ${k.kararNotu.slice(0, 90)}`);
  }
  console.log("");
}

console.log("=== T1 — AKTARILABILIR ===");
for (const k of grup.get("T1") ?? []) {
  console.log(`  ${k.partNumber.padEnd(16)} ${k.teknikAdTR.padEnd(32)} uyum=${k.sayfaliUyum} | ${k.gercekModeller.slice(0, 50)}`);
}

const csv = (rows, cols) =>
  [cols.join(";"), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\r\n");
const COLS = [...baslik, "kademe", "kararNotu", "mukerrerTuru", "gercekMarkalar", "gercekModeller"];
kayitlar.sort((a, b) => a.kademe.localeCompare(b.kademe) || a.partNumber.localeCompare(b.partNumber));
writeFileSync(OUT + "94_75aday_siniflandirma.csv", "\uFEFF" + csv(kayitlar, COLS), "utf8");
for (const t of ["T1", "T2", "T3", "T4", "T5"]) {
  writeFileSync(OUT + `95_${t}.csv`, "\uFEFF" + csv(grup.get(t) ?? [], COLS), "utf8");
}
console.log(`\n94_75aday_siniflandirma.csv ve 95_T1..T5.csv yazildi -> ${OUT}`);
