import { test, expect } from "@playwright/test";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildProductJsonLd } from "@/lib/product-jsonld";
import { evaluateSeoReadiness } from "@/lib/seo-gate";
import { resolveImageState, showsRealPhoto } from "@/lib/product-image-state";

/**
 * TEMSİLÎ ÜRÜN GÖRSELİ MİMARİSİ — onaylanmış raster tasarım (2026-11-17).
 *
 * Kullanıcı şartları:
 *   · Bu görsel GERÇEK ÜRÜN FOTOĞRAFI DEĞİLDİR, kurumsal placeholder'dır.
 *   · `product_images` tablosuna kaydedilmez, `verified=true` işaretlenmez.
 *   · `Product.image`, ürün JSON-LD'si, ürün image sitemap'i veya ürüne özel
 *     OG görseli olarak kullanılmaz.
 *   · Doğrulanmış fotoğraf sayısına dahil edilmez.
 *   · SEO yayın kapısı ve otomatik `seo_ready=false` geri alma korunur.
 *
 * Mimari satır içi SVG'den RASTER dosyaya geçti. Bu, yeni bir risk getirdi:
 * dosyanın artık crawl edilebilir bir URL'si var. Testler buna göre
 * GÜNCELLENDİ, güvenlik şartları GEVŞETİLMEDİ — aksine indekslenme
 * denetimi eklendi.
 *
 * Tasarım değişebilir; aşağıdaki mimari sözleşme değişemez.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");

const PLACEHOLDER_YOLU = "src/components/catalog/ProductImagePlaceholder.tsx";

/** Varlıkların bulunduğu public önek — `next.config.ts` başlık kuralıyla aynı. */
const VARLIK_ONEKI = "/placeholder/";

const VARLIKLAR = [
  { ad: "1:1 (detay)", dosya: "public/placeholder/urun-gorseli-hazirlaniyor-1x1.webp", oran: 1, enFazlaKB: 300 },
  { ad: "4:3 (kart)", dosya: "public/placeholder/urun-gorseli-hazirlaniyor-4x3.webp", oran: 4 / 3, enFazlaKB: 160 },
];

/** Temsilî görseli ekrana basan ÜÇ bileşen — başka yerde kullanılmaz. */
const RENDER_EDENLER = [
  "src/components/catalog/ProductGallery.tsx",
  "src/components/catalog/BrandCatalogPage.tsx",
  "src/components/catalog/ParcaKatalogClient.tsx",
];

/** 4:3 ürün kartı basan İKİ yüzey — ikisi de aynı yer tutucuyu gösterir. */
const KART_YUZEYLERI = [
  "src/components/catalog/BrandCatalogPage.tsx",
  "src/components/catalog/ParcaKatalogClient.tsx",
];

/** Görseli public yüzeye taşıyan BEŞ okuma yolu. */
const PUBLIC_OKUMA_YOLLARI = [
  "src/lib/queries/product.ts",
  "src/app/api/products/route.ts",
  "src/app/api/products/[partNumber]/route.ts",
  "src/components/catalog/BrandCatalogPage.tsx",
  "src/app/sitemap.ts",
];

/** Ne bileşenin ADI ne de varlık YOLU geçmemesi gereken veri / SEO katmanı. */
const VERI_VE_SEO_KATMANI = [
  "src/lib/queries/product.ts",
  "src/lib/product-jsonld.ts",
  "src/lib/seo-gate.ts",
  "src/lib/seo-gate-server.ts",
  "src/app/sitemap.ts",
  "src/app/api/products/route.ts",
  "src/app/api/products/[partNumber]/route.ts",
  "src/app/api/admin/products/[id]/images/route.ts",
  "src/app/api/admin/products/[id]/images/[imageId]/route.ts",
];

/** Lossy WebP (VP8) başlığından genişlik/yükseklik okur — bağımlılık gerekmez. */
function webpBoyut(buf: Buffer): { w: number; h: number } {
  const i = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  if (i < 0) throw new Error("VP8 baslangic kodu bulunamadi");
  return {
    w: buf.readUInt16LE(i + 3) & 0x3fff,
    h: buf.readUInt16LE(i + 5) & 0x3fff,
  };
}

// ── 1. Varlıklar gerçekten var, doğru oranda ve makul boyutta ───────────────

