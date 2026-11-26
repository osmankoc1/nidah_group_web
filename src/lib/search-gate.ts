import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/product-cache";

/**
 * ARAMA KAPISI — serbest metinli aramaların kalıcı önbellek anahtar uzayını
 * sınırlar.
 *
 * ── NEDEN (ölçüm, 2026-11-25) ────────────────────────────────────────────────
 * `/api/products` üzerindeki karakter (32) ve sayfa (1..500) sınırları anahtar
 * BOYUTUNU kıstırıyordu, anahtar SAYISINI değil. Ölçülen sonuç: 600 farklı,
 * sınırlara uyan bot sorgusu → **604 kalıcı önbellek kaydı / 946 KB / 1.200
 * Neon sorgusu**. `revalidate: false` olduğu için bu kayıtlar kendiliğinden
 * düşmez. Vercel Hobby Runtime Cache ayda 200.000 yazma içerir; ayda 200.000
 * farklı sorgu bu kotayı tüketir.
 *
 * ── ÇÖZÜM: üç kademe ─────────────────────────────────────────────────────────
 * Tek bir SABİT BOYUTLU sözlük kaydı (etiket tabanlı, `revalidate: false`)
 * tutulur ve her arama ona göre sınıflandırılır:
 *
 *   1. REDDET (`bos`)        — aramanın hiçbir satırla eşleşemeyeceği KANITLI.
 *                              Boş yanıt döner: 0 Neon sorgusu, 0 önbellek
 *                              yazması.
 *   2. ÖNBELLEKLİ            — arama, katalogdaki bir parça numarasının
 *                              gerçek bir alt dizesidir. Anahtar uzayı
 *                              katalogla SINIRLIDIR (bot üretemez). Gerçek
 *                              kullanıcıların sıcak yolu; önbellek avantajı
 *                              burada korunur.
 *   3. ÖNBELLEKSİZ           — kapıdan geçti ama parça numarası gövdesinde
 *                              yok (çok kelimeli ad aramaları, nadir ifadeler).
 *                              Sorgu DOĞRU çalışır, yalnızca KALICI KAYIT
 *                              OLUŞTURMAZ. Tekrarları CDN katmanı
 *                              (`s-maxage=600`) absorbe eder.
 *
 * Böylece "yüksek çeşitlilikli serbest metin" ekseni kalıcı önbellek
 * üretemez; üretebilen tek eksen katalogun kendisidir.
 *
 * ── NEDEN SÜREÇ İÇİ BELLEK DEĞİL ─────────────────────────────────────────────
 * Koruma, paylaşılan veri önbelleğinde (Vercel Runtime Cache) duran TEK bir
 * kayda dayanır — süreç içi bir Map'e değil. Fluid Compute'ta örnekler gelip
 * gider; süreç içi sayaç yeni örnekte sıfırlanır ve korumaz. Süreç içi tutulan
 * tek şey çözülmüş bit eşlemin hız amaçlı kopyasıdır (`bellekKopyasi`), ve o
 * kaybolursa koruma değil yalnızca birkaç mikrosaniye kaybedilir.
 *
 * ── SIFIR YENİ BAĞIMLILIK ────────────────────────────────────────────────────
 * Yalnızca Node yerleşikleri ve projenin mevcut Drizzle/Next API'leri.
 */
import {
  NGRAM_SAYISI,
  SATIR_UST_SINIRI,
  aramaKarariVer,
  bitEslem,
  sozlukKur,
  type AramaKarari,
  type Sozluk,
  type SozlukSatiri,
} from "@/lib/search-gate-core";

export type { AramaKarari, Sozluk, SozlukSatiri } from "@/lib/search-gate-core";
export { aramaKarariVer, sozlukKur } from "@/lib/search-gate-core";

async function sozlukUret(): Promise<Sozluk> {
  if (!db) throw new Error("ARAMA_SOZLUGU_DB_YOK");

  const satirlar: SozlukSatiri[] = await db
    .select({
      pn:  products.partNumber,
      pnn: products.partNumberNormalized,
      ad:  products.name,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(SATIR_UST_SINIRI);

  return sozlukKur(satirlar);
}

/**
 * TEK önbellek kaydı. Anahtarı argümansızdır, yani bot trafiği bu kaydın
 * sayısını ARTIRAMAZ. `PRODUCTS_CACHE_TAG` ile düşer (admin ürün yazma yolu
 * `revalidateProducts()` çağırır), süreyle eskimez.
 */
const sozlukOku = unstable_cache(sozlukUret, ["arama-sozlugu-v2"], {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: false,
});

/**
 * Normalize edilmiş arama terimini sınıflandırır.
 *
 * `arama` null ise (arama yok) karar her zaman `onbellekli`dir: o eksende
 * anahtar uzayı sayfa/marka/durum sınırlarıyla zaten kapalıdır.
 *
 * Sözlük okunamazsa karar `onbelleksiz` olur: kullanıcı DOĞRU sonucu alır
 * (fail-open), önbellek ise korunur (fail-closed). Kapı asla yanlış boş
 * sonuç üretmez.
 */
export async function aramaKapisi(arama: string | null): Promise<AramaKarari> {
  if (!arama) return { tur: "onbellekli", neden: "arama-yok" };

  let sozluk: Sozluk;
  try {
    sozluk = await sozlukOku();
    if (sozluk?.s !== 1) return { tur: "onbelleksiz", neden: "sozluk-okunamadi" };
  } catch (err) {
    // Bağlantı dizesi ya da hata mesajı LOGLANMAZ — yalnızca hata adı.
    console.error("[arama-kapisi] sözlük okunamadı:", (err as Error)?.name ?? "Error");
    return { tur: "onbelleksiz", neden: "sozluk-okunamadi" };
  }

  return aramaKarariVer(sozluk, arama);
}

/** Teşhis amaçlı: sözlüğün ölçülebilir büyüklükleri. Gizli değer içermez. */
export async function aramaSozluguOzeti() {
  const s = await sozlukOku();
  return {
    satir: s.satir,
    satirKismi: s.satirKismi,
    govdeKarakter: s.govde.length,
    govdeKismi: s.govdeKismi,
    bitBayt: Buffer.from(s.bit, "base64").length,
    ngramDoluluk: (() => {
      const bit = bitEslem(s);
      let n = 0;
      for (const b of bit) n += (b.toString(2).match(/1/g) ?? []).length;
      return { dolu: n, toplam: NGRAM_SAYISI };
    })(),
  };
}
