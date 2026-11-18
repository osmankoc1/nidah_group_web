import { test, expect } from "@playwright/test";
import { BRAND_PAGE_SIZE, paginate } from "@/lib/pagination";

/**
 * Sayfa numarası KULLANICI GİRDİSİDİR (`?sayfa=`). Bu testler hiçbir girdinin
 * NaN veya negatif OFFSET üretemeyeceğini kilitler.
 */

test.describe("paginate", () => {
  test("boş sonuç kümesi güvenli varsayılanlar döner", () => {
    const p = paginate(0, 1, BRAND_PAGE_SIZE);
    expect(p).toMatchObject({
      page: 1,
      total: 0,
      totalPages: 1,
      offset: 0,
      hasPrev: false,
      hasNext: false,
    });
  });

  test("normal sayfalama", () => {
    const p = paginate(100, "2", 48);
    expect(p.page).toBe(2);
    expect(p.totalPages).toBe(3);
    expect(p.offset).toBe(48);
    expect(p.hasPrev).toBe(true);
    expect(p.hasNext).toBe(true);
  });

  test("son sayfada hasNext false", () => {
    const p = paginate(100, "3", 48);
    expect(p.page).toBe(3);
    expect(p.offset).toBe(96);
    expect(p.hasNext).toBe(false);
  });

  test("aralık dışı sayfa son sayfaya kırpılır", () => {
    expect(paginate(100, "999", 48).page).toBe(3);
    expect(paginate(100, "99999999999", 48).offset).toBe(96);
  });

  test("geçersiz girdiler 1. sayfaya düşer", () => {
    for (const input of ["abc", "", "   ", null, undefined, "-5", "0", NaN, {}, []]) {
      const p = paginate(100, input, 48);
      expect(p.page, String(input)).toBe(1);
      expect(p.offset, String(input)).toBe(0);
    }
  });

  test("ondalıklı sayfa aşağı yuvarlanır", () => {
    expect(paginate(100, "2.9", 48).page).toBe(2);
  });

  test("OFFSET hiçbir girdide negatif veya NaN olmaz", () => {
    const inputs = ["-1", "-999", "abc", "1e9", "0", "1.5", null, undefined];
    for (const input of inputs) {
      const p = paginate(500, input, 48);
      expect(Number.isInteger(p.offset), String(input)).toBe(true);
      expect(p.offset >= 0, String(input)).toBe(true);
    }
  });

  test("bozuk toplam/boyut değerleri çökmez", () => {
    expect(paginate(NaN, 1, 48).totalPages).toBe(1);
    expect(paginate(-10, 1, 48).total).toBe(0);
    expect(paginate(100, 1, 0).pageSize).toBe(1);
    expect(paginate(100, 1, -5).pageSize).toBe(1);
  });

  test("marka sayfa boyutu makul bir değerdir", () => {
    expect(BRAND_PAGE_SIZE).toBeGreaterThan(0);
    expect(BRAND_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});
