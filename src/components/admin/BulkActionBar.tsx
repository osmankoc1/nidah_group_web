"use client";

import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BULK_ACTIONS,
  BULK_ACTION_LABELS,
  BULK_MAX,
  type BulkAction,
} from "@/lib/bulk-actions";
import { STOCK_STATUSES, STOCK_STATUS_LABELS, type StockStatusValue } from "@/lib/product-fields";

/**
 * Toplu işlem çubuğu — bulgu P5, karar K10.
 *
 * Yalnızca GÖSTERİR: seçim durumu ve isteği sayfa yönetir, onay diyaloğu da
 * oradadır. Bu bileşen hiçbir istek atmaz, bu yüzden "Uygula" düğmesi
 * kapıyı ATLAYAMAZ.
 *
 * Çubukta TOPLU SİLME ve TOPLU FOTOĞRAF DOĞRULAMA bilinçli olarak YOKTUR
 * (K10): silme geri alınamaz, doğrulama ise kayıt başına ALT metni ve kaynak
 * notu ister.
 */
export default function BulkActionBar({
  seciliSayisi,
  action,
  onActionChange,
  stockStatus,
  onStockStatusChange,
  onUygula,
  onTemizle,
  onFoyIndir,
  busy,
}: {
  seciliSayisi: number;
  action: BulkAction | "";
  onActionChange: (a: BulkAction) => void;
  stockStatus: StockStatusValue;
  onStockStatusChange: (s: StockStatusValue) => void;
  onUygula: () => void;
  onTemizle: () => void;
  onFoyIndir: () => void;
  busy: boolean;
}) {
  if (seciliSayisi === 0) return null;

  const limitAsildi = seciliSayisi > BULK_MAX;

  return (
    <div className="rounded-lg border border-[#F59E0B]/40 bg-amber-50/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Seçili {seciliSayisi} kayıt</span>

        <Select value={action} onValueChange={(v) => onActionChange(v as BulkAction)}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Toplu işlem">
            <SelectValue placeholder="İşlem seçin…" />
          </SelectTrigger>
          <SelectContent>
            {BULK_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {BULK_ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {action === "stock_status" && (
          <Select
            value={stockStatus}
            onValueChange={(v) => onStockStatusChange(v as StockStatusValue)}
          >
            <SelectTrigger className="w-full sm:w-60" aria-label="Stok durumu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STOCK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STOCK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          size="sm"
          disabled={busy || action === "" || limitAsildi}
          onClick={onUygula}
          className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
        >
          {busy && <Loader2 className="size-4 animate-spin mr-1" />}
          Uygula
        </Button>

        <Button type="button" size="sm" variant="outline" onClick={onFoyIndir}>
          <Download className="size-4 mr-1" />
          Fotoğraf föyü (CSV)
        </Button>

        <Button type="button" size="sm" variant="ghost" onClick={onTemizle} className="ml-auto">
          <X className="size-4 mr-1" />
          Seçimi temizle
        </Button>
      </div>

      {limitAsildi && (
        <p className="text-[11px] text-red-600">
          Tek istekte en fazla {BULK_MAX} kayıt işlenebilir. Seçimi daraltın.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Toplu işlem onay ister. Yayın onayında <strong>her ürün kapıdan ayrı
        ayrı geçer</strong>; ölçütleri karşılamayan ürün yayına alınmaz.
        Toplu silme ve toplu fotoğraf doğrulama <strong>yoktur</strong>.
      </p>
    </div>
  );
}
