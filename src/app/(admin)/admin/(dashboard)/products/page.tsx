"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Pencil, PowerOff, Power, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  inStock: boolean;
  primaryImageUrl: string | null;
  createdAt: string;
}

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
  onToggle: (id: string, current: boolean) => void;
  onDelete: (row: ProductRow) => void;
}

const ProductRow = memo(function ProductRow({ row, toggling, onToggle, onDelete }: RowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
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
      <td className="px-4 py-3 font-mono font-medium text-sm">{row.partNumber}</td>
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
        <Badge variant="outline" className={row.inStock ? "border-green-300 text-green-700" : "border-orange-300 text-orange-600"}>
          {row.inStock ? "Stokta" : "Sipariş"}
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
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading]   = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting]         = useState(false);

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
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res  = await fetch(`/api/admin/products?${params}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setMeta(json.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Toplam {meta.total} ürün
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
            placeholder="Parça no veya ad ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchProducts} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-12" />
              <th className="px-4 py-3 text-left font-medium text-gray-500">Parça No</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Stok</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Koşul</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Yükleniyor…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
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
                  onToggle={toggleActive}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </tbody>
        </table>
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
