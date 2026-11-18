import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIELD_LIMITS } from "@/lib/product-fields";

/**
 * Faz 4 — P12 (uyumluluk kaydının satır içi düzenlenmesi).
 *
 * Kilitlenen sözleşme:
 *   · NOT satır içi düzenlenir; eskiden tek yol kaydı SİLİP yeniden eklemekti
 *     ve bu doğrulama durumunu da siliyordu,
 *   · MAKİNE EŞLEŞMESİ satır içinde değiştirilemez (bilinçli karar),
 *   · Not düzenlemek `verified` / `source` alanlarına DOKUNMAZ,
 *   · Sınır arayüzde ve sunucuda AYNI sabitten okunur.
 */

const KOK = process.cwd();
const oku = (yol: string) => readFileSync(join(KOK, yol), "utf-8");
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const UI = oku("src/components/admin/FitmentsManager.tsx");
const UC = oku("src/app/api/admin/products/[id]/fitments/[fitmentId]/route.ts");

test.describe("P12 — satır içi not düzenleme", () => {
  test("düzenleme durumu ve kaydetme işlevi var", () => {
    expect(UI).toContain("notEditId");
    expect(UI).toContain("async function notuKaydet");
    expect(UI).toContain("Not ekle");
  });

  test("istek gövdesinde YALNIZCA notes gönderilir", () => {
    const kod = yorumsuz(UI);
    const bas = kod.indexOf("async function notuKaydet");
    const son = kod.indexOf("async function handleDelete");
    expect(bas).toBeGreaterThan(-1);
    expect(son).toBeGreaterThan(bas);
    const govde = kod.slice(bas, son);
    expect(govde).toContain("JSON.stringify({ notes: notMetni.trim() })");
    expect(govde).not.toContain("verified");
    expect(govde).not.toContain("source");
    expect(govde).not.toContain("machineId");
  });

  test("not alanı erişilebilir etiketi taşır", () => {
    expect(UI).toContain('aria-label="Uyumluluk notu"');
  });

  test("sınır SABİTTEN okunur, elle yazılmaz", () => {
    expect(UI).toContain("maxLength={FIELD_LIMITS.fitmentNotes}");
    expect(UI).not.toContain("maxLength={500}");
    expect(FIELD_LIMITS.fitmentNotes).toBe(500);
  });
});

test.describe("P12 — sunucu sözleşmesi", () => {
  test("uç sınırı aynı sabitten uygular", () => {
    expect(UC).toContain("FIELD_LIMITS.fitmentNotes");
    expect(UC).toContain("status: 400");
    // Değer kırpılmaz — sessiz veri kaybı olmaz.
    expect(UC).toContain("kirpilmaz");
  });

  test("makine eşleşmesi uçta da değiştirilemez", () => {
    const kod = yorumsuz(UC);
    const bas = kod.indexOf("export async function PATCH");
    const govde = kod.slice(bas);
    expect(govde).not.toContain("updates.machineId");
    expect(govde).not.toContain("updates.machineVariantId");
  });

  test("yalnızca notes gönderildiğinde doğrulama alanları YAZILMAZ", () => {
    const kod = yorumsuz(UC);
    // `verified` / `source` yazımları yalnızca ilgili `in body` dallarında.
    const notDali = kod.slice(kod.indexOf('if ("notes" in body)'));
    expect(notDali).not.toContain("updates.verified");
    expect(notDali).not.toContain("updates.source");
  });
});
