"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, RefreshCw, Pencil, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type RfqStatus = "pending" | "contacted" | "quoted" | "closed";
type RfqPriority = "low" | "normal" | "high" | "urgent";

interface RfqRow {
  id: string;
  fullName: string;
  company: string | null;
  phone: string;
  email: string;
  brand: string | null;
  machineModel: string | null;
  partNumber: string | null;
  quantity: number | null;
  country: string | null;
  message: string | null;
  status: RfqStatus;
  priority: RfqPriority;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Display config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RfqStatus, { label: string; className: string }> = {
  pending: { label: "Beklemede", className: "bg-yellow-100 text-yellow-800" },
  contacted: { label: "İletişime Geçildi", className: "bg-blue-100 text-blue-800" },
  quoted: { label: "Teklif Verildi", className: "bg-purple-100 text-purple-800" },
  closed: { label: "Kapandı", className: "bg-green-100 text-green-800" },
};

const PRIORITY_CONFIG: Record<RfqPriority, { label: string; className: string }> = {
  low: { label: "Düşük", className: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", className: "bg-gray-100 text-gray-700" },
  high: { label: "Yüksek", className: "bg-orange-100 text-orange-800" },
  urgent: { label: "Acil", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as RfqStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as RfqPriority] ?? {
    label: priority,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AdminRfqPage() {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Edit dialog state
  const [editRfq, setEditRfq] = useState<RfqRow | null>(null);
  const [editStatus, setEditStatus] = useState<RfqStatus>("pending");
  const [editPriority, setEditPriority] = useState<RfqPriority>("normal");
  const [editNote, setEditNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(currentPage));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/rfq?${params}`);
      if (res.status === 503) {
        setLoadError("Veritabanı yapılandırılmamış (DATABASE_URL eksik).");
        return;
      }
      if (!res.ok) throw new Error("Sunucu hatası");

      const data = await res.json();
      setRfqs(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setLoadError("Veriler yüklenemedi. Lütfen sayfayı yenileyin.");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (
      !window.confirm(
        `"${name}" adlı kişinin teklif talebini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/rfq/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRfqs((prev) => prev.filter((r) => r.id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch {
      alert("Silme sırasında hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Edit dialog ──────────────────────────────────────────────────────────

  const openEdit = (rfq: RfqRow) => {
    setEditRfq(rfq);
    setEditStatus(rfq.status);
    setEditPriority(rfq.priority);
    setEditNote(rfq.adminNote ?? "");
    setSaveError("");
  };

  const handleSave = async () => {
    if (!editRfq) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/rfq/${editRfq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          adminNote: editNote,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setRfqs((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setEditRfq(null);
    } catch {
      setSaveError("Güncelleme sırasında hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export URL ───────────────────────────────────────────────────────────

  const exportHref = "/api/admin/rfq/export";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teklif Talepleri</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {pagination.total > 0
              ? `Toplam ${pagination.total} kayıt`
              : "Kayıt bulunamadı"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={exportHref} download>
              <Download className="size-4" />
              CSV İndir
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-gray-400" />
            <Input
              placeholder="İsim, e-posta, parça no, firma..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <SelectItem key={val} value={val}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {loadError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-7 animate-spin text-gray-400" />
            </div>
          ) : rfqs.length === 0 && !loadError ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Eşleşen kayıt bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Kişi / Firma</th>
                    <th className="px-4 py-3">Parça / Marka</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Öncelik</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                        {new Date(rfq.createdAt).toLocaleDateString("tr-TR")}
                        <br />
                        <span className="text-[11px]">
                          {new Date(rfq.createdAt).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {rfq.fullName}
                        </p>
                        {rfq.company && (
                          <p className="text-xs text-gray-400">{rfq.company}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-400">
                          {rfq.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {rfq.partNumber ? (
                          <p className="font-mono text-xs font-medium text-gray-800">
                            {rfq.partNumber}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-300">—</p>
                        )}
                        {rfq.brand && (
                          <p className="text-xs text-gray-400">{rfq.brand}</p>
                        )}
                        {rfq.quantity && rfq.quantity > 1 && (
                          <p className="text-xs text-gray-400">
                            Adet: {rfq.quantity}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rfq.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={rfq.priority} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(rfq)}
                            title="Düzenle"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-400 hover:text-red-600"
                            onClick={() =>
                              handleDelete(rfq.id, rfq.fullName)
                            }
                            disabled={deletingId === rfq.id}
                            title="Sil"
                          >
                            {deletingId === rfq.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={currentPage >= pagination.totalPages || isLoading}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editRfq}
        onOpenChange={(open) => {
          if (!open) setEditRfq(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Teklif Detayı</DialogTitle>
          </DialogHeader>

          {editRfq && (
            <div className="space-y-5">
              {/* Contact info */}
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-400">Ad Soyad</p>
                    <p className="text-gray-800">{editRfq.fullName}</p>
                  </div>
                  {editRfq.company && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">Firma</p>
                      <p className="text-gray-800">{editRfq.company}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-400">Telefon</p>
                    <p className="text-gray-800">{editRfq.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">E-posta</p>
                    <p className="break-all text-gray-800">{editRfq.email}</p>
                  </div>
                  {editRfq.partNumber && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">
                        Parça No
                      </p>
                      <p className="font-mono text-gray-800">
                        {editRfq.partNumber}
                      </p>
                    </div>
                  )}
                  {editRfq.brand && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">Marka</p>
                      <p className="text-gray-800">{editRfq.brand}</p>
                    </div>
                  )}
                  {editRfq.machineModel && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">
                        Makine
                      </p>
                      <p className="text-gray-800">{editRfq.machineModel}</p>
                    </div>
                  )}
                  {editRfq.quantity && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">Adet</p>
                      <p className="text-gray-800">{editRfq.quantity}</p>
                    </div>
                  )}
                  {editRfq.country && (
                    <div>
                      <p className="text-xs font-medium text-gray-400">Ülke</p>
                      <p className="text-gray-800">{editRfq.country}</p>
                    </div>
                  )}
                </div>

                {editRfq.message && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-medium text-gray-400">Mesaj</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-gray-700">
                      {editRfq.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Durum</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as RfqStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                        <SelectItem key={val} value={val}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Öncelik</Label>
                  <Select
                    value={editPriority}
                    onValueChange={(v) => setEditPriority(v as RfqPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                        <SelectItem key={val} value={val}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Admin Notu (dahili)</Label>
                <Textarea
                  rows={3}
                  placeholder="Dahili not ekleyin..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-500">{saveError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRfq(null)}
              disabled={isSaving}
            >
              İptal
            </Button>
            <Button
              className="bg-[#F59E0B] text-white hover:bg-[#D97706]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
