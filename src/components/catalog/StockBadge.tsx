import { CheckCircle, Clock, HelpCircle } from "lucide-react";
import { stockPresentationFromStatus, type StockStatus } from "@/lib/stock";

/**
 * Ürün kartlarındaki stok durumu rozeti.
 *
 * ── NEDEN AYRI BİLEŞEN ─────────────────────────────────────────────────────
 * Aynı üç dallı rozet `BrandCatalogPage` ve `ParcaKatalogClient` içinde
 * BİREBİR kopyalanmıştı. Rozet, onaylanan temsilî görselin üzerindeki
 * "NİDAH GROUP" yazısını örtmesin diye kart bilgi bölümüne taşınırken
 * (kullanıcı kararı 2026-11-17) iki kopyanın ayrışma riski doğdu; tek
 * kaynağa alındı.
 *
 * ── GÖRÜNÜM: GÖRSEL ÜSTÜ → BİLGİ BÖLÜMÜ ────────────────────────────────────
 * Rozet eskiden fotoğrafın ÜZERİNDE duruyordu; dolu/koyu zemin ve gölge,
 * fotoğraf üstünde okunabilirlik içindi. Artık beyaz bilgi bölümünde duruyor
 * ve kartın diğer çipleriyle (parça numarası, kategori, `ConditionBadge`)
 * aynı dili kullanıyor: yumuşak zemin + ince kenarlık. Ton ayrımı
 * (yeşil / amber / turuncu) KORUNDU, yalnızca doygunluk düştü.
 *
 * ── İDDİA KURALI (denetim C10) ─────────────────────────────────────────────
 * Metin ve ton `src/lib/stock.ts`'ten gelir. Teyit edilmemiş stok "Stokta"
 * olarak SUNULMAZ; `unknown` durumu "Teyit Ediliyor" der. Bu bileşen o
 * kuralı değiştirmez, yalnızca sunar.
 */
export default function StockBadge({
  status,
  className = "",
}: {
  status: StockStatus | null | undefined;
  className?: string;
}) {
  const tone = stockPresentationFromStatus(status).tone;

  // `ConditionBadge` ile BİREBİR aynı ölçü ve biçim — iki rozet yan yana
  // durduğu için ayrışmaları dağınık görünürdü.
  const ortak =
    "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border";

  if (tone === "positive") {
    return (
      <span className={`${ortak} bg-green-50 text-green-700 border-green-200 ${className}`}>
        <CheckCircle className="w-2.5 h-2.5" /> Stokta
      </span>
    );
  }

  if (tone === "pending") {
    return (
      <span className={`${ortak} bg-amber-50 text-amber-700 border-amber-200 ${className}`}>
        <HelpCircle className="w-2.5 h-2.5" /> Teyit Ediliyor
      </span>
    );
  }

  return (
    <span className={`${ortak} bg-orange-50 text-orange-700 border-orange-200 ${className}`}>
      <Clock className="w-2.5 h-2.5" /> Sipariş
    </span>
  );
}
