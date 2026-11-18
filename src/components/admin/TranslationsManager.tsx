"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateTranslationReadiness } from "@/lib/translation-gate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PRODUCT_TRANSLATION_LOCALES,
  type ProductTranslationLocale,
} from "@/lib/product-i18n";

/**
 * Ürün çevirileri — TR temel, EN/RU/AR çeviri.
 *
 * TR içerik ürünün kendi alanlarındadır ve burada DÜZENLENMEZ; bu ekran
 * yalnızca çeviri dillerini yönetir (blogdaki manuel çeviri modelinin aynısı).
 *
 * YAYIN AYRI BİR ADIMDIR: kaydetmek çeviriyi yayına sokmaz. Yayınlanmamış
 * çeviri public sayfada HİÇ kullanılmaz ve o dil için hreflang üretilmez.
 */

const LOCALE_LABELS: Record<ProductTranslationLocale, string> = {
  en: "İngilizce (EN)",
  ru: "Rusça (RU)",
  ar: "Arapça (AR)",
};

interface TranslationRow {
  locale: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  published: boolean;
}

type Draft = {
  name: string;
  shortDescription: string;
  longDescription: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
};

const EMPTY: Draft = {
  name: "",
  shortDescription: "",
  longDescription: "",
  metaTitle: "",
  metaDescription: "",
  published: false,
};

export default function TranslationsManager({ productId }: { productId: string }) {
  // `null` = henuz yuklenmedi. Ayri bir `loading` state'i tutmak,
  // effect govdesinde senkron setState gerektirirdi (react-hooks kurali).
  const [rows, setRows] = useState<TranslationRow[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${productId}/translations`);
    const json = await res.json();
    setRows(res.ok ? (json.data ?? []) : []);
  }, [productId]);

  // Ilk yukleme effect icinde, IPTAL BAYRAGI ile yapilir: bilesen sokulduktan
  // sonra gelen yanit state'e yazilmaz (gercek bir yaris kosulu). `load` ise
  // mutasyonlardan sonra elle yeniden yukleme icin kullanilir.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}/translations`);
        const json = await res.json();
        if (!cancelled) setRows(res.ok ? (json.data ?? []) : []);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  if (rows === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        Türkçe içerik <strong>Bilgiler</strong> sekmesindedir ve burada
        düzenlenmez. Kaydetmek çeviriyi <strong>yayına sokmaz</strong>;
        yayınlanmamış çeviriler sitede hiç gösterilmez.
      </div>

      <Tabs defaultValue={PRODUCT_TRANSLATION_LOCALES[0]}>
        <TabsList>
          {PRODUCT_TRANSLATION_LOCALES.map((locale) => {
            const row = rows.find((r) => r.locale === locale);
            return (
              <TabsTrigger key={locale} value={locale}>
                {locale.toUpperCase()}
                {row && (
                  <span
                    className={`ml-1.5 inline-block size-1.5 rounded-full ${
                      row.published ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PRODUCT_TRANSLATION_LOCALES.map((locale) => (
          <TabsContent key={locale} value={locale} className="mt-4">
            <LocaleEditor
              productId={productId}
              locale={locale}
              existing={rows.find((r) => r.locale === locale) ?? null}
              reload={load}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LocaleEditor({
  productId,
  locale,
  existing,
  reload,
}: {
  productId: string;
  locale: ProductTranslationLocale;
  existing: TranslationRow | null;
  reload: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(
    existing
      ? {
          name: existing.name,
          shortDescription: existing.shortDescription ?? "",
          longDescription: existing.longDescription ?? "",
          metaTitle: existing.metaTitle ?? "",
          metaDescription: existing.metaDescription ?? "",
          published: existing.published,
        }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  /*
   * Çeviri yayın kapısı (P11) — saf `evaluateTranslationReadiness()` ile.
   * Ürün yayın kapısından AYRI ve daha hafiftir; eşik kopyası tutulmaz.
   */
  const ceviriKapisi = evaluateTranslationReadiness({
    name: draft.name,
    shortDescription: draft.shortDescription,
    longDescription: draft.longDescription,
  });

  function set(key: keyof Draft, value: string | boolean) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save(published: boolean) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/products/${productId}/translations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, locale, published }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Kaydedilemedi.");
        return;
      }
      set("published", published);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`${LOCALE_LABELS[locale]} çevirisi silinsin mi?`)) return;
    setBusy(true);
    const res = await fetch(
      `/api/admin/products/${productId}/translations/${locale}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (res.ok) {
      setDraft(EMPTY);
      await reload();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{LOCALE_LABELS[locale]}</CardTitle>
        <span
          className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${
            draft.published
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          {draft.published ? "Yayında" : "Yayında değil"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${locale}`}>Ürün adı *</Label>
          <Input
            id={`name-${locale}`}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`short-${locale}`}>Kısa açıklama</Label>
          <Textarea
            id={`short-${locale}`}
            rows={2}
            maxLength={500}
            value={draft.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`long-${locale}`}>Uzun açıklama</Label>
          <Textarea
            id={`long-${locale}`}
            rows={5}
            value={draft.longDescription}
            onChange={(e) => set("longDescription", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`mt-${locale}`}>Meta başlık</Label>
            <Input
              id={`mt-${locale}`}
              maxLength={255}
              value={draft.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`md-${locale}`}>Meta açıklama</Label>
            <Input
              id={`md-${locale}`}
              value={draft.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Boş bırakılan alanlar sitede Türkçe değerine düşer; böylece yarı
          çevrilmiş bir kayıt boş başlık veya açıklama üretmez.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Kaydedildi.</p>}

        {/*
          Yayın ölçütleri — YALNIZCA yayınlama eylemini denetler.
          `products.seo_ready` alanına DOKUNULMAZ: çeviri yayınlamak ürünü
          yayına açmaz, ürün yayında değilse çevirisi de görünmez.
        */}
        {!draft.published && !ceviriKapisi.eligible && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
              Yayın için eksikler
            </p>
            <ul className="space-y-1">
              {ceviriKapisi.reasons.map((r) => (
                <li key={r} className="text-[11px] text-amber-900/90 flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-900/70">
              Taslak olarak kaydedebilirsiniz; taslak çeviriler sitede hiç
              gösterilmez.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || !draft.name.trim()}
            onClick={() => save(false)}
            variant="outline"
          >
            {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            Taslak kaydet
          </Button>
          {draft.published ? (
            <Button
              type="button"
              disabled={busy || !draft.name.trim()}
              onClick={() => save(false)}
              variant="outline"
            >
              <EyeOff className="size-4 mr-1" /> Yayından al
            </Button>
          ) : (
            /* Çeviri yayın kapısı (bulgu P11): yarı çevrilmiş bir kayıt
               yayınlanamaz. Taslak kaydetmek HER ZAMAN serbesttir. */
            <Button
              type="button"
              disabled={busy || !ceviriKapisi.eligible}
              onClick={() => save(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Eye className="size-4 mr-1" /> Kaydet ve yayınla
            </Button>
          )}
          {existing && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={remove}
              className="text-red-600 hover:text-red-700 ml-auto"
            >
              <Trash2 className="size-4 mr-1" /> Sil
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
