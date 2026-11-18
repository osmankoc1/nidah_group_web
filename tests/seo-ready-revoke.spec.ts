import { test, expect } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getTableColumns } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { products } from "@/lib/db/schema";
import { shouldRevokeSeoReady, MIN_VERIFIED_IMAGES } from "@/lib/seo-gate";
import { revokeSeoReadyStatement } from "@/lib/seo-gate-server";

/**
 * Dayanaksız yayın onayının GERİ ALINMASI — kullanıcı onayı 2026-11-17.
 *
 * Kilitlenen altı koşul:
 *   1. Son doğrulanmış fotoğraf gidince `seo_ready = false`.
 *   2. Ürün bilgileri, açıklamalar, uyumluluklar ve stok DEĞİŞMEZ.
 *   3. Fotoğraf yeniden doğrulanınca `seo_ready` KENDİLİĞİNDEN true OLMAZ.
 *   4. Geri alma sonrası ürün sitemap'e GİRMEZ ve sayfa noindex olur.
 *   5. İşlem ATOMİKTİR — koşul UPDATE'in WHERE'inde, ayrı bir okumada değil.
 *   6. (bu dosya)
 *
 * SQL testleri BAĞLANMAYAN bir Drizzle örneğiyle çalışır: `neon()` kurulum
 * anında bağlantı açmaz, `.toSQL()` yalnızca sorguyu üretir. Hiçbir
 * veritabanına erişilmez.
 */

const sahteDb = drizzle(
  neon("postgresql://test:test@localhost/test?sslmode=disable"),
  { schema }
);

const URUN_ID = "11111111-2222-3333-4444-555555555555";

function uretilenSql() {
  return revokeSeoReadyStatement(URUN_ID, sahteDb).toSQL();
}

// ── Koşul 1 + 3: kararın yönü ────────────────────────────────────────────────

test.describe("şart 1 — son doğrulanmış fotoğraf gidince geri alınır", () => {
  test("yayındaki ürünün doğrulanmış fotoğrafı kalmazsa geri alınır", () => {
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 0 })).toBe(true);
  });

  test("doğrulanmış fotoğrafı duruyorsa geri alınmaz", () => {
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 1 })).toBe(false);
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 7 })).toBe(false);
  });

  test("eşik MIN_VERIFIED_IMAGES ile aynı", () => {
    expect(
      shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: MIN_VERIFIED_IMAGES })
    ).toBe(false);
    expect(
      shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: MIN_VERIFIED_IMAGES - 1 })
    ).toBe(true);
  });

  test("bozuk sayı güvenli tarafa düşer — geri alınır", () => {
    // Sayım okunamadıysa ürünü yayında BIRAKMAK, yayından çıkarmaktan
    // daha riskli: görselsiz sayfa indekslenmiş kalır.
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: NaN })).toBe(true);
  });
});

test.describe("şart 3 — geri alma TEK YÖNLÜDÜR, asla yayına almaz", () => {
  test("yayında OLMAYAN ürün için hiçbir koşulda işlem yapılmaz", () => {
    // Fotoğraf doğrulanmış olsa bile dönüş false: "yayına al" diye bir
    // çıktı YOKTUR. Yeniden yayın yalnızca yöneticinin açık kararıdır.
    for (const sayi of [0, 1, 5, NaN]) {
      expect(shouldRevokeSeoReady({ seoReady: false, verifiedImageCount: sayi })).toBe(false);
    }
  });

  test("fotoğraf yeniden doğrulanınca ürün kendiliğinden yayına DÖNMEZ", () => {
    // Senaryo: ürün geri alındı (seoReady=false), sonra yeni bir fotoğraf
    // doğrulandı. Karar yine `false` — yani "hiçbir şey yapma".
    expect(shouldRevokeSeoReady({ seoReady: false, verifiedImageCount: 3 })).toBe(false);
  });

  test("dönüş tipi boolean — üçüncü bir 'yayına al' durumu yok", () => {
    const sonuclar = [
      shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 0 }),
      shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 1 }),
      shouldRevokeSeoReady({ seoReady: false, verifiedImageCount: 0 }),
      shouldRevokeSeoReady({ seoReady: false, verifiedImageCount: 1 }),
    ];
    for (const s of sonuclar) expect(typeof s).toBe("boolean");
  });
});

// ── Koşul 2: başka hiçbir kolona dokunulmaz ─────────────────────────────────

