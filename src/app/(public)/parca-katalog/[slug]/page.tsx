import type { Metadata } from "next";
import { JsonLd } from "@/lib/json-ld";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, Clock, ShieldCheck, HelpCircle,
  MessageCircle, Weight, Tag, Hash, Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { getProductBySegment, type FitmentRow } from "@/lib/queries/product";
import { requirePageEnabled, isPageEnabled, DISABLED_PAGE_METADATA } from "@/lib/site-settings";
import { buildProductJsonLd } from "@/lib/product-jsonld";
import { isCanonicalProductSegment, productPath, productUrl } from "@/lib/product-url";
import { stockPresentationFromStatus } from "@/lib/stock";
import {
  brandClaimAllowed,
  fitmentPresentation,
  isDisplayableNumberType,
  oemNumberPresentation,
  summarizeVerification,
} from "@/lib/verification";
import { SOURCING_TYPE_LABELS } from "@/lib/product-fields";
import ProductGallery from "@/components/catalog/ProductGallery";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONDITION: Record<string, { label: string; cls: string }> = {
  new:            { label: "Sıfır",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used:           { label: "İkinci El",  cls: "bg-sky-50    text-sky-700    border-sky-200"    },
  remanufactured: { label: "Yenilenmiş", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

/**
 * Stok rozetinin görsel sunumu — metin ve ton src/lib/stock.ts'ten gelir.
 * `positive` tonuna yalnızca bir insan `stock_status = 'in_stock'`
 * işaretlediğinde ulaşılır.
 */
const STOCK_CLS = {
  pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  backorder: "bg-orange-50 text-orange-600 border border-orange-200",
  positive:  "bg-green-50 text-green-700 border border-green-200",
} as const;

function machineLabel(mfr: string, model: string, type: string | null) {
  return [mfr.toUpperCase(), model.toUpperCase(), type?.toUpperCase()].filter(Boolean).join(" — ");
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!await isPageEnabled("page_parca_katalog")) return DISABLED_PAGE_METADATA;
  const { slug } = await params;
  const product = await getProductBySegment(slug);

  if (!product) {
    return { ...DISABLED_PAGE_METADATA, title: "Ürün Bulunamadı" };
  }

  const canonical = productUrl(product.partNumber);

  // ── YAYIN KAPISI ───────────────────────────────────────────────────────────
  // `seo_ready = false` iken sayfa indekslenmez. Sitemap'e de girmez
  // (src/app/sitemap.ts). Böylece içeriği hazır olmayan ürünler Google'a
  // ince sayfa olarak sunulmaz (denetim C11).
  if (!product.seoReady) {
    return {
      title: `${product.partNumber} — ${product.name}`,
      robots: { index: false, follow: false },
      alternates: { canonical },
      openGraph: null,
      twitter: null,
    };
  }

  const stock = stockPresentationFromStatus(product.stockStatus);

  // Açıklama önceliği: elle yazılmış meta → kısa açıklama → üretilen özet.
  // Üretilen özette makine markaları "Uyumlu:" önekiyle verilir; parçanın
  // üreticisi AYRI bir alandır ve karıştırılmaz (denetim C9).
  const brands = [...new Set(product.fitments.map((f) => f.manufacturerName))];
  const generated =
    `${product.name} (${product.partNumber}). ` +
    (product.partManufacturer ? `Üretici: ${product.partManufacturer}. ` : "") +
    (brands.length > 0 ? `Uyumlu makineler: ${brands.join(", ")}. ` : "") +
    `${stock.label}. NİDAH GROUP'tan hızlı teklif.`;

  const description =
    product.metaDescription?.trim() || product.shortDescription?.trim() || generated;

  // OG görseli (karar K4). `product.images` YALNIZCA doğrulanmış görselleri
  // içerir (`queries/product.ts` → verified = true), bu yüzden burada
  // doğrulanmamış bir fotoğraf asla og:image olmaz.
  //
  // Doğrulanmış fotoğraf yoksa KURUMSAL kart kullanılır. Temsilî "ürün görseli
  // hazırlanıyor" kartı buraya GİRMEZ: satır içi SVG'nin URL'si yoktur ve
  // olsaydı bile paylaşımlarda ürün fotoğrafı gibi görünürdü. Kurumsal kart
  // ise bir ürünü temsil ettiğini iddia etmez.
  const ogImage = product.images.length > 0
    ? product.images[0].cloudinaryUrl
    : "/opengraph-image";

  const title = product.metaTitle?.trim() || `${product.partNumber} — ${product.name}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | NİDAH GROUP`,
      description,
      url: canonical,
      type: "website",
      images: [{ url: ogImage, width: 800, height: 800, alt: `${product.partNumber} — ${product.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | NİDAH GROUP`,
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

/**
 * Uyumlu makineler.
 *
 * Doğrulanmamış kayıtlar listelenir (kullanıcı için bilgi değeri var) ama
 * "uyumludur" diye KESİN sunulmaz: her satır doğrulama durumunu taşır ve
 * başlık altındaki özet kaç kaydın teyit beklediğini söyler.
 */
function CompatibilitySection({ fitments }: { fitments: FitmentRow[] }) {
  if (fitments.length === 0) return null;

  const summary = summarizeVerification(fitments);

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
          <p className="text-sm text-gray-500 mt-1">{summary.notice}</p>
          <p className="text-xs text-gray-400 mt-1">
            Marka ve model adları makine üreticilerine aittir; bu parçanın
            üreticisini belirtmez.
          </p>
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
                {rows.map((f) => {
                  const state = fitmentPresentation({ verified: f.verified });
                  return (
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

                      {/* Doğrulama durumu — teyitsiz kayıt kesin sunulmaz */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ml-auto ${
                          state.definitive
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                      >
                        {state.definitive
                          ? <ShieldCheck className="w-3 h-3" />
                          : <HelpCircle className="w-3 h-3" />}
                        {state.label}
                      </span>

                      {f.notes && (
                        <span className="text-xs text-gray-400 italic w-full">{f.notes}</span>
                      )}
                    </div>
                  );
                })}
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
  params: Promise<{ slug: string }>;
}) {
  // Admin > Sayfalar > "Parça Kataloğu" toggle'ı tek otoritedir —
  // hub kapalıyken ürün detayları da kapanır, açılınca otomatik yayına girer.
  await requirePageEnabled("page_parca_katalog");

  const { slug } = await params;
  const product = await getProductBySegment(slug);

  if (!product) notFound();

  // Kanonik olmayan yazım (eski `%20` linkleri, tireli/tiresiz varyantlar,
  // büyük harf) kalıcı olarak kanonik segmente yönlendirilir. Yönlendirme
  // HİÇBİR JSX render edilmeden, akış başlamadan önce yapılır.
  if (!isCanonicalProductSegment(slug, product.partNumber)) {
    permanentRedirect(productPath(product.partNumber));
  }

  const cond = CONDITION[product.condition] ?? { label: product.condition, cls: "" };
  const stock = stockPresentationFromStatus(product.stockStatus);
  const brands = [...new Set(product.fitments.map((f) => f.manufacturerName))];

  // Marka iddiası: parçanın KENDİ üreticisi girilmiş VE temin niteliği
  // belirlenmiş olmalı. Makine üreticisi buraya asla girmez (denetim C9).
  const canClaimBrand = brandClaimAllowed({
    partManufacturer: product.partManufacturer,
    sourcingType: product.sourcingType,
  });

  // Sayfada gösterilecek numaralar: `prefixless` yalnızca arama içindir.
  const displayNumbers = product.oemNumbers.filter((o) => isDisplayableNumberType(o.type));

  // Gövde metni: uzun açıklama → kısa açıklama → eski `description`.
  const bodyText =
    product.longDescription?.trim() ||
    product.shortDescription?.trim() ||
    product.description?.trim() ||
    null;

  const whatsappMessage =
    `Merhaba, ${product.partNumber} numaralı "${product.name}" parçası hakkında fiyat bilgisi almak istiyorum.`;
  const whatsappHref = WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, whatsappMessage);

  // JSON-LD — yalnızca DOĞRULANMIŞ bilgi yazılır (karar K5):
  //   brand       → yalnızca `brandClaimAllowed()` true ise
  //   offers      → yalnızca stok durumu bir insan tarafından işaretlendiyse
  //   price       → hiç yazılmaz (RFQ modeli)
  //   image       → yalnızca `product_images.verified = true` görseller;
  //                 `queries/product.ts` listeyi okuma anında süzer. TEMSİLÎ
  //                 görsel buraya GİRMEZ — satır içi SVG'nin URL'si yoktur ve
  //                 olsaydı bile Google merchant listing kuralını ihlal ederdi:
  //                 "Images must represent the marked up content."
  //   review / aggregateRating → YAZILMAZ (gerçek değerlendirme verisi yok)
  //
  // BİLİNEN SINIRLAMA (kabul edilen karar): Google'ın product snippet belgesi
  // `Product` için `offers` / `review` / `aggregateRating`'den BİRİNİ, `Offer`
  // için de `price`'ı zorunlu tutuyor. Fiyat RFQ ile verildiği için bu sayfalar
  // ZENGİN SONUÇ (rich result) üretmeye UYGUN DEĞİL ve Search Console uyarı
  // gösterecek. Bu bir ceza değildir, organik sıralamayı etkilemez. Uydurma
  // fiyat yazmak yerine uyarıyı kabul ediyoruz.
  // Gerekçeler: src/lib/product-jsonld.ts
  const productJsonLd = buildProductJsonLd({
    partNumber: product.partNumber,
    name: product.name,
    description: bodyText,
    categoryName: product.categoryName,
    imageUrls: product.images.map((img) => img.cloudinaryUrl),
    brandName: canClaimBrand ? product.partManufacturer : null,
    availability: stock.schemaAvailability,
  });

  return (
    <>
      <JsonLd data={productJsonLd} />
      <main>
        <PageBreadcrumb items={[
          { label: "Parça Kataloğu", href: "/parca-katalog" },
          { label: product.name },
        ]} currentUrl={productPath(product.partNumber)} />

        {/* Main */}
        <section className="bg-white py-10 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

              {/* Gallery — client component */}
              <div className="lg:sticky lg:top-24 self-start">
                <ProductGallery
                  images={product.images}
                  partNumber={product.partNumber}
                  productName={product.name}
                />
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
                  {product.sourcingType !== "unknown" && (
                    <Badge variant="outline" className="text-sm border-gray-300 text-gray-600">
                      {SOURCING_TYPE_LABELS[product.sourcingType]}
                    </Badge>
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

                {/* Stock status — teyit edilmemiş stok "stokta" olarak sunulmaz */}
                <div className={`inline-flex items-center gap-2 text-sm font-bold rounded-full px-5 py-2 ${STOCK_CLS[stock.tone]}`}>
                  {stock.tone === "positive" ? (
                    <><CheckCircle className="w-4 h-4" /> {stock.label}</>
                  ) : stock.tone === "pending" ? (
                    <><HelpCircle className="w-4 h-4" /> {stock.label}</>
                  ) : (
                    <><Clock className="w-4 h-4" /> {stock.label}</>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {bodyText && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Açıklama</h2>
                    <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{bodyText}</p>
                  </div>
                )}

                {/* Specs grid — parçanın üreticisi BURADA, makine markalarından ayrı */}
                {(product.partManufacturer || product.weight || product.categoryName) && (
                  <div className="grid grid-cols-2 gap-3">
                    {product.partManufacturer && (
                      <SpecTile
                        icon={<Factory className="w-5 h-5 text-[#F59E0B]" />}
                        label="Parça Üreticisi"
                        value={product.partManufacturer}
                      />
                    )}
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

                {/* Uyumlu makine markaları — parçanın üreticisi DEĞİL */}
                {brands.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Uyumlu Makine Markaları
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {brands.slice(0, 6).map((b) => (
                        <Badge key={b} className="bg-[#1A1A2E] text-white text-sm">{b}</Badge>
                      ))}
                      {brands.length > 6 && (
                        <span className="text-xs text-gray-400 self-center">+{brands.length - 6} marka</span>
                      )}
                    </div>
                  </div>
                )}

                {/* OEM / çapraz referans — her numara kendi doğrulama durumuyla */}
                {displayNumbers.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Referans Numaraları
                    </h2>
                    <div className="space-y-2">
                      {displayNumbers.map((o, i) => {
                        const state = oemNumberPresentation({ type: o.type, verified: o.verified });
                        return (
                          <div
                            key={i}
                            className="flex flex-wrap items-center gap-2 text-xs bg-gray-50 border text-gray-700 px-3 py-2 rounded-lg"
                          >
                            <Hash className="w-3 h-3 text-gray-400" />
                            <span className="font-mono font-semibold">{o.oemNumber}</span>
                            {o.manufacturer && (
                              <span className="text-gray-400">({o.manufacturer})</span>
                            )}
                            <span
                              className={`ml-auto inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 ${
                                state.definitive
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-100 text-gray-500 border border-gray-200"
                              }`}
                            >
                              {state.definitive
                                ? <ShieldCheck className="w-3 h-3" />
                                : <HelpCircle className="w-3 h-3" />}
                              {state.label}
                            </span>
                            {o.note && (
                              <span className="w-full text-gray-400 italic">{o.note}</span>
                            )}
                          </div>
                        );
                      })}
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

/**
 * ── ISTEK UZERINE ISR (2026-11-25, Aşama 3) ─────────────────────────────────
 * `generateStaticParams` TANIMLI OLMADIĞINDA Next bu rotayı tamamen dinamik
 * sayar: her istek sayfayı yeniden render eder ve `Cache-Control: no-store`
 * döner. 5.000–50.000 ürünlük katalogda bu, Google'ın her taramasında bir
 * Vercel fonksiyon çağrısı demektir.
 *
 * BOŞ liste döndürmek davranışı şuna çevirir: build sırasında HİÇBİR ürün
 * sorgulanmaz ve HİÇBİR sayfa üretilmez (build süresi ve Neon tüketimi
 * değişmez), ama ilk isteği gelen her ürün sayfası ÜRETİLİP ÖNBELLEĞE alınır
 * ve `revalidate: false` olduğu için süreyle eskimez. Sonraki bütün istekler
 * CDN'den gelir.
 *
 * Tazeleme olay tabanlıdır: admin yazma yolları `revalidateProducts()` çağırır
 * (bkz. `src/lib/revalidate-public.ts`), o da bu yolu ve `/parca-katalog`
 * layout alt ağacını düşürür. Toggle kapatıldığında `/api/admin/settings`
 * `revalidatePath("/", "layout")` çağırdığı için önbellekteki 404'ler de
 * düşer — gerçek 404 davranışı korunur (ölçüldü).
 */
export async function generateStaticParams() {
  return [];
}
