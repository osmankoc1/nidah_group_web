import { test, expect } from "@playwright/test";
import { buildProductJsonLd } from "@/lib/product-jsonld";
import { productUrl } from "@/lib/product-url";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Denetim C8 (desteklenmeyen offer/price) ve C9 (makine üreticisini parçanın
 * markası gibi sunma) için yapısal veri değişmezleri.
 */

const base = {
  partNumber: "CH 76281",
  name: "Hidrolik Ana Pompa",
};

test.describe("Product yapısal verisi", () => {
  test("DOĞRULANMAYAN alanlar hiç üretilmez: offers, brand, mpn, gtin", () => {
    const node = buildProductJsonLd({
      ...base,
      description: "Açıklama",
      categoryName: "Hidrolik Pompalar",
      imageUrls: ["https://res.cloudinary.com/x/a.jpg"],
    });
    const keys = Object.keys(node);
    expect(keys).not.toContain("offers");
    expect(keys).not.toContain("brand");
    expect(keys).not.toContain("mpn");
    expect(keys).not.toContain("gtin");
    expect(keys).not.toContain("aggregateRating");
    expect(keys).not.toContain("review");
  });

  test("serialize edilmiş çıktıda fiyat/stok iddiası geçmez", () => {
    const json = serializeJsonLd(
      buildProductJsonLd({ ...base, imageUrls: ["https://res.cloudinary.com/x/a.jpg"] })
    );
    expect(json).not.toContain("priceCurrency");
    expect(json).not.toContain("availability");
    expect(json).not.toContain("InStock");
    expect(json).not.toContain("OutOfStock");
    expect(json).not.toContain("Offer");
  });

  test("sku görünen parça numarasını AYNEN taşır", () => {
    expect(buildProductJsonLd(base).sku).toBe("CH 76281");
    expect(buildProductJsonLd({ ...base, partNumber: "0012345" }).sku).toBe("0012345");
    expect(buildProductJsonLd({ ...base, partNumber: "714-07-20701" }).sku).toBe(
      "714-07-20701"
    );
  });

  test("url kanonik ürün URL'idir — canonical ve sitemap ile aynı", () => {
    const node = buildProductJsonLd(base);
    expect(node.url).toBe(productUrl("CH 76281"));
    expect(node.url).toBe("https://www.nidahgroup.com.tr/parca-katalog/ch-76281");
  });

  test("boş/whitespace alanlar şemaya yazılmaz", () => {
    const node = buildProductJsonLd({
      ...base,
      description: "   ",
      categoryName: "",
      imageUrls: [],
    });
    expect(Object.keys(node)).not.toContain("description");
    expect(Object.keys(node)).not.toContain("category");
    expect(Object.keys(node)).not.toContain("image");
  });

  test("görsel listesi boş dizeleri filtreler, doluysa yazılır", () => {
    const node = buildProductJsonLd({
      ...base,
      imageUrls: ["https://res.cloudinary.com/x/a.jpg", "", "   "],
    });
    expect(node.image).toEqual(["https://res.cloudinary.com/x/a.jpg"]);
  });

  test("zorunlu çekirdek alanlar her zaman vardır", () => {
    const node = buildProductJsonLd(base);
    expect(node["@context"]).toBe("https://schema.org");
    expect(node["@type"]).toBe("Product");
    expect(node.name).toBe("Hidrolik Ana Pompa");
  });

  test("XSS kaçışı korunur (json-ld.tsx ile birlikte)", () => {
    const json = serializeJsonLd(
      buildProductJsonLd({ ...base, name: 'Pompa </script><script>alert(1)' })
    );
    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c");
  });
});

/**
 * Faz 2: `brand` ve `offers` KOŞULLU hâle geldi. Varsayılan hâlâ "üretme";
 * yalnızca çağıran taraf doğrulanmış veri geçince oluşurlar.
 */
test.describe("Faz 2 — koşullu brand", () => {
  test("brandName verilmezse brand düğümü üretilmez", () => {
    for (const value of [undefined, null, "", "   "]) {
      const node = buildProductJsonLd({ ...base, brandName: value });
      expect(Object.keys(node), String(value)).not.toContain("brand");
    }
  });

  test("brandName verilirse Brand düğümü üretilir", () => {
    const node = buildProductJsonLd({ ...base, brandName: "TEST Üretici" });
    expect(node.brand).toEqual({ "@type": "Brand", name: "TEST Üretici" });
  });

  test("brand değeri çağıran taraftan gelir — fitment zincirinden türetilmez", () => {
    // Makine markalari (VOLVO vb.) bu fonksiyona hic parametre olarak gecmez;
    // tek giris noktasi brandName'dir (denetim C9).
    const node = buildProductJsonLd(base);
    expect(node.brand).toBeUndefined();
  });
});

test.describe("Faz 2 — koşullu offers", () => {
  test("availability verilmezse offers üretilmez", () => {
    for (const value of [undefined, null, "", "   "]) {
      const node = buildProductJsonLd({ ...base, availability: value });
      expect(Object.keys(node), String(value)).not.toContain("offers");
    }
  });

  test("availability verilirse Offer üretilir ve FİYAT ALANI YAZILMAZ", () => {
    const node = buildProductJsonLd({
      ...base,
      availability: "https://schema.org/InStock",
    });
    expect(node.offers).toEqual({
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      url: productUrl(base.partNumber),
      seller: { "@type": "Organization", name: "NİDAH GROUP" },
    });
    const json = serializeJsonLd(node);
    // Eski hata: price olmadan priceCurrency yazmak.
    expect(json).not.toContain("priceCurrency");
    expect(json).not.toContain('"price"');
  });

  test("offers.url ürünün kanonik URL'i ile aynıdır", () => {
    const node = buildProductJsonLd({
      ...base,
      availability: "https://schema.org/BackOrder",
    });
    expect(node.offers!.url).toBe(node.url);
  });

  test("satıcı adı özelleştirilebilir", () => {
    const node = buildProductJsonLd({
      ...base,
      availability: "https://schema.org/InStock",
      sellerName: "TEST Satici",
    });
    expect(node.offers!.seller.name).toBe("TEST Satici");
  });
});
