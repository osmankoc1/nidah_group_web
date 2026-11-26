import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateSeoReadiness, shouldRevokeSeoReady } from "@/lib/seo-gate";

/**
 * Faz 4 — P7 (aktiflik anahtarı ve AYRI durum rozeti).
 *
 * Kilitlenen sözleşme:
 *   · Aktiflik ile yayın onayı AYRI iki alandır ve arayüzde ayrı gösterilir,
 *   · Pasifleştirme yayın onayını GERİ ALMAZ,
 *   · `seo_ready` otomatik geri alma YALNIZCA doğrulanmış fotoğraf kaybında,
 *   · Pasif ürüne YENİ yayın onayı verilemez (kapı aktiflik şartı taşır).
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const KONTROL = oku("src/components/admin/ActiveStatusControl.tsx");
const SAYFA = oku("src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx");

test.describe("P7 — iki kavram arayüzde ayrı", () => {
  test("düzenleme ekranı AKTİF/PASİF rozetini de basar", () => {
    expect(SAYFA).toContain("product.isActive ?");
    expect(SAYFA).toContain('"Aktif" : "Pasif"');
    // Yayın rozeti aynen duruyor — yeni rozet onun YERİNE geçmedi.
    expect(SAYFA).toContain("Yayında (indekslenebilir)");
  });

  test("anahtar düzenleme ekranına bağlandı", () => {
    expect(SAYFA).toContain("<ActiveStatusControl");
    expect(SAYFA).toContain("onChange={toggleActive}");
  });

  test("farkı tek cümleyle açıklar", () => {
    expect(KONTROL).toContain("Pasif ürün hiçbir public yüzeyde görünmez");
    expect(KONTROL).toContain("arama motoru indekslemesini belirler");
  });

  test("anahtar erişilebilir — role=switch + aria-checked", () => {
    expect(KONTROL).toContain('role="switch"');
    expect(KONTROL).toContain("aria-checked={isActive}");
    expect(KONTROL).toContain("aria-label");
  });
});

test.describe("P7 — pasifleştirme yayın onayına DOKUNMAZ", () => {
  test("bileşen `seo_ready` değerini YALNIZCA okur, yazmaz", () => {
    const kod = yorumsuz(KONTROL);
    // `seoReady` prop olarak gelir (tip bildiriminde geçer) ama hiçbir
    // yazma yolu yoktur: ne istek, ne gövde, ne durum değişimi.
    expect(kod).toContain("seoReady: boolean");
    expect(kod).not.toContain("fetch(");
    expect(kod).not.toContain("JSON.stringify");
    expect(kod).not.toContain("useState");
  });

  test("`toggleActive` gövdesinde YALNIZCA isActive gönderilir", () => {
    const kod = yorumsuz(SAYFA);
    const bas = kod.indexOf("async function toggleActive");
    expect(bas).toBeGreaterThan(-1);
    const son = kod.indexOf("async function toggleSeoReady");
    expect(son).toBeGreaterThan(bas);
    const govde = kod.slice(bas, son);
    expect(govde).toContain("JSON.stringify({ isActive: next })");
    expect(govde).not.toContain("seoReady");
  });

  test("form kaydı aktifliği taşımaz — iki karar karışmaz", () => {
    const kod = yorumsuz(SAYFA);
    const bas = kod.indexOf("async function handleSubmit");
    const son = kod.indexOf("async function toggleActive");
    const govde = kod.slice(bas, son);
    expect(govde).not.toContain("isActive");
    // `form` nesnesinde de aktiflik alanı YOK.
    const formBas = kod.indexOf("const [form, setForm] = useState({");
    const formSon = kod.indexOf("});", formBas);
    expect(kod.slice(formBas, formSon)).not.toContain("isActive");
  });

  test("otomatik geri alma ARTIK fotoğraf kaybında da olmuyor — aktiflik yine etkisiz", () => {
    // 2026-11-26: fotoğraf yayın şartı olmaktan çıktı (GORSEL_YAYIN_SARTI),
    // bu yüzden fotoğraf kaybı da onayı geri almıyor. P7'nin asıl bulgusu
    // "aktiflik değişimi yayın onayına DOKUNMAZ" idi ve o kural duruyor:
    // `shouldRevokeSeoReady` girdisinde aktiflik HİÇ yok.
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 1 })).toBe(false);
    expect(shouldRevokeSeoReady({ seoReady: true, verifiedImageCount: 0 })).toBe(false);
    // Yayında olmayan üründe her koşulda işlem yok.
    expect(shouldRevokeSeoReady({ seoReady: false, verifiedImageCount: 0 })).toBe(false);
  });

  test("sunucu tarafı geri alma koşulu yalnızca doğrulanmış fotoğrafa bakar", () => {
    const kod = yorumsuz(oku("src/lib/seo-gate-server.ts"));
    const bas = kod.indexOf("export function revokeSeoReadyStatement");
    expect(bas).toBeGreaterThan(-1);
    const govde = kod.slice(bas);
    expect(govde).toContain("productImages.verified");
    expect(govde).not.toContain("products.isActive");
  });
});

test.describe("P7 — pasif ürüne YENİ yayın onayı verilemez", () => {
  const dolu = {
    partNumber: "232-06-52410",
    name: "Kontrol valfi",
    verifiedImageCount: 1,
    longDescription: "x".repeat(400),
    verifiedFitmentCount: 1,
  };

  test("aktifken uygun, pasifken `inactive` eksiği çıkar", () => {
    expect(evaluateSeoReadiness({ ...dolu, isActive: true }).eligible).toBe(true);
    const pasif = evaluateSeoReadiness({ ...dolu, isActive: false });
    expect(pasif.eligible).toBe(false);
    expect(pasif.unmet).toContain("inactive");
  });

  test("operatöre pasif + onaylı çelişkisi gösterilir", () => {
    expect(KONTROL).toContain("yayın onayı duruyor");
    expect(KONTROL).toContain("Pasifleştirme yayın onayını geri almaz");
  });
});
