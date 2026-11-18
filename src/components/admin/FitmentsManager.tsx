"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Link2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import VerificationControl from "@/components/admin/VerificationControl";
import { FIELD_LIMITS } from "@/lib/product-fields";

interface Manufacturer  { id: string; name: string; }
interface Machine       { id: string; model: string; type: string | null; manufacturerId: string; manufacturerName: string | null; }
interface MachineVariant { id: string; variantName: string; }
interface FitmentRow {
  id: string;
  machineId: string;
  machineVariantId: string | null;
  manufacturerName: string | null;
  machineModel: string | null;
  machineType: string | null;
  variantName: string | null;
  notes: string | null;
  /** Faz 2 — uyumluluk dogrulama durumu (drizzle/0008). */
  verified: boolean;
  source: string | null;
}

/** VOLVO — G720 — GREYDER */
function machineLabel(mfr: string | null, model: string | null, type: string | null) {
  return [mfr?.toUpperCase(), model?.toUpperCase(), type?.toUpperCase()]
    .filter(Boolean)
    .join(" — ");
}

export default function FitmentsManager({ productId }: { productId: string }) {
  const [fitments,      setFitments]      = useState<FitmentRow[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [machines,      setMachines]      = useState<Machine[]>([]);
  const [variants,      setVariants]      = useState<MachineVariant[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  // Satır içi not düzenleme (bulgu P12): yalnızca NOT düzenlenir.
  const [notEditId, setNotEditId] = useState<string | null>(null);
  const [notMetni,  setNotMetni]  = useState("");
  const [notBusy,   setNotBusy]   = useState(false);

  const [mfrId,     setMfrId]     = useState("");
  const [machineId, setMachineId] = useState("");
  const [variantId, setVariantId] = useState("none");
  const [notes,     setNotes]     = useState("");

  async function fetchFitments() {
    const res  = await fetch(`/api/admin/products/${productId}/fitments`);
    const json = await res.json();
    setFitments(json.data ?? []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/manufacturers").then((r) => r.json()),
      fetch("/api/admin/machines").then((r) => r.json()),
      fetchFitments(),
    ]).then(([mfrs, mcs]) => {
      setManufacturers(mfrs.data ?? []);
      setMachines(mcs.data ?? []);
      setLoading(false);
    });
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMachineId("");
    setVariantId("none");
    setVariants([]);
  }, [mfrId]);

  useEffect(() => {
    setVariantId("none");
    if (!machineId) { setVariants([]); return; }
    fetch(`/api/admin/machines/${machineId}/variants`)
      .then((r) => r.json())
      .then((json) => setVariants(json.data ?? []));
  }, [machineId]);

  const filteredMachines = useMemo(
    () => mfrId ? machines.filter((m) => m.manufacturerId === mfrId) : machines,
    [mfrId, machines]
  );

  // Selected machine object (for display in dropdown)
  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === machineId),
    [machineId, machines]
  );

  async function handleAdd() {
    if (!machineId) { setError("Lütfen bir makine seçin."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/fitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId,
          machineVariantId: variantId === "none" ? null : variantId,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.includes("already exists") || json.error?.includes("uq_fitment")
          ? "Bu makine zaten uyumluluk listesinde var."
          : json.error ?? "Eklenemedi.";
        setError(msg);
        return;
      }
      toast.success("Uyumluluk kaydı eklendi.");
      await fetchFitments();
      setMachineId("");
      setVariantId("none");
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(
    fitmentId: string,
    next: { verified: boolean; source: string }
  ): Promise<string | null> {
    const res = await fetch(`/api/admin/products/${productId}/fitments/${fitmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error ?? "Güncellenemedi.";
    await fetchFitments();
    return null;
  }

  /**
   * Notu kaydeder — bulgu P12.
   *
   * Eskiden tek düzenleme yolu KAYDI SİLİP YENİDEN EKLEMEKTİ; bu da
   * doğrulama durumunu ve kaynağını birlikte siliyordu. Burada yalnızca
   * `notes` gönderilir: `verified` ve `source` gövdeye KONMAZ, bu yüzden
   * doğrulama durumu olduğu gibi kalır.
   */
  async function notuKaydet(fitmentId: string) {
    setNotBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${productId}/fitments/${fitmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notMetni.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Not kaydedilemedi.");
        return;
      }
      toast.success("Not güncellendi.");
      setNotEditId(null);
      await fetchFitments();
    } finally {
      setNotBusy(false);
    }
  }

  async function handleDelete(fitmentId: string, label: string) {
    const res = await fetch(`/api/admin/products/${productId}/fitments/${fitmentId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`"${label}" uyumluluğu kaldırıldı.`);
      setFitments((prev) => prev.filter((f) => f.id !== fitmentId));
    } else {
      toast.error("Silinemedi.");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="size-4 text-[#F59E0B]" />
          Uyumluluk Listesi
          <Badge variant="secondary" className="ml-auto">{fitments.length} kayıt</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Add form */}
        <div className="rounded-lg border p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Yeni Uyumluluk Ekle</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Üretici</Label>
              <Select value={mfrId} onValueChange={setMfrId}>
                <SelectTrigger><SelectValue placeholder="Seç…" /></SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Makine</Label>
              <Select value={machineId} onValueChange={setMachineId} disabled={!mfrId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seç…">
                    {selectedMachine
                      ? machineLabel(selectedMachine.manufacturerName, selectedMachine.model, selectedMachine.type)
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredMachines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {machineLabel(m.manufacturerName, m.model, m.type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Varyant (opsiyonel)</Label>
              <Select value={variantId} onValueChange={setVariantId} disabled={!machineId}>
                <SelectTrigger><SelectValue placeholder="Tümü" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tümü (varyant seçme)</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.variantName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Not (opsiyonel)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !machineId}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white shrink-0"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1" />Ekle</>}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
        </div>

        {/* Fitments list */}
        {fitments.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="size-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Henüz uyumluluk kaydı eklenmedi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fitments.map((f) => {
              const label = machineLabel(f.manufacturerName, f.machineModel, f.machineType);
              return (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#1A1A2E]">{label}</span>
                      {f.variantName && (
                        <Badge className="bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/30 text-xs font-semibold">
                          Varyant: {f.variantName}
                        </Badge>
                      )}
                    </div>
                    {/* Not — satır içi düzenlenebilir (bulgu P12). Makine
                        eşleşmesi burada DEĞİŞTİRİLEMEZ: yanlış eşleşme
                        silinip yeniden eklenir, böylece doğrulama geçmişi
                        yanıltıcı olmaz. */}
                    {notEditId === f.id ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Input
                          className="h-8 w-full sm:w-72 text-xs"
                          aria-label="Uyumluluk notu"
                          maxLength={FIELD_LIMITS.fitmentNotes}
                          placeholder="Not (boş bırakılırsa silinir)…"
                          value={notMetni}
                          onChange={(e) => setNotMetni(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={notBusy}
                          onClick={() => notuKaydet(f.id)}
                        >
                          {notBusy && <Loader2 className="size-3.5 animate-spin mr-1" />}
                          Kaydet
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setNotEditId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setNotEditId(f.id);
                          setNotMetni(f.notes ?? "");
                        }}
                      >
                        <Pencil className="size-3 shrink-0" aria-hidden="true" />
                        <span>{f.notes ? f.notes : "Not ekle"}</span>
                      </button>
                    )}
                    {/* Dogrulama — teyitsiz uyumluluk public sayfada kesin
                        bilgi olarak sunulmaz ve yapisal veriye yazilmaz. */}
                    <div className="mt-2">
                      <VerificationControl
                        verified={f.verified}
                        source={f.source}
                        applyChange={(next) => handleVerify(f.id, next)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => handleDelete(f.id, label)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
