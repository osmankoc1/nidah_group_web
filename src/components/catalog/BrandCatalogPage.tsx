import Link from "next/link";
import Image from "next/image";
import { PackageSearch, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { db } from "@/lib/db";
import {
  products, productImages, categories,
  fitments, machines, manufacturers,
} from "@/lib/db/schema";
import { eq, and, ilike, asc } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandProductItem {
  id: string;
  partNumber: string;
  name: string;
  condition: "new" | "used" | "remanufactured";
  inStock: boolean;
  categoryName: string | null;
  imageUrl: string | null;
}

interface BrandCatalogPageProps {
  brandSlug: string;
  brandDisplayName: string;
  brandDescription: string;
  brandMachineTypes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONDITION: Record<string, { label: string; cls: string }> = {
  new:            { label: "Sıfır",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used:           { label: "İkinci El",  cls: "bg-sky-50 text-sky-700 border-sky-200" },
  remanufactured: { label: "Yenilenmiş", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

// ── Server component ──────────────────────────────────────────────────────────

export default async function BrandCatalogPage({
  brandSlug,
  brandDisplayName,
  brandDescription,
  brandMachineTypes,
}: BrandCatalogPageProps) {
  // Fetch products for this brand via fitments → machines → manufacturers join
  let brandProducts: BrandProductItem[] = [];

  if (db) {
    try {
      // Get product IDs that fit machines from this manufacturer
      const fitmentRows = await db
        .selectDistinct({ productId: fitments.productId })
        .from(fitments)
        .innerJoin(machines, eq(fitments.machineId, machines.id))
        .innerJoin(manufacturers, eq(machines.manufacturerId, manufacturers.id))
        .where(ilike(manufacturers.name, `%${brandDisplayName}%`));

      const productIds = fitmentRows.map((r) => r.productId);

      if (productIds.length > 0) {
        // Fetch products in batches (drizzle doesn't support IN with large arrays well, but this is fine)
        const productRows = await db
          .select({
            id:           products.id,
            partNumber:   products.partNumber,
            name:         products.name,
            condition:    products.condition,
            inStock:      products.inStock,
            categoryName: categories.name,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(products.isActive, true))
          .orderBy(asc(products.partNumber))
          .limit(100);

        // Filter to only products that match the brand
        const brandProductSet = new Set(productIds);
        const matchedProducts = productRows.filter((p) => brandProductSet.has(p.id));

        // Fetch primary image for each matched product
        if (matchedProducts.length > 0) {
          const imagePromises = matchedProducts.slice(0, 48).map(async (p) => {
            if (!db) return { ...p, imageUrl: null, categoryName: p.categoryName ?? null };
            const imgs = await db
              .select({ cloudinaryUrl: productImages.cloudinaryUrl })
              .from(productImages)
              .where(and(eq(productImages.productId, p.id), eq(productImages.isPrimary, true)))
              .limit(1);
            const imgUrl = imgs[0]?.cloudinaryUrl ?? null;
            // fallback to first image if no primary
            if (!imgUrl) {
              const firstImg = await db
                .select({ cloudinaryUrl: productImages.cloudinaryUrl })
                .from(productImages)
                .where(eq(productImages.productId, p.id))
                .orderBy(asc(productImages.sortOrder))
                .limit(1);
              return { ...p, imageUrl: firstImg[0]?.cloudinaryUrl ?? null, categoryName: p.categoryName ?? null };
            }
            return { ...p, imageUrl: imgUrl, categoryName: p.categoryName ?? null };
          });
          brandProducts = await Promise.all(imagePromises);
        }
      }
    } catch {
      brandProducts = [];
    }
  }

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${brandDisplayName} Yedek Parça`,
    description: `${brandDisplayName} iş makinaları için OEM ve muadil yedek parça kataloğu.`,
    url: `https://www.nidahgroup.com.tr/parca-katalog/${brandSlug}`,
    provider: { "@type": "Organization", name: "NİDAH GROUP" },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
      { "@type": "ListItem", position: 2, name: "Parça Kataloğu", item: "https://www.nidahgroup.com.tr/parca-katalog" },
      { "@type": "ListItem", position: 3, name: `${brandDisplayName} Yedek Parça`, item: `https://www.nidahgroup.com.tr/parca-katalog/${brandSlug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
        ]} />

        {/* Products grid */}
        <section className="bg-nidah-light py-10 min-h-[60vh]">
          <div className="container mx-auto px-4">
            {brandProducts.length > 0 ? (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Bu marka için <span className="font-bold text-gray-700">{brandProducts.length}</span> ürün bulundu
                    {brandProducts.length >= 48 && <span className="text-gray-400"> (ilk 48 gösteriliyor)</span>}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {brandProducts.map((item) => {
                    const cond = CONDITION[item.condition] ?? { label: item.condition, cls: "" };
                    return (
                      <Link
                        key={item.id}
                        href={`/parca-katalog/${encodeURIComponent(item.partNumber)}`}
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
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-nidah-dark to-nidah-steel">
                              <PackageSearch className="w-9 h-9 text-nidah-yellow opacity-70" />
                              <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">{item.partNumber}</span>
                            </div>
                          )}
                          <div className="absolute top-2.5 right-2.5">
                            {item.inStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                                <CheckCircle className="w-2.5 h-2.5" /> Stokta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                                <Clock className="w-2.5 h-2.5" /> Sipariş
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-2.5 left-2.5">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold bg-white/90 backdrop-blur-sm ${cond.cls}`}>
                              {cond.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-4">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <span className="text-[10px] font-mono font-bold text-nidah-yellow-dark tracking-widest uppercase bg-nidah-yellow/8 px-2 py-0.5 rounded">
                              #{item.partNumber}
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
