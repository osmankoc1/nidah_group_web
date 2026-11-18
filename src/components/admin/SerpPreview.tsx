/**
 * Google sonuç (SERP) önizlemesi ve meta uzunluk göstergeleri — bulgu P9.
 *
 * ── SORUN ──────────────────────────────────────────────────────────────────
 * Kısa ve uzun açıklamada karakter sayacı vardı; META BAŞLIK ve META
 * AÇIKLAMADA yoktu. Meta başlığın veritabanı sınırı 255 karakter ama Google
 * yaklaşık 60 karakterde kesiyor. Operatör yazdığı başlığın arama sonucunda
 * nasıl görüneceğini — ve nerede kesileceğini — göremiyordu.
 *
 * ── NE İDDİA ETMEZ ─────────────────────────────────────────────────────────
 * Buradaki sınırlar Google'ın PİKSEL genişliğine değil karakter sayısına
 * dayanan YAKLAŞIK değerlerdir; Google gerçekte piksel genişliğine bakar ve
 * sonucu sorguya göre yeniden yazabilir. Bu yüzden gösterge "kesin kesilme
 * noktası" değil, UYARI eşiğidir. Bileşen hiçbir değeri değiştirmez,
 * kırpmaz veya kaydetmez — yalnızca gösterir.
 */

/** Google başlıkları yaklaşık bu uzunluktan sonra kesiyor. */
export const SERP_TITLE_LIMIT = 60;
/** Google açıklamaları yaklaşık bu uzunluktan sonra kesiyor. */
export const SERP_DESCRIPTION_LIMIT = 155;

function Sayac({
  uzunluk,
  esik,
  dbSiniri,
}: {
  uzunluk: number;
  esik: number;
  dbSiniri?: number;
}) {
  const asildi = uzunluk > esik;
  const dbAsildi = dbSiniri !== undefined && uzunluk > dbSiniri;

  return (
    <p className={`text-[11px] ${dbAsildi ? "text-red-600" : asildi ? "text-amber-700" : "text-muted-foreground"}`}>
      {uzunluk} karakter
      {dbAsildi ? (
        <> — <strong>sınır aşıldı</strong> (en fazla {dbSiniri})</>
      ) : asildi ? (
        <> — Google yaklaşık {esik}. karakterden sonrasını kesebilir</>
      ) : (
        <> / ~{esik} (Google kesme eşiği)</>
      )}
    </p>
  );
}

export function MetaTitleCounter({
  value,
  dbSiniri,
}: {
  value: string;
  dbSiniri: number;
}) {
  return <Sayac uzunluk={value.trim().length} esik={SERP_TITLE_LIMIT} dbSiniri={dbSiniri} />;
}

export function MetaDescriptionCounter({ value }: { value: string }) {
  return <Sayac uzunluk={value.trim().length} esik={SERP_DESCRIPTION_LIMIT} />;
}

/**
 * Arama sonucu önizlemesi.
 *
 * Boş bırakılan alanlar için sayfanın gerçekte ne kullanacağı gösterilir
 * (`yedekBaslik` / `yedekAciklama`), çünkü meta alanları boşsa detay sayfası
 * başlığı parça numarası + addan, açıklamayı kısa açıklamadan veya üretilen
 * özetten türetir. Operatör "boş bıraktım, ne görünecek?" sorusunu burada
 * yanıtlar.
 */
export default function SerpPreview({
  metaTitle,
  metaDescription,
  yedekBaslik,
  yedekAciklama,
  url,
}: {
  metaTitle: string;
  metaDescription: string;
  yedekBaslik: string;
  yedekAciklama: string;
  url: string;
}) {
  const baslikHam = metaTitle.trim() || yedekBaslik;
  const aciklamaHam = metaDescription.trim() || yedekAciklama;

  const baslik =
    baslikHam.length > SERP_TITLE_LIMIT
      ? baslikHam.slice(0, SERP_TITLE_LIMIT).trimEnd() + "…"
      : baslikHam;
  const aciklama =
    aciklamaHam.length > SERP_DESCRIPTION_LIMIT
      ? aciklamaHam.slice(0, SERP_DESCRIPTION_LIMIT).trimEnd() + "…"
      : aciklamaHam;

  const metaBosMu = !metaTitle.trim() || !metaDescription.trim();

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Google sonuç önizlemesi
      </p>

      <div className="rounded-lg border bg-white p-3">
        <p className="text-[11px] text-[#202124] truncate">{url}</p>
        <p className="text-[#1a0dab] text-base leading-snug hover:underline">
          {baslik || <span className="text-gray-400 italic">başlık boş</span>}
        </p>
        <p className="text-[13px] leading-snug text-[#4d5156]">
          {aciklama || <span className="text-gray-400 italic">açıklama boş</span>}
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {metaBosMu && (
          <>
            Boş bırakılan meta alanı için sayfanın <strong>kendi yedeği</strong>{" "}
            gösterildi.{" "}
          </>
        )}
        Önizleme yaklaşıktır: Google piksel genişliğine bakar ve başlığı
        sorguya göre yeniden yazabilir.
      </p>
    </div>
  );
}
