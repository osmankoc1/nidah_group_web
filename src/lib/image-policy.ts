/**
 * GÖRSEL YÜKLEME POLİTİKASI — tek kaynak.
 *
 * Gerekçe ve ölçümler: `docs/admin-master-plan/29-GORSEL-YUKLEME-POLITIKASI.md`.
 * Özeti: ham telefon fotoğrafı (orijinal + türevler) ~2,8 MB yer tutuyor;
 * yükleme anında küçültülmüş hâli ~0,45 MB. **6,2 kat fark.** 50.000 ürün ×
 * 1 fotoğrafta bu, Cloudinary ücretsiz paketi (25 kredi/ay) ile Plus
 * ($99/ay) arasındaki farktır.
 *
 * ZAMANLAMA: politika toplu yüklemeden ÖNCE uygulanmalıdır. Sonradan
 * uygulanırsa fazla depolama ZATEN ödenmiş olur ve mevcut dosyaların
 * yeniden işlenmesi gerekir.
 *
 * KAPSAM: saf. Cloudinary SDK'sı, ağ, veritabanı yok — bu yüzden test
 * edilebilir (`tests/image-policy.spec.ts`).
 */

/** Depolanan görselin en uzun kenarı (px). Detay sunumu ~1200 px. */
export const GORSEL_EN_UZUN_KENAR = 1600;

/** Depolanan format. JPEG'e göre ~%30 küçük; `next/image` türevleri ayrı üretir. */
export const GORSEL_FORMAT = "webp" as const;

/** Kalite. 80 altında parça yüzeyindeki doku kaybı gözle görünür hâle geliyor. */
export const GORSEL_KALITE = 80;

/**
 * Kabul edilen en küçük görsel — EN UZUN kenar (px).
 * Daha küçüğü detay sayfasında bulanık görünür.
 */
export const GORSEL_EN_KUCUK_KENAR = 800;

/**
 * Dosya başına sert üst sınır (bayt). 50 MB'den düşürüldü: 1600 px WebP
 * hiçbir koşulda 8 MB olmaz, daha büyüğü yanlış dosyadır.
 *
 * NOT: `next.config.ts` içindeki gövde sınırı bir ÜST sınırdır; burada
 * daraltmak o ayarı değiştirmeyi gerektirmez.
 */
export const GORSEL_MAKS_BAYT = 8 * 1024 * 1024;

/** Depolanan dosya boyutu HEDEFİ (şart değil, yalnızca raporlama için). */
export const GORSEL_HEDEF_BAYT = 400 * 1024;

/**
 * Cloudinary yükleme dönüşümü.
 *
 * `crop: "limit"` küçük görseli BÜYÜTMEZ, yalnızca büyük olanı küçültür —
 * bu yüzden alt sınır kontrolü dönüşümden SONRA da doğru sonuç verir
 * (ölçüler orijinalin ölçüleri olarak kalır).
 */
export const CLOUDINARY_YUKLEME_SECENEKLERI = {
  transformation: [
    {
      width: GORSEL_EN_UZUN_KENAR,
      height: GORSEL_EN_UZUN_KENAR,
      crop: "limit" as const,
      quality: GORSEL_KALITE,
    },
  ],
  format: GORSEL_FORMAT,
} as const;

export type GorselRedNedeni = "cok_buyuk_dosya" | "cok_kucuk_olcu";

export interface GorselDenetimi {
  kabul: boolean;
  neden?: GorselRedNedeni;
  /** Kullanıcıya gösterilecek Türkçe mesaj. */
  mesaj?: string;
}

const mb = (bayt: number) => (bayt / (1024 * 1024)).toFixed(0);

/** Yükleme ÖNCESİ: dosya boyutu sınırı. */
export function dosyaBoyutuDenetimi(bayt: number): GorselDenetimi {
  if (bayt > GORSEL_MAKS_BAYT) {
    return {
      kabul: false,
      neden: "cok_buyuk_dosya",
      mesaj: `Dosya ${mb(GORSEL_MAKS_BAYT)} MB sınırını aşıyor. Görseli küçültüp yeniden deneyin.`,
    };
  }
  return { kabul: true };
}

/**
 * Yükleme SONRASI: ölçü alt sınırı.
 *
 * Neden sonra: ölçüyü güvenilir biçimde okumanın yolu Cloudinary'nin
 * döndürdüğü `width`/`height`tir. Reddedilen görsel Cloudinary'den SİLİNİR,
 * yani depoda artık kalmaz.
 */
export function olcuDenetimi(width: number, height: number): GorselDenetimi {
  const enUzun = Math.max(width, height);
  if (!Number.isFinite(enUzun) || enUzun < GORSEL_EN_KUCUK_KENAR) {
    return {
      kabul: false,
      neden: "cok_kucuk_olcu",
      mesaj: `Görselin en uzun kenarı en az ${GORSEL_EN_KUCUK_KENAR} px olmalı (gelen: ${width}×${height}).`,
    };
  }
  return { kabul: true };
}
