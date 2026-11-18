import { test, expect } from "@playwright/test";
import { isTestRecord } from "@/lib/test-records";

/**
 * Sentetik kayıt ayrımı — adlandırma sözleşmesi.
 *
 * Kullanıcı kararı: TEST-K3, TEST-FAZ2B ve ATOM kayıtları development'ta
 * kalacak ama GERÇEK ÜRÜNLERDEN AÇIKÇA AYRILACAK. Veritabanında kolon
 * olmadığı için ayrım parça numarası önekine dayanıyor; bu testler önekin
 * ne yakaladığını ve ne yakalamadığını kilitler.
 */

test.describe("sentetik kayıtlar yakalanır", () => {
  test("TEST- ve ATOM- önekleri", () => {
    for (const pn of [
      "TEST-K3-UI-0001", "TEST-FAZ2B-0001", "TEST-K3-CSV-0003",
      "ATOM-P-0001", "ATOM-M1", "atom-p-0002", "test-k3-guard-01",
      "TEST 1234", "ATOM 9",
    ]) {
      expect(isTestRecord(pn), pn).toBe(true);
    }
  });
});

test.describe("gerçek ürünler yakalanmaz", () => {
  test("V8 araştırma kümesindeki gerçek numara biçimleri", () => {
    for (const pn of [
      "VOE 12727728", "CH 19629", "328-9669", "714-16-19730",
      "23A-43-13330", "0012345", "002 236 11 10", "NDG15189",
      "50A-1864ZI", "61963-10500",
    ]) {
      expect(isTestRecord(pn), pn).toBe(false);
    }
  });

  test("ayırıcısız TEST/ATOM ile BAŞLAYAN gerçek kod yakalanmaz", () => {
    // "TESTA-1" bir urun kodu olabilir; onek yalnizca ayirici ile eslesir.
    expect(isTestRecord("TESTA-1")).toBe(false);
    expect(isTestRecord("ATOMIC-5")).toBe(false);
  });

  test("boş ve tanımsız değerler false döner", () => {
    expect(isTestRecord("")).toBe(false);
    expect(isTestRecord(null)).toBe(false);
    expect(isTestRecord(undefined)).toBe(false);
  });
});
