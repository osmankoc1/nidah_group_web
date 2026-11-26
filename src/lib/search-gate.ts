import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/product-cache";
import { normalizePartNumber } from "@/lib/part-number";

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

// ── Alfabe katlama ──────────────────────────────────────────────────────────
//
// 37 sınıf: 0-9 (0..9), A-Z (10..35), diğer her şey (36).
// Türkçe harfler ASCII karşılığına indirilir. Katlama yalnızca DAHA GEVŞEK
// olabilir (iki karakter aynı sınıfa düşerse sözlük daha çok 3-gram içerir
// sayılır), bu yüzden YANLIŞ "bos" kararı üretemez.

const SINIF_SAYISI = 37;
const NGRAM_SAYISI = SINIF_SAYISI ** 3; // 50.653
const BIT_BAYT = Math.ceil(NGRAM_SAYISI / 8); // 6.332 bayt

const TR_KATLAMA: Record<string, string> = {
  Ç: "C", Ğ: "G", İ: "I", I: "I", Ş: "S", Ü: "U", Ö: "O",
  Â: "A", Î: "I", Û: "U", Ê: "E", Ô: "O",
};

/** Dizeyi 0..36 sınıf dizisine çevirir. */
function katla(ham: string): number[] {
  const buyuk = ham.toUpperCase();
  const cikti: number[] = [];
  for (const ch of buyuk) {
    const c = TR_KATLAMA[ch] ?? ch;
    const k = c.charCodeAt(0);
    if (k >= 48 && k <= 57) cikti.push(k - 48);           // 0-9
    else if (k >= 65 && k <= 90) cikti.push(k - 65 + 10); // A-Z
    else cikti.push(36);
  }
  return cikti;
}

function ngramIndeksi(a: number, b: number, c: number): number {
  return a * SINIF_SAYISI * SINIF_SAYISI + b * SINIF_SAYISI + c;
}

// ── Sözlük kaydı ────────────────────────────────────────────────────────────

/** Parça numarası gövdesinin karakter üst sınırı (Data Cache kaydı < 2 MB). */
const GOVDE_UST_SINIRI = 1_200_000;
/** Sözlük üretirken okunacak en çok satır. */
const SATIR_UST_SINIRI = 60_000;

type Sozluk = {
  /** Şema sürümü — biçim değişirse eski kayıt sessizce yanlış yorumlanmasın. */
  s: 1;
  /** 3-gram bit eşlemi (base64). Her zaman TÜM satırlardan üretilir. */
  bit: string;
  /** `\n` ile ayrılmış, büyük harfli, tekilleştirilmiş parça numaraları. */
  govde: string;
  /** Gövde üst sınıra takıldı mı? (takıldıysa "yok ⇒ eşleşmez" çıkarımı YAPILMAZ) */
  govdeKismi: boolean;
  /** Okunan satır sayısı ve satır sınırına takılma durumu — raporlama için. */
  satir: number;
  satirKismi: boolean;
};

