import { test, expect } from "@playwright/test";
import {
  IMAGE_STATE_LABEL,
  imageAltText,
  publishableImages,
  resolveImageState,
  showsRealPhoto,
  type ProductImageState,
} from "@/lib/product-image-state";
import {
  IMAGE_ALT_TEXT_MIN,
  FIELD_LIMITS,
  parseImageAltText,
  parseImageSourceNote,
} from "@/lib/product-fields";

/**
 * Görsel durumları ve doğrulama alanları (kararlar K2 / K4 / K6).
 *
 * Bu testlerin kilitlediği sözleşme:
 *   · DOĞRULANMAMIŞ fotoğraf public yüzeye ÇIKMAZ,
 *   · TEMSİLÎ görsel gerçek fotoğraf SAYILMAZ,
 *   · "doğrulandı" demek için ALT metni VE kaynak zorunludur.
 */

test.describe("resolveImageState — public yüzey", () => {
  test("hiç görsel yok → placeholder", () => {
    expect(
      resolveImageState({ imageCount: 0, verifiedImageCount: 0, surface: "public" })
    ).toBe("placeholder");
  });

  test("görsel var ama DOĞRULANMAMIŞ → placeholder (gerçek fotoğraf gösterilmez)", () => {
    // Bu testin kilitlediği karar: doğrulanmamış dosyanın bu parçayı
    // gösterdiği teyit edilmemiştir. Yayınlamak Google'ın
    // "Images must represent the marked up content." kuralını ihlal etme
    // riski taşır, bu yüzden public yüzeyde YOK SAYILIR.
    expect(
      resolveImageState({ imageCount: 3, verifiedImageCount: 0, surface: "public" })
    ).toBe("placeholder");
  });

  test("en az bir doğrulanmış görsel → verified", () => {
    expect(
      resolveImageState({ imageCount: 3, verifiedImageCount: 1, surface: "public" })
    ).toBe("verified");
  });

  test("public yüzeyde pending_verification durumu HİÇ oluşmaz", () => {
    for (const toplam of [0, 1, 5, 10]) {
      const state = resolveImageState({
        imageCount: toplam,
        verifiedImageCount: 0,
        surface: "public",
      });
      expect(state).not.toBe("pending_verification");
      expect(state).not.toBe("missing");
    }
  });
});

test.describe("resolveImageState — yönetim yüzeyi", () => {
  test("hiç görsel yok → missing", () => {
    expect(
      resolveImageState({ imageCount: 0, verifiedImageCount: 0, surface: "admin" })
    ).toBe("missing");
  });

  test("görsel var, doğrulanmamış → pending_verification", () => {
    expect(
      resolveImageState({ imageCount: 2, verifiedImageCount: 0, surface: "admin" })
    ).toBe("pending_verification");
  });

  test("doğrulanmış görsel var → verified", () => {
    expect(
      resolveImageState({ imageCount: 2, verifiedImageCount: 2, surface: "admin" })
    ).toBe("verified");
  });

  test("missing ve placeholder AYNI veri durumunun iki görünümü", () => {
    const veri = { imageCount: 0, verifiedImageCount: 0 };
    expect(resolveImageState({ ...veri, surface: "admin" })).toBe("missing");
    expect(resolveImageState({ ...veri, surface: "public" })).toBe("placeholder");
  });
});

test.describe("resolveImageState — bozuk girdiler", () => {
  test("NaN, negatif ve ondalıklı değerler çökmez", () => {
    expect(
      resolveImageState({ imageCount: NaN, verifiedImageCount: NaN, surface: "admin" })
    ).toBe("missing");
    expect(
      resolveImageState({ imageCount: -5, verifiedImageCount: -1, surface: "public" })
    ).toBe("placeholder");
    expect(
      resolveImageState({ imageCount: 2.9, verifiedImageCount: 1.4, surface: "admin" })
    ).toBe("verified");
  });

  test("doğrulanmış sayı toplamı AŞAMAZ", () => {
    // Tutarsız girdi (ör. yarışan iki istek) yanlışlıkla `verified` üretmemeli
    // diye kırpılır: 0 görselin 5'i doğrulanmış olamaz.
    expect(
      resolveImageState({ imageCount: 0, verifiedImageCount: 5, surface: "admin" })
    ).toBe("missing");
  });
});

test.describe("showsRealPhoto", () => {
  test("yalnızca verified durumunda gerçek fotoğraf gösterilir", () => {
    expect(showsRealPhoto("verified")).toBe(true);
    expect(showsRealPhoto("placeholder")).toBe(false);
    expect(showsRealPhoto("pending_verification")).toBe(false);
    expect(showsRealPhoto("missing")).toBe(false);
  });
});

