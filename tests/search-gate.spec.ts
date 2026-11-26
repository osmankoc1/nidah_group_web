import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sozlukKur, aramaKarariVer, type SozlukSatiri } from "@/lib/search-gate-core";

/**
 * ARAMA KAPISI — DOĞRULUK TESTİ
 *
 * Kapının tek tehlikesi YANLIŞ "bos" kararıdır: gerçek bir ürünün aramayla
 * bulunamaması. Buradaki testler bunu üç seviyede ölçer:
 *
 *  1. Senaryo testleri — marka, parça numarası biçimleri, Türkçe karakter,
 *     muadil numara, normalizasyon.
 *  2. KANIT testi — katalogdaki her değerin HER ALT DİZESİ için karar asla
 *     "bos" olamaz (kaba kuvvet, tüm alt dizeler).
 *  3. Bekçi testi — `/api/products` GET'inin aradığı sütun kümesi sözlüğe
 *     beslenen küme dışına çıkarsa test düşer.
 */

/** Sentetik katalog — gerçek veri DEĞİL, biçimleri temsil eder. */
const KATALOG: SozlukSatiri[] = [
  { pn: "VOE 14512695",  pnn: "VOE14512695",  ad: "Yağ Filtresi" },
  { pn: "328-9669",      pnn: "3289669",      ad: "Enjektör Grubu" },
  { pn: "6732-81-3100",  pnn: "6732813100",   ad: "Turbo Şarj Ünitesi" },
  { pn: "CH 76281",      pnn: "CH76281",      ad: "Hidrolik Pompa Mili" },
  { pn: "SA8230-23620",  pnn: "SA823023620",  ad: "Şanzıman Dişlisi" },
  { pn: "RM80123456",    pnn: "RM80123456",   ad: "Çekvalf Takımı" },
  // 0006 öncesi satır: normalize kolon NULL (ham kolona düşülür)
  { pn: "ZX-200/3",      pnn: null,           ad: "İtici Pim" },
  { pn: "AT309478",      pnn: "AT309478",      ad: "Ön Cam Silecek Lastiği (ÜÇGEN)" },
  // Muadil / cross-ref numarası, kendi kaydı olarak
  { pn: "4W-3024",       pnn: "4W3024",       ad: "Keçe — muadil" },
];

const SOZLUK = sozlukKur(KATALOG);

function karar(arama: string) {
  return aramaKarariVer(SOZLUK, arama);
}

// ── 1. Senaryolar ───────────────────────────────────────────────────────────

test.describe("parça numarası biçimleri", () => {
  const girdiler = [
    "VOE 14512695", "VOE14512695", "voe14512695", "14512695",
    "328-9669", "3289669", "328 9669", "9669",
    "6732-81-3100", "6732813100", "6732 81 3100", "81-3100",
    "CH 76281", "CH76281", "ch-76281", "ch 76281", "76281",
    "SA8230-23620", "SA823023620", "sa8230 23620", "23620",
    "RM80123456", "rm80123456", "80123456",
    "ZX-200/3", "zx-200", "200/3",
    "AT309478", "at309478", "309478",
  ];
  for (const g of girdiler) {
    test(`"${g}" elenmez`, () => {
      expect(karar(g).tur).not.toBe("bos");
    });
  }
});

test("normalize edilmiş parça numaraları önbelleğe DEĞER (sıcak yol korunur)", () => {
  for (const g of ["CH76281", "ch-76281", "3289669", "328-9669", "VOE14512695"]) {
    expect(karar(g)).toEqual({ tur: "onbellekli", neden: "parca-govdesi" });
  }
});

test.describe("Türkçe karakterli ad aramaları", () => {
  for (const g of [
    "yağ", "YAĞ", "Yağ Filtresi", "keçe", "KEÇE", "şanzıman", "ŞANZIMAN",
    "çekvalf", "Çekvalf", "itici", "İtici", "üçgen", "ÜÇGEN", "dişli",
    "enjektör", "silecek lastiği", "turbo şarj",
  ]) {
    test(`"${g}" elenmez`, () => {
      expect(karar(g).tur).not.toBe("bos");
    });
  }
});

test("muadil numara kendi kaydıyla bulunur", () => {
  for (const g of ["4W-3024", "4W3024", "4w3024", "3024"]) {
    expect(karar(g).tur).not.toBe("bos");
  }
});

/**
 * ÖLÇÜLEN SINIR (kapi kaynakli DEGIL, SQL kaynakli):
 * `part_number_normalized` NULL olan (0006 öncesi) bir satır, NORMALİZE
 * arama biçimiyle bulunamaz — çünkü SQL o satırda ham kolonu HAM aramayla
 * karşılaştırır (`and(isNull(pnn), ilike(pn, %arama%))`). Kapının "bos"
 * demesi bu yüzden DOĞRUdur: sorgu çalışsa da 0 satır dönerdi.
 * Çözüm kapıda değil VERİDE: her satırın `pnn`'i dolu olmalı (tüm admin
 * yazma yolları bunu zaten yapıyor; kalan risk 0006 öncesi artık satırlardır).
 */
