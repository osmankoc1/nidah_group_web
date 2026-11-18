import { test, expect } from "@playwright/test";
import {
  SIRALAMA_ALANLARI,
  VARSAYILAN_FILTRELER,
  aktifFiltreSayisi,
  filtreleriSorguyaYaz,
  parseProductFilters,
} from "@/lib/product-filters";
import { STOCK_STATUSES } from "@/lib/product-fields";

/**
 * Faz 2 / P4 + Y3 — yönetim listesi filtreleri ve sıralama.
 *
 * Kilitlenen sözleşme:
 *   · Sentetik kayıtlar VARSAYILAN OLARAK GİZLİ,
 *   · Geçersiz değer HATA ÜRETMEZ, varsayılana düşer,
 *   · Sıralama alanı BEYAZ LİSTEDEN gelir (SQL enjeksiyon yüzeyi yok),
 *   · Filtreler URL'ye yazılabilir ve geri okunabilir (tur-dönüş).
 */

const q = (s: string) => new URLSearchParams(s);

test.describe("varsayılanlar", () => {
  test("boş sorgu varsayılanları verir", () => {
    expect(parseProductFilters(q(""))).toEqual(VARSAYILAN_FILTRELER);
  });

  test("sentetik kayıtlar VARSAYILAN OLARAK GİZLİ", () => {
    // 12 test kaydı operatörün 154 gerçek ürünü görmesini engellememeli.
    expect(VARSAYILAN_FILTRELER.synthetic).toBe("hide");
    expect(parseProductFilters(q("")).synthetic).toBe("hide");
  });

  test("varsayılan sıralama en yeni kayıt önce", () => {
    expect(VARSAYILAN_FILTRELER.sort).toBe("createdAt");
    expect(VARSAYILAN_FILTRELER.dir).toBe("desc");
  });
});

test.describe("üç durumlu filtreler", () => {
  const alanlar = [
    "active",
    "seoReady",
    "verifiedPhoto",
    "anyPhoto",
    "shortDescription",
    "publishEligible",
  ] as const;

  for (const alan of alanlar) {
    test(`${alan}: yes / no / all`, () => {
      expect(parseProductFilters(q(`${alan}=yes`))[alan]).toBe("yes");
      expect(parseProductFilters(q(`${alan}=no`))[alan]).toBe("no");
      expect(parseProductFilters(q(""))[alan]).toBe("all");
    });

    test(`${alan}: eski boolean biçimi de anlaşılır`, () => {
      // Geriye uyumluluk: mevcut `?active=true` çağrıları kırılmamalı.
      expect(parseProductFilters(q(`${alan}=true`))[alan]).toBe("yes");
      expect(parseProductFilters(q(`${alan}=false`))[alan]).toBe("no");
      expect(parseProductFilters(q(`${alan}=1`))[alan]).toBe("yes");
      expect(parseProductFilters(q(`${alan}=0`))[alan]).toBe("no");
    });

    test(`${alan}: tanınmayan değer "all"a düşer`, () => {
      expect(parseProductFilters(q(`${alan}=zırva`))[alan]).toBe("all");
      expect(parseProductFilters(q(`${alan}=`))[alan]).toBe("all");
    });
  }
});

test.describe("enum filtreleri beyaz listeye bağlı", () => {
  test("stockStatus yalnızca şema enum değerlerini kabul eder", () => {
    for (const deger of STOCK_STATUSES) {
      expect(parseProductFilters(q(`stockStatus=${deger}`)).stockStatus).toBe(deger);
    }
    expect(parseProductFilters(q("stockStatus=stokta_var")).stockStatus).toBeNull();
    expect(parseProductFilters(q("stockStatus=' OR 1=1--")).stockStatus).toBeNull();
  });

  test("condition yalnızca üç değeri kabul eder", () => {
    for (const deger of ["new", "used", "remanufactured"]) {
      expect(parseProductFilters(q(`condition=${deger}`)).condition).toBe(deger);
    }
    expect(parseProductFilters(q("condition=sifir")).condition).toBeNull();
  });

  test("categoryId yalnızca UUID biçimini kabul eder", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    expect(parseProductFilters(q(`categoryId=${uuid}`)).categoryId).toBe(uuid);
    expect(parseProductFilters(q("categoryId=1")).categoryId).toBeNull();
    expect(parseProductFilters(q("categoryId=; DROP TABLE products")).categoryId).toBeNull();
  });
});

