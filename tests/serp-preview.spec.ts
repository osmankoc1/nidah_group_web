import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SERP_DESCRIPTION_LIMIT,
  SERP_TITLE_LIMIT,
} from "@/components/admin/SerpPreview";
import { FIELD_LIMITS } from "@/lib/product-fields";

/**
 * Faz 3 / P9 — meta sayaçları ve arama sonucu önizlemesi.
 *
 * Kilitlenen sözleşme:
 *   · Önizleme hiçbir değeri DEĞİŞTİRMEZ, kırpmaz veya kaydetmez,
 *   · Veritabanı sınırı ile Google kesme eşiği AYRI gösterilir,
 *   · Boş meta alanı için sayfanın KENDİ yedeği gösterilir.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const KAYNAK = oku("src/components/admin/SerpPreview.tsx");

test.describe("P9 — eşikler", () => {
  test("Google kesme eşikleri tanımlı ve makul", () => {
    expect(SERP_TITLE_LIMIT).toBe(60);
    expect(SERP_DESCRIPTION_LIMIT).toBe(155);
  });

  test("Google eşiği veritabanı sınırından AYRI", () => {
    // Karışırsa operatör 255 karaktere kadar yazıp sonucun kesileceğini
    // göremez — bulgunun ta kendisi.
    expect(SERP_TITLE_LIMIT).toBeLessThan(FIELD_LIMITS.metaTitle);
  });
});

test.describe("P9 — önizleme hiçbir veriyi değiştirmez", () => {
  test("bileşen yazma yapmaz", () => {
    expect(KAYNAK).not.toContain("fetch(");
    expect(KAYNAK).not.toContain("useState");
    expect(KAYNAK).not.toContain("@/lib/db");
  });

  test("kırpma YALNIZCA gösterim içindir", () => {
    // `slice` yalnızca önizleme metninde kullanılır; değer prop olarak
    // gelir ve geri yazılmaz.
    expect(KAYNAK).toContain("slice(0, SERP_TITLE_LIMIT)");
    expect(KAYNAK).not.toContain("onChange");
    expect(KAYNAK).not.toContain("setForm");
  });

  test("belirsizlik açıkça söylenir — kesin kesme noktası İDDİA EDİLMEZ", () => {
    expect(KAYNAK).toContain("yaklaşık");
    expect(KAYNAK).toContain("piksel");
  });
});

test.describe("P9 — düzenleme ekranına bağlandı", () => {
  const sayfa = oku("src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx");

  test("iki sayaç da meta alanlarının altında", () => {
    expect(sayfa).toContain("MetaTitleCounter");
    expect(sayfa).toContain("MetaDescriptionCounter");
  });

  test("meta başlık sınırı SABİTTEN gelir, elle yazılmaz", () => {
    expect(sayfa).toContain("maxLength={FIELD_LIMITS.metaTitle}");
    expect(sayfa).not.toContain("maxLength={255}");
  });

  test("önizleme boş meta için sayfanın yedeğini gösterir", () => {
    expect(sayfa).toContain("yedekBaslik");
    expect(sayfa).toContain("yedekAciklama");
  });
});
