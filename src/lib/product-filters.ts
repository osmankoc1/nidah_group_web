/**
 * Yönetim paneli ürün listesi — FİLTRE ve SIRALAMA ayrıştırması.
 *
 * ── NEDEN (bulgular P4 + Y3) ───────────────────────────────────────────────
 * Liste ucunun tek aracı serbest metin aramasıydı. 166 kayıt 9 sayfaya
 * yayıldığı için "fotoğrafı eksik olanlar", "açıklaması kısa olanlar" veya
 * "yayına hazır olanlar" listelenemiyordu. Sıralama da sabitti
 * (`created_at desc`), yani parça numarasına göre bakmak mümkün değildi.
 *
 * ── TASARIM ────────────────────────────────────────────────────────────────
 * Bu modül SAF: DB, ağ, React yok. Yalnızca `URLSearchParams` → doğrulanmış
 * filtre nesnesi dönüşümü yapar. Böylece:
 *   · geçersiz değerler SESSİZCE YOK SAYILIR (500 yerine varsayılan davranış),
 *   · sıralama alanı beyaz listeden gelir (SQL enjeksiyonu yüzeyi yok),
 *   · tek bir yerden test edilir.
 *
 * ── SENTETİK KAYIT VARSAYILANI ─────────────────────────────────────────────
 * `synthetic` belirtilmezse varsayılan `"hide"`: 12 sentetik kayıt listede
 * GÖRÜNMEZ ve sayıma girmez. Operatör 154 gerçek ürünü görür. Bu bir
 * GÜVENLİK katmanı değil, kullanılabilirlik tercihidir — sentetik kayıtlar
 * zaten `is_active = false` ile public yüzeyden kapalıdır.
 */

import { STOCK_STATUSES, type StockStatusValue } from "@/lib/product-fields";

/** Sıralanabilir alanlar — BEYAZ LİSTE. Dışındaki değer yok sayılır. */
export const SIRALAMA_ALANLARI = [
  "createdAt",
  "partNumber",
  "name",
  "updatedAt",
  "publishReadiness",
] as const;
export type SiralamaAlani = (typeof SIRALAMA_ALANLARI)[number];

export type SiralamaYonu = "asc" | "desc";

/** Üç durumlu filtreler: "all" = filtre uygulanmaz. */
export type UclüDurum = "all" | "yes" | "no";

/** Sentetik kayıt görünürlüğü. */
export type SentetikGorunurluk = "hide" | "only" | "all";

export interface UrunFiltreleri {
  search: string | null;
  /** `is_active` */
  active: UclüDurum;
  /** `seo_ready` */
  seoReady: UclüDurum;
  /** En az bir DOĞRULANMIŞ fotoğraf var mı */
  verifiedPhoto: UclüDurum;
  /** Hiç fotoğraf yüklenmiş mi (doğrulanmış olsun olmasın) */
  anyPhoto: UclüDurum;
  /** Uzun açıklama eşiğin altında mı */
  shortDescription: UclüDurum;
  /** Yayın ölçütlerinin tamamı karşılanıyor mu */
  publishEligible: UclüDurum;
  stockStatus: StockStatusValue | null;
  condition: string | null;
  manufacturer: string | null;
  categoryId: string | null;
  synthetic: SentetikGorunurluk;
  sort: SiralamaAlani;
  dir: SiralamaYonu;
}

export const VARSAYILAN_FILTRELER: UrunFiltreleri = {
  search: null,
  active: "all",
  seoReady: "all",
  verifiedPhoto: "all",
  anyPhoto: "all",
  shortDescription: "all",
  publishEligible: "all",
  stockStatus: null,
  condition: null,
  manufacturer: null,
  categoryId: null,
  synthetic: "hide",
  sort: "createdAt",
  dir: "desc",
};

/** `?x=yes|no|true|false|1|0` → üç durum. Tanınmayan değer "all". */
function ucluOku(ham: string | null | undefined): UclüDurum {
  if (ham === null || ham === undefined) return "all";
  const v = ham.trim().toLowerCase();
  if (v === "yes" || v === "true" || v === "1") return "yes";
  if (v === "no" || v === "false" || v === "0") return "no";
  return "all";
}

function metinOku(ham: string | null | undefined, enFazla = 200): string | null {
  if (typeof ham !== "string") return null;
  const t = ham.trim();
  if (!t || t.length > enFazla) return null;
  return t;
}

