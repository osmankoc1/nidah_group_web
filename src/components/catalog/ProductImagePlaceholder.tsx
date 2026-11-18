import Image from "next/image";

/**
 * NİDAH GROUP temsilî ürün görseli — ONAYLANMIŞ TASARIM (2026-11-17).
 *
 * Fotoğrafı henüz çekilmemiş ürünlerde gösterilen kurumsal karttır.
 * Kullanıcı onayıyla fotogerçekçi raster görsele geçildi; önceki geçici
 * satır içi SVG kaldırıldı.
 *
 * ═══ BU GÖRSEL BİR ÜRÜN FOTOĞRAFI DEĞİLDİR ═══════════════════════════════
 *
 * Üzerinde "ÜRÜN GÖRSELİ HAZIRLANIYOR / PRODUCT IMAGE COMING SOON" yazar ve
 * hiçbir parçayı temsil ETMEZ. Bu yüzden şunların HİÇBİRİNE girmez:
 *
 *   · `product_images` tablosu          → satırı yoktur
 *   · doğrulanmış fotoğraf sayısı       → yayın kapısı yalnızca
 *                                         `product_images.verified` sayar
 *   · `Product.image` / ürün JSON-LD'si → görsel listesi boşsa alan
 *                                         HİÇ üretilmez
 *   · ürün image sitemap'i              → sorgu `product_images`'tan okur
 *   · ürüne özel `og:image`             → fotoğraf yoksa KURUMSAL
 *                                         `/opengraph-image` kullanılır
 *
 * Gerekçe, Google merchant listing kuralıdır: "Images must represent the
 * marked up content." Markalı bir "hazırlanıyor" kartı parçayı resmetmez.
 * `tests/placeholder-architecture.spec.ts` bu beş yasağı kilitler.
 *
 * ═══ İNDEKSLENME ═════════════════════════════════════════════════════════
 *
 * Raster dosyanın crawl edilebilir bir URL'si VARDIR (SVG'den farkı budur).
 * Tek bir jenerik görselin 154 ürün sayfasının önizlemesi olarak
 * indekslenmemesi için `next.config.ts` `/placeholder/*` yoluna
 * `X-Robots-Tag: noindex, noimageindex` gönderir. Bu yüzden görsel
 * `unoptimized` ile sunulur: optimize edilseydi adres `/_next/image?url=…`
 * olur ve başlığı TAŞIMAZDI.
 *
 * ═══ ORAN SÖZLEŞMESİ ═════════════════════════════════════════════════════
 *
 *   detail → 1:1  · `aspect-square` kapsayıcı  · ürün detay galerisi
 *   card   → 4:3  · `aspect-[4/3]` kapsayıcı   · liste / marka kartları
 *
 * Varlıkların oranı kapsayıcıyla BİREBİR aynıdır; bu yüzden `object-cover`
 * hiçbir şeyi kırpmaz. 4:3 varlığı, onaylanmış KARE görselin kırpılmadan
 * ortalanıp iki yanına kurumsal koyu şerit eklenmesiyle üretilmiştir —
 * tasarımdan hiçbir öğe, özellikle alttaki iki dilli bant ve üstteki
 * kurumsal işaret, KAYBOLMAZ.
 */

/** Temsilî kartın kullanıldığı yer. */
export type PlaceholderVariant =
  /** Ürün detay sayfası galerisi — kare (1:1). */
  | "detail"
  /** Liste/katalog kartı — 4:3. */
  | "card";

/**
 * Varlık tanımları.
 *
 * Yollar `/placeholder/` altındadır; `next.config.ts` bu önek için
 * `X-Robots-Tag: noindex, noimageindex` gönderir. Önek değişirse başlık
 * kuralı da değişmek ZORUNDADIR.
 */
const VARLIK: Record<
  PlaceholderVariant,
  { src: string; width: number; height: number; sizes: string }
> = {
  detail: {
    src: "/placeholder/urun-gorseli-hazirlaniyor-1x1.webp",
    width: 1000,
    height: 1000,
    sizes: "(max-width: 1024px) 100vw, 44vw",
  },
  card: {
    src: "/placeholder/urun-gorseli-hazirlaniyor-4x3.webp",
    width: 800,
    height: 600,
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  },
};

/**
 * Erişilebilir metin.
 *
 * Bir ÜRÜNÜ TARİF ETMEZ — etseydi, görselin o parçayı gösterdiği iddiası
 * olurdu. Yalnızca kartın ne olduğunu söyler. Google görsel aramada ALT
 * metnini birincil sinyal olarak kullandığı için bu ayrım önemlidir.
 */
const ERISILEBILIR_METIN =
  "NİDAH GROUP — ürün görseli hazırlanıyor. Product image coming soon. " +
  "Bu bir ürün fotoğrafı değildir.";

export default function ProductImagePlaceholder({
  variant = "detail",
  className = "",
}: {
  variant?: PlaceholderVariant;
  className?: string;
}) {
  const varlik = VARLIK[variant];

  return (
    <Image
      src={varlik.src}
      alt={ERISILEBILIR_METIN}
      width={varlik.width}
      height={varlik.height}
      sizes={varlik.sizes}
      // `unoptimized`: sunulan adres `/placeholder/…` olarak KALIR ve
      // `X-Robots-Tag: noindex` başlığını taşır. Dosya zaten ölçeklenmiş ve
      // WebP olarak sıkıştırılmış olduğu için optimizasyon kazancı yok.
      unoptimized
      // Detay sayfasında fotoğraf yoksa bu görsel LCP öğesidir.
      priority={variant === "detail"}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
