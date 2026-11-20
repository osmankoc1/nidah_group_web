import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BULK_ACTIONS,
  BULK_ACTION_CONSEQUENCE,
  BULK_ACTION_LABELS,
  BULK_MAX,
  parseBulkRequest,
  summarizeBulk,
} from "@/lib/bulk-actions";
import {
  AUDIT_ACTIONS,
  IZINLI_ALANLAR,
  sanitizeAuditState,
} from "@/lib/audit-log";
import { STOCK_STATUSES } from "@/lib/product-fields";

/**
 * Faz 4 — P5 (toplu işlemler) + K9 (işlem kaydı) + K10 (operatör onayı).
 *
 * Kilitlenen sözleşme:
 *   · `confirm: true` OLMADAN hiçbir toplu işlem çalışmaz,
 *   · Yayın işleminde kapı KAYIT BAŞINA çalışır ve atlanamaz,
 *   · Toplu SİLME ve toplu FOTOĞRAF DOĞRULAMA yoktur,
 *   · İstek başına en fazla BULK_MAX kayıt,
 *   · İşlem kaydına şifre/token/gizli anahtar YAZILMAZ (beyaz liste),
 *   · İşlem kaydı yazılamazsa işlem DÜŞMEZ.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const UC = oku("src/app/api/admin/products/bulk/route.ts");
const CUBUK = oku("src/components/admin/BulkActionBar.tsx");
const SAYFA = oku("src/app/(admin)/admin/(dashboard)/products/page.tsx");
const GOC = oku("drizzle/0013_admin_bulk_audit.sql");

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

test.describe("K10 — açık operatör onayı", () => {
  test("`confirm` yoksa istek REDDEDİLİR", () => {
    const r = parseBulkRequest({ action: "activate", ids: [ID1] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("açık onay");
  });

  test("`confirm: \"true\"` (metin) onay SAYILMAZ", () => {
    expect(parseBulkRequest({ action: "activate", ids: [ID1], confirm: "true" }).ok).toBe(false);
    expect(parseBulkRequest({ action: "activate", ids: [ID1], confirm: 1 }).ok).toBe(false);
  });

  test("onay varsa ve alanlar geçerliyse kabul edilir", () => {
    const r = parseBulkRequest({ action: "activate", ids: [ID1, ID2], confirm: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.ids).toEqual([ID1, ID2]);
  });

  test("arayüz `confirm: true`yu YALNIZCA onaydan sonra gönderir", () => {
    const kod = yorumsuz(SAYFA);
    // Bayrak yalnızca `topluUygula` içinde geçer; `topluUygula` da onay
    // diyaloğunun "Onayla ve uygula" düğmesine bağlıdır.
    expect(kod.match(/confirm: true/g) ?? []).toHaveLength(1);
    expect(kod).toContain("onClick={topluUygula}");
    expect(kod).toContain("setOnayAcik(true)");
    // Çubuğun "Uygula" düğmesi isteği DEĞİL, diyaloğu açar.
    expect(kod).toContain("onUygula={() => setOnayAcik(true)}");
  });

  test("çubuk hiçbir istek atmaz — kapı atlanamaz", () => {
    const kod = yorumsuz(CUBUK);
    expect(kod).not.toContain("fetch(");
    expect(kod).not.toContain("confirm");
  });
});

test.describe("P5 — eylem beyaz listesi", () => {
  test("tanınmayan eylem reddedilir", () => {
    expect(parseBulkRequest({ action: "delete", ids: [ID1], confirm: true }).ok).toBe(false);
    expect(parseBulkRequest({ action: "verify_images", ids: [ID1], confirm: true }).ok).toBe(false);
    expect(parseBulkRequest({ ids: [ID1], confirm: true }).ok).toBe(false);
  });

  test("TOPLU SİLME ve TOPLU FOTOĞRAF DOĞRULAMA yok", () => {
    expect(BULK_ACTIONS).not.toContain("delete");
    expect(BULK_ACTIONS).not.toContain("verify");
    const kod = yorumsuz(UC);
    expect(kod).not.toContain("db.delete(");
    expect(kod).not.toContain("productImages");
    expect(kod).not.toContain("verified:");
  });

  test("her eylemin Türkçe adı ve SONUÇ cümlesi var", () => {
    for (const a of BULK_ACTIONS) {
      expect(BULK_ACTION_LABELS[a].length).toBeGreaterThan(3);
      expect(BULK_ACTION_CONSEQUENCE[a].length).toBeGreaterThan(20);
    }
  });
});

test.describe("P5 — kimlik ve sayı doğrulaması", () => {
  test("geçersiz kimlik SQL'e gitmez", () => {
    expect(parseBulkRequest({ action: "activate", ids: ["elma"], confirm: true }).ok).toBe(false);
    expect(
      parseBulkRequest({ action: "activate", ids: [ID1, "1 OR 1=1"], confirm: true }).ok
    ).toBe(false);
  });

  test("boş seçim reddedilir", () => {
    expect(parseBulkRequest({ action: "activate", ids: [], confirm: true }).ok).toBe(false);
  });

  test(`en fazla ${BULK_MAX} kayıt`, () => {
    const cok = Array.from({ length: BULK_MAX + 1 }, () => ID1);
    const r = parseBulkRequest({ action: "activate", ids: cok, confirm: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(BULK_MAX));
  });

  test("tekrarlı kimlik bir kez işlenir", () => {
    const r = parseBulkRequest({ action: "activate", ids: [ID1, ID1, ID2], confirm: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.ids).toEqual([ID1, ID2]);
  });

  test("stok durumu yalnızca enum değerlerinden biri", () => {
    expect(
      parseBulkRequest({ action: "stock_status", ids: [ID1], confirm: true }).ok
    ).toBe(false);
    expect(
      parseBulkRequest({
        action: "stock_status", ids: [ID1], confirm: true, stockStatus: "stokta",
      }).ok
    ).toBe(false);
    for (const s of STOCK_STATUSES) {
      const r = parseBulkRequest({
        action: "stock_status", ids: [ID1], confirm: true, stockStatus: s,
      });
      expect(r.ok).toBe(true);
    }
  });

  test("kısmi başarı sayılır", () => {
    const ozet = summarizeBulk([
      { id: ID1, ok: true },
      { id: ID2, ok: false, error: "x" },
    ]);
    expect(ozet).toEqual({ islenen: 2, basarili: 1, reddedilen: 1 });
  });
});

test.describe("P5 — yayın kapısı kayıt BAŞINA çalışır", () => {
  test("uç tek ürün yoluyla AYNI fonksiyonu kullanır", () => {
    expect(UC).toContain("evaluatePublishEligibility");
    const tekUrun = oku("src/app/api/admin/products/[id]/route.ts");
    expect(tekUrun).toContain("evaluatePublishEligibility");
  });

  test("kapı DÖNGÜ içinde, kayıt başına çağrılır", () => {
    const kod = yorumsuz(UC);
    const bas = kod.indexOf('if (action === "publish")');
    expect(bas).toBeGreaterThan(-1);
    const dongu = kod.indexOf("for (const p of islenecek)", bas);
    expect(dongu).toBeGreaterThan(bas);
    const cagri = kod.indexOf("evaluatePublishEligibility", dongu);
    expect(cagri).toBeGreaterThan(dongu);
  });

  test("ölçütleri karşılamayan kayıt REDDEDİLİR ve yazılmaz", () => {
    const kod = yorumsuz(UC);
    const bas = kod.indexOf("if (!readiness.eligible)");
    expect(bas).toBeGreaterThan(-1);
    const dal = kod.slice(bas, kod.indexOf("continue;", bas));
    expect(dal).toContain("ok: false");
    expect(dal).toContain("unmet");
    expect(dal).not.toContain("db.update");
  });

  test("toplu yayın tek UPDATE ile TOPLUCA yazılmaz", () => {
    const kod = yorumsuz(UC);
    // `seoReady: true` yalnızca kayıt bazlı dalda geçer; toplu `inArray`
    // UPDATE'inde geçmemeli.
    const topluDal = kod.slice(kod.indexOf("} else if (islenecek.length > 0)"));
    expect(topluDal).not.toContain("seoReady: true");
  });

  test("yayından alma ölçüt gerektirmez (görünürlüğü azaltır)", () => {
    const kod = yorumsuz(UC);
    expect(kod).toContain('if (action === "unpublish")');
    expect(kod).toContain("set.seoReady = false");
  });
});

test.describe("K9 — işlem kaydında gizli değer YOK", () => {
  test("beyaz liste dışındaki her alan DÜŞÜRÜLÜR", () => {
    const sonuc = sanitizeAuditState({
      isActive: true,
      password: "gizli",
      token: "abc",
      JWT_SECRET: "x",
      apiKey: "y",
      longDescription: "uzun metin",
      cookie: "z",
    });
    expect(sonuc).toEqual({ isActive: true });
  });

  test("iç içe nesne ve dizi değerler düşürülür", () => {
    const sonuc = sanitizeAuditState({
      isActive: { nested: { password: "gizli" } } as unknown as boolean,
      seoReady: true,
    });
    expect(sonuc).toEqual({ seoReady: true });
  });

  test("beyaz liste yalnızca durum alanlarını içerir", () => {
    expect([...IZINLI_ALANLAR].sort()).toEqual(["isActive", "seoReady", "stockStatus"]);
    for (const alan of IZINLI_ALANLAR) {
      expect(alan.toLowerCase()).not.toContain("pass");
      expect(alan.toLowerCase()).not.toContain("token");
      expect(alan.toLowerCase()).not.toContain("secret");
    }
  });

  test("boş sonuç null döner — anlamsız kayıt yazılmaz", () => {
    expect(sanitizeAuditState({ password: "x" })).toBe(null);
    expect(sanitizeAuditState(null)).toBe(null);
    expect(sanitizeAuditState(undefined)).toBe(null);
  });

  test("eylem adları beyaz listeli", () => {
    expect(AUDIT_ACTIONS).toContain("bulk_publish");
    expect(AUDIT_ACTIONS.length).toBe(BULK_ACTIONS.length);
  });

  test("veritabanı kısıtı İKİNCİ savunma olarak var", () => {
    expect(GOC).toContain("ck_admin_audit_no_secrets");
    for (const ad of ["password", "token", "secret", "jwt", "cookie"]) {
      expect(GOC).toContain(`'${ad}'`);
    }
    // Kısıtın gerçekten çalıştığı migration içinde KANITLANIR.
    expect(GOC).toContain("REDDEDILDI");
  });

  test("kayıt yazımı işlemi DÜŞÜRMEZ", () => {
    const kaynak = oku("src/lib/audit-log.ts");
    expect(kaynak).toContain("catch");
    expect(kaynak).toContain("return false");
    const kod = yorumsuz(UC);
    // Dönüş değeri rapora girer ama akışı kesmez.
    expect(kod).toContain("audited: kaydedildi");
    expect(kod).not.toContain("if (!kaydedildi) return");
  });
});

test.describe("P5 — işlem kaydı ürüne bağlı ama FK YOK", () => {
  test("ürün silinse de iz kalır", () => {
    expect(GOC).toContain("YABANCI ANAHTAR YOK");
    expect(GOC).toContain("POST-CHECK yabanci anahtar (beklenen 0");
    // Satır sonu biçimine BAĞLI OLMAMALI: depo CRLF ile de checkout
    // edilebiliyor ve `\n` arayan bir eşleşme sessizce başarısız oluyordu.
    const sema = oku("src/lib/db/schema.ts").replace(/\r\n/g, "\n");
    const bas = sema.indexOf('pgTable(\n  "admin_audit_log"');
    expect(bas).toBeGreaterThan(-1);
    const tablo = sema.slice(bas, sema.indexOf("export type AdminAuditLog"));
    expect(tablo).not.toContain("references(");
  });
});

test.describe("P5 — arayüz güvenliği", () => {
  test("seçim SAYFA bazlı — görünmeyen kayıt seçilmez", () => {
    expect(SAYFA).toContain("function tumunuSec");
    const kod = yorumsuz(SAYFA);
    const bas = kod.indexOf("function tumunuSec");
    const govde = kod.slice(bas, bas + 400);
    expect(govde).toContain("for (const r of rows)");
  });

  test("reddedilenler GEREKÇESİYLE listelenir", () => {
    expect(SAYFA).toContain("reddedilenler");
    expect(SAYFA).toContain("reddedildi");
  });

  test("gerekçe TÜRKÇE gösterilir — ham ölçüt kodu değil", () => {
    // Canlı doğrulamada ekranda "no_verified_image,
    // long_description_too_short" (eski ölçüt adı; bugünkü karşılığı
    // `long_description_missing`) yazıyordu; operatöre ne yapacağını
    // söylemiyordu. Sunucu artık Türkçe gerekçeyi de dönüyor.
    expect(UC).toContain("reasons: readiness.reasons");
    const kod = yorumsuz(SAYFA);
    const bas = kod.indexOf("const reddedilenler");
    const govde = kod.slice(bas, bas + 500);
    expect(govde).toContain("r.reasons?.length");
    // Türkçe gerekçe varken kod listesi KULLANILMAZ.
    expect(govde.indexOf("r.reasons")).toBeLessThan(govde.indexOf("r.unmet"));
  });

  test("fotoğraf föyü sunucuya istek ATMAZ ve veri DEĞİŞTİRMEZ", () => {
    const kod = yorumsuz(SAYFA);
    const bas = kod.indexOf("function foyIndir");
    const son = kod.indexOf("return (", bas);
    const govde = kod.slice(bas, son);
    expect(govde).not.toContain("fetch(");
    expect(govde).toContain("ALT metni (doldurulacak)");
  });

  test("limit aşılırsa Uygula düğmesi pasif", () => {
    expect(CUBUK).toContain("limitAsildi");
    expect(CUBUK).toContain("disabled={busy || action === \"\" || limitAsildi}");
  });
});