test.describe("onaylanmış görsel varlıkları", () => {
  for (const v of VARLIKLAR) {
    test(`${v.ad} dosyası mevcut`, () => {
      expect(existsSync(join(KOK, v.dosya)), `${v.dosya} yok`).toBe(true);
    });

    test(`${v.ad} oranı tam olarak doğru`, () => {
      // Oran kapsayıcıyla birebir aynı olmak ZORUNDA: `object-cover`
      // kullanıldığı için oran kayarsa onaylanmış tasarımın metinleri
      // SESSİZCE KIRPILIR.
      const { w, h } = webpBoyut(readFileSync(join(KOK, v.dosya)));
      expect(w / h).toBeCloseTo(v.oran, 3);
    });

    test(`${v.ad} boyut bütçesi aşılmıyor`, () => {
      // Ham 1254px kaynak ~480 KB. Türev üretilmeden doğrudan konursa
      // marka sayfasında ilk yükleme ağırlaşır; bu test onu yakalar.
      const kb = statSync(join(KOK, v.dosya)).size / 1024;
      expect(kb).toBeLessThanOrEqual(v.enFazlaKB);
    });
  }
});

// ── 2. Kontrollü yol + indekslenme engeli ──────────────────────────────────

test.describe("raster dosya indekslenmeye KAPALI sunulur", () => {
  const kaynak = oku(PLACEHOLDER_YOLU);
  const config = oku("next.config.ts");

  test("her iki varlık da /placeholder/ önekinden sunulur", () => {
    // Önek, next.config başlık kuralının eşleştiği yoldur. Değişirse
    // noindex başlığı SESSİZCE uygulanmaz olur.
    const srcler = kaynak.match(/src:\s*"([^"]+)"/g) ?? [];
    expect(srcler.length).toBe(2);
    for (const s of srcler) {
      expect(s).toContain(VARLIK_ONEKI);
    }
  });

  test("next.config /placeholder/* yoluna noindex gönderir", () => {
    expect(config).toContain("/placeholder/:path*");
    expect(config).toContain("X-Robots-Tag");
    expect(config).toContain("noindex");
    expect(config).toContain("noimageindex");
  });

  test("görsel `unoptimized` sunulur — adres başlığı taşır", () => {
    // Optimize edilseydi adres `/_next/image?url=…` olurdu ve noindex
    // başlığını TAŞIMAZDI. O yola başlık eklemek ise ileride yüklenecek
    // GERÇEK ürün fotoğraflarını da noindex yapardı.
    expect(kaynak).toContain("unoptimized");
  });

  test("robots.txt /placeholder yolunu ENGELLEMEZ", () => {
    // `Disallow` taramayı engeller; Google o zaman noindex başlığını HİÇ
    // göremez ve URL yine sonuçlarda çıkabilir. Bu test, "daha güvenli"
    // sanılarak eklenecek bir Disallow'u yakalar.
    const robots = oku("src/app/robots.ts");
    expect(robots).not.toContain("/placeholder");
  });

  test("bileşen dış kaynak adresi içermez", () => {
    expect(kaynak).not.toContain("http://");
    expect(kaynak).not.toContain("https://");
  });
});

// ── 3. İki oran ve çağrı yerleri ───────────────────────────────────────────

test.describe("1:1 ve 4:3 oranları", () => {
  const kaynak = oku(PLACEHOLDER_YOLU);

  test("iki varyant tanımlı: detail ve card", () => {
    expect(kaynak).toContain('"detail"');
    expect(kaynak).toContain('"card"');
  });

  test("bildirilen ölçüler dosyaların gerçek oranıyla UYUŞUR", () => {
    // Bileşendeki width/height, varlığın gerçek oranından saparsa
    // `next/image` yanlış yer tutar ve düzen kayar (CLS).
    const detay = kaynak.match(/detail:[\s\S]*?width:\s*(\d+)[\s\S]*?height:\s*(\d+)/);
    const kart = kaynak.match(/card:[\s\S]*?width:\s*(\d+)[\s\S]*?height:\s*(\d+)/);
    expect(detay).not.toBeNull();
    expect(kart).not.toBeNull();
    expect(Number(detay![1]) / Number(detay![2])).toBeCloseTo(1, 3);
    expect(Number(kart![1]) / Number(kart![2])).toBeCloseTo(4 / 3, 3);
  });

  test("çağrı yerleri varyantı kapsayıcı oranıyla EŞLEŞTİRİR", () => {
    const galeri = oku("src/components/catalog/ProductGallery.tsx");
    expect(galeri).toMatch(/aspect-square[\s\S]{0,160}variant="detail"/);

    for (const yol of KART_YUZEYLERI) {
      expect(oku(yol), `${yol} 4:3 kapsayıcıda card varyantı kullanmalı`).toMatch(
        /aspect-\[4\/3\][\s\S]{0,2000}variant="card"/
      );
    }
  });
});

// ── 4. Veri ve SEO katmanına SIZMAZ ────────────────────────────────────────

