"use client";

import { Loader2 } from "lucide-react";

/**
 * AKTİF / PASİF anahtarı ve durum rozeti — bulgu P7.
 *
 * ── SORUN ──────────────────────────────────────────────────────────────────
 * `is_active` yalnızca ürün LİSTESİNDEN değiştirilebiliyordu; düzenleme
 * ekranında ne anahtarı ne de durumun yazısı vardı. Üstteki tek rozet
 * `seo_ready`'yi gösterdiği için operatör "Yayında değil" yazısını ürünün
 * pasif olduğu sanıyordu. İki alan farklı şeyi yönetir:
 *
 *   · `is_active = false`  → ürün HİÇBİR public yüzeyde yok (public API,
 *     ürün detay sayfası, marka sayfaları, sitemap). Doğrulandı:
 *     `src/lib/queries/product.ts`, `src/app/api/products/**`,
 *     `src/app/sitemap.ts` sorguları `is_active = true` şartı taşır.
 *   · `seo_ready = false` → ürün aktifse sayfası YAŞAR ama `noindex`
 *     taşır ve sitemap'e girmez.
 *
 * ── DEĞİŞMEYEN KURAL ───────────────────────────────────────────────────────
 * Pasifleştirme yayın onayını **GERİ ALMAZ**: iki alan bağımsızdır ve bu
 * bileşen yalnızca `isActive` yazar. (`seo_ready`'nin otomatik geri alınması
 * yalnızca son DOĞRULANMIŞ FOTOĞRAFIN kaybında çalışır — `seo-gate-server.ts`
 * içindeki `revokeSeoReadyStatement`. Ona dokunulmadı.)
 *
 * Yayın kapısı aktiflik şartı taşıdığı için pasif bir ürüne YENİ yayın onayı
 * verilemez; ama MEVCUT onay silinmez. Bu ikisi birbirine karışırsa operatör
 * geçici olarak pasife aldığı ürünün yayın onayını kaybeder ve ölçütleri
 * baştan toplamak zorunda kalır.
 */
export default function ActiveStatusControl({
  isActive,
  seoReady,
  busy,
  onChange,
}: {
  isActive: boolean;
  seoReady: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Görünürlük
        </span>

        <span
          className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
            isActive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }`}
        >
          {isActive ? "Aktif" : "Pasif"}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={isActive ? "Ürünü pasife al" : "Ürünü aktife al"}
          disabled={busy}
          onClick={() => onChange(!isActive)}
          className={`relative ml-auto inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
            isActive ? "bg-green-600 border-green-700" : "bg-gray-200 border-gray-300"
          }`}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>

        {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Pasif ürün hiçbir public yüzeyde görünmez. Yayın onayı ise yalnızca
        arama motoru indekslemesini belirler.
      </p>

      {!isActive && seoReady && (
        <p className="text-[11px] text-amber-700">
          Bu ürünün <strong>yayın onayı duruyor</strong> ama pasif olduğu için
          hiçbir yerde görünmüyor. Pasifleştirme yayın onayını geri almaz;
          aktife aldığınızda onay olduğu gibi geçerli olur.
        </p>
      )}
    </div>
  );
}
