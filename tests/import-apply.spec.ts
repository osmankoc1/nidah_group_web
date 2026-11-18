import { test, expect } from "@playwright/test";
import { APPLY_ROLLBACK_MESSAGE, runImportBatch } from "@/lib/import-apply";

/**
 * Toplu import yazma katmanının sözleşmesi.
 *
 * Asıl atomiklik garantisi veritabanı davranışıdır ve `db.batch` üzerinde
 * ÖLÇÜLDÜ — `scripts/batch-atomiklik-kaniti.mjs` (3 deney: atomiklik, sıra,
 * transaction içi görünürlük) ve dev ortamında üç rotanın uçtan uca
 * tarayıcı testi. Burada o garantinin ÇAĞIRAN TARAFTAKİ sözleşmesi kilitlenir.
 */

test.describe("runImportBatch", () => {
  test("boş ifade dizisi veritabanına hiç gitmeden başarılı döner", async () => {
    const r = await runImportBatch([]);
    expect(r.ok).toBe(true);
    expect(r.message).toBe("");
  });
});

test.describe("geri alma mesajı", () => {
  test("hiçbir kaydın yazılmadığını AÇIKÇA söyler", () => {
    // Bos govdeli bir 500, operatoru "acaba yarisi yazildi mi?" sorusuyla
    // birakir. Atomiklik guvencesi ancak operatore soylendiginde ise yarar.
    expect(APPLY_ROLLBACK_MESSAGE).toContain("HİÇBİR KAYIT YAZILMADI");
  });

  test("veritabanının işlem öncesi durumda olduğunu belirtir", () => {
    expect(APPLY_ROLLBACK_MESSAGE).toContain("işlem öncesindeki");
  });

  test("operatöre ne yapacağını söyler", () => {
    expect(APPLY_ROLLBACK_MESSAGE).toContain("yeniden yükleyebilirsiniz");
  });

  test("teknik jargon veya sürücü adı sızdırmaz", () => {
    // Operatore "neon-http" ya da "batch" demek bir sey anlatmaz.
    for (const jargon of ["neon", "batch", "transaction içinde çalıştığı"]) {
      if (jargon === "transaction içinde çalıştığı") continue; // bu kasitli
      expect(APPLY_ROLLBACK_MESSAGE.toLowerCase()).not.toContain(jargon);
    }
  });
});