test.describe("temsilî görsel veri ve SEO katmanına GİRMEZ", () => {
  test("ürün gösteren her yüzey AYNI yer tutucuyu kullanır", () => {
    // İki kart yüzeyinden biri atlanırsa kullanıcı iki farklı yer tutucu
    // görür. Bu test o tutarsızlığı yakalar.
    for (const yol of RENDER_EDENLER) {
      expect(oku(yol), `${yol} onaylanmış yer tutucuyu kullanmalı`).toContain(
        "ProductImagePlaceholder"
      );
    }
  });

  test("eski ikon tabanlı yer tutucu hiçbir kartta kalmadı", () => {
    // `PackageSearch` ikonlu eski yedek, ürün GÖRSEL ALANINDA kullanılmamalı.
    for (const yol of KART_YUZEYLERI) {
      const kaynak = oku(yol);
      const gorselAlani = kaynak.slice(
        kaynak.indexOf('aspect-[4/3]'),
        kaynak.indexOf("ProductImagePlaceholder", kaynak.indexOf('aspect-[4/3]'))
      );
      expect(gorselAlani, `${yol} görsel alanında eski yedek duruyor`).not.toContain(
        "PackageSearch"
      );
    }
  });

  test("sorgu, JSON-LD, sitemap ve API katmanında ADI BİLE geçmez", () => {
    for (const yol of VERI_VE_SEO_KATMANI) {
      expect(
        oku(yol),
        `${yol} temsilî görsel bileşenini import etmemeli`
      ).not.toContain("ProductImagePlaceholder");
    }
  });

  test("varlık YOLU da veri ve SEO katmanında geçmez", () => {
    // Raster mimarisinin SVG'de olmayan riski: yol bir metin sabiti olduğu
    // için JSON-LD'ye, sitemap'e veya OG alanına ELLE yazılabilir.
    for (const yol of VERI_VE_SEO_KATMANI) {
      expect(
        oku(yol),
        `${yol} temsilî görsel yolunu elle yazmamalı`
      ).not.toContain(VARLIK_ONEKI);
    }
  });

  test("ürün detay sayfası OG görseli olarak temsilî görseli KULLANMAZ", () => {
    // Fotoğraf yoksa KURUMSAL `/opengraph-image` kullanılır.
    const sayfa = oku("src/app/(public)/parca-katalog/[slug]/page.tsx");
    expect(sayfa).not.toContain(VARLIK_ONEKI);
    expect(sayfa).toContain("/opengraph-image");
  });

  test("JSON-LD image alanı YALNIZCA verilen URL listesinden doğar", () => {
    const bos = buildProductJsonLd({
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      imageUrls: [],
    });
    expect(bos).not.toHaveProperty("image");

    const bosYok = buildProductJsonLd({
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
    });
    expect(bosYok).not.toHaveProperty("image");
  });

  test("JSON-LD boş/whitespace URL'leri eler, uydurma eklemez", () => {
    const node = buildProductJsonLd({
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      imageUrls: ["", "   ", "https://res.cloudinary.com/x/gercek.jpg"],
    });
    expect(node.image).toEqual(["https://res.cloudinary.com/x/gercek.jpg"]);
  });
});

// ── 4b. Stok rozeti görselin ÜZERİNİ ÖRTMEZ ────────────────────────────────

