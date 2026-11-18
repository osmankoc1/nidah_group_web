/**
 * Sentetik geliştirme kayıtlarının ayırt edilmesi.
 *
 * NEDEN ADLANDIRMA SÖZLEŞMESİ:
 *   Veritabanında "test kaydı" anlamına gelen bir KOLON YOK ve yalnızca bu iş
 *   için yeni bir migration açılmadı. Ayrım, geliştirme sırasında üretilen
 *   kayıtların parça numarasının `TEST-` veya `ATOM-` ile başlaması
 *   sözleşmesine dayanır.
 *
 * NEREDE KULLANILIR:
 *   Yalnızca YÖNETİM PANELİ. İki işe yarar:
 *     · operatör sentetik kaydı gerçek üründen bir bakışta ayırır,
 *     · production'a aktarım hazırlanırken hangi kayıtların dışarıda kalacağı
 *       görünür olur.
 *
 * NEREDE KULLANILMAZ:
 *   Public yüzey. Bu kayıtların hiçbiri `seo_ready` değildir, dolayısıyla
 *   public sayfalarda ve sitemap'te zaten görünmezler. Bu fonksiyon bir
 *   güvenlik sınırı DEĞİLDİR; görsel bir yardımcıdır.
 *
 * SINIRI:
 *   Gerçek bir ürünün numarası `TEST` ile başlıyorsa yanlış pozitif verir.
 *   V8 araştırma kümesindeki 5.688 kodun hiçbiri böyle başlamıyor (hepsi
 *   rakam, `VOE`, `CH`, `NDG` veya üretici biçimindedir), bu yüzden pratikte
 *   çakışma yok. Kalıcı bir ayrım gerekirse bu, kendi kolonunu hak eder.
 */

/** Kibar ayırıcı: `TEST-`, `TEST `, `ATOM-`, `ATOM ` — büyük/küçük harf duyarsız. */
const TEST_PREFIX = /^(TEST|ATOM)[-\s]/i;

export function isTestRecord(partNumber: string | null | undefined): boolean {
  if (!partNumber) return false;
  return TEST_PREFIX.test(partNumber.trim());
}
