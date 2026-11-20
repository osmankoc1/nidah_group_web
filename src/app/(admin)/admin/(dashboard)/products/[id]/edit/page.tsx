"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImagesManager from "@/components/admin/ImagesManager";
import ActiveStatusControl from "@/components/admin/ActiveStatusControl";
import SerpPreview, {
  MetaDescriptionCounter,
  MetaTitleCounter,
} from "@/components/admin/SerpPreview";
import {
  IMAGE_STATE_LABEL,
  IMAGE_STATE_NOTE,
  resolveImageState,
} from "@/lib/product-image-state";
import FitmentsManager from "@/components/admin/FitmentsManager";
import OemNumbersManager from "@/components/admin/OemNumbersManager";
import TranslationsManager from "@/components/admin/TranslationsManager";
import {
  FIELD_LIMITS,
  SOURCING_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  type SourcingTypeValue,
  type StockStatusValue,
} from "@/lib/product-fields";
import { evaluateSeoReadiness, ONERILEN_ACIKLAMA_KARAKTERI } from "@/lib/seo-gate";
import { buildCategoryTree } from "@/lib/category-tree";

/**
 * "Kategori yok" seçeneği (bulgu P6). Radix Select boş string değeri kabul
 * etmediği için sentinel kullanılır; sunucuya `null` olarak gider.
 */
const KATEGORI_YOK = "__kategori_yok__";

interface Kategori {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

interface Product {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  condition: "new" | "used" | "remanufactured";
  categoryId: string | null;
  weight: number | null;
  notes: string | null;
  isActive: boolean;
  /** LEGACY — stok otoritesi `stockStatus`'tur. Formda düzenlenmez. */
  inStock: boolean;
  // ── Faz 2 ──
  partManufacturer: string | null;
  sourcingType: SourcingTypeValue;
  stockStatus: StockStatusValue;
  shortDescription: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  seoReady: boolean;
  // ── Faz 3 (drizzle/0010) — İÇ KULLANIM, public yüzeyde gösterilmez ──
  internalStockCode: string | null;
  seoReadyAt: string | null;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  // İKİ SAYI ayrı tutulur: yayın kapısı DOĞRULANMIŞ fotoğrafı sayar (K2),
  // yönetim görünümü ise "hiç fotoğraf yok" ile "var ama doğrulanmadı"
  // ayrımını göstermek için toplamı da bilmek zorundadır.
  const [imageCount, setImageCount] = useState(0);
  const [verifiedImageCount, setVerifiedImageCount] = useState(0);
  const [verifiedFitmentCount, setVerifiedFitmentCount] = useState(0);
  const [seoBusy, setSeoBusy] = useState(false);
  const [activeBusy, setActiveBusy] = useState(false);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);

  const [form, setForm] = useState({
    partNumber:  "",
    name:        "",
    description: "",
    condition:   "new" as "new" | "used" | "remanufactured",
    categoryId:  KATEGORI_YOK,
    weight:      "",
    notes:       "",
    // ── Faz 2 ──
    partManufacturer: "",
    sourcingType:     "unknown" as SourcingTypeValue,
    stockStatus:      "unknown" as StockStatusValue,
    shortDescription: "",
    longDescription:  "",
    metaTitle:        "",
    metaDescription:  "",
    // ── Faz 3 ──
    internalStockCode: "",
  });

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const p = json.data as Product;
        setProduct(p);
        setForm({
          partNumber:  p.partNumber,
          name:        p.name,
          description: p.description ?? "",
          condition:   p.condition,
          categoryId:  p.categoryId ?? KATEGORI_YOK,
          weight:      p.weight != null ? String(p.weight) : "",
          notes:       p.notes ?? "",
          partManufacturer: p.partManufacturer ?? "",
          sourcingType:     p.sourcingType ?? "unknown",
          stockStatus:      p.stockStatus ?? "unknown",
          shortDescription: p.shortDescription ?? "",
          longDescription:  p.longDescription ?? "",
          metaTitle:        p.metaTitle ?? "",
          metaDescription:  p.metaDescription ?? "",
          internalStockCode: p.internalStockCode ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Kategori listesi — seçici için. Liste BOŞ olabilir (dev'de boştur);
  // bu bir hata değil, kategori ağacının henüz kurulmamış olmasıdır.
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => setKategoriler(Array.isArray(json.data) ? json.data : []))
      .catch(() => setKategoriler([]));
  }, []);

