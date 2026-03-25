"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Link2 } from "lucide-react";
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
                    {f.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{f.notes}</p>
                    )}
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