test.describe("sıralama — beyaz liste", () => {
  test("yalnızca tanımlı alanlar kabul edilir", () => {
    for (const alan of SIRALAMA_ALANLARI) {
      expect(parseProductFilters(q(`sort=${alan}`)).sort).toBe(alan);
    }
  });

  test("tanınmayan alan varsayılana düşer — SQL'e sızmaz", () => {
    expect(parseProductFilters(q("sort=createdAt; DROP TABLE products")).sort).toBe(
      "createdAt"
    );
    expect(parseProductFilters(q("sort=password")).sort).toBe("createdAt");
  });

  test("yön yalnızca asc / desc", () => {
    expect(parseProductFilters(q("dir=asc")).dir).toBe("asc");
    expect(parseProductFilters(q("dir=desc")).dir).toBe("desc");
    expect(parseProductFilters(q("dir=rastgele")).dir).toBe("desc");
  });
});

test.describe("sentetik görünürlük", () => {
  test("üç değer", () => {
    expect(parseProductFilters(q("synthetic=hide")).synthetic).toBe("hide");
    expect(parseProductFilters(q("synthetic=only")).synthetic).toBe("only");
    expect(parseProductFilters(q("synthetic=all")).synthetic).toBe("all");
  });

  test("tanınmayan değer GİZLİYE düşer — güvenli taraf", () => {
    // Yazım hatası sentetik kayıtları KAZARA göstermemeli.
    expect(parseProductFilters(q("synthetic=belki")).synthetic).toBe("hide");
  });
});

test.describe("arama metni", () => {
  test("kırpılır", () => {
    expect(parseProductFilters(q("search=%20%20CH%2076281%20%20")).search).toBe("CH 76281");
  });

  test("boş veya aşırı uzun değer yok sayılır", () => {
    expect(parseProductFilters(q("search=")).search).toBeNull();
    expect(parseProductFilters(q("search=" + "x".repeat(300))).search).toBeNull();
  });
});

test.describe("aktif filtre sayacı", () => {
  test("varsayılanda 0", () => {
    expect(aktifFiltreSayisi(VARSAYILAN_FILTRELER)).toBe(0);
  });

  test("arama sayılmaz — kutusu zaten görünür", () => {
    expect(aktifFiltreSayisi(parseProductFilters(q("search=pompa")))).toBe(0);
  });

  test("her sapma bir sayılır", () => {
    const f = parseProductFilters(q("active=yes&seoReady=no&stockStatus=in_stock"));
    expect(aktifFiltreSayisi(f)).toBe(3);
  });

  test("sentetik gösterimi de bir filtredir", () => {
    expect(aktifFiltreSayisi(parseProductFilters(q("synthetic=all")))).toBe(1);
  });
});

test.describe("URL tur-dönüşü", () => {
  test("varsayılanlar URL'ye YAZILMAZ — adres temiz kalır", () => {
    expect(filtreleriSorguyaYaz(VARSAYILAN_FILTRELER).toString()).toBe("");
  });

  test("yazılan sorgu geri okunduğunda aynı filtreyi verir", () => {
    const ilk = parseProductFilters(
      q("search=pompa&active=yes&seoReady=no&verifiedPhoto=no&shortDescription=yes&stockStatus=on_order&condition=used&synthetic=all&sort=partNumber&dir=asc")
    );
    const geri = parseProductFilters(filtreleriSorguyaYaz(ilk));
    expect(geri).toEqual(ilk);
  });

  test("düz nesne girdisi de desteklenir", () => {
    const f = parseProductFilters({ active: "yes", sort: "name", dir: "asc" });
    expect(f.active).toBe("yes");
    expect(f.sort).toBe("name");
    expect(f.dir).toBe("asc");
  });
});