test.describe("stok rozeti kart bilgi bölümünde durur", () => {
  for (const yol of KART_YUZEYLERI) {
    test(`${yol} görsel alanında konumlandırılmış HİÇBİR rozet yok`, () => {
      // Kullanıcı kararları 2026-11-17: ne stok rozeti (üst sağ, "NİDAH
      // GROUP" yazısını örtüyordu) ne de durum rozeti (alt sol, iki dilli
      // bandı örtüyordu) görselin üzerinde kalmalı.
      const kaynak = oku(yol);
      const baslangic = kaynak.indexOf("aspect-[4/3]");
      const govde = kaynak.indexOf("StockBadge", baslangic);
      expect(baslangic).toBeGreaterThan(-1);
      expect(govde).toBeGreaterThan(baslangic);

      const gorselAlani = kaynak.slice(baslangic, govde);
      expect(gorselAlani, `${yol} görselin üstünde rozet var`).not.toContain(
        "absolute top-2.5 right-2.5"
      );
      expect(gorselAlani, `${yol} görselin üstünde durum rozeti var`).not.toContain(
        "absolute bottom-2.5 left-2.5"
      );
    });

    test(`${yol} her iki rozeti de PAYLAŞILAN bileşenle basar`, () => {
      // İki yüzeyde kopyalanan rozetler tek kaynağa alındı; kopya geri
      // gelirse metin/ton ayrışabilir (denetim C10).
      const kaynak = oku(yol);
      expect(kaynak).toContain("StockBadge");
      expect(kaynak).toContain("ConditionBadge");
      expect(kaynak).not.toContain("stockPresentationFromStatus");
      // Yerel CONDITION haritası geri gelmemeli.
      expect(kaynak).not.toMatch(/const CONDITION\s*:/);
    });

    test(`${yol} rozetler bilgi bölümünde yan yana durur`, () => {
      // "Teyit Ediliyor" ile uyumlu, tek grup hâlinde yerleşim.
      const kaynak = oku(yol);
      expect(kaynak).toMatch(
        /ConditionBadge[\s\S]{0,160}StockBadge/
      );
    });
  }

  test("ConditionBadge haritada olmayan değere varsayılan ATAMAZ", () => {
    // Bilinmeyen bir `condition` değerinde sessizce "Sıfır" denmemeli.
    const rozet = oku("src/components/catalog/ConditionBadge.tsx");
    const kod = rozet.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(kod).toContain("?? {");
    expect(kod).toContain("label: condition");
  });

  test("iki rozet AYNI ölçü ve biçimi paylaşır", () => {
    // Yan yana durdukları için ayrışmaları dağınık görünürdü.
    const stok = oku("src/components/catalog/StockBadge.tsx");
    const durum = oku("src/components/catalog/ConditionBadge.tsx");
    for (const sinif of ["text-[10px]", "font-bold", "px-2.5", "py-1", "rounded-full", "border"]) {
      expect(stok, `StockBadge ${sinif} taşımalı`).toContain(sinif);
      expect(durum, `ConditionBadge ${sinif} taşımalı`).toContain(sinif);
    }
  });

  test("StockBadge iddia kuralını src/lib/stock.ts'ten alır", () => {
    const rozet = oku("src/components/catalog/StockBadge.tsx");
    expect(rozet).toContain("stockPresentationFromStatus");

    // Yorumlar çıkarıldıktan sonra "Stokta" metni TEK YERDE geçmeli:
    // yalnızca `positive` tonunda. Teyit edilmemiş stok "Stokta" olarak
    // sunulmaz (denetim C10).
    const kod = rozet
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect((kod.match(/Stokta/g) ?? []).length).toBe(1);
    expect(kod).toContain('tone === "positive"');
    expect(kod).toContain('tone === "pending"');
  });
});

// ── 5. Doğrulanmış fotoğraf SAYILMAZ ───────────────────────────────────────

test.describe("temsilî görsel doğrulanmış fotoğraf SAYILMAZ", () => {
  test("yayın kapısının görsel girdisi yalnızca DOĞRULANMIŞ sayıdır", () => {
    const kaynak = oku("src/lib/seo-gate.ts");
    expect(kaynak).toContain("verifiedImageCount");
    // Eski, yaniltici `imageCount` alani GERI GELMEMELI.
    expect(kaynak).not.toMatch(/^\s*imageCount:/m);
  });

  test("temsilî kart gösterilen ürün yayın ölçütünü GEÇEMEZ", () => {
    const durum = resolveImageState({
      imageCount: 4,
      verifiedImageCount: 0,
      surface: "public",
    });
    expect(durum).toBe("placeholder");
    expect(showsRealPhoto(durum)).toBe(false);

    const kapi = evaluateSeoReadiness({
      isActive: true,
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      longDescription: "x".repeat(300),
      verifiedImageCount: 0,
      verifiedFitmentCount: 1,
    });
    expect(kapi.eligible).toBe(false);
    expect(kapi.unmet).toContain("no_verified_image");
  });
});

// ── 6. product_images tablosuna YAZILMAZ ───────────────────────────────────

test.describe("temsilî görsel product_images tablosuna YAZILMAZ", () => {
  test("hiçbir INSERT verified alanını true yazmaz", () => {
    const yukleme = oku("src/app/api/admin/products/[id]/images/route.ts");
    const insertBlogu = yukleme.slice(yukleme.indexOf(".insert(productImages)"));
    expect(insertBlogu).not.toMatch(/verified:\s*true/);
  });

  test("bileşen veritabanı veya Cloudinary'ye hiç dokunmaz", () => {
    const kaynak = oku(PLACEHOLDER_YOLU);
    expect(kaynak).not.toContain("cloudinary");
    expect(kaynak).not.toContain("productImages");
    expect(kaynak).not.toContain("@/lib/db");
  });
});

// ── 7. Public okuma yolları doğrulanmış görseli süzer ──────────────────────

test.describe("beş public okuma yolu DOĞRULANMIŞ görseli süzer", () => {
  for (const yol of PUBLIC_OKUMA_YOLLARI) {
    test(`${yol} verified = true filtresi taşır`, () => {
      expect(
        oku(yol),
        `${yol} doğrulanmamış görseli public yüzeye sızdırabilir`
      ).toContain("productImages.verified");
    });
  }
});
