/**
 * Kategori alanları, ağaç kurulumu ve döngü koruması — bulgu P6.
 *
 * ── NEDEN AYRI BİR MODÜL ───────────────────────────────────────────────────
 * `categories.parent_id` şemada uuid bir kolondur ama **yabancı anahtarı
 * YOKTUR** (`src/lib/db/schema.ts`): veritabanı ne üst kaydın varlığını ne de
 * döngüsüzlüğü garanti eder. Üst kategori kendi alt ağacına bağlanırsa ağacı
 * basan her kod sonsuz döngüye girer. Bu yüzden iki kural UYGULAMA
 * tarafında zorunlu kılınır ve burada — veritabanına ve React'e dokunmayan
 * saf kodda — test edilir.
 *
 * ── NE İDDİA ETMEZ ─────────────────────────────────────────────────────────
 * Bu modül hiçbir kategori ağacı ÖNERMEZ ve varsayılan kategori ÜRETMEZ.
 * Kategori ağacının içeriği kullanıcı kararıdır (ertelenen Y1); burada
 * yalnızca aracı hazırlanır. Dev veritabanında `categories` tablosu BOŞTUR.
 */

export const CATEGORY_LIMITS = {
  name: 255,
  slug: 255,
} as const;

export const CATEGORY_SORT_MAX = 9999;

/** Slug deseni — küçük harf, rakam ve tek tireli ayırma. */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Türkçe karakterleri slug'a çevirir.
 *
 * `toLowerCase()` tek başına yetmez: "Ş" → "ş" olur ve desen dışı kalır,
 * dolayısıyla "Şanzıman" slug'ı "anzman" gibi harf düşüren bir sonuca
 * dönerdi. Harita bunu engeller.
 */
const TR_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", I: "i", Ö: "o", Ş: "s", Ü: "u",
};

export function slugifyCategory(input: string): string {
  return input
    .trim()
    .replace(/[çğıİöşüÇĞIÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATEGORY_LIMITS.slug);
}

export function parseCategoryName(value: unknown): Parsed<string> {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: "Kategori adı zorunludur." };
  }
  const trimmed = value.trim();
  if (trimmed.length > CATEGORY_LIMITS.name) {
    return { ok: false, error: `Kategori adı en fazla ${CATEGORY_LIMITS.name} karakter olabilir.` };
  }
  return { ok: true, value: trimmed };
}

/** Slug boş gelirse addan üretilir; verilirse desene uymak zorundadır. */
export function parseCategorySlug(value: unknown, name: string): Parsed<string> {
  const raw = typeof value === "string" ? value.trim() : "";
  const slug = raw === "" ? slugifyCategory(name) : slugifyCategory(raw);
  if (slug === "") {
    return { ok: false, error: "Slug en az bir harf veya rakam içermelidir." };
  }
  if (!CATEGORY_SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Slug yalnızca küçük harf, rakam ve tire içerebilir." };
  }
  return { ok: true, value: slug };
}

/** Üst kategori — `null` kök demektir. */
export function parseCategoryParentId(value: unknown): Parsed<string | null> {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return { ok: false, error: "Geçersiz üst kategori kimliği." };
  }
  return { ok: true, value };
}

export function parseCategorySortOrder(value: unknown): Parsed<number> {
  if (value === null || value === undefined || value === "") return { ok: true, value: 0 };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > CATEGORY_SORT_MAX) {
    return { ok: false, error: `Sıra 0 ile ${CATEGORY_SORT_MAX} arasında bir tam sayı olmalıdır.` };
  }
  return { ok: true, value: n };
}

/** Ürün kategorisi ataması — `null` "kategori yok" demektir. */
export function parseProductCategoryId(value: unknown): Parsed<string | null> {
  return parseCategoryParentId(value);
}

export interface CategoryNodeInput {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

export interface CategoryNode extends CategoryNodeInput {
  /** Kök = 0. */
  depth: number;
  /** Üst kategorisi listede bulunamayan kayıt — kök gibi basılır, işaretlenir. */
  orphan: boolean;
}

/**
 * Döngü koruması.
 *
 * `id` kategorisinin üstü `parentId` yapılırsa döngü oluşur mu? Kendi kendine
 * bağlama ve kendi alt ağacına bağlama reddedilir. Zincir takip edilirken
 * ziyaret edilen kimlikler tutulur; veritabanında ÖNCEDEN bozuk bir zincir
 * varsa fonksiyon yine de durur (sonsuz döngüye girmez).
 */
export function wouldCreateCycle(
  id: string,
  parentId: string | null,
  parentOf: Map<string, string | null>
): boolean {
  if (parentId === null) return false;
  if (parentId === id) return true;

  const gorulen = new Set<string>([id]);
  let current: string | null | undefined = parentId;
  while (current) {
    if (current === id) return true;
    if (gorulen.has(current)) return false; // mevcut bozuk zincir — yeni döngü değil
    gorulen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

/**
 * Düz listeyi derinlik bilgisiyle sıralı bir listeye çevirir.
 *
 * Sıralama her seviyede `sortOrder`, eşitlikte ada göredir — böylece ekranda
 * kayıt sırası rastgele değişmez.
 */
export function buildCategoryTree(rows: CategoryNodeInput[]): CategoryNode[] {
  const idSet = new Set(rows.map((r) => r.id));
  const children = new Map<string | null, CategoryNodeInput[]>();

  for (const row of rows) {
    // Üstü listede yoksa kök gibi davranır (veri bozulmasında ekran boş kalmaz).
    const key = row.parentId !== null && idSet.has(row.parentId) ? row.parentId : null;
    const liste = children.get(key) ?? [];
    liste.push(row);
    children.set(key, liste);
  }

  for (const liste of children.values()) {
    liste.sort((a, b) =>
      a.sortOrder !== b.sortOrder
        ? a.sortOrder - b.sortOrder
        : a.name.localeCompare(b.name, "tr")
    );
  }

  const sonuc: CategoryNode[] = [];
  const gorulen = new Set<string>();

  const yurut = (parent: string | null, depth: number) => {
    for (const row of children.get(parent) ?? []) {
      if (gorulen.has(row.id)) continue; // bozuk zincire karşı emniyet
      gorulen.add(row.id);
      sonuc.push({
        ...row,
        depth,
        orphan: row.parentId !== null && !idSet.has(row.parentId),
      });
      yurut(row.id, depth + 1);
    }
  };

  yurut(null, 0);
  return sonuc;
}