test("pnn NULL satir: normalize bicim SQL'de de eslesmez, kapi SQL ile ayni davranir", () => {
  expect(aramaKarariVer(SOZLUK, "ZX2003").tur).toBe("bos");
  expect(aramaKarariVer(SOZLUK, "ZX-200/3").tur).not.toBe("bos");
});

test("ayrisik (NFD) Turkce girdi elenmez", () => {
  // "İtici".toLowerCase() === "i̇tici" (i + U+0307)
  for (const g of ["İtici Pim".toLowerCase(), "İtici".toLowerCase(), "Keçe".normalize("NFD"), "Şanzıman".normalize("NFD")]) {
    expect(aramaKarariVer(SOZLUK, g).tur).not.toBe("bos");
  }
});

test("3 karakterden kısa aramalar kapıya takılmaz", () => {
  for (const g of ["CH", "76", "zz", "ağ"]) {
    expect(karar(g).tur).not.toBe("bos");
  }
});

test("arama yoksa karar önbelleklidir", () => {
  expect(aramaKarariVer(SOZLUK, null)).toEqual({ tur: "onbellekli", neden: "arama-yok" });
});

test("eşleşmesi İMKÂNSIZ dizeler reddedilir (0 sorgu, 0 önbellek yazması)", () => {
  for (const g of [
    "wp-admin", "QZXJWV", "xmlrpc", "phpmyadmin", "qqqqqqq",
    "zzzxxxyyy", "jwqxzvk", "/etc/passwd", "'; DROP TABLE",
  ]) {
    expect(karar(g)).toEqual({ tur: "bos", neden: "ngram" });
  }
});

// ── 2. KANIT: hiçbir gerçek alt dize elenemez ───────────────────────────────

test("KANIT — katalogdaki her değerin her alt dizesi kapıdan geçer", () => {
  const degerler = KATALOG.flatMap((r) => [r.pn, r.pnn, r.ad]).filter(
    (v): v is string => Boolean(v)
  );
  let sayac = 0;
  const elenen: string[] = [];
  for (const deger of degerler) {
    for (let i = 0; i < deger.length; i++) {
      for (let j = i + 2; j <= deger.length; j++) {
        const parca = deger.slice(i, j);
        for (const varyant of [parca, parca.toLowerCase(), parca.toUpperCase()]) {
          sayac++;
          if (aramaKarariVer(SOZLUK, varyant).tur === "bos") elenen.push(varyant);
        }
      }
    }
  }
  expect(sayac).toBeGreaterThan(1000);
  expect(elenen).toEqual([]);
});

// ── 3. Kardinalite: bot trafiği kalıcı kayıt üretemez ───────────────────────

test("600 farklı rastgele bot sorgusu TEK bir önbellek kaydı üretmez", () => {
  const harf = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tohum = 12345;
  const rnd = () => (tohum = (tohum * 1103515245 + 12345) % 2147483648) / 2147483648;
  const dagilim: Record<string, number> = {};
  for (let n = 0; n < 600; n++) {
    let q = "";
    const uzunluk = 6 + Math.floor(rnd() * 20);
    for (let i = 0; i < uzunluk; i++) q += harf[Math.floor(rnd() * harf.length)];
    const k = karar(q);
    dagilim[k.tur] = (dagilim[k.tur] ?? 0) + 1;
  }
  // "onbellekli" TEK kalıcı kayıt üreten kademedir; bot oraya ulaşamaz.
  expect(dagilim["onbellekli"] ?? 0).toBe(0);
  expect(dagilim["bos"]).toBeGreaterThan(0);
});

// ── 4. Bekçi: aranan sütun kümesi sözlüğe beslenen kümeyle aynı olmalı ──────

test("BEKÇİ — /api/products arama dalı yalnızca sözlüğe beslenen sütunları arar", () => {
  const kaynak = readFileSync(
    path.join(process.cwd(), "src/app/api/products/route.ts"),
    "utf8"
  );
  const bas = kaynak.indexOf("if (search) {");
  const son = kaynak.indexOf("if (condition &&");
  expect(bas).toBeGreaterThan(0);
  expect(son).toBeGreaterThan(bas);
  const blok = kaynak.slice(bas, son);

  const BESLENEN = new Set(["partNumber", "partNumberNormalized", "name"]);
  const kullanilan = new Set(
    [...blok.matchAll(/products\.(\w+)/g)].map((m) => m[1])
  );
  for (const sutun of kullanilan) expect(BESLENEN.has(sutun)).toBe(true);

  // Başka bir tabloya genişletilirse sözlük de beslenmeli — o yüzden düşer.
  expect(blok).not.toMatch(/oemNumbers|fitments|manufacturers|machines|categories/);
});

// ── 5. Boş katalog: "bos" DOĞRU karardır ────────────────────────────────────

test("katalog boşken her arama boş döner (0 aktif ürün = 0 satır)", () => {
  const bos = sozlukKur([]);
  expect(aramaKarariVer(bos, "CH76281")).toEqual({ tur: "bos", neden: "ngram" });
});