/** UUID biçimi — kategori kimliği için. Biçimsiz değer yok sayılır. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sorgu parametrelerini doğrulanmış filtrelere çevirir.
 *
 * HİÇBİR geçersiz değer hata üretmez; varsayılana düşer. Liste ekranı bir
 * yazım hatası yüzünden boş dönmemeli.
 */
export function parseProductFilters(
  params: URLSearchParams | Record<string, string | null | undefined>
): UrunFiltreleri {
  const al = (ad: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(ad);
    const v = params[ad];
    return v === undefined ? null : v;
  };

  const stockHam = metinOku(al("stockStatus"));
  const stockStatus =
    stockHam && (STOCK_STATUSES as readonly string[]).includes(stockHam)
      ? (stockHam as StockStatusValue)
      : null;

  const conditionHam = metinOku(al("condition"));
  const condition =
    conditionHam && ["new", "used", "remanufactured"].includes(conditionHam)
      ? conditionHam
      : null;

  const sentetikHam = (metinOku(al("synthetic")) ?? "").toLowerCase();
  const synthetic: SentetikGorunurluk =
    sentetikHam === "only" ? "only" : sentetikHam === "all" ? "all" : "hide";

  const sortHam = metinOku(al("sort")) ?? "";
  const sort = (SIRALAMA_ALANLARI as readonly string[]).includes(sortHam)
    ? (sortHam as SiralamaAlani)
    : VARSAYILAN_FILTRELER.sort;

  const dirHam = (metinOku(al("dir")) ?? "").toLowerCase();
  const dir: SiralamaYonu = dirHam === "asc" ? "asc" : "desc";

  const kategoriHam = metinOku(al("categoryId"));

  return {
    search: metinOku(al("search")),
    active: ucluOku(al("active")),
    seoReady: ucluOku(al("seoReady")),
    verifiedPhoto: ucluOku(al("verifiedPhoto")),
    anyPhoto: ucluOku(al("anyPhoto")),
    shortDescription: ucluOku(al("shortDescription")),
    publishEligible: ucluOku(al("publishEligible")),
    stockStatus,
    condition,
    manufacturer: metinOku(al("manufacturer")),
    categoryId: kategoriHam && UUID.test(kategoriHam) ? kategoriHam : null,
    synthetic,
    sort,
    dir,
  };
}

/**
 * Varsayılandan sapan filtre var mı? Arayüzde "Filtreleri temizle"
 * düğmesinin görünürlüğü ve aktif filtre rozeti sayısı buna bakar.
 *
 * `search` sayılmaz: arama kutusu zaten ayrı ve görünür.
 */
export function aktifFiltreSayisi(f: UrunFiltreleri): number {
  let n = 0;
  if (f.active !== "all") n++;
  if (f.seoReady !== "all") n++;
  if (f.verifiedPhoto !== "all") n++;
  if (f.anyPhoto !== "all") n++;
  if (f.shortDescription !== "all") n++;
  if (f.publishEligible !== "all") n++;
  if (f.stockStatus !== null) n++;
  if (f.condition !== null) n++;
  if (f.manufacturer !== null) n++;
  if (f.categoryId !== null) n++;
  if (f.synthetic !== "hide") n++;
  return n;
}

/**
 * Filtreleri paylaşılabilir bir sorgu dizesine çevirir.
 *
 * YALNIZCA varsayılandan sapanlar yazılır; böylece adres kısa kalır ve
 * "varsayılan görünüm" tek bir temiz URL'dir.
 */
export function filtreleriSorguyaYaz(f: UrunFiltreleri): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.active !== "all") p.set("active", f.active);
  if (f.seoReady !== "all") p.set("seoReady", f.seoReady);
  if (f.verifiedPhoto !== "all") p.set("verifiedPhoto", f.verifiedPhoto);
  if (f.anyPhoto !== "all") p.set("anyPhoto", f.anyPhoto);
  if (f.shortDescription !== "all") p.set("shortDescription", f.shortDescription);
  if (f.publishEligible !== "all") p.set("publishEligible", f.publishEligible);
  if (f.stockStatus) p.set("stockStatus", f.stockStatus);
  if (f.condition) p.set("condition", f.condition);
  if (f.manufacturer) p.set("manufacturer", f.manufacturer);
  if (f.categoryId) p.set("categoryId", f.categoryId);
  if (f.synthetic !== "hide") p.set("synthetic", f.synthetic);
  if (f.sort !== VARSAYILAN_FILTRELER.sort) p.set("sort", f.sort);
  if (f.dir !== VARSAYILAN_FILTRELER.dir) p.set("dir", f.dir);
  return p;
}
