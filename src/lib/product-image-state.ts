/**
 * Ürün görseli durumları — DÖRT DURUM, TEK KAYNAK.
 *
 * NEDEN (K2 / K6 kararları): "görseli var" tek başına hiçbir şey söylemiyor.
 * Birinin yüklediği, kimsenin bu parçayı gösterdiğini teyit etmediği bir dosya
 * ile depoda çekilmiş, teyitli bir fotoğraf aynı satırda duruyordu. Google'ın
 * merchant listing kuralı ("Images must represent the marked up content.")
 * bu ayrımı zorunlu kılıyor.
 *
 * DÖRT DURUM
 *   missing              → kayıtlı hiçbir görsel yok. YÖNETİM görünümü.
 *   placeholder          → kayıtlı hiçbir YAYINLANABİLİR görsel yok; public
 *                          yüzeyde markalı temsilî kart gösterilir.
 *                          `missing` ile AYNI veri durumunun public görünümü.
 *   pending_verification → dosya var, doğrulanmamış. Public yüzeyde ürün
 *                          fotoğrafı olarak GÖSTERİLMEZ (yanlış parçayı
 *                          gösterme riski); yalnızca yönetim panelinde görünür.
 *   verified             → en az bir `product_images.verified = true` görsel.
 *                          Yayınlanabilir tek durum.
 *
 * FOTOĞRAF DOĞRULAMA ≠ YAYIN ONAYI (kullanıcı şartı)
 *   Bu modül "fotoğraf hangi durumda?" sorusunu yanıtlar, "ürün yayınlanabilir
 *   mi?" sorusunu YANITLAMAZ. Yayın kararı `seo-gate.ts` + insan onayıdır.
 *   Bir fotoğrafı doğrulamak ürünü yayına AÇMAZ; `seo_ready` ayrı ve açık bir
 *   karardır. Tersi de doğru: yayın onayı bir fotoğrafı doğrulanmış YAPMAZ.
 *
 * PLACEHOLDER VERİTABANINA YAZILMAZ (kullanıcı şartı)
 *   Temsilî görsel bir React bileşenidir (satır içi SVG). Veritabanında satırı,
 *   Cloudinary'de dosyası, dolayısıyla indekslenebilir bir URL'si YOKTUR.
 *   Bu yüzden `Product.image`, image sitemap, `og:image` ve yayın kapısının
 *   görsel sayımına SIZAMAZ. `placeholder` burada yalnızca bir SUNUM durumudur;
 *   bir veri kaydı değildir.
 *
 * KAPSAM: saf. DB, ağ, React yok.
 */

/** Dört görsel durumu. */
export type ProductImageState =
  | "missing"
  | "placeholder"
  | "pending_verification"
  | "verified";

/**
 * Durumun sorulduğu yüzey.
 *
 * `public`  → ziyaretçinin gördüğü sayfa, API, sitemap, OG, JSON-LD
 * `admin`   → yönetim paneli (operatör eksikleri ve bekleyenleri görmeli)
 */
export type ImageSurface = "public" | "admin";

export interface ProductImageStateInput {
  /** Ürüne kayıtlı TÜM görsellerin sayısı (doğrulanmamışlar dahil). */
  imageCount: number;
  /** `product_images.verified = true` olan görsellerin sayısı. */
  verifiedImageCount: number;
  surface: ImageSurface;
}

/** Sayı olmayan / negatif girdiler 0 sayılır — çağıran yerde çökmemeli. */
function sayi(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

/**
 * Görsel durumunu çözer.
 *
 * Public yüzeyde doğrulanmamış görsel YOK SAYILIR: 3 doğrulanmamış fotoğrafı
 * olan bir ürün de, hiç fotoğrafı olmayan bir ürün de `placeholder` döner.
 * Gerekçe: doğrulanmamış dosyanın bu parçayı gösterdiği teyit edilmemiştir;
 * yayınlamak "Images must represent the marked up content." kuralını ihlal
 * etme riski taşır. Yönetim panelinde ise fark görünür kalır
 * (`pending_verification`), çünkü operatörün yapacağı iş tam olarak budur.
 */
export function resolveImageState(
  input: ProductImageStateInput
): ProductImageState {
  const toplam = sayi(input.imageCount);
  const dogrulanmis = Math.min(sayi(input.verifiedImageCount), toplam);

  if (input.surface === "public") {
    return dogrulanmis > 0 ? "verified" : "placeholder";
  }

  if (toplam === 0) return "missing";
  return dogrulanmis > 0 ? "verified" : "pending_verification";
}

/**
 * Public yüzeyde GERÇEK fotoğraf gösterilecek mi?
 *
 * `false` ise çağıran taraf temsilî kartı basar. Temsilî kart hiçbir koşulda
 * `og:image`, `Product.image` veya image sitemap'e yazılmaz.
 */
export function showsRealPhoto(state: ProductImageState): boolean {
  return state === "verified";
}

/** Yönetim panelinde gösterilecek Türkçe etiketler. */
export const IMAGE_STATE_LABEL: Record<ProductImageState, string> = {
  missing: "Fotoğraf yok",
  placeholder: "Temsilî görsel gösteriliyor",
  pending_verification: "Doğrulama bekliyor",
  verified: "Doğrulandı",
};

/** Yönetim panelinde gösterilecek tek satırlık açıklamalar. */
export const IMAGE_STATE_NOTE: Record<ProductImageState, string> = {
  missing:
    "Bu ürüne hiç fotoğraf yüklenmedi. Public sayfada markalı temsilî kart görünür.",
  placeholder:
    "Yayınlanabilir fotoğraf yok; public sayfada markalı temsilî kart görünür.",
  pending_verification:
    "Fotoğraf yüklendi ama bu parçayı gösterdiği teyit edilmedi. " +
    "Doğrulanmamış fotoğraf public sayfada GÖSTERİLMEZ.",
  verified:
    "En az bir fotoğraf doğrulandı. Yalnızca doğrulanmış fotoğraflar public " +
    "sayfada, yapısal veride ve sitemap'te kullanılır.",
};

/**
 * Bir görsel listesinden public yüzeye çıkabilecekleri süzer.
 *
 * Tek satırlık ama TEK KAYNAK olması önemli: beş ayrı okuma yolu
 * (queries/product.ts · api/products · api/products/[partNumber] ·
 * BrandCatalogPage · sitemap.ts) aynı kuralı uygulamak zorunda. Bir yol
 * atlanırsa doğrulanmamış fotoğraf yayına sızar.
 */
export function publishableImages<T extends { verified: boolean }>(
  images: ReadonlyArray<T>
): T[] {
  return images.filter((image) => image.verified === true);
}

/**
 * Görselin ALT metni.
 *
 * Google Images belgesi ALT metnini "en önemli özellik" olarak tanımlıyor.
 * Operatörün yazdığı metin varsa O kullanılır. Yoksa parça numarası + ad ile
 * nötr bir metin üretilir — bu bir TARİF DEĞİLDİR, yalnızca boş `alt`
 * bırakmamak içindir ve doğrulanmış görselde ALT metni ZORUNLU olduğu için
 * (DB CHECK) yayınlanan hiçbir görselde bu yedeğe düşülmez.
 */
export function imageAltText(input: {
  altText: string | null | undefined;
  partNumber: string;
  productName: string;
}): string {
  const yazilan = input.altText?.trim();
  if (yazilan) return yazilan;
  return `${input.productName} — ${input.partNumber}`;
}