test.describe("şart 2 — yalnızca üç kolon yazılır", () => {
  test("SET listesi tam olarak seo_ready, seo_ready_at, updated_at", () => {
    const { sql } = uretilenSql();
    const setBolumu = sql.slice(sql.indexOf(" set "), sql.indexOf(" where "));

    expect(setBolumu).toContain('"seo_ready"');
    expect(setBolumu).toContain('"seo_ready_at"');
    expect(setBolumu).toContain('"updated_at"');

    // Atama sayısı üç: iki virgül.
    expect(setBolumu.split(",").length).toBe(3);
  });

  test("ürün kimliği, içeriği ve stok kolonları SET listesinde YOK", () => {
    const { sql } = uretilenSql();
    const setBolumu = sql.slice(sql.indexOf(" set "), sql.indexOf(" where "));

    const dokunulmayacak = [
      "part_number",
      "part_number_normalized",
      "name",
      "description",
      "short_description",
      "long_description",
      "meta_title",
      "meta_description",
      "condition",
      "category_id",
      "weight",
      "notes",
      "is_active",
      "in_stock",
      "stock_status",
      "stock_status_updated_at",
      "part_manufacturer",
      "sourcing_type",
      "internal_stock_code",
      "internal_stock_code_normalized",
    ];
    for (const kolon of dokunulmayacak) {
      expect(setBolumu).not.toContain(`"${kolon}"`);
    }
  });

  test("dokunulmayacak liste products şemasındaki TÜM kolonları kapsar", () => {
    // Bu test, şemaya yeni bir kolon eklendiğinde yukarıdaki listenin
    // güncellenmesini ZORUNLU kılar: aksi halde yeni kolon sessizce
    // denetimsiz kalırdı.
    const semaKolonlari = Object.values(getTableColumns(products)).map((c) => c.name);
    const yazilanlar = ["seo_ready", "seo_ready_at", "updated_at"];
    const beklenenDenetim = semaKolonlari.filter(
      (ad) => !yazilanlar.includes(ad) && ad !== "id" && ad !== "created_at"
    );

    const { sql } = uretilenSql();
    const setBolumu = sql.slice(sql.indexOf(" set "), sql.indexOf(" where "));
    for (const kolon of beklenenDenetim) {
      expect(setBolumu).not.toContain(`"${kolon}"`);
    }
  });

  test("UPDATE yalnızca products tablosuna yazar", () => {
    const { sql } = uretilenSql();
    const yazmaBolumu = sql.slice(0, sql.indexOf(" where "));

    expect(yazmaBolumu).toContain('update "products"');
    // Uyumluluk, çeviri, OEM ve görsel tabloları YAZMA bölümünde geçmez.
    expect(yazmaBolumu).not.toContain('"fitments"');
    expect(yazmaBolumu).not.toContain('"product_translations"');
    expect(yazmaBolumu).not.toContain('"oem_numbers"');
    expect(yazmaBolumu).not.toContain('"product_images"');
  });

  test("product_images yalnızca OKUNUR (alt sorguda), yazılmaz", () => {
    const { sql } = uretilenSql();
    expect(sql).toContain('from "product_images"');
    expect(sql).not.toContain('update "product_images"');
    expect(sql).not.toContain('delete from "product_images"');
  });
});

// ── Koşul 5: atomiklik ───────────────────────────────────────────────────────

test.describe("şart 5 — koşul UPDATE'in kendi WHERE'inde", () => {
  test("WHERE hem yayın durumunu hem doğrulanmış fotoğraf yokluğunu içerir", () => {
    const { sql } = uretilenSql();
    const whereBolumu = sql.slice(sql.indexOf(" where "));

    expect(whereBolumu).toContain('"id" =');
    expect(whereBolumu).toContain('"seo_ready" =');
    expect(whereBolumu.toLowerCase()).toContain("not exists");
    expect(whereBolumu).toContain('"verified" =');
  });

  test("ayrı bir ön okumaya GEREK YOK — tek ifade", () => {
    // İfade `update … where … not exists (select …)` biçiminde TEK deyimdir.
    // Birden fazla deyim olsaydı aralarında yarış penceresi olurdu.
    const { sql } = uretilenSql();
    expect(sql.trim().toLowerCase().startsWith("update")).toBe(true);
    expect(sql).not.toContain(";");
  });

  test("etkilenen satır sayısı okunabilsin diye RETURNING var", () => {
    // Geri almanın GERÇEKTEN olup olmadığı ancak böyle bilinir; ayrıca
    // okumak yeni bir yarış penceresi açardı.
    const { sql } = uretilenSql();
    expect(sql.toLowerCase()).toContain("returning");
  });

  test("ürün kimliği parametre olarak bağlanır — SQL'e gömülmez", () => {
    const { sql, params } = uretilenSql();
    expect(sql).not.toContain(URUN_ID);
    expect(params).toContain(URUN_ID);
  });

  test("seo_ready false, seo_ready_at null olarak yazılır", () => {
    const { params } = uretilenSql();
    expect(params).toContain(false);
    expect(params).toContain(null);
  });
});

// ── Koşul 4: geri alma sonrası public yüzey ─────────────────────────────────

test.describe("şart 4 — geri alma sonrası ürün yayın yüzeyinden çıkar", () => {
  test("sitemap ve indeksleme koşulu seo_ready'ye bağlı", async () => {
    const { isProductIndexable } = await import("@/lib/seo-gate");

    // Geri alma ÖNCESİ: indekslenebilir.
    expect(isProductIndexable({ isActive: true, seoReady: true })).toBe(true);
    // Geri alma SONRASI: indekslenemez — sitemap'e girmez, sayfa noindex.
    expect(isProductIndexable({ isActive: true, seoReady: false })).toBe(false);
  });

  test("ürün aktif kalmaya devam eder — is_active DEĞİŞMEZ", () => {
    // Geri alma ürünü PASİFLEŞTİRMEZ. Ürün sayfası erişilebilir kalır ama
    // `noindex` taşır ve sitemap'te bulunmaz; liste yüzeylerinde ise
    // fotoğrafsız (temsilî kartla) görünür. Bu, yayın onayı hiç verilmemiş
    // her ürünle AYNI davranıştır.
    const { sql } = uretilenSql();
    const setBolumu = sql.slice(sql.indexOf(" set "), sql.indexOf(" where "));
    expect(setBolumu).not.toContain('"is_active"');
  });
});
