"use client";

import { useCallback, useEffect, useState } from "react";
import { Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VerificationControl from "@/components/admin/VerificationControl";
import type { PartNumberType } from "@/lib/verification";

/**
 * OEM / çapraz referans numarası yönetimi.
 *
 * Denetim E-8: bu tabloya yazan hiçbir arayüz yoktu. Numaralar yalnızca
 * okunuyordu, hiçbir yerden eklenemiyordu.
 *
 * Her numara KENDİ doğrulama durumunu taşır; doğrulanmamış numara public
 * sayfada "OEM Numarası" olarak etiketlenmez ve yapısal veriye yazılmaz.
 */

interface OemRow {
  id: string;
  oemNumber: string;
  type: PartNumberType;
  manufacturer: string | null;
  note: string | null;
  verified: boolean;
  source: string | null;
}

const TYPE_LABELS: Record<PartNumberType, string> = {
  oem: "OEM numarası",
  cross_ref: "Çapraz referans",
  alternate: "Alternatif gösterim",
  supersedes: "Yerine geçtiği numara",
  superseded_by: "Yerine kullanılan numara",
  prefixless: "Prefiksiz biçim (yalnızca arama)",
};

export default function OemNumbersManager({ productId }: { productId: string }) {
  // `null` = henuz yuklenmedi. Ayri bir `loading` state'i tutmak,
  // effect govdesinde senkron setState gerektirirdi (react-hooks kurali).
  const [rows, setRows] = useState<OemRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [draft, setDraft] = useState({
    oemNumber: "",
    type: "oem" as PartNumberType,
    manufacturer: "",
    note: "",
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${productId}/oem-numbers`);
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
        const res = await fetch(`/api/admin/products/${productId}/oem-numbers`);
        const json = await res.json();
        if (!cancelled) setRows(res.ok ? (json.data ?? []) : []);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  async function handleAdd() {
    setError("");
    if (!draft.oemNumber.trim()) {
      setError("Numara zorunlu.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/oem-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `verified` GÖNDERİLMEZ: yeni numara daima teyit bekler durumda eklenir.
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Eklenemedi.");
        return;
      }
      setDraft({ oemNumber: "", type: "oem", manufacturer: "", note: "" });
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(row: OemRow) {
    if (!confirm(`"${row.oemNumber}" numarası silinsin mi?`)) return;
    const res = await fetch(
      `/api/admin/products/${productId}/oem-numbers/${row.id}`,
      { method: "DELETE" }
    );
    if (res.ok) await load();
  }

  async function handleVerify(
    row: OemRow,
    next: { verified: boolean; source: string }
  ): Promise<string | null> {
    const res = await fetch(
      `/api/admin/products/${productId}/oem-numbers/${row.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error ?? "Güncellenemedi.";
    await load();
    return null;
  }

  if (rows === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni Referans Numarası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oemNumber">Numara *</Label>
              <Input
                id="oemNumber"
                placeholder="örn. 11184523"
                value={draft.oemNumber}
                onChange={(e) => setDraft((p) => ({ ...p, oemNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oemType">İlişki türü</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((p) => ({ ...p, type: v as PartNumberType }))}
              >
                <SelectTrigger id="oemType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as PartNumberType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oemMfr">Numaranın üreticisi</Label>
              <Input
                id="oemMfr"
                placeholder="opsiyonel"
                value={draft.manufacturer}
                onChange={(e) => setDraft((p) => ({ ...p, manufacturer: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oemNote">Not</Label>
              <Input
                id="oemNote"
                placeholder="opsiyonel"
                value={draft.note}
                onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Yeni numara <strong>teyit bekliyor</strong> olarak eklenir. Doğrulamak
            için listeden &quot;Doğrula&quot; düğmesini kullanın; kaynak belirtmek zorunludur.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
          >
            {adding ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
            Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Kayıtlı Numaralar ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Bu ürün için kayıtlı referans numarası yok.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className="py-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-sm font-semibold">{row.oemNumber}</span>
                    <span className="text-xs text-gray-500">{TYPE_LABELS[row.type]}</span>
                    {row.manufacturer && (
                      <span className="text-xs text-gray-400">({row.manufacturer})</span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 ml-auto text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(row)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {row.note && <p className="text-xs text-gray-400 italic">{row.note}</p>}
                  <VerificationControl
                    verified={row.verified}
                    source={row.source}
                    applyChange={(next) => handleVerify(row, next)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
