import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tabsListVariants } from "@/components/ui/tabs";
import { ONERILEN_ACIKLAMA_KARAKTERI, evaluateSeoReadiness } from "@/lib/seo-gate";

/**
 * Faz 1 — yönetim paneli kullanılabilirlik düzeltmeleri.
 *
 *   P1  Dar ekranda sekme şeridi taşıyordu; "Çeviriler" ve "Yayın"
 *       sekmelerine telefondan ulaşılamıyordu.
 *   P3  Yayın düğmesi ölçütler karşılanmadan da tıklanabiliyordu.
 *   P8  Uzun açıklama sayacı "önerilir" diyordu; kural zorunlu.
 *
 * Bu testler DAVRANIŞ SÖZLEŞMESİNİ kilitler: tasarım değişebilir, sözleşme
 * değişemez.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");

const DUZENLEME_SAYFASI =
  "src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx";

// ── P1: sekme şeridi taşmayı kendi içinde yönetir ───────────────────────────

test.describe("P1 — sekme şeridi dar ekranda taşmaz", () => {
  test("temel sınıf yatay kaydırma taşıması içerir", () => {
    const sinif = tabsListVariants();
    expect(sinif).toContain("max-w-full");
    expect(sinif).toContain("overflow-x-auto");
  });

  test("taşan kapta içeriğin BAŞI erişilebilir kalır", () => {
    // `justify-center` taşan bir flex kabında içeriğin başını kaydırılamaz
    // hâle getirir — bilinen flexbox davranışı. Bu yüzden `justify-start`.
    const sinif = tabsListVariants();
    expect(sinif).toContain("justify-start");
    expect(sinif).not.toContain("justify-center");
  });

  test("kaydırma sayfaya taşmaz", () => {
    expect(tabsListVariants()).toContain("overscroll-x-contain");
  });

  test("her iki varyant da taşma yönetimini miras alır", () => {
    // Varyant yalnızca zemini değiştirir; taşma kuralı TEMEL sınıftadır,
    // böylece yeni bir varyant eklendiğinde sözleşme kendiliğinden geçerlidir.
    for (const variant of ["default", "line"] as const) {
      const sinif = tabsListVariants({ variant });
      expect(sinif, `${variant} varyantı taşmayı yönetmeli`).toContain(
        "overflow-x-auto"
      );
      expect(sinif).toContain("max-w-full");
    }
  });

  test("masaüstü görünümü korunur — genişlik hâlâ içerik kadar", () => {
    // `w-fit` kaldırılırsa şerit tüm genişliği kaplar ve masaüstü tasarımı
    // bozulur. İçerik sığarken `max-w-full` hiçbir şeyi değiştirmez.
    expect(tabsListVariants()).toContain("w-fit");
  });
});

// ── P3: yayın düğmesi ölçüte bağlı ──────────────────────────────────────────

test.describe("P3 — yayın düğmesi ölçütler karşılanmadan etkin değil", () => {
  const kaynak = oku(DUZENLEME_SAYFASI);

  test("düğme `readiness.eligible` ile pasifleşir", () => {
    expect(kaynak).toContain("disabled={seoBusy || !readiness.eligible}");
  });

  test("eksik sayısı operatöre gösterilir", () => {
    expect(kaynak).toContain("readiness.unmet.length");
  });

  test("SUNUCU KAPISI DEĞİŞMEDİ — istemci yalnızca önden gösterir", () => {
    // Kritik regresyon koruması: istemci düğmesi pasifleşti diye sunucu
    // kontrolü gevşetilmiş OLMAMALI.
    const rota = oku("src/app/api/admin/products/[id]/route.ts");
    expect(rota).toContain("evaluatePublishEligibility");
    expect(rota).toContain("status: 422");
    expect(rota).toContain("readiness.eligible");
  });

  test("kapı kararı ile düğme kararı AYNI kaynaktan gelir", () => {
    // İkisi de `evaluateSeoReadiness` sonucuna dayanır; ayrı bir eşik
    // kopyası oluşursa arayüz ile sunucu ayrışır.
    expect(kaynak).toContain("evaluateSeoReadiness");

    const uygun = evaluateSeoReadiness({
      isActive: true,
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      longDescription: "x".repeat(ONERILEN_ACIKLAMA_KARAKTERI),
      verifiedImageCount: 1,
      verifiedFitmentCount: 1,
    });
    expect(uygun.eligible).toBe(true);

    // 2026-11-26: fotografsizlik artik uygunsuzluk DEGIL. Uygunsuzluk
    // ornegi bu yuzden BOS ACIKLAMA ile kuruldu.
    const uygunsuz = evaluateSeoReadiness({
      isActive: true,
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      longDescription: "",
      verifiedImageCount: 0,
      verifiedFitmentCount: 1,
    });
    expect(uygunsuz.eligible).toBe(false);
    expect(uygunsuz.unmet).toContain("long_description_missing");

    // Fotografsiz ama tam kayit: UYGUN + gorsel bekliyor.
    const fotografsiz = evaluateSeoReadiness({
      isActive: true,
      partNumber: "CH 76281",
      name: "Hidrolik Ana Pompa",
      longDescription: "x".repeat(ONERILEN_ACIKLAMA_KARAKTERI),
      verifiedImageCount: 0,
      verifiedFitmentCount: 1,
    });
    expect(fotografsiz.eligible).toBe(true);
    expect(fotografsiz.gorselBekliyor).toBe(true);
  });
});

// ── P8: eşik metni sabitten gelir ve TAVSİYE olarak sunulur ────────────────
//
// 2026-11-20: 300 karakter yayın şartı olmaktan ÇIKARILDI. P8'in asıl
// bulgusu "ekranlar çelişmesin" idi; o kural duruyor — ama artık iki ekran
// da ZORUNLU değil TAVSİYE dili kullanmalı. Yayını engelleyen tek içerik
// şartı açıklamanın boş olmamasıdır.

test.describe("P8 — uzun açıklama hedefi TAVSİYE olarak sunulur", () => {
  const kaynak = oku(DUZENLEME_SAYFASI);
  /** Yorumlar çıkarılmış kod — "önerilir" sözcüğü açıklama blokunda geçebilir. */
  const kod = kaynak
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  test("metin ZORUNLU demiyor, ÖNERİLEN hedef diyor", () => {
    expect(kod).toContain("önerilen hedef");
    expect(kod).toContain("zorunlu değil");
    // Eski "en az N karakter zorunlu" dili kalmamalı.
    expect(kod).not.toContain("karakter <strong>zorunlu</strong>");
  });

  test("BOŞ açıklama ayrı ve net uyarı alır", () => {
    // Boş olmak hâlâ yayın engeli; ekran bunu uzunluk uyarısından
    // AYIRMALI, yoksa operatör hangisinin engel olduğunu anlayamaz.
    expect(kod).toContain("boş olamaz");
    expect(kod).toContain("text-amber-700");
  });

  test("eşik sabitten okunur, elle yazılmaz", () => {
    expect(kod).toContain("ONERILEN_ACIKLAMA_KARAKTERI");
    // Eşik sayısı metne GÖMÜLMEMELİ.
    expect(kod).not.toContain("en az 300");
    expect(kod).not.toContain("hedef 300");
  });

  test("eşiğin altında uyarı rengi kullanılır", () => {
    expect(kaynak).toContain("text-amber-700");
  });

  test("Yayın sekmesi ile aynı dili kullanır", () => {
    // İki ekran da aynı şeyi söylemeli: uzunluk zorunlu DEĞİL, boş olmak
    // engel. Kapının gerekçe metni de bunu yazıyor.
    const gate = oku("src/lib/seo-gate.ts");
    expect(gate).toContain("Uzunluk sınırı yoktur");
    expect(gate).toContain("yalnızca önerilen hedeftir");
    expect(kaynak).toContain("boş olamaz");
  });
});
