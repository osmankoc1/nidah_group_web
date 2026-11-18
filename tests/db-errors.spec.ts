import { test, expect } from "@playwright/test";
import {
  PG_UNIQUE_VIOLATION,
  findDbError,
  isUndefinedColumn,
  isUniqueViolation,
} from "@/lib/db/errors";

/**
 * Faz 2b doğrulamasında ÖLÇÜLEN gerçek hata: aynı OEM numarasının farklı
 * yazımı eklenmeye çalışıldığında API 409 yerine **500** dönüyordu.
 *
 * Kök neden: Drizzle sürücü hatasını kendi `Error`'una sarar. Dış hatanın
 * mesajı `Failed query: insert into ...` olur; constraint adı ve PostgreSQL
 * kodu yalnızca `error.cause` zincirindeki sürücü nesnesindedir. Bu yüzden
 * `err.message.includes("uq_...")` kontrolleri HİÇ eşleşmiyordu.
 *
 * Aşağıdaki sahte hata nesnesi, gözlenen gerçek yapının birebir kopyasıdır.
 */

/** Drizzle'ın sardığı, gerçek ölçümden alınmış hata yapısı. */
function drizzleWrappedUniqueError(constraint: string) {
  const driverError = Object.assign(
    new Error(`duplicate key value violates unique constraint "${constraint}"`),
    {
      severity: "ERROR",
      code: PG_UNIQUE_VIOLATION,
      detail: `Key (product_id, number_normalized, type)=(abc, TESTOEM1, oem) already exists.`,
      schema: "public",
      table: "oem_numbers",
      constraint,
    }
  );
  return Object.assign(
    new Error('Failed query: insert into "oem_numbers" (...) values (...)'),
    { cause: driverError }
  );
}

test.describe("findDbError — cause zincirini gezer", () => {
  test("sarılmış sürücü hatasını bulur", () => {
    const info = findDbError(drizzleWrappedUniqueError("uq_oem_product_number_type"));
    expect(info).not.toBeNull();
    expect(info!.code).toBe(PG_UNIQUE_VIOLATION);
    expect(info!.constraint).toBe("uq_oem_product_number_type");
    expect(info!.table).toBe("oem_numbers");
  });

  test("iç içe birden fazla sarmalamayı çözer", () => {
    const deep = Object.assign(new Error("katman 1"), {
      cause: Object.assign(new Error("katman 2"), {
        cause: drizzleWrappedUniqueError("uq_products_pn_norm"),
      }),
    });
    expect(findDbError(deep)?.constraint).toBe("uq_products_pn_norm");
  });

  test("kod taşımayan hatalarda null döner", () => {
    expect(findDbError(new Error("sıradan hata"))).toBeNull();
    expect(findDbError(null)).toBeNull();
    expect(findDbError(undefined)).toBeNull();
    expect(findDbError("metin")).toBeNull();
    expect(findDbError({ cause: { cause: {} } })).toBeNull();
  });

  test("döngüsel cause zinciri sonsuz döngüye girmez", () => {
    const a: Record<string, unknown> = { message: "a" };
    const b: Record<string, unknown> = { message: "b", cause: a };
    a.cause = b;
    expect(findDbError(a)).toBeNull();
  });

  test("beş karakterlik olmayan kodlar yok sayılır", () => {
    expect(findDbError({ code: "ENOTFOUND" })).toBeNull();
    expect(findDbError({ code: 23505 })).toBeNull();
  });
});

test.describe("isUniqueViolation", () => {
  test("ESKİ KONTROLÜN KAÇIRDIĞI DURUM artık yakalanıyor", () => {
    const err = drizzleWrappedUniqueError("uq_oem_product_number_type");
    // Eski yol: dis hatanin mesajinda constraint adi YOK.
    expect((err as Error).message.includes("uq_oem_product_number_type")).toBe(false);
    // Yeni yol: yakalaniyor.
    expect(isUniqueViolation(err, ["uq_oem_product_number_type"])).toBe(true);
  });

  test("constraint listesi verilmezse her unique ihlali sayılır", () => {
    expect(isUniqueViolation(drizzleWrappedUniqueError("baska_constraint"))).toBe(true);
  });

  test("İLGİSİZ constraint eşleşmez", () => {
    const err = drizzleWrappedUniqueError("uq_blog_post_tag");
    expect(isUniqueViolation(err, ["uq_products_pn_norm"])).toBe(false);
  });

  test("dev ve production farklı constraint adlarının ikisi de kabul edilir", () => {
    const names = ["uq_products_part_number", "products_part_number_unique"];
    for (const name of names) {
      expect(isUniqueViolation(drizzleWrappedUniqueError(name), names), name).toBe(true);
    }
  });

  test("constraint adı yoksa ayrıntı metninden eşleşir", () => {
    const err = Object.assign(new Error("Failed query"), {
      cause: {
        code: PG_UNIQUE_VIOLATION,
        detail: 'duplicate key ... constraint "uq_products_pn_norm" ...',
      },
    });
    expect(isUniqueViolation(err, ["uq_products_pn_norm"])).toBe(true);
  });

  test("unique olmayan hata kodları false döner", () => {
    const fk = Object.assign(new Error("Failed query"), {
      cause: { code: "23503", constraint: "fitments_product_id_fkey" },
    });
    expect(isUniqueViolation(fk)).toBe(false);
  });
});

test.describe("isUndefinedColumn — şema drift'i", () => {
  test("eksik kolon hatası tanınır", () => {
    // Faz 2b'de yerel dev veritabaninda gorulen gercek hata:
    // "column products.seo_ready does not exist"
    const err = Object.assign(new Error("Failed query: select ... seo_ready ..."), {
      cause: { code: "42703", message: "column products.seo_ready does not exist" },
    });
    expect(isUndefinedColumn(err)).toBe(true);
  });

  test("diğer hatalar false döner", () => {
    expect(isUndefinedColumn(drizzleWrappedUniqueError("x"))).toBe(false);
    expect(isUndefinedColumn(new Error("yok"))).toBe(false);
  });
});