async function sozlukUret(): Promise<Sozluk> {
  if (!db) throw new Error("ARAMA_SOZLUGU_DB_YOK");

  const satirlar = await db
    .select({
      pn:  products.partNumber,
      pnn: products.partNumberNormalized,
      ad:  products.name,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(SATIR_UST_SINIRI);

  const bit = new Uint8Array(BIT_BAYT);
  const isaretle = (deger: string | null) => {
    if (!deger) return;
    const k = katla(deger);
    for (let i = 0; i + 2 < k.length; i++) {
      const idx = ngramIndeksi(k[i], k[i + 1], k[i + 2]);
      bit[idx >> 3] |= 1 << (idx & 7);
    }
  };

  const tekil = new Set<string>();
  let uzunluk = 0;
  let govdeKismi = false;

  for (const r of satirlar) {
    // Bit eşlem HER satırdan beslenir — sınıra takılsa bile eksilmez.
    isaretle(r.pn);
    isaretle(r.pnn);
    isaretle(r.ad);

    for (const deger of [r.pnn, r.pn]) {
      if (!deger) continue;
      const u = deger.toUpperCase();
      if (tekil.has(u)) continue;
      if (uzunluk + u.length + 1 > GOVDE_UST_SINIRI) {
        govdeKismi = true;
        continue;
      }
      tekil.add(u);
      uzunluk += u.length + 1;
    }
  }

  return {
    s: 1,
    bit: Buffer.from(bit).toString("base64"),
    govde: tekil.size > 0 ? `\n${[...tekil].join("\n")}\n` : "",
    govdeKismi,
    satir: satirlar.length,
    satirKismi: satirlar.length >= SATIR_UST_SINIRI,
  };
}

/**
 * TEK önbellek kaydı. Anahtarı argümansızdır, yani bot trafiği bu kaydın
 * sayısını ARTIRAMAZ. `PRODUCTS_CACHE_TAG` ile düşer (admin ürün yazma yolu
 * `revalidateProducts()` çağırır), süreyle eskimez.
 */
const sozlukOku = unstable_cache(sozlukUret, ["arama-sozlugu-v1"], {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: false,
});

/** Süreç içi, yalnızca HIZ amaçlı bit eşlem kopyası. Kaybı korumayı bozmaz. */
let bellekKopyasi: { anahtar: string; bit: Uint8Array } | null = null;

function bitEslem(sozluk: Sozluk): Uint8Array {
  if (bellekKopyasi && bellekKopyasi.anahtar === sozluk.bit) return bellekKopyasi.bit;
  const bit = new Uint8Array(Buffer.from(sozluk.bit, "base64"));
  bellekKopyasi = { anahtar: sozluk.bit, bit };
  return bit;
}

/**
 * `deger`in TÜM 3-gramları sözlükte var mı?
 *
 * `false` dönerse `ILIKE '%deger%'` HİÇBİR satırla eşleşemez: bir alt dizenin
 * her 3-gramı, onu içeren dizede de bulunmak zorundadır. 3 karakterden kısa
 * dizeler için kapı uygulanmaz (`true` döner).
 */
function ngramGecer(sozluk: Sozluk, deger: string): boolean {
  const k = katla(deger);
  if (k.length < 3) return true;
  const bit = bitEslem(sozluk);
  for (let i = 0; i + 2 < k.length; i++) {
    const idx = ngramIndeksi(k[i], k[i + 1], k[i + 2]);
    if ((bit[idx >> 3] & (1 << (idx & 7))) === 0) return false;
  }
  return true;
}

// ── Karar ───────────────────────────────────────────────────────────────────

export type AramaKarari =
  /** Eşleşme KANITLI olarak imkânsız: boş yanıt, 0 sorgu, 0 önbellek yazması. */
  | { tur: "bos"; neden: "ngram" }
  /** Önbelleğe alınabilir: anahtar uzayı katalogla sınırlı. */
  | { tur: "onbellekli"; neden: "parca-govdesi" | "kisa" | "arama-yok" }
  /** Doğru çalışır, kalıcı kayıt oluşturmaz. */
  | { tur: "onbelleksiz"; neden: "serbest-metin" | "sozluk-okunamadi" };

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

  const buyuk = arama.toUpperCase();
  const nq = normalizePartNumber(arama);

  // 1) Parça numarası gövdesinde GERÇEKTEN var mı? → önbelleğe değer.
  //    Anahtar uzayı: katalogdaki parça numaralarının alt dizeleri. Bot bu
  //    kümeyi büyütemez; yalnızca katalog büyütür.
  if (sozluk.govde) {
    if ((nq.length >= 2 && sozluk.govde.includes(nq)) ||
        (buyuk.length >= 2 && sozluk.govde.includes(buyuk))) {
      return { tur: "onbellekli", neden: "parca-govdesi" };
    }
  }

  // 2) 3 karakterden kısa aramalar: kapı uygulanamaz, ama anahtar uzayı
  //    zaten 37² = 1.369 ile sınırlı. Önbelleğe alınır.
  if (katla(buyuk).length < 3 && katla(nq).length < 3) {
    return { tur: "onbellekli", neden: "kisa" };
  }

  // 3) Hiçbir eksende 3-gramları tutmuyorsa eşleşme İMKÂNSIZ.
  //    Üç SQL dalı da alt dize eşlemesidir:
  //      part_number_normalized LIKE %nq%
  //      part_number            ILIKE %arama%
  //      name                   ILIKE %arama%
  //    Her biri için ilgili formun 3-gramları sözlükte olmak zorundadır.
  if (!ngramGecer(sozluk, buyuk) && !(nq && ngramGecer(sozluk, nq))) {
    return { tur: "bos", neden: "ngram" };
  }

  // 4) Kapıdan geçti, parça gövdesinde yok: çok kelimeli / nadir ad aramaları.
  //    Doğru çalışır, kalıcı kayıt oluşturmaz.
  return { tur: "onbelleksiz", neden: "serbest-metin" };
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
