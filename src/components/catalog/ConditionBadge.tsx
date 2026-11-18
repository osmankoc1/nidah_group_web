/**
 * Ürün kartlarındaki DURUM rozeti (Sıfır / İkinci El / Yenilenmiş).
 *
 * ── NEDEN AYRI BİLEŞEN ─────────────────────────────────────────────────────
 * `CONDITION` haritası `BrandCatalogPage` ve `ParcaKatalogClient` içinde
 * BİREBİR kopyalanmıştı. Rozet, onaylanan temsilî görselin üzerindeki iki
 * dilli banttan kart bilgi bölümüne taşınırken (kullanıcı kararı
 * 2026-11-17) iki kopyanın ayrışma riski doğdu; `StockBadge` ile aynı
 * şekilde tek kaynağa alındı.
 *
 * ── İDDİA ÜRETMEZ ──────────────────────────────────────────────────────────
 * Değer doğrudan `products.condition` enum'undan gelir; burada varsayılan
 * ATANMAZ. Haritada olmayan bir değer gelirse ham değer gösterilir — sessizce
 * "Sıfır" denmez.
 */

export type ProductCondition = "new" | "used" | "remanufactured";

const DURUM: Record<string, { label: string; cls: string }> = {
  new: { label: "Sıfır", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used: { label: "İkinci El", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  remanufactured: { label: "Yenilenmiş", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export default function ConditionBadge({
  condition,
  className = "",
}: {
  condition: ProductCondition | string;
  className?: string;
}) {
  const durum = DURUM[condition] ?? {
    label: condition,
    cls: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${durum.cls} ${className}`}
    >
      {durum.label}
    </span>
  );
}
