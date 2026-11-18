import { test, expect } from "@playwright/test";
import {
  brandClaimAllowed,
  fitmentPresentation,
  isDisplayableNumberType,
  oemNumberPresentation,
  summarizeVerification,
  type PartNumberType,
} from "@/lib/verification";

/**
 * Talimat: "OEM ve makine uyumluluğu doğrulanmadan kesin bilgi olarak
 * yayınlanmasın." `verified` varsayılanı false olduğu için migration'dan hemen
 * sonra HİÇBİR kayıt doğrulanmış değildir.
 */

const ALL_TYPES: PartNumberType[] = [
  "oem", "cross_ref", "alternate", "supersedes", "superseded_by", "prefixless",
];

test.describe("OEM numarası sunumu", () => {
  test("DOĞRULANMAMIŞ numara hiçbir tipte kesin dil kullanmaz", () => {
    for (const type of ALL_TYPES) {
      const p = oemNumberPresentation({ type, verified: false });
      expect(p.definitive, type).toBe(false);
      expect(p.includeInStructuredData, type).toBe(false);
      expect(p.label, type).toBe("Bildirilen Numara · teyit bekliyor");
      // "OEM" kelimesi teyitsiz bir etikette GEÇMEZ.
      expect(p.label.includes("OEM"), type).toBe(false);
    }
  });

  test("doğrulanmış numara tipine göre kesin etiket alır", () => {
    expect(oemNumberPresentation({ type: "oem", verified: true })).toEqual({
      label: "OEM Numarası",
      definitive: true,
      includeInStructuredData: true,
    });
    expect(oemNumberPresentation({ type: "cross_ref", verified: true }).label).toBe(
      "Çapraz Referans"
    );
    expect(oemNumberPresentation({ type: "superseded_by", verified: true }).label).toBe(
      "Yerine Kullanılan Numara"
    );
  });

  test("prefixless yalnızca arama içindir, sayfada gösterilmez", () => {
    expect(isDisplayableNumberType("prefixless")).toBe(false);
    for (const type of ALL_TYPES.filter((t) => t !== "prefixless")) {
      expect(isDisplayableNumberType(type), type).toBe(true);
    }
  });
});

test.describe("uyumluluk sunumu", () => {
  test("doğrulanmamış uyumluluk kesin sunulmaz ve şemaya girmez", () => {
    const p = fitmentPresentation({ verified: false });
    expect(p.definitive).toBe(false);
    expect(p.includeInStructuredData).toBe(false);
    expect(p.label).toBe("Teyit bekliyor");
  });

  test("doğrulanmış uyumluluk kesin sunulabilir", () => {
    const p = fitmentPresentation({ verified: true });
    expect(p.definitive).toBe(true);
    expect(p.includeInStructuredData).toBe(true);
  });
});

test.describe("doğrulama özeti", () => {
  test("hiç kayıt yoksa iddia edilecek bir şey yoktur", () => {
    const s = summarizeVerification([]);
    expect(s).toMatchObject({ total: 0, verified: 0, unverified: 0, allVerified: false });
    expect(s.notice).toContain("bulunmuyor");
  });

  test("hiçbiri doğrulanmamışsa teyit uyarısı verir", () => {
    const s = summarizeVerification([{ verified: false }, { verified: false }]);
    expect(s).toMatchObject({ total: 2, verified: 0, unverified: 2, allVerified: false });
    expect(s.notice).toContain("hiçbiri henüz doğrulanmadı");
    expect(s.notice).toContain("teyit ediniz");
  });

  test("KISMEN doğrulanmış liste tamamen doğrulanmış gibi sunulmaz", () => {
    const s = summarizeVerification([
      { verified: true }, { verified: false }, { verified: true },
    ]);
    expect(s).toMatchObject({ total: 3, verified: 2, unverified: 1, allVerified: false });
    expect(s.notice).toContain("2 tanesi doğrulandı");
    expect(s.notice).toContain("1 tanesi teyit bekliyor");
  });

  test("tamamı doğrulanmışsa uyarı metni yoktur", () => {
    const s = summarizeVerification([{ verified: true }, { verified: true }]);
    expect(s.allVerified).toBe(true);
    expect(s.notice).toBe("2 makine uyumu doğrulandı.");
    expect(s.notice).not.toContain("teyit bekliyor");
  });
});

test.describe("marka iddiası (denetim C9)", () => {
  test("part_manufacturer boşsa marka iddia EDİLMEZ", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(
        brandClaimAllowed({ partManufacturer: value, sourcingType: "oem" }),
        String(value)
      ).toBe(false);
    }
  });

  test("sourcing_type 'unknown' iken marka iddia EDİLMEZ", () => {
    expect(
      brandClaimAllowed({ partManufacturer: "TEST Üretici", sourcingType: "unknown" })
    ).toBe(false);
    expect(
      brandClaimAllowed({ partManufacturer: "TEST Üretici", sourcingType: null })
    ).toBe(false);
    expect(
      brandClaimAllowed({ partManufacturer: "TEST Üretici", sourcingType: undefined })
    ).toBe(false);
  });

  test("iki koşul birlikte sağlanınca marka iddia edilebilir", () => {
    for (const sourcing of ["oem", "oem_equivalent", "aftermarket"] as const) {
      expect(
        brandClaimAllowed({ partManufacturer: "TEST Üretici", sourcingType: sourcing }),
        sourcing
      ).toBe(true);
    }
  });

  test("migration sonrası VARSAYILAN durum: marka iddiası kapalı", () => {
    // 0008 sonrasi her satir: part_manufacturer NULL + sourcing_type 'unknown'
    expect(
      brandClaimAllowed({ partManufacturer: null, sourcingType: "unknown" })
    ).toBe(false);
  });
});
