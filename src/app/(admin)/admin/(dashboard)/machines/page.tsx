"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, ChevronDown, ChevronRight, Loader2, Factory, Cpu, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Manufacturer  { id: string; name: string; }
interface Machine       { id: string; model: string; type: string | null; manufacturerId: string; manufacturerName: string | null; yearFrom: number | null; yearTo: number | null; }
interface MachineVariant { id: string; variantName: string; engineModel: string | null; serialFrom: string | null; serialTo: string | null; }

/** VOLVO — G720 — GREYDER */
function machineLabel(mfr: string | null, model: string, type: string | null) {
  return [mfr?.toUpperCase(), model.toUpperCase(), type?.toUpperCase()]
    .filter(Boolean)
    .join(" — ");
}

export default function MachinesPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [machines,      setMachines]      = useState<Machine[]>([]);
  const [variants,      setVariants]      = useState<Record<string, MachineVariant[]>>({});
  const [expanded,      setExpanded]      = useState<Record<string, boolean>>({});
  const [loading,       setLoading]       = useState(true);

  const [newMfr,      setNewMfr]      = useState("");
  const [savingMfr,   setSavingMfr]   = useState(false);

  const [newMachine,       setNewMachine]       = useState({ manufacturerId: "", model: "", type: "", yearFrom: "", yearTo: "" });
  const [savingMachine,    setSavingMachine]    = useState(false);

  const [variantForm, setVariantForm] = useState<Record<string, { name: string; engine: string }>>({});

  async function fetchAll() {
    const [mfrs, mcs] = await Promise.all([
      fetch("/api/admin/manufacturers").then((r) => r.json()),
      fetch("/api/admin/machines").then((r) => r.json()),
    ]);
    setManufacturers(mfrs.data ?? []);
    setMachines(mcs.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function fetchVariants(machineId: string) {
    const res  = await fetch(`/api/admin/machines/${machineId}/variants`);
    const json = await res.json();
    setVariants((prev) => ({ ...prev, [machineId]: json.data ?? [] }));
  }

  function toggleExpand(machineId: string) {
    const next = !expanded[machineId];
    setExpanded((prev) => ({ ...prev, [machineId]: next }));
    if (next && !variants[machineId]) fetchVariants(machineId);
  }

  async function addManufacturer() {
    if (!newMfr.trim()) return;
    setSavingMfr(true);
    try {
      const res = await fetch("/api/admin/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMfr.trim() }),
      });
      if (res.ok) {
        toast.success(`"${newMfr.trim()}" üreticisi eklendi.`);
        setNewMfr("");
        await fetchAll();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Eklenemedi.");
      }
    } finally {
      setSavingMfr(false);
    }
  }

  async function addMachine() {
    if (!newMachine.manufacturerId || !newMachine.model.trim()) return;
    setSavingMachine(true);
    try {
      const res = await fetch("/api/admin/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMachine),
      });
      if (res.ok) {
        toast.success(`"${newMachine.model.trim()}" makinesi eklendi.`);
        setNewMachine({ manufacturerId: "", model: "", type: "", yearFrom: "", yearTo: "" });
        await fetchAll();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Eklenemedi.");
      }
    } finally {
      setSavingMachine(false);
    }
  }

  async function addVariant(machineId: string, mc: Machine) {
    const f = variantForm[machineId];
    if (!f?.name?.trim()) return;
    const res = await fetch(`/api/admin/machines/${machineId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantName: f.name, engineModel: f.engine || null }),
    });
    if (res.ok) {
      toast.success(`Varyant "${f.name}" eklendi.`);
      setVariantForm((prev) => ({ ...prev, [machineId]: { name: "", engine: "" } }));
      await fetchVariants(machineId);
    } else {
      toast.error("Varyant eklenemedi.");
    }
    void mc; // suppress unused var
  }

  // Group machines by manufacturer (memoised)
  const machinesByMfr = useMemo(() => {
    const map: Record<string, Machine[]> = {};
    for (const m of machines) {
      if (!map[m.manufacturerId]) map[m.manufacturerId] = [];
      map[m.manufacturerId].push(m);
    }
    return map;
  }, [machines]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Makineler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Üreticiler, modeller ve varyantları yönetin.
        </p>
      </div>

      {/* Add forms */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Add manufacturer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Factory className="size-4 text-[#F59E0B]" />
              Üretici Ekle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="örn. VOLVO, KOMATSU, CAT"
                value={newMfr}
                onChange={(e) => setNewMfr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManufacturer()}
              />
              <Button
                onClick={addManufacturer}
                disabled={savingMfr || !newMfr.trim()}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white shrink-0"
              >
                {savingMfr ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>
            {manufacturers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {manufacturers.map((m) => (
                  <Badge key={m.id} variant="secondary" className="font-semibold">
                    {m.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add machine */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="size-4 text-[#F59E0B]" />
              Makine Ekle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Üretici *</Label>
                <Select
                  value={newMachine.manufacturerId}
                  onValueChange={(v) => setNewMachine((p) => ({ ...p, manufacturerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seç…" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Model *</Label>
                <Input
                  placeholder="örn. G720"
                  value={newMachine.model}
                  onChange={(e) => setNewMachine((p) => ({ ...p, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tip</Label>
                <Input
                  placeholder="GREYDER"
                  value={newMachine.type}
                  onChange={(e) => setNewMachine((p) => ({ ...p, type: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Yıldan</Label>
                <Input
                  type="number"
                  placeholder="1995"
                  value={newMachine.yearFrom}
                  onChange={(e) => setNewMachine((p) => ({ ...p, yearFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Yıla</Label>
                <Input
                  type="number"
                  placeholder="2010"
                  value={newMachine.yearTo}
                  onChange={(e) => setNewMachine((p) => ({ ...p, yearTo: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={addMachine}
              disabled={savingMachine || !newMachine.manufacturerId || !newMachine.model.trim()}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              {savingMachine ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
              Makine Ekle
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturer list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : manufacturers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Factory className="size-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium">Henüz üretici eklenmedi.</p>
          <p className="text-sm mt-1">Soldaki formdan üretici ekleyerek başlayın.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manufacturers.map((mfr) => {
            const mfMachines = machinesByMfr[mfr.id] ?? [];
            return (
              <Card key={mfr.id} className="overflow-hidden">
                {/* Manufacturer header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#1A1A2E] text-white">
                  <div className="flex items-center gap-2">
                    <Factory className="size-4 text-[#F59E0B]" />
                    <span className="font-bold tracking-wide">{mfr.name.toUpperCase()}</span>
                  </div>
                  <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 text-xs">
                    {mfMachines.length} model
                  </Badge>
                </div>

                {mfMachines.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-muted-foreground">
                    Bu üretici için henüz makine eklenmedi.
                  </div>
                ) : (
                  <CardContent className="p-3 space-y-2">
                    {mfMachines.map((mc) => (
                      <div key={mc.id} className="rounded-lg border bg-white overflow-hidden">
                        {/* Machine row */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                          onClick={() => toggleExpand(mc.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Tag className="size-3.5 text-[#F59E0B] shrink-0" />
                            <div className="min-w-0">
                              {/* MARKA — MODEL — TİP */}
                              <span className="font-semibold text-sm text-[#1A1A2E]">
                                {machineLabel(mfr.name, mc.model, mc.type)}
                              </span>
                              {(mc.yearFrom || mc.yearTo) && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {mc.yearFrom ?? "?"} – {mc.yearTo ?? "günümüz"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {variants[mc.id] !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {variants[mc.id].length} varyant
                              </Badge>
                            )}
                            {expanded[mc.id] ? (
                              <ChevronDown className="size-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="size-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded: variants + add form */}
                        {expanded[mc.id] && (
                          <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                            {(variants[mc.id] ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Bu model için varyant yok.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {(variants[mc.id] ?? []).map((v) => (
                                  <div key={v.id} className="flex items-center gap-2 text-xs bg-white rounded border px-3 py-2">
                                    <span className="font-semibold text-[#1A1A2E]">
                                      {machineLabel(mfr.name, mc.model, mc.type)}
                                    </span>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-[#F59E0B] font-semibold">Varyant: {v.variantName}</span>
                                    {v.engineModel && (
                                      <span className="text-muted-foreground">Motor: {v.engineModel}</span>
                                    )}
                                    {v.serialFrom && (
                                      <span className="text-muted-foreground">SN: {v.serialFrom}–{v.serialTo ?? "?"}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add variant */}
                            <div className="flex gap-2 pt-1">
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Varyant adı (örn. G720B)…"
                                value={variantForm[mc.id]?.name ?? ""}
                                onChange={(e) =>
                                  setVariantForm((p) => ({
                                    ...p,
                                    [mc.id]: { ...(p[mc.id] ?? { name: "", engine: "" }), name: e.target.value },
                                  }))
                                }
                              />
                              <Input
                                className="h-8 text-xs w-28"
                                placeholder="Motor modeli"
                                value={variantForm[mc.id]?.engine ?? ""}
                                onChange={(e) =>
                                  setVariantForm((p) => ({
                                    ...p,
                                    [mc.id]: { ...(p[mc.id] ?? { name: "", engine: "" }), engine: e.target.value },
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-[#F59E0B] hover:bg-[#D97706] text-white"
                                onClick={() => addVariant(mc.id, mc)}
                                disabled={!variantForm[mc.id]?.name?.trim()}
                              >
                                <Plus className="size-3 mr-1" />Ekle
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
