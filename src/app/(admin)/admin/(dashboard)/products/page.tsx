"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Pencil, PowerOff, Power, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isTestRecord } from "@/lib/test-records";
import ProductFilterBar from "@/components/admin/ProductFilterBar";
import BulkActionBar from "@/components/admin/BulkActionBar";
import {
  BULK_ACTION_CONSEQUENCE,
  BULK_ACTION_LABELS,
  BULK_MAX,
  type BulkAction,
  type BulkItemResult,
} from "@/lib/bulk-actions";
import { STOCK_STATUS_LABELS, type StockStatusValue } from "@/lib/product-fields";
import {
  VARSAYILAN_FILTRELER,
  filtreleriSorguyaYaz,
  type UrunFiltreleri,
} from "@/lib/product-filters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProductRow {
  id: string;
  partNumber: string;
  name: string;
  condition: string;
  isActive: boolean;
  /** LEGACY — stok otoritesi `stockStatus`. */
  inStock: boolean;
  stockStatus: "unknown" | "in_stock" | "on_order";
  sourcingType: "unknown" | "oem" | "oem_equivalent" | "aftermarket";
  seoReady: boolean;
  partManufacturer: string | null;
  /** Faz 3 — Logo İşbaşı iç stok kodu. Yalnızca bu panelde görünür. */
  internalStockCode: string | null;
  primaryImageUrl: string | null;
  createdAt: string;
}

/** Liste rozetleri — teyitsiz stok "Stokta" olarak gösterilmez. */
const STOCK_BADGE: Record<ProductRow["stockStatus"], { label: string; cls: string }> = {
  unknown:  { label: "Teyit bekliyor", cls: "border-amber-300 text-amber-700" },
  in_stock: { label: "Stokta",         cls: "border-green-300 text-green-700" },
  on_order: { label: "Sipariş üzerine", cls: "border-orange-300 text-orange-600" },
};

interface Meta { page: number; limit: number; total: number; pages: number; }

const CONDITION_LABELS: Record<string, string> = {
  new: "Sıfır",
  used: "İkinci El",
  remanufactured: "Yenilenmiş",
};

// ── Row component (memoised to avoid full-list re-renders on single-row state changes) ──

interface RowProps {
  row: ProductRow;
  toggling: boolean;
  secili: boolean;
  onSelect: (id: string, next: boolean) => void;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (row: ProductRow) => void;
}

