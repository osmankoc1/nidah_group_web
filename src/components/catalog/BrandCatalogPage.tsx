import Link from "next/link";
import { ORGANIZATION_REF } from "@/lib/constants";
import { JsonLd } from "@/lib/json-ld";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PackageSearch, ArrowRight } from "lucide-react";
import ProductImagePlaceholder from "./ProductImagePlaceholder";
import StockBadge from "./StockBadge";
import ConditionBadge from "./ConditionBadge";
import { isPageEnabled } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers,
} from "@/lib/db/schema";
import { eq, and, ilike, asc, sql, inArray, countDistinct } from "drizzle-orm";
import { BRAND_PAGE_SIZE, paginate, type PageInfo } from "@/lib/pagination";
import { productCache } from "@/lib/product-cache";
import { productPath } from "@/lib/product-url";
import { type StockStatus } from "@/lib/stock";

// ── Types ────────────────────────────────────────────────────────

interface BrandProductItem {
  id: string;
  partNumber: string;
  name: string;
  condition: "new" | "used" | "remanufactured";
  /** Stok OTORITESI (drizzle/0008). Legacy `in_stock` okunmaz. */
  stockStatus: StockStatus;
  categoryName: string | null;
  imageUrl: string | null;
}

interface BrandCatalogPageProps {
  brandSlug: string;
  brandDisplayName: string;
  brandDescription: string;
  brandMachineTypes: string[];
  /** `?sayfa=` sorgu parametresi — doğrulama paginate() içinde. */
  page?: string | string[];
}

// ── Helpers ───────────────────────────────────────────────────

const EMPTY_PAGE = { items: [] as BrandProductItem[], pageInfo: paginate(0, 1, BRAND_PAGE_SIZE) };

/**
 * Marka sayfasının ürünlerini getirir.
 *
 * Denetim C5 — ESKİ DAVRANIŞ BOZUKTU: marka filtresi SQL'de uygulanmıyordu.
 * Sorgu `is_active = true` ile `ORDER BY part_number LIMIT 100` yapıp ilk 100
 * ürünü çekiyor, marka eşleşmesi sonra JS'te `Set` ile yapılıyordu. Toplam
 * ürün sayısı 100'ü geçtiği anda marka sayfaları sessizce boşalıyordu.
 * Ayrıca her ürün için 1–2 ayrı görsel sorgusu atılıyordu (N+1; 48 üründe
 * 96 sorguya kadar).
 *
 * YENİ: filtre ve sayfalama SQL'de, görseller TEK batch sorguda.
 * Sorgu sayısı sayfa başına sabit 4'tür (üretici + toplam + sayfa + görseller).
 *
 * 2026-11-24 (bulgu B1): bu 4 sorgu artık ETİKET TABANLI önbellekten geçer
 * (`fetchBrandPage`, aşağıda). Marka sayfaları `?sayfa=` okuduğu için render
 * istek başınadır, ancak ölçülen sorgu sayısı ikinci istekte 4 → 0'a iner.
 * Tazeleme olay tabanlıdır: admin ürün/üretici yazma yolları
 * `revalidateProducts()` çağırır.
 */
