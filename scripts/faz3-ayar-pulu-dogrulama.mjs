/**
 * Üç kavrama ayar pulunun KALINLIK ↔ PARÇA NUMARASI eşleşmesini doğrular.
 * SALT OKUNUR.
 *
 * Kritik soru: "1 mm / 0,5 mm / 0,2 mm" değerleri DOĞRU parça numaralarıyla mı
 * eşleşiyor? Yanlış eşleşme, müşteriye yanlış parça göndermek demektir.
 *
 * Doğrulama, değeri TEK bir sayfadan okumaz; V18'in birbirinden bağımsız
 * sayfalarında aynı eşleşmeyi arar:
 *   · A Yayın Adayları     -> "Ölçü ve Özellik"
 *   · Tüm Ürünler          -> Logo'daki orijinal ürün adı
 *   · Araştırma Kaynakları -> kaynak kalemi ve kanıt alıntısı
 *   · Makine Uyumluluğu    -> çizim / kalem
 *
 * Ayrıca aynı aileden (61963-*) BAŞKA ayar pulu olup olmadığını arar: eksik
 * bir kademe varsa "üç kademe" ifadesi yanlış olurdu.
 *
 * Kullanım: node scripts/faz3-ayar-pulu-dogrulama.mjs
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const V18 = "C:/Users/HP/Downloads/NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx";
const N = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const S = (r, c) => String(r[c] ?? "").trim();

const wb = XLSX.read(readFileSync(V18), { type: "buffer" });
const sh = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { raw: false, defval: "" });
const WK = sh("Web Katalog Adayları");
const A = sh("A Yayın Adayları");
const KAY = sh("Araştırma Kaynakları");
const UY = sh("Makine Uyumluluğu");
const EK = sh("A Grubu Teknik Eksikler");
const TUM = XLSX.utils.sheet_to_json(wb.Sheets["Tüm Ürünler"], { raw: true, defval: "" });

const HEDEF = ["61963-00900", "61963-01100", "61963-01200"];

console.log("=".repeat(78));
console.log("A) UC AYAR PULUNUN KALINLIK ESLESMESI — BAGIMSIZ SAYFA KARSILASTIRMASI");
console.log("=".repeat(78));

const satirlar = [];
for (const pn of HEDEF) {
  const k = N(pn);
  const wk = WK.find((r) => N(S(r, "Orijinal Logo Stok Kodu")) === k);
  const a = A.find((r) => N(S(r, "Orijinal Ürün Kodu")) === k);
  const tum = TUM.find((r) => N(r["Orijinal Ürün Kodu"]) === k);
  const kay = KAY.filter((r) => N(S(r, "Orijinal Ürün Kodu")) === k);
  const uy = UY.filter((r) => N(S(r, "Orijinal Ürün Kodu")) === k && S(r, "Uyum Kanıtı") === "Kesin doğrulandı");
  const ek = EK.find((r) => N(S(r, "Orijinal Ürün Kodu")) === k);

  satirlar.push({
    pn,
    katalog: wk ? S(wk, "Katalog Referansı") : "(yok)",
    teknikAd: wk ? S(wk, "Teknik Ad TR") : "(yok)",
    teknikAdEN: a ? S(a, "Teknik Ad EN") : "(yok)",
    olcu: a ? S(a, "Ölçü ve Özellik") : "(yok)",
    logoAdi: String(tum?.["Orijinal Ürün Adı"] ?? "").trim(),
    logoAdet: tum?.["Gerçek Stok Miktarı"] ?? "",
    teknikKimlik: ek ? S(ek, "Teknik Kimlik") : "(yok)",
    kaynakKalemi: ek ? S(ek, "Kaynak / Kalem") : "(yok)",
    kaynaklar: kay.map((r) => ({
      kimlik: S(r, "Kaynak Kimliği"),
      belge: S(r, "Belge / Katalog"),
      kalem: S(r, "Sayfa / Çizim / Kalem"),
      iddia: S(r, "Desteklenen İddia / Arama"),
      url: S(r, "Kaynak URL"),
    })),
    modeller: [...new Set(uy.map((r) => `${S(r, "Makine Markası")} ${S(r, "Makine Modeli")}`))],
    uyumKalemleri: [...new Set(uy.map((r) => S(r, "Sayfa / Çizim / Kalem")))],
  });
}

for (const s of satirlar) {
  console.log(`\n--- ${s.pn} ---`);
  console.log(`  katalog referansi : ${s.katalog}`);
  console.log(`  teknik ad         : ${s.teknikAd} / ${s.teknikAdEN}`);
  console.log(`  OLCU (A sayfasi)  : ${s.olcu}`);
  console.log(`  Logo'daki ad      : ${s.logoAdi}   (adet: ${s.logoAdet})`);
  console.log(`  teknik kimlik     : ${s.teknikKimlik}`);
  console.log(`  kaynak / kalem    : ${s.kaynakKalemi}`);
  console.log(`  uyum kalemleri    : ${s.uyumKalemleri.join(" | ")}`);
  console.log(`  modeller          : ${s.modeller.join(", ")}`);
  for (const k of s.kaynaklar) {
    console.log(`  kaynak[${k.kimlik}] ${k.belge}`);
    console.log(`     kalem: ${k.kalem}`);
    console.log(`     iddia: ${k.iddia}`);
  }
}

// --- Capraz kontroller ------------------------------------------------------
console.log(`\n${"=".repeat(78)}`);
console.log("B) CAPRAZ KONTROLLER");
console.log("=".repeat(78));

const olculer = satirlar.map((s) => s.olcu);
const benzersiz = new Set(olculer);
console.log(`\n1. Her urunun ayri bir olcusu var mi?  ${benzersiz.size === satirlar.length ? "EVET" : "HAYIR"}  (${olculer.join(" / ")})`);

const olcuBos = satirlar.filter((s) => !s.olcu || s.olcu === "(yok)");
console.log(`2. Olcusu bos olan: ${olcuBos.length}`);

// Logo adi kalinligi iceriyor mu? (bagimsiz ikinci kanit)
console.log(`3. Logo adi olcuyu dogruluyor mu?`);
for (const s of satirlar) {
  const sayi = s.olcu.replace(/[^0-9,.]/g, "");
  const logoIceriyor = sayi && s.logoAdi.replace(/\s/g, "").includes(sayi.replace(/\s/g, ""));
  console.log(`   ${s.pn}  olcu="${s.olcu}"  logoAdi="${s.logoAdi}"  -> ${logoIceriyor ? "LOGO ADI DA AYNI DEGERI TASIYOR" : "logo adi olcu icermiyor"}`);
}

// Ayni ailede baska ayar pulu var mi?
console.log(`\n4. 61963-* ailesindeki TUM kayitlar:`);
const aile = WK.filter((r) => /^61963/.test(S(r, "Orijinal Logo Stok Kodu")));
for (const r of aile) {
  const k = N(S(r, "Orijinal Logo Stok Kodu"));
  const a = A.find((x) => N(S(x, "Orijinal Ürün Kodu")) === k);
  console.log(`   ${S(r, "Orijinal Logo Stok Kodu").padEnd(14)} sev=${S(r, "Seviye")} ${S(r, "Teknik Ad TR").padEnd(38)} olcu="${a ? S(a, "Ölçü ve Özellik") : ""}"`);
}

const ayarPullari = aile.filter((r) => /ayar pulu/i.test(S(r, "Teknik Ad TR")));
console.log(`\n   ailedeki ayar pulu sayisi: ${ayarPullari.length}`);
console.log(`   hedefteki sayi           : ${HEDEF.length}`);
console.log(`   -> ${ayarPullari.length === HEDEF.length ? "TUM KADEMELER HEDEFTE" : "UYARI: ailede hedefte olmayan ayar pulu var"}`);

// Kalinlik degerleri birbirinin alt-dizesi mi? (0,2 <-> 0,25 gibi karisma riski)
console.log(`\n5. Kalinlik degerleri birbiriyle karisabilir mi?`);
const degerler = satirlar.map((s) => s.olcu.replace(/[^0-9,]/g, ""));
let karisma = false;
for (let i = 0; i < degerler.length; i++) {
  for (let j = 0; j < degerler.length; j++) {
    if (i !== j && degerler[j].startsWith(degerler[i])) {
      console.log(`   UYARI: "${degerler[i]}" degeri "${degerler[j]}" icinde bulunuyor`);
      karisma = true;
    }
  }
}
if (!karisma) console.log(`   hayir — degerler (${degerler.join(", ")}) birbirinin on eki degil`);
