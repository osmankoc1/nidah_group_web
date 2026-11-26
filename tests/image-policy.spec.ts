import { test, expect } from "@playwright/test";
import {
  GORSEL_EN_UZUN_KENAR,
  GORSEL_EN_KUCUK_KENAR,
  GORSEL_FORMAT,
  GORSEL_KALITE,
  GORSEL_MAKS_BAYT,
  CLOUDINARY_YUKLEME_SECENEKLERI,
  dosyaBoyutuDenetimi,
  olcuDenetimi,
} from "@/lib/image-policy";

/**
 * GÖRSEL YÜKLEME POLİTİKASI — sabitler ve kapılar.
 *
 * Bu testlerin amacı sayıları dondurmaktır: politika bir maliyet kararıdır
 * (ölçülen 6,2 kat depolama farkı) ve sessizce gevşerse fark geri gelir.
 */

test("politika sabitleri belgedeki değerlerle aynı", () => {
  expect(GORSEL_EN_UZUN_KENAR).toBe(1600);
  expect(GORSEL_EN_KUCUK_KENAR).toBe(800);
  expect(GORSEL_FORMAT).toBe("webp");
  expect(GORSEL_KALITE).toBe(80);
  expect(GORSEL_MAKS_BAYT).toBe(8 * 1024 * 1024);
});

test("Cloudinary dönüşümü küçültür ama BÜYÜTMEZ", () => {
  const [t] = CLOUDINARY_YUKLEME_SECENEKLERI.transformation;
  expect(t.crop).toBe("limit"); // "fill"/"scale" olsaydı küçük görsel büyütülürdü
  expect(t.width).toBe(1600);
  expect(t.height).toBe(1600);
  expect(t.quality).toBe(80);
  expect(CLOUDINARY_YUKLEME_SECENEKLERI.format).toBe("webp");
});

test("dosya boyutu: 8 MB sınırı", () => {
  expect(dosyaBoyutuDenetimi(1).kabul).toBe(true);
  expect(dosyaBoyutuDenetimi(GORSEL_MAKS_BAYT).kabul).toBe(true);
  const ret = dosyaBoyutuDenetimi(GORSEL_MAKS_BAYT + 1);
  expect(ret.kabul).toBe(false);
  expect(ret.neden).toBe("cok_buyuk_dosya");
  expect(ret.mesaj).toContain("8 MB");
});

test("ölçü: en uzun kenar 800 px alt sınırı", () => {
  expect(olcuDenetimi(800, 600).kabul).toBe(true);   // en uzun = 800
  expect(olcuDenetimi(600, 800).kabul).toBe(true);   // yön önemsiz
  expect(olcuDenetimi(1600, 1200).kabul).toBe(true);
  const ret = olcuDenetimi(799, 799);
  expect(ret.kabul).toBe(false);
  expect(ret.neden).toBe("cok_kucuk_olcu");
  expect(ret.mesaj).toContain("800");
});

test("ölçü: bozuk değerler reddedilir", () => {
  expect(olcuDenetimi(NaN, NaN).kabul).toBe(false);
  expect(olcuDenetimi(0, 0).kabul).toBe(false);
  expect(olcuDenetimi(Infinity, Infinity).kabul).toBe(false);
});

test("hedef boyut sınır DEĞİL — yalnızca raporlama için", async () => {
  const { GORSEL_HEDEF_BAYT } = await import("@/lib/image-policy");
  expect(GORSEL_HEDEF_BAYT).toBeLessThan(GORSEL_MAKS_BAYT);
  // 500 KB'lık bir dosya hedefi aşar ama KABUL EDİLİR.
  expect(dosyaBoyutuDenetimi(500 * 1024).kabul).toBe(true);
});
