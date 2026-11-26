/**
 * ARAMA KAPISI — SAF ÇEKİRDEK.
 *
 * Bu dosya BİLİNÇLİ olarak sunucuya bağlı hiçbir şey import etmez:
 * `server-only`, `next/cache` ve `@/lib/db` burada YOKTUR. Tek nedeni
 * DOĞRULANABİLİRLİK — `tests/search-gate.spec.ts` sentetik bir katalog kurup
 * kapının gerçek bir ürünü asla elemediğini HER ALT DİZE için ölçer.
 *
 * Gerekçe, ölçümler ve üç kademenin anlamı: `src/lib/search-gate.ts` başı.
 */
import { normalizePartNumber } from "@/lib/part-number";

// ── Alfabe katlama ──────────────────────────────────────────────────────────
//
// 37 sınıf: 0-9 (0..9), A-Z (10..35), diğer her şey (36).
// Türkçe harfler ASCII karşılığına indirilir. Katlama yalnızca DAHA GEVŞEK
// olabilir (iki karakter aynı sınıfa düşerse sözlük daha çok 3-gram içerir
// sayılır), bu yüzden YANLIŞ "bos" kararı üretemez.

const SINIF_SAYISI = 37;
export const NGRAM_SAYISI = SINIF_SAYISI ** 3; // 50.653
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
    // BIRLESEN ISARETLER ATILIR (U+0300..U+036F). Gerekce: "İ".toLowerCase()
    // ayrisik "i̇" (i + birlesen nokta) uretir; Postgres ILIKE bunu
    // onceden-birlesik "İ" ile EslESTIRMEZ, yani SQL de bos doner. Isareti
    // atmak kapiyi yalnizca DAHA GEVSEK yapar: sorgu ve sozluk ayni katlamadan
    // gectigi icin "q, v'nin alt dizesiyse q'nun her 3-grami v'de vardir"
    // degismezi korunur; boylece ayrisik girdi ASLA yanlis "bos" uretemez.
    const kod = ch.codePointAt(0) ?? 0;
    if (kod >= 0x0300 && kod <= 0x036f) continue;
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
export const SATIR_UST_SINIRI = 60_000;

export type Sozluk = {
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

/** Sozlugun beslendigi TEK satir bicimi. */
export type SozlukSatiri = {
  pn: string | null;
  pnn: string | null;
  ad: string | null;
};

/**
 * Sozlugu satirlardan kurar - SAF fonksiyon, veritabani gerektirmez.
 *
 * Disa acik olmasinin tek nedeni DOGRULANABILIRLIK: `tests/search-gate.spec.ts`
 * sentetik bir katalog kurup kapinin gercek bir urunu asla elemedigini
 * (her alt dize icin) olcer. Uretim yolu yalnizca `sozlukUret` uzerinden gecer.
 */
export function sozlukKur(satirlar: SozlukSatiri[]): Sozluk {
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

/** Süreç içi, yalnızca HIZ amaçlı bit eşlem kopyası. Kaybı korumayı bozmaz. */
let bellekKopyasi: { anahtar: string; bit: Uint8Array } | null = null;

export function bitEslem(sozluk: Sozluk): Uint8Array {
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
 * Kararin SAF hali - sozluk verilmisse veritabani gerekmez.
 *
 * SAGLAMLIK SARTI: Bu kapi, `/api/products` GET'inin aradigi SUTUNLARIN
 * sozluge beslenmis olmasina dayanir. Bugun aranan sutunlar:
 *   products.part_number_normalized - products.part_number - products.name
 * ve ucu de `sozlukKur()` icinde `isaretle()` ile beslenir. Sorguya YENI bir
 * sutun (orn. `oem_numbers.number`) eklenirse o sutun da beslenmelidir;
 * aksi halde kapi YANLIS "bos" karari uretir. `tests/search-gate.spec.ts`
 * icindeki "aranan sutun kumesi" testi bu sarti bekciler.
 */
export function aramaKarariVer(sozluk: Sozluk, arama: string | null): AramaKarari {
  if (!arama) return { tur: "onbellekli", neden: "arama-yok" };

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