const ProductRow = memo(function ProductRow({
  row, toggling, secili, onSelect, onToggle, onDelete,
}: RowProps) {
  return (
    <tr className={`transition-colors ${secili ? "bg-amber-50/60" : "hover:bg-gray-50"}`}>
      {/* Toplu işlem seçimi (bulgu P5) */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="size-4 accent-[#F59E0B]"
          checked={secili}
          onChange={(e) => onSelect(row.id, e.target.checked)}
          aria-label={`${row.partNumber} kaydını seç`}
        />
      </td>
      <td className="px-4 py-3">
        {row.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.primaryImageUrl} alt="" className="size-10 rounded object-cover border" />
        ) : (
          <div className="size-10 rounded border bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
            —
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono font-medium text-sm">
        {row.partNumber}
        {isTestRecord(row.partNumber) && (
          <span
            className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 align-middle font-sans text-[10px] font-semibold text-amber-700"
            title="Sentetik geliştirme kaydı — gerçek ürün değildir, production'a aktarılmaz"
          >
            TEST
          </span>
        )}
        {row.internalStockCode && (
          <span
            className="block font-normal text-[11px] text-muted-foreground"
            title="Logo İşbaşı stok kodu — iç kayıt, public yüzeyde gösterilmez"
          >
            Logo: {row.internalStockCode}
          </span>
        )}
      </td>
      <td className="px-4 py-3 max-w-xs truncate text-sm">{row.name}</td>
      <td className="px-4 py-3">
        <Badge
          variant={row.isActive ? "default" : "secondary"}
          className={row.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
        >
          {row.isActive ? "Aktif" : "Pasif"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={STOCK_BADGE[row.stockStatus].cls}>
          {STOCK_BADGE[row.stockStatus].label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={row.seoReady ? "border-green-300 text-green-700" : "border-gray-300 text-gray-500"}
          title={row.seoReady ? "İndekslenebilir, sitemap'e girer" : "noindex, sitemap'e girmez"}
        >
          {row.seoReady ? "Yayında" : "Yayında değil"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm">
        {CONDITION_LABELS[row.condition] ?? row.condition}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" asChild title="Düzenle">
            <Link href={`/admin/products/${row.id}/edit`}>
              <Pencil className="size-3.5" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggle(row.id, row.isActive)}
            disabled={toggling}
            title={row.isActive ? "Pasife al" : "Aktife al"}
          >
            {toggling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : row.isActive ? (
              <PowerOff className="size-3.5 text-amber-500" />
            ) : (
              <Power className="size-3.5 text-green-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
            onClick={() => onDelete(row)}
            title="Sil"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [rows, setRows]         = useState<ProductRow[]>([]);
  const [meta, setMeta]         = useState<Meta | null>(null);
  /*
   * Filtre durumu (P4 + Y3). Tek kaynak burada; `ProductFilterBar` yalnızca
   * gösterir ve değişikliği yukarı bildirir. Sorgu dizesi
   * `filtreleriSorguyaYaz()` ile üretilir — varsayılandan sapmayan hiçbir
   * alan adrese yazılmaz.
   */
  const [filtre, setFiltre] = useState<UrunFiltreleri>(VARSAYILAN_FILTRELER);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading]   = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // -- Toplu islem durumu (bulgu P5, karar K10) ------------------------------
  // Secim SAYFA bazlidir: "tumunu sec" yalnizca ekranda gorunen kayitlari
  // secer. Filtrelenmis 154 kaydin tamamini tek tusla secmek, operatorun
  // GORMEDIGI kayitlara islem uygulamasina yol acardi.
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [topluAction, setTopluAction] = useState<BulkAction | "">("");
  const [topluStok, setTopluStok] = useState<StockStatusValue>("unknown");
  const [topluBusy, setTopluBusy] = useState(false);
  const [onayAcik, setOnayAcik] = useState(false);
  const [topluSonuc, setTopluSonuc] = useState<{
    action: BulkAction;
    basarili: number;
    reddedilen: number;
    reddedilenler: Array<{ partNumber: string; error: string }>;
  } | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtreleriSorguyaYaz({ ...filtre, search: debouncedSearch || null });
      params.set("page", String(page));
      params.set("limit", "20");
      const res  = await fetch(`/api/admin/products?${params}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setMeta(json.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filtre]);

  // Filtre değişince ilk sayfaya dön — 8. sayfadayken filtre uygulayıp
  // boş sonuç görmek kafa karıştırıcı olurdu.
  function filtreDegistir(yeni: UrunFiltreleri) {
    setFiltre(yeni);
    setPage(1);
  }

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        // Optimistic update — no full refetch needed
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive: !current } : r))
        );
        toast.success(current ? "Ürün pasife alındı." : "Ürün aktife alındı.");
      } else {
        toast.error("İşlem başarısız oldu.");
      }
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setMeta((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
        toast.success(`"${deleteTarget.name}" silindi.`);
        setDeleteTarget(null);
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Silme işlemi başarısız.");
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setDeleting(false);
    }
  }

  function secimDegistir(id: string, next: boolean) {
    setSecili((prev) => {
      const sonraki = new Set(prev);
      if (next) sonraki.add(id);
      else sonraki.delete(id);
      return sonraki;
    });
  }

  const sayfadakiSecili = rows.filter((r) => secili.has(r.id)).length;
  const tumuSecili = rows.length > 0 && sayfadakiSecili === rows.length;

  function tumunuSec(next: boolean) {
    setSecili((prev) => {
      const sonraki = new Set(prev);
      for (const r of rows) {
        if (next) sonraki.add(r.id);
        else sonraki.delete(r.id);
      }
      return sonraki;
    });
  }

  /**
   * Toplu islemi uygular - ACIK ONAY SONRASI (K10).
   *
   * `confirm: true` yalnizca burada, operator onay diyalogunu onayladiktan
   * SONRA gonderilir. Uc bu bayrak olmadan istegi reddeder; yani diyalog
   * atlanarak islem yapilamaz. Yayin onayinda kapi SUNUCUDA kayit basina
   * calisir - buradaki hicbir kod onu atlayamaz.
   */
  async function topluUygula() {
    if (!topluAction) return;
    const ids = Array.from(secili);
    setTopluBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: topluAction,
          ids,
          confirm: true,
          ...(topluAction === "stock_status" ? { stockStatus: topluStok } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Toplu islem basarisiz.");
        return;
      }

      const sonuclar: BulkItemResult[] = json.data?.results ?? [];
      const adMap = new Map(rows.map((r) => [r.id, r.partNumber]));
      const reddedilenler = sonuclar
        .filter((r) => !r.ok)
        .map((r) => ({
          partNumber: adMap.get(r.id) ?? r.id,
          // TÜRKÇE gerekçe varsa o gösterilir. Ham ölçüt kodları
          // (`no_verified_image` gibi) operatöre ne yapacağını söylemez;
          // yalnızca gerekçe gelmediğinde son çare olarak kullanılır.
          error: r.reasons?.length
            ? r.reasons.join(" ")
            : r.unmet?.length
              ? `${r.error ?? "Reddedildi."} (${r.unmet.join(", ")})`
              : (r.error ?? "Reddedildi."),
        }));

      setTopluSonuc({
        action: topluAction,
        basarili: json.data?.summary?.basarili ?? 0,
        reddedilen: json.data?.summary?.reddedilen ?? reddedilenler.length,
        reddedilenler,
      });

      if (json.data?.audited === false) {
        toast.warning("Islem uygulandi ancak islem kaydi yazilamadi.");
      } else {
        toast.success(
          `${BULK_ACTION_LABELS[topluAction]}: ${json.data?.summary?.basarili ?? 0} kayit islendi.`
        );
      }

      setOnayAcik(false);
      setSecili(new Set());
      await fetchProducts();
    } catch {
      toast.error("Sunucu baglanti hatasi.");
    } finally {
      setTopluBusy(false);
    }
  }

  /**
   * Depo turu icin fotograf foyu (CSV).
   *
   * Yalnizca EKRANDAKI secili satirlardan uretilir; sunucuya istek atilmaz
   * ve hicbir veri degismez. ALT metni ve kaynak notu kolonlari BOS gelir:
   * fotografi ceken kisi ikisini sahada doldurur (K1/K2 - dogrulama bu iki
   * kaniti ister).
   */
  function foyIndir() {
    const secilenler = rows.filter((r) => secili.has(r.id));
    if (secilenler.length === 0) return;

    const basliklar = [
      "Parca No", "Logo Stok Kodu", "Ad", "Kosul", "Stok Durumu",
      "Yayin Onayi", "ALT metni (doldurulacak)", "Kaynak notu (doldurulacak)",
    ];
    const alan = (v: string | null) => JSON.stringify(v ?? "");
    const satirlar = secilenler.map((r) =>
      [
        alan(r.partNumber),
        alan(r.internalStockCode),
        alan(r.name),
        alan(CONDITION_LABELS[r.condition] ?? r.condition),
        alan(STOCK_STATUS_LABELS[r.stockStatus]),
        alan(r.seoReady ? "Yayinda" : "Yayinda degil"),
        alan(""),
        alan(""),
      ].join(",")
    );

    // BOM: Excel'in UTF-8'i dogru okumasi icin gerekli.
    const csv = "\uFEFF" + [basliklar.map(alan).join(","), ...satirlar].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fotograf-foyu-${secilenler.length}-urun.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {/* Sayı FİLTRELENMİŞ sonucu gösterir; varsayılanda sentetik
                  kayıtlar gizli olduğu için 154 gerçek ürün okunur. */}
              {meta.total} ürün
            </p>
          )}
        </div>
        <Button asChild className="bg-[#F59E0B] hover:bg-[#D97706] text-white">
          <Link href="/admin/products/new">
            <Plus className="size-4 mr-1" /> Yeni Ürün
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Parça no, Logo stok kodu veya ad ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchProducts} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filtreler ve sıralama — bulgular P4 ve Y3 */}
      <ProductFilterBar
        filtre={filtre}
        onChange={filtreDegistir}
        sonucSayisi={meta?.total ?? null}
      />

      {/* Toplu islem cubugu (bulgu P5) - secim bos iken hic gorunmez */}
      <BulkActionBar
        seciliSayisi={secili.size}
        action={topluAction}
        onActionChange={setTopluAction}
        stockStatus={topluStok}
        onStockStatusChange={setTopluStok}
        onUygula={() => setOnayAcik(true)}
        onTemizle={() => setSecili(new Set())}
        onFoyIndir={foyIndir}
        busy={topluBusy}
      />

      {/* Kismi basari raporu: reddedilen kayitlar GEREKCESIYLE listelenir */}
      {topluSonuc && (
        <div className="rounded-lg border bg-white p-3 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {BULK_ACTION_LABELS[topluSonuc.action]} sonucu
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setTopluSonuc(null)}
            >
              Kapat
            </Button>
          </div>
          <p className="text-sm">
            <span className="text-green-700 font-semibold">{topluSonuc.basarili} islendi</span>
            {" · "}
            <span className={topluSonuc.reddedilen > 0 ? "text-amber-700 font-semibold" : "text-muted-foreground"}>
              {topluSonuc.reddedilen} reddedildi
            </span>
          </p>
          {topluSonuc.reddedilenler.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {topluSonuc.reddedilenler.map((r) => (
                <li key={r.partNumber} className="text-xs text-amber-700">
                  <span className="font-mono font-semibold">{r.partNumber}</span> - {r.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Table */}
      {/*
        `overflow-hidden` yuvarlak köşeleri kırpmak için gerekli, ama tabloyu
        da kırpıyordu: 375px'te sütunların çoğu ERİŞİLEMEZ hâle geliyordu.
        İç sarmal yatay kaydırma sağlar; `min-w` masaüstü yerleşimini korur
        (kapsayıcı lg'de ~1216px olduğu için masaüstünde kaydırma oluşmaz).
      */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">
                {/* Yalnizca BU SAYFADAKI kayitlari secer (bulgu P5) */}
                <input
                  type="checkbox"
                  className="size-4 accent-[#F59E0B]"
                  checked={tumuSecili}
                  onChange={(e) => tumunuSec(e.target.checked)}
                  aria-label="Sayfadaki kayitlarin tumunu sec"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-12" />
              <th className="px-4 py-3 text-left font-medium text-gray-500">Parça No</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Stok</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">SEO</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Koşul</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Yükleniyor…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Search className="size-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">Ürün bulunamadı</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? "Farklı bir arama terimi deneyin." : "Henüz ürün eklenmedi."}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <ProductRow
                  key={row.id}
                  row={row}
                  toggling={toggling === row.id}
                  secili={secili.has(row.id)}
                  onSelect={secimDegistir}
                  onToggle={toggleActive}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Sayfa {meta.page} / {meta.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Önceki
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {/* Toplu islem ONAY diyalogu (karar K10) - `confirm: true` yalnizca
          buradan sonra gonderilir */}
      <Dialog
        open={onayAcik}
        onOpenChange={(open) => { if (!open && !topluBusy) setOnayAcik(false); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[#F59E0B]" />
              Toplu islem onayi
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{secili.size} kayit</span> icin{" "}
              <span className="font-semibold">
                {topluAction ? BULK_ACTION_LABELS[topluAction] : ""}
              </span>
              {topluAction === "stock_status" && (
                <> - <span className="font-semibold">{STOCK_STATUS_LABELS[topluStok]}</span></>
              )}
              {" "}islemi uygulanacak.
            </p>
            <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-xs text-amber-800">
              {topluAction ? BULK_ACTION_CONSEQUENCE[topluAction] : ""}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Islem kaydi tutulur (kim, ne zaman, hangi urun). Tek istekte en
              fazla {BULK_MAX} kayit islenir.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOnayAcik(false)} disabled={topluBusy}>
              Iptal
            </Button>
            <Button
              onClick={topluUygula}
              disabled={topluBusy || !topluAction}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              {topluBusy ? (
                <><Loader2 className="size-4 animate-spin mr-1" />Uygulaniyor...</>
              ) : (
                "Onayla ve uygula"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Ürünü Sil
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span> ürünü{" "}
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{deleteTarget?.partNumber}</span>{" "}
              kalıcı olarak silinecek.
            </p>
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1">
              <p className="font-semibold">Bu işlem geri alınamaz:</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>Tüm ürün görselleri</li>
                <li>Makine uyumluluk kayıtları</li>
                <li>OEM / referans numaraları</li>
                <li>Cloudinary'deki dosyalar</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <><Loader2 className="size-4 animate-spin mr-1" />Siliniyor…</>
              ) : (
                "Evet, Sil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
