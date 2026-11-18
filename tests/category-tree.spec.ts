import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CATEGORY_LIMITS,
  CATEGORY_SORT_MAX,
  buildCategoryTree,
  parseCategoryName,
  parseCategoryParentId,
  parseCategorySlug,
  parseCategorySortOrder,
  parseProductCategoryId,
  slugifyCategory,
  wouldCreateCycle,
} from "@/lib/category-tree";
import type { SeoCriterion } from "@/lib/seo-gate";

/**
 * Faz 4 — P6 (kategori seçici + kategori yönetim ekranı).
 *
 * Kilitlenen sözleşme:
 *   · Kategori YAYIN ÖLÇÜTÜ DEĞİLDİR — eksikliği yayını engellemez,
 *   · Döngü kurulamaz (`parent_id` yabancı anahtarı yok, koruma uygulamada),
 *   · Dolu veya alt kategorisi olan kategori silinemez
 *     (`products.category_id` FK'si ON DELETE SET NULL taşır — sessiz veri kaybı),
 *   · Geçersiz kategori kimliği 400 ile reddedilir, 500 üretmez,
 *   · Bu çalışma hiçbir kategori ÜRETMEZ.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

test.describe("P6 — slug üretimi", () => {
  test("Türkçe harfler düşürülmez, karşılığına çevrilir", () => {
    expect(slugifyCategory("Şanzıman Parçaları")).toBe("sanziman-parcalari");
    expect(slugifyCategory("Güç Aktarma")).toBe("guc-aktarma");
    expect(slugifyCategory("İÇ KISIM")).toBe("ic-kisim");
  });

  test("baştaki/sondaki ayraçlar temizlenir", () => {
    expect(slugifyCategory("  --Hidrolik / Pompa--  ")).toBe("hidrolik-pompa");
  });

  test("slug boşsa addan üretilir", () => {
    const r = parseCategorySlug("", "Fren Sistemi");
    expect(r.ok && r.value).toBe("fren-sistemi");
  });

  test("harf/rakam içermeyen slug reddedilir", () => {
    const r = parseCategorySlug("///", "///");
    expect(r.ok).toBe(false);
  });
});

test.describe("P6 — alan doğrulaması", () => {
  test("ad zorunlu, boşluk ad sayılmaz", () => {
    expect(parseCategoryName("   ").ok).toBe(false);
    expect(parseCategoryName(null).ok).toBe(false);
    const r = parseCategoryName("  Hidrolik  ");
    expect(r.ok && r.value).toBe("Hidrolik");
  });

  test("ad uzunluk sınırı", () => {
    expect(parseCategoryName("x".repeat(CATEGORY_LIMITS.name)).ok).toBe(true);
    expect(parseCategoryName("x".repeat(CATEGORY_LIMITS.name + 1)).ok).toBe(false);
  });

  test("üst kategori: boş değerler kök sayılır", () => {
    for (const bos of [null, undefined, ""]) {
      const r = parseCategoryParentId(bos);
      expect(r.ok && r.value).toBe(null);
    }
  });

  test("geçersiz kimlik reddedilir — sürücüye gitmez", () => {
    expect(parseCategoryParentId("elma").ok).toBe(false);
    expect(parseCategoryParentId("1; DROP TABLE categories").ok).toBe(false);
    expect(parseCategoryParentId(A).ok).toBe(true);
  });

  test("ürün kategorisi aynı kuralı kullanır — `null` geçerli seçim", () => {
    const yok = parseProductCategoryId(null);
    expect(yok.ok && yok.value).toBe(null);
    expect(parseProductCategoryId("x").ok).toBe(false);
  });

  test("sıra sınırları", () => {
    const bos = parseCategorySortOrder("");
    expect(bos.ok && bos.value).toBe(0);
    expect(parseCategorySortOrder(5).ok).toBe(true);
    expect(parseCategorySortOrder(-1).ok).toBe(false);
    expect(parseCategorySortOrder(1.5).ok).toBe(false);
    expect(parseCategorySortOrder(CATEGORY_SORT_MAX + 1).ok).toBe(false);
  });
});

test.describe("P6 — döngü koruması", () => {
  // A → B → C zinciri (C'nin üstü B, B'nin üstü A).
  const parentOf = new Map<string, string | null>([
    [A, null],
    [B, A],
    [C, B],
  ]);

  test("kendine bağlanamaz", () => {
    expect(wouldCreateCycle(A, A, parentOf)).toBe(true);
  });

  test("doğrudan alt kategorisine bağlanamaz", () => {
    expect(wouldCreateCycle(A, B, parentOf)).toBe(true);
  });

  test("derin alt kategorisine bağlanamaz", () => {
    expect(wouldCreateCycle(A, C, parentOf)).toBe(true);
  });

  test("ilgisiz kategoriye bağlanabilir", () => {
    expect(wouldCreateCycle(C, A, parentOf)).toBe(false);
    expect(wouldCreateCycle(B, null, parentOf)).toBe(false);
  });

  test("veritabanında ÖNCEDEN bozuk zincir varsa fonksiyon DURUR", () => {
    // B ↔ C birbirine bağlı: fonksiyon sonsuz döngüye girmemeli.
    const bozuk = new Map<string, string | null>([
      [B, C],
      [C, B],
    ]);
    expect(wouldCreateCycle(A, B, bozuk)).toBe(false);
  });
});

test.describe("P6 — ağaç kurulumu", () => {
  test("derinlik ve sıralama: önce sortOrder, eşitlikte ad", () => {
    const agac = buildCategoryTree([
      { id: C, name: "Zincir", slug: "zincir", parentId: null, sortOrder: 0 },
      { id: A, name: "Aktarma", slug: "aktarma", parentId: null, sortOrder: 0 },
      { id: B, name: "Pompa", slug: "pompa", parentId: A, sortOrder: 5 },
    ]);
    expect(agac.map((k) => k.name)).toEqual(["Aktarma", "Pompa", "Zincir"]);
    expect(agac.map((k) => k.depth)).toEqual([0, 1, 0]);
  });

  test("üstü bulunamayan kayıt kök gibi basılır ve İŞARETLENİR", () => {
    const agac = buildCategoryTree([
      { id: B, name: "Yetim", slug: "yetim", parentId: C, sortOrder: 0 },
    ]);
    expect(agac).toHaveLength(1);
    expect(agac[0].depth).toBe(0);
    expect(agac[0].orphan).toBe(true);
  });

  test("bozuk veri sonsuz döngü ÜRETMEZ", () => {
    const agac = buildCategoryTree([
      { id: A, name: "A", slug: "a", parentId: B, sortOrder: 0 },
      { id: B, name: "B", slug: "b", parentId: A, sortOrder: 0 },
    ]);
    // İkisi de birbirini gösteriyor; hiçbiri kök değil. Ekran boş kalabilir
    // ama program ASILMAZ — testin kendisi bunu kanıtlar.
    expect(agac.length).toBeLessThanOrEqual(2);
  });

  test("boş liste boş ağaç — varsayılan kategori ÜRETİLMEZ", () => {
    expect(buildCategoryTree([])).toEqual([]);
  });
});

test.describe("P6 — kategori YAYIN ÖLÇÜTÜ değildir", () => {
  test("yayın kapısının ölçüt listesinde kategori YOK", () => {
    const olcutler: SeoCriterion[] = [
      "inactive",
      "part_number_missing",
      "name_missing",
      "no_verified_image",
      "long_description_too_short",
      "no_verified_fitment",
    ];
    // Tip denetimi: listeye kategori eklenirse bu dizi derlenmez.
    expect(olcutler).toHaveLength(6);
    const kaynak = oku("src/lib/seo-gate.ts");
    expect(kaynak).not.toContain("category");
  });

  test("ekran ve seçici bunu operatöre YAZIYOR", () => {
    expect(oku("src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx")).toContain(
      "yayın ölçütü"
    );
    expect(oku("src/app/(admin)/admin/(dashboard)/categories/page.tsx")).toContain(
      "yayın ölçütü değildir"
    );
  });
});

test.describe("P6 — sunucu korumaları", () => {
  const liste = oku("src/app/api/admin/categories/route.ts");
  const tek = oku("src/app/api/admin/categories/[id]/route.ts");
  const urun = oku("src/app/api/admin/products/[id]/route.ts");

  test("üst kategorinin VARLIĞI kontrol edilir (FK yok)", () => {
    expect(liste).toContain("Üst kategori bulunamadı");
    expect(tek).toContain("Üst kategori bulunamadı");
  });

  test("döngü sunucu tarafında reddedilir", () => {
    expect(tek).toContain("wouldCreateCycle");
    expect(tek).toContain("kendi alt kategorisine bağlanamaz");
  });

  test("dolu veya alt kategorisi olan kategori SİLİNEMEZ", () => {
    expect(tek).toContain("productCount");
    expect(tek).toContain("childCount");
    expect(tek).toContain("status: 409");
  });

  test("ürün kategorisi ham geçmez — doğrulanır", () => {
    expect(urun).toContain("parseProductCategoryId");
    expect(urun).toContain("Kategori bulunamadı.");
    // Ham geçiş listesinden ÇIKARILDI.
    const allowed = urun.slice(urun.indexOf("const allowedFields"));
    expect(allowed.slice(0, 200)).not.toContain("categoryId");
  });

  test("sayımlar TOPLU — kategori başına sorgu yok", () => {
    expect(liste).toContain("groupBy(products.categoryId)");
  });
});
