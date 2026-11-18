/**
 * Ürün sayfası Product JSON-LD üreticisi — saf, test edilebilir.
 *
 * TEMEL İLKE: yapısal veriye YALNIZCA doğrulanmış bilgi yazılır. Her alan ya
 * bir öz-beyandır (bizim SKU'muz, bizim URL'imiz) ya da bir insanın açıkça
 * onayladığı veridir. Teyit edilmemiş hiçbir şey buraya girmez.
 *
 * FAZ 1'DE HİÇ ÜRETİLMEYEN, FAZ 2'DE KOŞULLU HÂLE GELEN ALANLAR:
 *
 * `brand`  — Denetim C9. Eski kod markayı `fitments → machines →
 *   manufacturers` zincirinden alıyordu; yani PARÇANIN değil MAKİNENİN
 *   üreticisini yazıyordu. Artık yalnızca `products.part_manufacturer`
 *   (bir insanın girdiği değer) kaynak olabilir ve çağıran taraf önce
 *   `brandClaimAllowed()` (src/lib/verification.ts) kontrolünden geçer.
 *   `brandName` verilmezse `brand` düğümü ÜRETİLMEZ.
 *
 * `offers` — Denetim C8. Eski kod `priceCurrency: "USD"` yazıp `price`
 *   vermiyordu; Google bunu eksik sayar. Fiyat RFQ ile verildiği için hâlâ
 *   `price`/`priceCurrency` YAZILMAZ. `availability` ise yalnızca
 *   `products.stock_status` bir insan tarafından 'in_stock' veya 'on_order'
 *   olarak işaretlendiğinde dolar (src/lib/stock.ts). `availability`
 *   verilmezse `offers` düğümü HİÇ üretilmez.
 *   NOT: fiyatsız `Offer` yayınlanıp yayınlanmayacağı karar D5'tir; bu yüzden
 *   `availability` ÇAĞIRAN TARAFTAN gelir, burada otomatik türetilmez.
 *
 * `mpn` / `gtin` — "manufacturer part number" / global ticari numara
 *   iddialarıdır; numaranın OEM olduğu doğrulanana kadar yazılmaz. `sku`
 *   (bizim kendi stok kodumuz) güvenli bir öz-beyan olduğu için yazılır.
 */
import { productUrl } from "@/lib/product-url";

export interface ProductJsonLdInput {
  /** Görünen kanonik parça numarası — "CH 76281". */
  partNumber: string;
  name: string;
  description?: string | null;
  categoryName?: string | null;
  /** Cloudinary kaynak URL'leri; boşsa `image` alanı hiç üretilmez. */
  imageUrls?: readonly string[];
  /**
   * PARÇANIN KENDİ üreticisi. Yalnızca `brandClaimAllowed()` true dönerse
   * geçilir. Makine üreticisi BURAYA ASLA GEÇİLMEZ.
   */
  brandName?: string | null;
  /**
   * schema.org availability URL'i — `stockPresentationFromStatus()` üretir.
   * `null`/verilmemiş ise `offers` düğümü oluşturulmaz.
   */
  availability?: string | null;
  /** `offers.seller` için kurum adı. */
  sellerName?: string;
}

export interface ProductJsonLdOffer {
  "@type": "Offer";
  availability: string;
  url: string;
  seller: { "@type": "Organization"; name: string };
}

export interface ProductJsonLd {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  sku: string;
  url: string;
  description?: string;
  category?: string;
  image?: string[];
  brand?: { "@type": "Brand"; name: string };
  offers?: ProductJsonLdOffer;
}

const DEFAULT_SELLER = "NİDAH GROUP";

/**
 * Yalnızca doğrulanabilir alanları içeren Product düğümü üretir.
 * Boş/whitespace değerler alan olarak HİÇ eklenmez — `description: ""` gibi
 * anlamsız alanlar şemayı kirletir.
 */
export function buildProductJsonLd(input: ProductJsonLdInput): ProductJsonLd {
  const url = productUrl(input.partNumber);

  const node: ProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    sku: input.partNumber,
    url,
  };

  const description = input.description?.trim();
  if (description) node.description = description;

  const category = input.categoryName?.trim();
  if (category) node.category = category;

  const images = (input.imageUrls ?? []).filter(
    (image): image is string => typeof image === "string" && image.trim().length > 0
  );
  if (images.length > 0) node.image = [...images];

  const brandName = input.brandName?.trim();
  if (brandName) node.brand = { "@type": "Brand", name: brandName };

  const availability = input.availability?.trim();
  if (availability) {
    node.offers = {
      "@type": "Offer",
      availability,
      url,
      seller: { "@type": "Organization", name: input.sellerName ?? DEFAULT_SELLER },
    };
  }

  return node;
}
