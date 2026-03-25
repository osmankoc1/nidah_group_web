"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    partNumber:  "",
    name:        "",
    description: "",
    condition:   "new" as "new" | "used" | "remanufactured",
    weight:      "",
    notes:       "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
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

      router.push(`/admin/products/${json.data.id}/edit`);
    } catch {
      setError("Sunucu bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/products"><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Yeni Ürün</h1>
      </div>

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
                  placeholder="örn. VOE11709035"
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
                placeholder="örn. Hidrolik Pompa"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Ürün hakkında kısa açıklama…"
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
                  placeholder="örn. 12.5"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="İç notlar (müşterilere gösterilmez)…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
              >
                {saving ? <><Loader2 className="size-4 animate-spin mr-1" />Kaydediliyor…</> : "Kaydet & Devam Et"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/products">İptal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