test.describe("publishableImages", () => {
  test("yalnızca verified = true süzülür", () => {
    const liste = [
      { id: "a", verified: false },
      { id: "b", verified: true },
      { id: "c", verified: false },
      { id: "d", verified: true },
    ];
    expect(publishableImages(liste).map((i) => i.id)).toEqual(["b", "d"]);
  });

  test("hiçbiri doğrulanmamışsa boş döner", () => {
    expect(publishableImages([{ verified: false }, { verified: false }])).toEqual([]);
  });

  test("boş liste güvenli", () => {
    expect(publishableImages([])).toEqual([]);
  });
});

test.describe("imageAltText", () => {
  test("operatörün yazdığı ALT metni kullanılır", () => {
    expect(
      imageAltText({
        altText: "Sökülmüş kavrama ayar pulu, üstten çekim",
        partNumber: "61963-00300",
        productName: "Kavrama Ayar Pulu",
      })
    ).toBe("Sökülmüş kavrama ayar pulu, üstten çekim");
  });

  test("boş / whitespace ALT metni yedeğe düşer", () => {
    for (const bos of [null, undefined, "", "   "]) {
      expect(
        imageAltText({ altText: bos, partNumber: "CH 76281", productName: "Hidrolik Pompa" })
      ).toBe("Hidrolik Pompa — CH 76281");
    }
  });
});

test.describe("parseImageAltText — ALT metni doğrulamanın ŞARTI", () => {
  test("verified = true iken ALT metni ZORUNLU", () => {
    const r = parseImageAltText("", true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("ALT metni zorunludur");
  });

  test("verified = true iken kısa ALT metni reddedilir", () => {
    const r = parseImageAltText("x".repeat(IMAGE_ALT_TEXT_MIN - 1), true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(`en az ${IMAGE_ALT_TEXT_MIN}`);
  });

  test("eşik DEĞERİ tam olarak yeterli", () => {
    const r = parseImageAltText("x".repeat(IMAGE_ALT_TEXT_MIN), true);
    expect(r.ok).toBe(true);
  });

  test("verified = false iken ALT metni serbest (taslak)", () => {
    const bos = parseImageAltText("", false);
    expect(bos.ok).toBe(true);
    if (bos.ok) expect(bos.value).toBeNull();

    const kisa = parseImageAltText("kisa", false);
    expect(kisa.ok).toBe(true);
    if (kisa.ok) expect(kisa.value).toBe("kisa");
  });

  test("üst sınır aşılırsa reddedilir — kırpılmaz", () => {
    const r = parseImageAltText("x".repeat(FIELD_LIMITS.imageAltText + 1), false);
    expect(r.ok).toBe(false);
  });

  test("metin olmayan girdi reddedilir", () => {
    expect(parseImageAltText(42, false).ok).toBe(false);
    expect(parseImageAltText({}, true).ok).toBe(false);
  });

  test("baştaki/sondaki boşluk kırpılır", () => {
    const r = parseImageAltText("  Kavrama ayar pulu yakin plan  ", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Kavrama ayar pulu yakin plan");
  });
});

test.describe("parseImageSourceNote — kaynak doğrulamanın ŞARTI", () => {
  test("verified = true iken kaynak ZORUNLU", () => {
    const r = parseImageSourceNote("   ", true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("kaynak zorunludur");
  });

  test("verified = false iken kaynak serbest", () => {
    const r = parseImageSourceNote("", false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeNull();
  });

  test("geçerli kaynak kabul edilir", () => {
    const r = parseImageSourceNote("depo çekimi 2026-11-17", true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("depo çekimi 2026-11-17");
  });

  test("üst sınır aşılırsa reddedilir", () => {
    expect(
      parseImageSourceNote("x".repeat(FIELD_LIMITS.imageSourceNote + 1), true).ok
    ).toBe(false);
  });

  test("metin olmayan girdi reddedilir", () => {
    expect(parseImageSourceNote(true, true).ok).toBe(false);
  });
});

test.describe("etiketler", () => {
  test("dört durumun hepsi Türkçe etiket taşır", () => {
    const durumlar: ProductImageState[] = [
      "missing",
      "placeholder",
      "pending_verification",
      "verified",
    ];
    for (const d of durumlar) {
      expect(IMAGE_STATE_LABEL[d].length).toBeGreaterThan(0);
    }
  });
});
