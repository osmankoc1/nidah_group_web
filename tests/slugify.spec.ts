import { test, expect } from "@playwright/test";
import { slugifyName, turkishToAscii } from "../src/lib/slugify";

/**
 * 2026-11-16 regresyon testi.
 *
 * Hata: makine içe aktarmasındaki yerel `slugify`, Türkçe harfleri ASCII'ye
 * ÇEVİRMİYOR, tamamen SİLİYORDU. "ÇUKUROVA" üreticisi "ukurova" slug'ıyla
 * oluşuyordu. Aşağıdaki ilk blok hatanın geri gelmesini engeller.
 */

test.describe("turkishToAscii", () => {
  test("büyük Türkçe harfleri ASCII'ye çevirir", () => {
    expect(turkishToAscii("ÇĞİÖŞÜ")).toBe("CGIOSU");
  });

  test("küçük Türkçe harfleri ASCII'ye çevirir", () => {
    expect(turkishToAscii("çğıöşü")).toBe("cgiosu");
  });

  test("noktasız ı ASCII i olur", () => {
    expect(turkishToAscii("ılık")).toBe("ilik");
  });

  test('"İ".toLowerCase() birleşik noktası temizlenir', () => {
    // "İ".toLowerCase() === "i̇" (i + birleşik nokta)
    expect(turkishToAscii("İ".toLowerCase())).toBe("i");
    expect(turkishToAscii("HİDROMEK".toLowerCase())).toBe("hidromek");
  });

  test("ASCII metni değiştirmez", () => {
    expect(turkishToAscii("CATERPILLAR 420F2")).toBe("CATERPILLAR 420F2");
  });

  test("hiçbir Türkçe harf silinmez", () => {
    for (const ch of "çğıöşüÇĞİÖŞÜ") {
      expect(turkishToAscii(ch).length).toBeGreaterThan(0);
    }
  });
});

test.describe("slugifyName — Türkçe harf hatası (regresyon)", () => {
  test("ÇUKUROVA 'ukurova' DEĞİL 'cukurova' üretir", () => {
    expect(slugifyName("ÇUKUROVA")).toBe("cukurova");
    expect(slugifyName("ÇUKUROVA")).not.toBe("ukurova");
  });

  test("Çukurova yazımı da aynı slug'ı verir", () => {
    expect(slugifyName("Çukurova")).toBe("cukurova");
    expect(slugifyName("çukurova")).toBe("cukurova");
  });

  test("baştaki Türkçe harf kaybolmaz", () => {
    // Eski hata YALNIZCA baştaki harfte sessizdi; her konum sınanır.
    expect(slugifyName("ÇAĞRI")).toBe("cagri");
    expect(slugifyName("GÜÇ")).toBe("guc");
    expect(slugifyName("İŞ MAKİNASI")).toBe("is-makinasi");
  });
});

test.describe("slugifyName — mevcut üretici slug'ları DEĞİŞMEZ", () => {
  // Development veritabanındaki gerçek üretici adları (2026-11-16).
  const mevcut: [string, string][] = [
    ["VOLVO", "volvo"],
    ["CATERPILLAR", "caterpillar"],
    ["KOMATSU", "komatsu"],
    ["CHAMPION", "champion"],
    ["AMMANN", "ammann"],
    ["HİDROMEK", "hidromek"],
    ["TEST VOLVO", "test-volvo"],
    ["ATOM TEST URETICI", "atom-test-uretici"],
  ];

  for (const [ad, beklenen] of mevcut) {
    test(`"${ad}" -> "${beklenen}"`, () => {
      expect(slugifyName(ad)).toBe(beklenen);
    });
  }
});

test.describe("slugifyName — biçim kuralları", () => {
  test("boşluk dizisi tek tireye iner", () => {
    expect(slugifyName("BOSCH   REXROTH")).toBe("bosch-rexroth");
  });

  test("baş ve son boşluklar atılır", () => {
    expect(slugifyName("  VOLVO  ")).toBe("volvo");
  });

  test("izinsiz karakterler silinir", () => {
    expect(slugifyName("VOLVO CE (TR)")).toBe("volvo-ce-tr");
  });

  test("art arda tireler teke iner, baş/sondaki tire kalmaz", () => {
    expect(slugifyName("--VOLVO--CE--")).toBe("volvo-ce");
  });

  test("rakamlar korunur", () => {
    expect(slugifyName("ÇUKUROVA 940")).toBe("cukurova-940");
  });

  test("aynı ad her zaman aynı slug'ı verir (kararlılık)", () => {
    expect(slugifyName("ÇUKUROVA")).toBe(slugifyName("ÇUKUROVA"));
  });

  test("farklı Türkçe markalar farklı slug alır (çakışma yok)", () => {
    const slugs = ["ÇUKUROVA", "HİDROMEK", "MITSUBISHI", "HITACHI"].map(slugifyName);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
