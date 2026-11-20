"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VARSAYILAN_FILTRELER,
  aktifFiltreSayisi,
  type SiralamaAlani,
  type UrunFiltreleri,
} from "@/lib/product-filters";

/**
 * Yönetim listesi filtre çubuğu — bulgular P4 (filtreler) ve Y3 (sıralama).
 *
 * ── NEDEN ──────────────────────────────────────────────────────────────────
 * Listenin tek aracı serbest metin aramasıydı. 154 gerçek ürün 8 sayfaya
 * yayıldığı için "fotoğrafı eksik olanlar" ya da "yayına en yakın olanlar"
 * listelenemiyordu; fotoğraf turu bu yüzden planlanamıyordu.
 *
 * ── TASARIM ────────────────────────────────────────────────────────────────
 * Durum bu bileşende TUTULMAZ; yukarıdan gelir ve `onChange` ile yukarı
 * bildirilir. Böylece filtreler URL'ye yazılabilir ve sayfa yenilendiğinde
 * korunur (`product-filters.ts` → `filtreleriSorguyaYaz`).
 *
 * ── SENTETİK KAYITLAR ──────────────────────────────────────────────────────
 * Varsayılan "Gizli". Bu bir GÜVENLİK katmanı değil, kullanılabilirlik
 * tercihidir: 12 test kaydı zaten `is_active = false` ile public yüzeyden
 * kapalıdır ve o koruma DEĞİŞMEDİ.
 */

/** Üç durumlu filtre tanımı — hepsi aynı bileşenle çizilir. */
const UCLU_FILTRELER = [
  { alan: "verifiedPhoto", etiket: "Doğrulanmış fotoğraf", evet: "Var", hayir: "Yok" },
  { alan: "shortDescription", etiket: "Açıklama", evet: "300\u2019ün altında", hayir: "300 ve üzeri" },
  { alan: "seoReady", etiket: "Yayın onayı", evet: "Verildi", hayir: "Verilmedi" },
  { alan: "active", etiket: "Durum", evet: "Aktif", hayir: "Pasif" },
] as const satisfies ReadonlyArray<{
  alan: keyof UrunFiltreleri;
  etiket: string;
  evet: string;
  hayir: string;
}>;

const SIRALAMA_SECENEKLERI: ReadonlyArray<{ deger: SiralamaAlani; etiket: string }> = [
  { deger: "createdAt", etiket: "Eklenme tarihi" },
  { deger: "partNumber", etiket: "Parça numarası" },
  { deger: "name", etiket: "Ürün adı" },
  { deger: "updatedAt", etiket: "Son güncelleme" },
  { deger: "publishReadiness", etiket: "Yayın hazırlığı" },
];

export default function ProductFilterBar({
  filtre,
  onChange,
  sonucSayisi,
}: {
  filtre: UrunFiltreleri;
  onChange: (yeni: UrunFiltreleri) => void;
  sonucSayisi: number | null;
}) {
  const aktif = aktifFiltreSayisi(filtre);

  const ayarla = <K extends keyof UrunFiltreleri>(alan: K, deger: UrunFiltreleri[K]) =>
    onChange({ ...filtre, [alan]: deger });

  const temizle = () =>
    onChange({ ...VARSAYILAN_FILTRELER, search: filtre.search });

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <Filter className="size-3.5" />
          Filtreler
          {aktif > 0 && (
            <span className="rounded-full bg-nidah-yellow/15 px-1.5 py-0.5 text-[10px] font-bold text-nidah-yellow-dark">
              {aktif}
            </span>
          )}
        </span>

        {sonucSayisi !== null && (
          <span className="text-xs text-gray-500">
            {sonucSayisi} sonuç
          </span>
        )}

        {aktif > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-[11px]"
            onClick={temizle}
          >
            <X className="size-3.5 mr-1" />
            Filtreleri temizle
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {UCLU_FILTRELER.map(({ alan, etiket, evet, hayir }) => (
          <div key={alan} className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {etiket}
            </label>
            <Select
              value={filtre[alan] as string}
              onValueChange={(v) => ayarla(alan, v as UrunFiltreleri[typeof alan])}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="yes">{evet}</SelectItem>
                <SelectItem value="no">{hayir}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Stok durumu
          </label>
          <Select
            value={filtre.stockStatus ?? "all"}
            onValueChange={(v) =>
              ayarla("stockStatus", v === "all" ? null : (v as UrunFiltreleri["stockStatus"]))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {/* Teyit edilmemiş stok "Stokta" olarak SUNULMAZ (denetim C10). */}
              <SelectItem value="unknown">Teyit bekliyor</SelectItem>
              <SelectItem value="in_stock">Stokta</SelectItem>
              <SelectItem value="on_order">Sipariş üzerine</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Test kayıtları
          </label>
          <Select
            value={filtre.synthetic}
            onValueChange={(v) => ayarla("synthetic", v as UrunFiltreleri["synthetic"])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hide">Gizli</SelectItem>
              <SelectItem value="all">Göster</SelectItem>
              <SelectItem value="only">Yalnızca test</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Sırala
          </label>
          <Select
            value={filtre.sort}
            onValueChange={(v) => ayarla("sort", v as SiralamaAlani)}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIRALAMA_SECENEKLERI.map((s) => (
                <SelectItem key={s.deger} value={s.deger}>
                  {s.etiket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Yön
          </label>
          <Select
            value={filtre.dir}
            onValueChange={(v) => ayarla("dir", v as UrunFiltreleri["dir"])}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">
                {filtre.sort === "publishReadiness" ? "Yayına en yakın" : "Azalan"}
              </SelectItem>
              <SelectItem value="asc">
                {filtre.sort === "publishReadiness" ? "En çok iş gereken" : "Artan"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtre.synthetic === "hide" && (
          <p className="ml-auto text-[11px] text-gray-400">
            Test kayıtları gizli — hepsi zaten pasif ve yayın dışı.
          </p>
        )}
      </div>
    </div>
  );
}
