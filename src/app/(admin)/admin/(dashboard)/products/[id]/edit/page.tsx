"use client";

import { useState, useEffect, use } from "react";
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
import FitmentsManager from "@/components/admin/FitmentsManager";

interface Product {
  id: string;
  partNumber: string;
  name: string;
  description: string | null;
  condition: "new" | "used" | "remanufactured";
  weight: number | null;
  notes: string | null;
  isActive: boolean;
  inStock: boolean;
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

  const [form, setForm] = useState({
    partNumber:  "",
    name:        "",
    description: "",
    condition:   "new" as "new" | "used" | "remanufactured",
    weight:      "",
    notes:       "",
    inStock:     true,
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
          inStock:     p.inStock,
          weight:      p.weight != null ? String(p.weight) : "",
          notes:       p.notes ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Bilgiler</TabsTrigger>
          <TabsTrigger value="photos">Fotoğraflar</TabsTrigger>
          <TabsTrigger value="fitments">Uyumluluk</TabsTrigger>
        </TabsList>

        {/* ── Info Tab ── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-1.5">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Stok Durumu</Label>
                    <div className="flex items-center gap-3 h-10">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.inStock}
                        onClick={() => setForm(p => ({ ...p, inStock: !p.inStock }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${form.inStock ? "bg-green-500" : "bg-gray-200"}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
                          ${form.inStock ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                      <span className={`text-sm font-medium ${form.inStock ? "text-green-600" : "text-gray-500"}`}>
                        {form.inStock ? "Stokta" : "Sipariş Üzerine"}
                      </span>
                    </div>
                  </div>
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
          <ImagesManager productId={id} />
        </TabsContent>

        {/* ── Fitments Tab ── */}
        <TabsContent value="fitments" className="mt-4">
          <FitmentsManager productId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
