import { test, expect } from "@playwright/test";
import {
  VERIFICATION_SOURCE_MAX,
  parseVerificationSource,
  parseVerifiedFlag,
} from "@/lib/verification";

/**
 * Doğrulama girdisi — admin API ve toplu import ortak kuralı.
 *
 * TEMEL KURAL: "Doğrulandı" demek için KAYNAK ZORUNLUDUR. Dayanağı
 * belirtilmemiş bir OEM numarası veya makine uyumluluğu kesin bilgi hâline
 * getirilemez (talimat #4 ve #7).
 */

test.describe("parseVerifiedFlag", () => {
  test("yalnızca açık boolean kabul edilir", () => {
    expect(parseVerifiedFlag(true)).toEqual({ ok: true, value: true });
    expect(parseVerifiedFlag(false)).toEqual({ ok: true, value: false });
    expect(parseVerifiedFlag("true")).toEqual({ ok: true, value: true });
    expect(parseVerifiedFlag("false")).toEqual({ ok: true, value: false });
  });

  test("belirsiz değerler reddedilir", () => {
    for (const value of [undefined, null, "", "1", 1, "evet", "yes", {}]) {
      expect(parseVerifiedFlag(value).ok, String(value)).toBe(false);
    }
  });
});

test.describe("parseVerificationSource", () => {
  test("DOĞRULANDI işaretlemek için kaynak ZORUNLUDUR", () => {
    for (const value of [undefined, null, "", "   "]) {
      const r = parseVerificationSource(value, true);
      expect(r.ok, String(value)).toBe(false);
      if (!r.ok) expect(r.error).toContain("kaynak zorunludur");
    }
  });

  test("doğrulanmış kayıt için kaynak kabul edilir ve trim'lenir", () => {
    const r = parseVerificationSource("  Üretici katalogu 2024  ", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Üretici katalogu 2024");
  });

  test("doğrulanmamış kayıtta kaynak serbesttir", () => {
    const empty = parseVerificationSource("", false);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.value).toBeNull();

    const noted = parseVerificationSource("Tedarikçi listesi (teyit bekliyor)", false);
    expect(noted.ok).toBe(true);
    if (noted.ok) expect(noted.value).toBe("Tedarikçi listesi (teyit bekliyor)");
  });

  test("uzun kaynak reddedilir", () => {
    const tooLong = "x".repeat(VERIFICATION_SOURCE_MAX + 1);
    expect(parseVerificationSource(tooLong, true).ok).toBe(false);
    expect(parseVerificationSource(tooLong, false).ok).toBe(false);
  });

  test("sınır değeri kabul edilir", () => {
    const exact = "x".repeat(VERIFICATION_SOURCE_MAX);
    expect(parseVerificationSource(exact, true).ok).toBe(true);
  });

  test("metin olmayan değer reddedilir", () => {
    expect(parseVerificationSource(42, false).ok).toBe(false);
  });

  test("DEĞİŞMEZ: verified true iken dönen kaynak asla null değildir", () => {
    const r = parseVerificationSource("Fiziksel ölçüm", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).not.toBeNull();
  });
});