async function fetchBrandPageUncached(
  brandSlug: string,
  brandDisplayName: string,
  requestedPage: string | string[] | undefined
): Promise<{ items: BrandProductItem[]; pageInfo: PageInfo }> {
  if (!db) return EMPTY_PAGE;

  const pageParam = Array.isArray(requestedPage) ? requestedPage[0] : requestedPage;

  try {
    // 1 ─ Üretici(ler). TAM eşleşme önce: slug veya ad. Eski `ilike('%CAT%')`
    //     biçimi "CAT" ile "CATERPILLAR"ı ayırt edemiyordu.
    const slugLower = brandSlug.toLowerCase();
    const nameUpper = brandDisplayName.toUpperCase();

    let mfrRows = await db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(
        sql`lower(${manufacturers.slug}) = ${slugLower} or upper(${manufacturers.name}) = ${nameUpper}`
      );

    // 2 ─ Geri dönüş: canlı veride üretici adı farklı yazılmış olabilir
    //     (ör. "CAT" sayfası için "CATERPILLAR" kaydı). Mevcut davranışı
    //     bozmamak için alt-dize eşleşmesi KORUNUR, ama yalnızca tam
    //     eşleşme hiç sonuç vermediğinde denenir.
    if (mfrRows.length === 0) {
      mfrRows = await db
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(ilike(manufacturers.name, `%${brandDisplayName}%`));
    }

    if (mfrRows.length === 0) return EMPTY_PAGE;

    const where = and(
      eq(products.isActive, true),
      inArray(
        machines.manufacturerId,
        mfrRows.map((m) => m.id)
      )
    );

    const [totals] = await db
      .select({ total: countDistinct(products.id) })
      .from(products)
      .innerJoin(fitments, eq(fitments.productId, products.id))
      .innerJoin(machines, eq(fitments.machineId, machines.id))
      .where(where);

    const pageInfo = paginate(Number(totals?.total ?? 0), pageParam, BRAND_PAGE_SIZE);
    if (pageInfo.total === 0) return { items: [], pageInfo };

    const rows = await db
      .selectDistinct({
        id:           products.id,
        partNumber:   products.partNumber,
        name:         products.name,
        condition:    products.condition,
        stockStatus:  products.stockStatus,
        categoryName: categories.name,
      })
      .from(products)
      .innerJoin(fitments, eq(fitments.productId, products.id))
      .innerJoin(machines, eq(fitments.machineId, machines.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(asc(products.partNumber))
      .limit(pageInfo.pageSize)
      .offset(pageInfo.offset);

    if (rows.length === 0) return { items: [], pageInfo };

    // Görseller — TEK sorgu. Birincil görsel önce, sonra sıra numarası.
    const imageRows = await db
      .select({
        productId: productImages.productId,
        url:       productImages.cloudinaryUrl,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      // YALNIZCA DOGRULANMIS GORSELLER (karar K2). Yuklenmis ama bu parcayi
      // gosterdigi teyit edilmemis bir dosya public yuzeye CIKMAZ: Google
      // merchant listing kurali "Images must represent the marked up
      // content." Dogrulanmamis fotograf yalnizca yonetim panelinde gorunur.
      .where(
        and(
          eq(productImages.verified, true),
          inArray(productImages.productId, rows.map((r) => r.id))
        )
      );

    const imageByProduct = new Map<string, string>();
    for (const row of [...imageRows].sort(
      (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
    )) {
      if (!row.url) continue;
      if (!imageByProduct.has(row.productId)) imageByProduct.set(row.productId, row.url);
    }

    return {
      items: rows.map((r) => ({
        ...r,
        categoryName: r.categoryName ?? null,
        imageUrl: imageByProduct.get(r.id) ?? null,
      })),
      pageInfo,
    };
  } catch {
    return EMPTY_PAGE;
  }
}

const fetchBrandPage = productCache(["brand-catalog-page-v2"], fetchBrandPageUncached);

// ── Server component ──────────────────────────────────────────────

export default async function BrandCatalogPage({
  brandSlug,
  brandDisplayName,
  brandDescription,
  brandMachineTypes,
  page,
}: BrandCatalogPageProps) {
  // Admin > Sayfalar > "Parça Kataloğu" toggle'ı tek otoritedir —
  // hub kapalıyken tüm marka sayfaları da kapanır, açılınca otomatik yayına girer.
  if (!await isPageEnabled("page_parca_katalog")) notFound();

  const { items: brandProducts, pageInfo } = await fetchBrandPage(
    brandSlug,
    brandDisplayName,
    page
  );

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${brandDisplayName} Yedek Parça`,
    description: `${brandDisplayName} iş makinaları için OEM ve muadil yedek parça kataloğu.`,
    url: `https://www.nidahgroup.com.tr/parca-katalog/${brandSlug}`,
    provider: ORGANIZATION_REF,
  };

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <main>
        {/* Hero */}
        <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
              <PackageSearch className="size-3.5 text-nidah-yellow" />
              <span>OEM & Muadil Yedek Parça</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {brandDisplayName} Yedek Parça
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-6">
              {brandDescription}. Hidrolik pompalar, şanzıman parçaları, motor ve elektronik bileşenler.
            </p>
            {/* Machine types */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {brandMachineTypes.map((mt) => (
                <span key={mt} className="bg-white/10 border border-white/20 text-white/80 text-xs px-3 py-1.5 rounded-full">
                  {mt}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/teklif-al">Parça Teklifi Al</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                <Link href="/parca-katalog">Tüm Katalog</Link>
              </Button>
            </div>
          </div>
        </section>

        <PageBreadcrumb items={[
          { label: "Parça Kataloğu", href: "/parca-katalog" },
          { label: `${brandDisplayName} Yedek Parça` },
        ]} currentUrl={`/parca-katalog/${brandSlug}`} />

        {/* Products grid */}
        <section className="bg-nidah-light py-10 min-h-[60vh]">
          <div className="container mx-auto px-4">
            {brandProducts.length > 0 ? (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Bu marka için <span className="font-bold text-gray-700">{pageInfo.total}</span> ürün bulundu
                    {pageInfo.totalPages > 1 && (
                      <span className="text-gray-400">
                        {" "}— sayfa {pageInfo.page}/{pageInfo.totalPages}
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {brandProducts.map((item) => {
                    return (
                      <Link
                        key={item.id}
                        href={productPath(item.partNumber)}
                        className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-nidah-yellow/30 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                      >
                        {/* Image area */}
                        <div className="relative w-full aspect-[4/3] bg-gray-50 overflow-hidden">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            /* Doğrulanmış fotoğraf yok → onaylanmış TEMSİLÎ
                               kart. `product_images`'ta satırı yoktur; JSON-LD,
                               sitemap ve og:image'a girmez. Dosya
                               `X-Robots-Tag: noindex` ile sunulur. */
                            <ProductImagePlaceholder variant="card" />
                          )}
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-4">
                          {/* Durum ve stok rozetleri BİLGİ BÖLÜMÜNDE durur —
                              onaylanan temsilî görselin üzerindeki kurumsal
                              yazıyı ve iki dilli bandı örtmemeleri için
                              (kullanıcı kararı 2026-11-17). */}
                          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-nidah-yellow-dark tracking-widest uppercase bg-nidah-yellow/8 px-2 py-0.5 rounded">
                              #{item.partNumber}
                            </span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <ConditionBadge condition={item.condition} />
                              <StockBadge status={item.stockStatus} />
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-nidah-yellow-dark transition-colors mb-2.5 flex-1">
                            {item.name}
                          </h3>
                          {item.categoryName && (
                            <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-md self-start font-medium">
                              {item.categoryName}
                            </span>
                          )}
                        </div>

                        <div className="px-4 pb-4">
                          <div className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-nidah-yellow-dark border border-nidah-yellow/40 rounded-xl py-2.5 group-hover:bg-nidah-yellow group-hover:text-nidah-dark group-hover:border-nidah-yellow transition-all duration-200">
                            Detay &amp; Teklif Al
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Sayfalama — taranabilir <a> bağlantıları.
                    Binlerce ürün hedefi için zorunlu (denetim C5/C6): eski sert
                    `LIMIT 100` derin ürünlere hiç tarama yolu bırakmıyordu. */}
                {pageInfo.totalPages > 1 && (
                  <nav
                    aria-label="Sayfalama"
                    className="mt-10 flex items-center justify-center gap-3"
                  >
                    {pageInfo.hasPrev ? (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={
                            pageInfo.page - 1 === 1
                              ? `/parca-katalog/${brandSlug}`
                              : `/parca-katalog/${brandSlug}?sayfa=${pageInfo.page - 1}`
                          }
                          rel="prev"
                        >
                          Önceki
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-300 px-3">Önceki</span>
                    )}

                    <span className="text-xs font-semibold text-gray-500">
                      {pageInfo.page} / {pageInfo.totalPages}
                    </span>

                    {pageInfo.hasNext ? (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/parca-katalog/${brandSlug}?sayfa=${pageInfo.page + 1}`}
                          rel="next"
                        >
                          Sonraki
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-300 px-3">Sonraki</span>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="text-center py-28">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <PackageSearch className="w-10 h-10 text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">
                  Bu markaya ait katalog yakında güncelleniyor
                </h2>
                <p className="text-gray-400 max-w-sm mx-auto text-sm mb-6">
                  {brandDisplayName} yedek parça stoğumuz sürekli genişlemektedir.
                  İhtiyacınız olan parça için lütfen bizimle iletişime geçin.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                    <Link href="/teklif-al">Parça Teklifi Al</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/iletisim">İletişime Geçin</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-[#1A1A2E] py-14">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Aradığınız {brandDisplayName} Parçasını Bulamadınız mı?
            </h2>
            <p className="text-gray-400 mb-7 max-w-lg mx-auto text-sm">
              Katalogumuzda listelenmese bile tedarik edebiliyoruz. Parça numarası veya araç modeli ile talep oluşturun.
            </p>
            <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1A2E] font-bold">
              <Link href={`/teklif-al?brand=${encodeURIComponent(brandDisplayName)}`}>Parça Teklifi Al</Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
