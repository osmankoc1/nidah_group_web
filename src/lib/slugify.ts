/**
 * Türkçe-duyarlı slug üretimi — TEK KAYNAK.
 *
 * NEDEN (2026-11-16 bulgusu): `src/app/api/admin/import/machines/route.ts`
 * içindeki `slugify`, ASCII dışı harfleri çeviremeyip SİLİYORDU:
 *
 *     "ÇUKUROVA" -> toLowerCase -> "çukurova" -> [^a-z0-9-] silindi -> "ukurova"
 *
 * Yani baştaki harf tamamen kayboluyordu. Üretici kaydı "ukurova" slug'ıyla
 * oluşuyor, marka sayfası slug üzerinden eşleşemiyordu. (Sayfa `upper(name)`
 * yedeğiyle yine açılıyordu; bu yüzden hata sessizdi.)
 *
 * Doğru dönüşüm projede ZATEN vardı — `blog-taxonomy.ts` içindeki
 * `slugifyTaxonomy` ğ/ü/ş/ı/ö/ç harflerini g/u/s/i/o/c'ye çeviriyor.
 * Bu modül aynı kuralı üretici slug'ları için kullanılabilir hâle getirir.
 *
 * `slugifyTaxonomy` BİLEREK buraya taşınmadı: Türkçe DIŞI aksanlarda
 * davranışı farklıdır ("Café" -> "caf"), bu modül ise NFD ile "cafe" üretir.
 * Blog slug'ları veritabanında kayıtlı ve SEO'ya bağlı olduğundan, davranışı
 * değiştirecek bir birleştirme ayrı bir karardır.
 *
 * KAPSAM: saf. DB, ağ, React yok.
 */

/**
 * Türkçe harfleri ASCII karşılıklarına çevirir.
 *
 * Hem büyük hem küçük biçimler ele alınır: çağıran taraf `toLowerCase()`
 * uygulamış olsa bile (ki `"İ".toLowerCase()` "i" + U+0307 birleşik noktası
 * üretir) sonuç kararlıdır.
 *
 * `I` ve `ı` ayrımı kasıtlı: Türkçe'de noktasız `ı` ASCII `i`ye karşılık gelir.
 */
export function turkishToAscii(text: string): string {
  return text
    .replace(/Ğ/g, "G").replace(/ğ/g, "g")
    .replace(/Ü/g, "U").replace(/ü/g, "u")
    .replace(/Ş/g, "S").replace(/ş/g, "s")
    .replace(/İ/g, "I").replace(/ı/g, "i")
    .replace(/Ö/g, "O").replace(/ö/g, "o")
    .replace(/Ç/g, "C").replace(/ç/g, "c")
    // "İ".toLowerCase() = "i" + U+0307 (birleşik nokta). Yukarıdaki kural
    // büyük harfi yakalar; küçük harfe çevrilmiş biçim için kalan birleşik
    // işaretler burada temizlenir.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Ad -> slug. Üretici (ve benzeri) kayıtlar için kullanılır.
 *
 * Kurallar, makine içe aktarmasının ÖNCEKİ davranışıyla birebir aynıdır —
 * yalnızca Türkçe harf dönüşümü eklenmiştir:
 *   1. küçük harfe çevir
 *   2. Türkçe harfleri ASCII'ye çevir
 *   3. baş/son boşlukları at
 *   4. boşluk dizilerini tek "-" yap
 *   5. kalan [a-z0-9-] dışı karakterleri sil
 *   6. art arda gelen "-" işaretlerini tekle, baş/sondakileri at
 *
 * Mevcut üretici slug'ları (volvo, caterpillar, komatsu, hidromek, ammann,
 * champion, test-volvo, atom-test-uretici) bu kurallarla DEĞİŞMEZ; yalnızca
 * Türkçe harf içeren adlar düzelir.
 */
export function slugifyName(name: string): string {
  return turkishToAscii(name.toLowerCase())
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
