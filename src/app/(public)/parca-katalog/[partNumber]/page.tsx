import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Package, CheckCircle, Clock,
  MessageCircle, Weight, Tag, Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { getProductByPartNumber, type FitmentRow } from "@/lib/queries/product";
import ProductGallery from "@/components/catalog/ProductGallery";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONDITION: Record<string, { label: string; cls: string }> = {
  new:            { label: "Sıfır",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used:           { label: "İkinci El",  cls: "bg-sky-50    text-sky-700    border-sky-200"    },
  remanufactured: { label: "Yenilenmiş", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

function machineLabel(mfr: string, model: string, type: string | null) {
  return [mfr.toUpperCase(), model.toUpperCase(), type?.toUpperCase()].filter(Boolean).join(" — ");
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}): Promise<Metadata> {
  const { partNumber } = await params;
  const decodedPN = decodeURIComponent(partNumber);
  const product = await getProductByPartNumber(decodedPN);

  if (!product) {
    return { title: "Ürün Bulunamadı | NİDAH GROUP" };
  }

  const brands = [...new Set(product.fitments.map((f) => f.manufacturerName))];
  const brandStr = brands.length > 0 ? `${brands.join(", ")}. ` : "";
  const stockStr = product.inStock ? "Stokta mevcut." : "Sipariş üzerine.";
  const description = `${product.name} (${product.partNumber}). ${brandStr}${stockStr} NİDAH GROUP'tan hızlı teklif ve dünya geneline teslimat.`;
  const canonical = `https://www.nidahgroup.com.tr/parca-katalog/${product.partNumber}`;
  const ogImage = product.images.length > 0
    ? product.images[0].cloudinaryUrl
    : "/opengraph-image";

  return {
    title: `${product.partNumber} — ${product.name} | NİDAH GROUP`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${product.partNumber} — ${product.name} | NİDAH GROUP`,
      description,
      url: canonical,
      type: "website",
      images: [{ url: ogImage, width: 800, height: 800, alt: `${product.partNumber} — ${product.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.partNumber} — ${product.name} | NİDAH GROUP`,
      description,
      images: [ogImage],
    },
  };
}

// ── Inner components (server-rendered) ───────────────────────────────────────

function SpecTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3 border border-gray-100">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function CompatibilitySection({ fitments }: { fitments: FitmentRow[] }) {
  if (fitments.length === 0) return null;

  const byBrand = fitments.reduce<Record<string, FitmentRow[]>>((acc, f) => {
    const key = f.manufacturerName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <section className="bg-gray-50 border-t py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Uyumlu Makineler</h2>
          <p className="text-sm text-gray-500 mt-1">{fitments.length} makine uyumu tespit edildi</p>
        </div>

        <div className="space-y-4">
          {Object.entries(byBrand).map(([brand, rows]) => (
            <div key={brand} className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3 bg-[#1A1A2E]">
                <span className="font-bold text-white tracking-wide">{brand.toUpperCase()}</span>
                <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 text-xs ml-auto">
                  {rows.length} model
                </Badge>
              </div>

              <div className="divide-y divide-gray-50">
                {rows.map((f) => (
                  <div key={f.id} className="px-5 py-3 flex flex-wrap items-center gap-3 hover:bg-gray-50 transition-colors">
                    <span className="font-semibold text-sm text-gray-800 min-w-[140px]">
                      {machineLabel(f.manufacturerName, f.machineModel, f.machineType)}
                    </span>

                    {f.variantName && (
                      <Badge className="bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/30 text-xs font-semibold">
                        Varyant: {f.variantName}
                      </Badge>
                    )}

                    {(f.yearFrom || f.yearTo) && (
                      <span className="text-xs text-gray-400 font-mono">
                        {f.yearFrom ?? "?"} – {f.yearTo ?? "günümüz"}
                      </span>
                    )}

                    {f.notes && (
                      <span className="text-xs text-gray-400 italic">{f.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}) {
  const { partNumber } = await params;
  const decodedPN = decodeURIComponent(partNumber);
  const product = await getProductByPartNumber(decodedPN);

  if (!product) notFound();

  const cond = CONDITION[product.condition] ?? { label: product.condition, cls: "" };
  const brands = [...new Set(product.fitments.map((f) => f.manufacturerName))];

  const whatsappMessage =
    `Merhaba, ${product.partNumber} numaralı "${product.name}" parçası hakkında fiyat bilgisi almak istiyorum.`;
  const whatsappHref = WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, whatsappMessage);

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.partNumber,
    description: product.description ?? undefined,
    brand: brands.length > 0 ? { "@type": "Brand", name: brands[0] } : undefined,
    image: product.images.map((img) => img.cloudinaryUrl),
    category: product.categoryName ?? undefined,
    offers: {
      "@type": "Offer",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://www.nidahgroup.com.tr/parca-katalog/${product.partNumber}`,
      seller: { "@type": "Organization", name: "NİDAH GROUP" },
      priceCurrency: "USD",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
      { "@type": "ListItem", position: 2, name: "Parça Kataloğu", item: "https://www.nidahgroup.com.tr/parca-katalog" },
      { "@type": "ListItem", position: 3, name: product.name, item: `https://www.nidahgroup.com.tr/parca-katalog/${product.partNumber}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main>
        <PageBreadcrumb items={[
          { label: "Parça Kataloğu", href: "/parca-katalog" },
          { label: product.name },
        ]} />

        {/* Main */}
        <section className="bg-white py-10 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

              {/* Gallery — client component */}
              <div className="lg:sticky lg:top-24 self-start">
                <ProductGallery images={product.images} partNumber={product.partNumber} />
              </div>

              {/* Info panel */}
              <div className="space-y-6">

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${cond.cls} text-sm font-semibold px-3`}>
                    {cond.label}
                  </Badge>
                  {product.categoryName && (
                    <Badge variant="secondary" className="text-sm">{product.categoryName}</Badge>
                  )}
                  {brands.slice(0, 4).map((b) => (
                    <Badge key={b} className="bg-[#1A1A2E] text-white text-sm">{b}</Badge>
                  ))}
                  {brands.length > 4 && (
                    <span className="text-xs text-gray-400">+{brands.length - 4} marka</span>
                  )}
                </div>

                {/* Name + part number */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-gray-500 text-sm tracking-wider uppercase">
                      {product.partNumber}
                    </span>
                  </div>
                </div>

                {/* Stock status */}
                <div className={`inline-flex items-center gap-2 text-sm font-bold rounded-full px-5 py-2
                  ${product.inStock
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-orange-50 text-orange-600 border border-orange-200"}`}
                >
                  {product.inStock ? (
                    <><CheckCircle className="w-4 h-4" /> Stokta Mevcut</>
                  ) : (
                    <><Clock className="w-4 h-4" /> Sipariş Üzerine</>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {product.description && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Açıklama</h2>
                    <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
                  </div>
                )}

                {/* Specs grid */}
                {(product.weight || product.categoryName) && (
                  <div className="grid grid-cols-2 gap-3">
                    {product.weight && (
                      <SpecTile
                        icon={<Weight className="w-5 h-5 text-[#F59E0B]" />}
                        label="Ağırlık"
                        value={`${product.weight} kg`}
                      />
                    )}
                    {product.categoryName && (
                      <SpecTile
                        icon={<Tag className="w-5 h-5 text-[#F59E0B]" />}
                        label="Kategori"
                        value={product.categoryName}
                      />
                    )}
                  </div>
                )}

                {/* OEM numbers */}
                {product.oemNumbers.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                      OEM / Çapraz Referans
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {product.oemNumbers.map((o, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 font-mono text-xs bg-gray-50 border text-gray-700 px-3 py-1.5 rounded-lg"
                        >
                          <Hash className="w-3 h-3 text-gray-400" />
                          <span className="font-semibold">{o.oemNumber}</span>
                          {o.manufacturer && (
                            <span className="text-gray-400">({o.manufacturer})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTAs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1A2E] font-bold shadow-lg shadow-amber-200/50 transition-all hover:shadow-amber-300/50 hover:-translate-y-0.5"
                  >
                    <Link href={`/teklif-al?partNumber=${encodeURIComponent(product.partNumber)}`}>
                      Fiyat Teklifi Al
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-200/50 transition-all hover:shadow-green-300/50 hover:-translate-y-0.5"
                  >
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp ile Sor
                    </a>
                  </Button>
                </div>

                {/* Quick info note */}
                <p className="text-xs text-gray-400 text-center">
                  Ücretsiz fiyat teklifi · Hızlı yanıt · Güvenli ödeme
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Compatibility */}
        <CompatibilitySection fitments={product.fitments} />

        {/* Bottom CTA */}
        <section className="bg-[#1A1A2E] py-14">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Aradığınız Parçayı Bulamadınız mı?</h2>
            <p className="text-gray-400 mb-7 max-w-lg mx-auto text-sm">
              Katalogumuzda bulunmayan parçalar için de tedarik hizmeti sunuyoruz.
            </p>
            <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1A2E] font-bold">
              <Link href="/iletisim">İletişime Geçin</Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
