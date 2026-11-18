/**
 * Sayfalama matematiği — saf.
 *
 * Denetim C5/C6: marka sayfalarında sayfalama yoktu ve sorgu sert `LIMIT 100`
 * kullanıyordu. Binlerce ürün hedefi için sayfalama zorunlu; bu modül sayfa
 * numarası doğrulamasını (kullanıcı girdisi!) tek yerde tutar.
 */

export interface PageInfo {
  /** 1 tabanlı, sınırlar içine kırpılmış sayfa numarası. */
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** SQL OFFSET. */
  offset: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/** Marka katalog sayfası başına ürün sayısı. */
export const BRAND_PAGE_SIZE = 48;

/**
 * Sayfa numarasını güvenle çözer. Geçersiz, negatif, ondalıklı, aşırı büyük
 * veya metin girdiler 1'e ya da son sayfaya kırpılır — asla NaN/negatif OFFSET
 * üretilmez.
 */
export function paginate(
  total: number,
  requestedPage: unknown,
  pageSize: number
): PageInfo {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));

  const parsed =
    typeof requestedPage === "number"
      ? requestedPage
      : Number.parseInt(String(requestedPage ?? ""), 10);

  const page = Number.isFinite(parsed)
    ? Math.min(Math.max(1, Math.floor(parsed)), totalPages)
    : 1;

  return {
    page,
    pageSize: safeSize,
    total: safeTotal,
    totalPages,
    offset: (page - 1) * safeSize,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
