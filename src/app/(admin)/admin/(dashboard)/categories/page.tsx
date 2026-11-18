"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LIMITS,
  CATEGORY_SORT_MAX,
  buildCategoryTree,
  slugifyCategory,
} from "@/lib/category-tree";

/**
 * Kategori yönetimi ekranı — bulgu P6.
 *
 * Panelde kategori ekranı yoktu; `products.category_id` yalnızca içe aktarma
 * yoluyla yazılabiliyordu. Bu ekran ARACI kurar, kategori ağacını KURMAZ:
 * hangi kategorilerin olacağı kullanıcı kararıdır (ertelenen Y1) ve dev
 * veritabanındaki tablo bugün BOŞTUR.
 */

interface Kategori {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
}

const KOK = "__kok__";

export default function CategoriesPage() {
  const [rows, setRows] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ name: "", slug: "", parentId: KOK, sortOrder: "0" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", parentId: KOK, sortOrder: "0" });

  async function yukle() {
    const res = await fetch("/api/admin/categories");
    const json = await res.json().catch(() => ({}));
    setRows(Array.isArray(json.data) ? json.data : []);
    setLoading(false);
  }

  useEffect(() => {
    yukle();
  }, []);

  const agac = useMemo(() => buildCategoryTree(rows), [rows]);

  // Alt kategorisi olan kayıtlar silinemez; sayıyı ekranda göstermek için
  // üst kimliklere göre sayılır.
  const altSayisi = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.parentId) m.set(r.parentId, (m.get(r.parentId) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  async function ekle() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          parentId: form.parentId === KOK ? null : form.parentId,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Kategori eklenemedi.");
        return;
      }
      toast.success(`"${form.name.trim()}" kategorisi eklendi.`);
      setForm({ name: "", slug: "", parentId: KOK, sortOrder: "0" });
      await yukle();
    } finally {
      setBusy(false);
    }
  }

  function duzenlemeyiBaslat(k: Kategori) {
    setEditId(k.id);
    setEditForm({
      name: k.name,
      slug: k.slug,
      parentId: k.parentId ?? KOK,
      sortOrder: String(k.sortOrder),
    });
  }

  async function kaydet(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
          parentId: editForm.parentId === KOK ? null : editForm.parentId,
          sortOrder: Number(editForm.sortOrder) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Kategori güncellenemedi.");
        return;
      }
      toast.success("Kategori güncellendi.");
      setEditId(null);
      await yukle();
    } finally {
      setBusy(false);
    }
  }

  async function sil(k: Kategori) {
    // Silme ONAY ister: `products.category_id` FK'si ON DELETE SET NULL
    // taşıdığı için dolu bir kategorinin silinmesi ürünlerin kategorisini
    // sessizce boşaltırdı. Sunucu da ayrıca reddeder (409).
    if (!window.confirm(`"${k.name}" kategorisi silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${k.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Kategori silinemedi.");
        return;
      }
      toast.success("Kategori silindi.");
      await yukle();
    } finally {
      setBusy(false);
    }
  }

  const slugOnizleme = form.slug.trim()
    ? slugifyCategory(form.slug)
    : slugifyCategory(form.name);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kategoriler</h1>
        <p className="text-sm text-muted-foreground">
          Ürün kategorileri. Kategori ağacı <strong>kendiliğinden oluşmaz</strong>;
          hangi kategorilerin olacağına siz karar verirsiniz.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kat-ad">Ad *</Label>
              <Input
                id="kat-ad"
                maxLength={CATEGORY_LIMITS.name}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kat-slug">Slug (boş bırakılırsa addan üretilir)</Label>
              <Input
                id="kat-slug"
                maxLength={CATEGORY_LIMITS.slug}
                placeholder={slugOnizleme || "ornek-kategori"}
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
              {slugOnizleme && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  /{slugOnizleme}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kat-ust">Üst kategori</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm((p) => ({ ...p, parentId: v }))}
              >
                <SelectTrigger id="kat-ust">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KOK}>Üst kategori yok (kök)</SelectItem>
                  {agac.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {"— ".repeat(k.depth)}
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kat-sira">Sıra</Label>
              <Input
                id="kat-sira"
                type="number"
                min="0"
                max={CATEGORY_SORT_MAX}
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              />
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 bg-[#F59E0B] hover:bg-[#D97706] text-white"
            disabled={busy || !form.name.trim()}
            onClick={ekle}
          >
            {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
            Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Mevcut kategoriler {rows.length > 0 && `(${rows.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Henüz kategori yok.</p>
              <p>
                Kategori ağacı bilinçli olarak boştur. Ürünler kategori olmadan da
                çalışır: kategori <strong>yayın ölçütü değildir</strong> ve eksikliği
                hiçbir ürünün yayınını engellemez.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {agac.map((k) => {
                const satir = rows.find((r) => r.id === k.id)!;
                const alt = altSayisi.get(k.id) ?? 0;
                const silinemez = satir.productCount > 0 || alt > 0;

                if (editId === k.id) {
                  return (
                    <li key={k.id} className="py-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          aria-label="Kategori adı"
                          maxLength={CATEGORY_LIMITS.name}
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                          aria-label="Slug"
                          maxLength={CATEGORY_LIMITS.slug}
                          value={editForm.slug}
                          onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))}
                        />
                        <Select
                          value={editForm.parentId}
                          onValueChange={(v) => setEditForm((p) => ({ ...p, parentId: v }))}
                        >
                          <SelectTrigger aria-label="Üst kategori">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={KOK}>Üst kategori yok (kök)</SelectItem>
                            {agac
                              .filter((o) => o.id !== k.id)
                              .map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {"— ".repeat(o.depth)}
                                  {o.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          aria-label="Sıra"
                          type="number"
                          min="0"
                          max={CATEGORY_SORT_MAX}
                          value={editForm.sortOrder}
                          onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !editForm.name.trim()}
                          onClick={() => kaydet(k.id)}
                        >
                          {busy && <Loader2 className="size-4 animate-spin mr-1" />}
                          Kaydet
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                          <X className="size-4 mr-1" />
                          Vazgeç
                        </Button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={k.id} className="flex items-center gap-3 py-2.5">
                    <div style={{ paddingLeft: k.depth * 16 }} className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {k.name}
                        {k.orphan && (
                          <span className="ml-2 text-[10px] font-semibold text-amber-700">
                            üst kategorisi bulunamadı
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        /{k.slug} · sıra {k.sortOrder} · {satir.productCount} ürün
                        {alt > 0 && ` · ${alt} alt kategori`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Düzenle"
                      onClick={() => duzenlemeyiBaslat(satir)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy || silinemez}
                      title={
                        silinemez
                          ? "Bağlı ürün veya alt kategori var — önce onları taşıyın"
                          : "Sil"
                      }
                      onClick={() => sil(satir)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