  // Yayın ölçütleri için görsel ve DOĞRULANMIŞ uyumluluk sayıları.
  useEffect(() => {
    fetch(`/api/admin/products/${id}/images`)
      .then((r) => r.json())
      .then((json) => {
        const data: Array<{ verified?: boolean }> = Array.isArray(json.data) ? json.data : [];
        setImageCount(data.length);
        setVerifiedImageCount(data.filter((i) => i.verified === true).length);
      })
      .catch(() => { setImageCount(0); setVerifiedImageCount(0); });

    fetch(`/api/admin/products/${id}/fitments`)
      .then((r) => r.json())
      .then((json) =>
        setVerifiedFitmentCount(
          Array.isArray(json.data)
            ? json.data.filter((f: { verified?: boolean }) => f.verified === true).length
            : 0
        )
      )
      .catch(() => setVerifiedFitmentCount(0));
  }, [id]);

  // Seçicide hiyerarşiyi göstermek için derinlik bilgisi eklenir.
  // `useMemo` erken dönüşlerin ÜSTÜNDE durur: hook sırası sabit kalmalı.
  const kategoriAgaci = useMemo(() => buildCategoryTree(kategoriler), [kategoriler]);

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Sentinel sunucuya GİTMEZ: "kategori yok" = null.
          categoryId: form.categoryId === KATEGORI_YOK ? null : form.categoryId,
          weight: form.weight ? Number(form.weight) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Kayıt başarısız.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Sunucu bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * AKTİFLİK — yayın onayından BAĞIMSIZ alan (bulgu P7).
   *
   * Yalnızca `isActive` gönderilir. `seoReady` gövdeye KONMAZ, bu yüzden
   * pasifleştirme mevcut yayın onayını geri almaz. Form kaydı (`handleSubmit`)
   * da `isActive` taşımaz; iki karar birbirine karışmaz.
   */
  async function toggleActive(next: boolean) {
    setActiveBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Aktiflik durumu güncellenemedi.");
        return;
      }
      setProduct((prev) => (prev ? { ...prev, isActive: next } : prev));
    } catch {
      setError("Sunucu bağlantı hatası.");
    } finally {
      setActiveBusy(false);
    }
  }

  /**
   * YAYIN ONAYI — ayrı bir insan kararı.
   *
   * Ürün alanlarıyla birlikte kaydedilmez; bilinçli olarak kendi düğmesi
   * vardır. `true` yapıldığında sayfa indekslenebilir hâle gelir ve ürün
   * sitemap'e girer.
   */
  async function toggleSeoReady(next: boolean) {
    setSeoBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoReady: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 422 = sunucu tarafı yayın kapısı reddetti (K3). Sunucu eksik
        // ölçütleri `reasons` içinde döner; istemcideki liste yalnızca
        // bilgilendirme olduğu için KARARI SUNUCU verir.
        const reasons: string[] = Array.isArray(json.reasons) ? json.reasons : [];
        setError(
          reasons.length > 0
            ? `${json.error ?? "Yayın onayı verilemez."} — ${reasons.join(" ")}`
            : (json.error ?? "Yayın durumu güncellenemedi.")
        );
        return;
      }
      setProduct((prev) =>
        prev ? { ...prev, seoReady: next, seoReadyAt: json.data?.seoReadyAt ?? null } : prev
      );
    } finally {
      setSeoBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Ürün bulunamadı.{" "}
        <Link href="/admin/products" className="underline">
          Geri dön
        </Link>
      </div>
    );
  }

  // Fotoğraf durumu — YÖNETİM görünümü (missing / pending_verification /
  // verified ayrı ayrı görünür; public yüzeyde ilk ikisi aynı temsilî kartı
  // basar). Yayın onayından BAĞIMSIZDIR.
  const imageState = resolveImageState({
    imageCount,
    verifiedImageCount,
    surface: "admin",
  });

  // Yayın ölçütleri — eksik olanlar operatöre tek tek gösterilir.
  const readiness = evaluateSeoReadiness({
    isActive: product.isActive,
    partNumber: form.partNumber,
    name: form.name,
    verifiedImageCount,
    longDescription: form.longDescription,
    verifiedFitmentCount,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ürün Düzenle</h1>
          <p className="text-sm text-muted-foreground font-mono">{product.partNumber}</p>
        </div>
        {/* İKİ AYRI ROZET (bulgu P7): aktiflik public görünürlüğü,
            yayın onayı yalnızca indekslemeyi belirler. Tek rozet
            varken operatör "Yayında değil" yazısını ürünün pasif
            olduğu sanıyordu. */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
              product.isActive
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {product.isActive ? "Aktif" : "Pasif"}
          </span>
          <span
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${
              product.seoReady
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {product.seoReady ? "Yayında (indekslenebilir)" : "Yayında değil (noindex)"}
          </span>
        </div>
      </div>

      <ActiveStatusControl
        isActive={product.isActive}
        seoReady={product.seoReady}
        busy={activeBusy}
        onChange={toggleActive}
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Bilgiler</TabsTrigger>
          <TabsTrigger value="photos">Fotoğraflar</TabsTrigger>
          <TabsTrigger value="fitments">Uyumluluk</TabsTrigger>
          <TabsTrigger value="references">Referanslar</TabsTrigger>
          <TabsTrigger value="translations">Çeviriler</TabsTrigger>
          <TabsTrigger value="publish">Yayın</TabsTrigger>
        </TabsList>

        {/* ── Info Tab ── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="partNumber">Parça Numarası *</Label>
                    <Input
                      id="partNumber"
                      required
                      value={form.partNumber}
                      onChange={(e) => set("partNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="condition">Koşul</Label>
                    <Select
                      value={form.condition}
                      onValueChange={(v) => set("condition", v)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Sıfır</SelectItem>
                        <SelectItem value="used">İkinci El</SelectItem>
                        <SelectItem value="remanufactured">Yenilenmiş</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Ürün Adı *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>

                {/* ── Kategori seçici (bulgu P6) ─────────────────────────
                    Panelde kategori atanamıyordu; `category_id` yalnızca içe
                    aktarma yoluyla yazılabiliyordu. Liste BOŞ olabilir — ağaç
                    henüz kurulmadı (kullanıcı kararı). */}
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Kategori</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => set("categoryId", v)}
                  >
                    <SelectTrigger id="categoryId"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={KATEGORI_YOK}>Kategori yok</SelectItem>
                      {kategoriAgaci.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {"— ".repeat(k.depth)}
                          {k.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {kategoriAgaci.length === 0 ? (
                      <>
                        Henüz kategori tanımlı değil.{" "}
                        <Link href="/admin/categories" className="underline">
                          Kategoriler ekranından
                        </Link>{" "}
                        ekleyebilirsiniz. Kategori <strong>yayın ölçütü
                        değildir</strong>; eksikliği yayını engellemez.
                      </>
                    ) : (
                      <>
                        Kategori <strong>yayın ölçütü değildir</strong>; eksikliği
                        yayını engellemez. Ağaç{" "}
                        <Link href="/admin/categories" className="underline">
                          Kategoriler ekranından
                        </Link>{" "}
                        yönetilir.
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="weight">Ağırlık (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => set("weight", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stockStatus">Stok Durumu</Label>
                    <Select
                      value={form.stockStatus}
                      onValueChange={(v) => set("stockStatus", v)}
                    >
                      <SelectTrigger id="stockStatus"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STOCK_STATUS_LABELS) as StockStatusValue[]).map((s) => (
                          <SelectItem key={s} value={s}>{STOCK_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      &quot;Bilinmiyor&quot; seçili kaldığı sürece sitede stok iddiası
                      yapılmaz ve yapısal veriye yazılmaz.
                    </p>
                  </div>
                </div>

                {/* ── Parça kimliği — MAKİNE MARKASINDAN AYRI ────────────── */}
                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Parça Kimliği
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="internalStockCode">Logo Stok Kodu</Label>
                      <Input
                        id="internalStockCode"
                        maxLength={100}
                        placeholder="Logo İşbaşı'ndaki orijinal kod — örn. 002 236 11 10"
                        value={form.internalStockCode}
                        onChange={(e) => set("internalStockCode", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        <strong>İç kullanım.</strong> Depo eşleşmesi ve bu paneldeki
                        arama içindir. Public ürün sayfasında, SEO verisinde veya
                        OEM / muadil numarası olarak <strong>gösterilmez</strong>.
                        Baştaki sıfırlar, tireler ve boşluklar aynen korunur;
                        normalleştirme yalnızca aramada kullanılır.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="partManufacturer">Parçanın üreticisi</Label>
                      <Input
                        id="partManufacturer"
                        maxLength={FIELD_LIMITS.partManufacturer}
                        placeholder="parçayı ÜRETEN firma"
                        value={form.partManufacturer}
                        onChange={(e) => set("partManufacturer", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Uyumlu makinenin markası <strong>değil</strong>. Makine
                        markaları <em>Uyumluluk</em> sekmesinden yönetilir.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sourcingType">Temin niteliği</Label>
                      <Select
                        value={form.sourcingType}
                        onValueChange={(v) => set("sourcingType", v)}
                      >
                        <SelectTrigger id="sourcingType"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SOURCING_TYPE_LABELS) as SourcingTypeValue[]).map((t) => (
                            <SelectItem key={t} value={t}>{SOURCING_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Marka, yapısal veriye yalnızca üretici girilmiş <strong>ve</strong>
                        {" "}temin niteliği belirlenmişse yazılır.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── SEO içeriği ──────────────────────────────────────────── */}
                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    SEO İçeriği (Türkçe)
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="shortDescription">Kısa açıklama</Label>
                    <Textarea
                      id="shortDescription"
                      rows={2}
                      maxLength={500}
                      value={form.shortDescription}
                      onChange={(e) => set("shortDescription", e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {form.shortDescription.length} / 500 karakter
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longDescription">Uzun açıklama (sayfa gövdesi)</Label>
                    <Textarea
                      id="longDescription"
                      rows={6}
                      value={form.longDescription}
                      onChange={(e) => set("longDescription", e.target.value)}
                    />
                    {/* 2026-11-20: 300 karakter artık YAYIN ŞARTI DEĞİL,
                        önerilen kalite hedefidir. Yayını engelleyen tek
                        içerik şartı açıklamanın BOŞ olmamasıdır — ekran da
                        bu iki durumu ayrı gösterir, yoksa operatör hangisinin
                        engel olduğunu anlayamaz. */}
                    {form.longDescription.trim().length === 0 ? (
                      <p className="text-[11px] text-amber-700">
                        0 karakter — yayın için açıklama <strong>boş olamaz</strong>.
                        Uzunluk sınırı yoktur.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {form.longDescription.trim().length} karakter
                        {form.longDescription.trim().length < ONERILEN_ACIKLAMA_KARAKTERI && (
                          <> — önerilen hedef {ONERILEN_ACIKLAMA_KARAKTERI} karakter
                          (zorunlu değil)</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="metaTitle">Meta başlık</Label>
                      <Input
                        id="metaTitle"
                        maxLength={FIELD_LIMITS.metaTitle}
                        value={form.metaTitle}
                        onChange={(e) => set("metaTitle", e.target.value)}
                      />
                      {/* Sayaç ve kesme eşiği (bulgu P9) — veritabanı sınırı
                          255 ama Google ~60 karakterde kesiyor. */}
                      <MetaTitleCounter
                        value={form.metaTitle}
                        dbSiniri={FIELD_LIMITS.metaTitle}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="metaDescription">Meta açıklama</Label>
                      <Input
                        id="metaDescription"
                        value={form.metaDescription}
                        onChange={(e) => set("metaDescription", e.target.value)}
                      />
                      <MetaDescriptionCounter value={form.metaDescription} />
                    </div>
                  </div>

                  {/* Arama sonucu önizlemesi (bulgu P9). Boş meta alanları
                      için sayfanın KENDİ yedeği gösterilir. */}
                  <SerpPreview
                    metaTitle={form.metaTitle}
                    metaDescription={form.metaDescription}
                    yedekBaslik={`${form.partNumber} — ${form.name}`}
                    yedekAciklama={
                      form.shortDescription.trim() ||
                      form.longDescription.trim().slice(0, 200)
                    }
                    url={`www.nidahgroup.com.tr/parca-katalog/${form.partNumber
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
                )}
                {saved && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Kaydedildi!</div>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                >
                  {saving ? <><Loader2 className="size-4 animate-spin mr-1" />Kaydediliyor…</> : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Photos Tab ── */}
        <TabsContent value="photos" className="mt-4">
          <ImagesManager
            productId={id}
            onStateChange={({ total, verified }) => {
              setImageCount(total);
              setVerifiedImageCount(verified);
            }}
          />
        </TabsContent>

        {/* ── Fitments Tab ── */}
        <TabsContent value="fitments" className="mt-4">
          <FitmentsManager productId={id} />
        </TabsContent>

        {/* ── OEM / çapraz referans ── */}
        <TabsContent value="references" className="mt-4">
          <OemNumbersManager productId={id} />
        </TabsContent>

        {/* ── Çeviriler ── */}
        <TabsContent value="translations" className="mt-4">
          <TranslationsManager productId={id} />
        </TabsContent>

        {/* ── Yayın onayı ── */}
        <TabsContent value="publish" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO Yayın Onayı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Yayın onayı verilmeyen ürünün sayfası <strong>noindex</strong> etiketi
                taşır ve ürün <strong>sitemap&apos;e girmez</strong>. Bu, içeriği hazır
                olmayan sayfaların Google&apos;da ince içerik olarak değerlendirilmesini
                engeller.
              </p>

              <div className="rounded-lg border p-3 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Fotoğraf durumu
                </p>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${
                      imageState === "verified"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : imageState === "pending_verification"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {IMAGE_STATE_LABEL[imageState]}
                  </span>{" "}
                  <span className="text-muted-foreground text-xs">
                    ({verifiedImageCount} doğrulanmış / {imageCount} yüklü)
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {IMAGE_STATE_NOTE[imageState]}
                </p>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Yayın ölçütleri
                </p>
                {readiness.eligible ? (
                  <p className="text-sm text-green-700">
                    Tüm ölçütler karşılanıyor. Yayın kararı yine de size aittir.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {readiness.reasons.map((reason) => (
                      <li key={reason} className="text-sm text-amber-700 flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Ölçütler <strong>sunucu tarafında zorunludur</strong> (karar K3):
                  eksik varsa yayın onayı reddedilir. Ölçütlerin tamamı
                  karşılandığında ürün kendiliğinden yayına GİRMEZ — yayın kararı
                  yine size aittir.
                </p>
              </div>

              {product.seoReadyAt && (
                <p className="text-xs text-muted-foreground">
                  Son yayın onayı:{" "}
                  {new Date(product.seoReadyAt).toLocaleString("tr-TR")}
                </p>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              {product.seoReady ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={seoBusy}
                  onClick={() => toggleSeoReady(false)}
                >
                  {seoBusy && <Loader2 className="size-4 animate-spin mr-1" />}
                  Yayından al (noindex)
                </Button>
              ) : (
                /* Ölçütler karşılanmadan düğme ETKİN DEĞİL (bulgu P3).
                   Sunucu kapısı aynen duruyor ve son sözü o söylüyor; burada
                   yalnızca AYNI karar önden gösteriliyor, böylece operatör
                   başarısız olacağı belli bir eylemi denemiyor. */
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    disabled={seoBusy || !readiness.eligible}
                    onClick={() => toggleSeoReady(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {seoBusy && <Loader2 className="size-4 animate-spin mr-1" />}
                    Yayına hazır olarak işaretle
                  </Button>
                  {!readiness.eligible && (
                    <p className="text-[11px] text-amber-700">
                      Önce yukarıdaki {readiness.unmet.length} eksiği tamamlayın.
                    </p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Not: katalog bölümü admin → Sayfalar toggle&apos;ı ile kapalıyken
                hiçbir ürün sayfası public olarak erişilebilir değildir.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
