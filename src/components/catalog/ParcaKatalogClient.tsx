"use client";

import { useState, useEffect, useRef, memo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, PackageSearch, Loader2, CheckCircle, Clock, ArrowRight, X, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductItem {
  id:           string;
  partNumber:   string;
  name:         string;
  description:  string | null;
  condition:    "new" | "used" | "remanufactured";
  inStock:      boolean;
  categoryName: string | null;
  imageUrl:     string | null;
  brands:       string[];
}

interface Meta { page: number; limit: number; total: number; pages: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONDITION: Record<string, { label: string; cls: string }> = {
  new:            { label: "Sıfır",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used:           { label: "İkinci El",  cls: "bg-sky-50 text-sky-700 border-sky-200"    },
  remanufactured: { label: "Yenilenmiş", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

const BRANDS = [
  { label: "VOLVO",    href: "/parca-katalog/volvo"    },
  { label: "KOMATSU",  href: "/parca-katalog/komatsu"  },
  { label: "CAT",      href: "/parca-katalog/cat"      },
  { label: "HİDROMEK", href: "/parca-katalog/hidromek" },
  { label: "HAMM",     href: "/parca-katalog/hamm"     },
  { label: "BOMAG",    href: "/parca-katalog/bomag"    },
  { label: "AMMANN",   href: "/parca-katalog/ammann"   },
  { label: "CHAMPION", href: "/parca-katalog/champion" },
] as const;

// ── Card ──────────────────────────────────────────────────────────────────────

const ProductCard = memo(function ProductCard({ item }: { item: ProductItem }) {
  const cond = CONDITION[item.condition] ?? { label: item.condition, cls: "" };
  const waMsg = `Merhaba, ${item.partNumber} numaralı parça için teklif almak istiyorum.`;

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-nidah-yellow/30 hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      <Link href={`/parca-katalog/${encodeURIComponent(item.partNumber)}`} className="flex flex-col flex-1">
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

          {/* Stock badge */}
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

          {/* Condition badge */}
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

          {item.brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {item.brands.slice(0, 3).map((b) => (
                <span key={b} className="text-[10px] font-bold bg-nidah-dark text-white px-2 py-0.5 rounded-md">
                  {b}
                </span>
              ))}
              {item.brands.length > 3 && (
                <span className="text-[10px] text-gray-400 self-center font-medium">+{item.brands.length - 3}</span>
              )}
            </div>
          )}

          {item.categoryName && (
            <span className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-md self-start font-medium">
              {item.categoryName}
            </span>
          )}
        </div>
      </Link>

      {/* CTA row — two actions */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <Link
          href={`/parca-katalog/${encodeURIComponent(item.partNumber)}`}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-nidah-yellow-dark border border-nidah-yellow/40 rounded-xl py-2.5 hover:bg-nidah-yellow hover:text-nidah-dark hover:border-nidah-yellow transition-all duration-200"
        >
          Teklif Al <ArrowRight className="size-3.5" />
        </Link>
        <a
          href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, waMsg)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl py-2.5 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all duration-200"
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>
      </div>
    </div>
  );
});

// ── Card skeleton ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-gray-100 rounded-md w-14" />
          <div className="h-5 bg-gray-100 rounded-md w-14" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-9 bg-gray-50 rounded-xl border border-gray-100" />
      </div>
    </div>
  );
}

// ── Brand chips row ───────────────────────────────────────────────────────────

function BrandChips({
  activeBrand,
  onSelect,
}: {
  activeBrand: string;
  onSelect: (brand: string) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mr-1">Marka:</span>

          {/* All-brands chip */}
          <button
            onClick={() => onSelect("")}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
              activeBrand === ""
                ? "bg-nidah-dark text-white border-nidah-dark shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-nidah-yellow/50 hover:text-nidah-dark"
            }`}
          >
            Tümü
          </button>

          {BRANDS.map((b) => {
            const isActive = activeBrand === b.label;
            return (
              <button
                key={b.label}
                onClick={() => onSelect(isActive ? "" : b.label)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  isActive
                    ? "bg-nidah-yellow text-nidah-dark border-nidah-yellow shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-nidah-yellow/50 hover:text-nidah-dark"
                }`}
              >
                {b.label}
                {isActive && <X className="size-3 ml-0.5" />}
              </button>
            );
          })}

          {/* Separator + brand page links */}
          <span className="hidden sm:inline text-gray-200 mx-1">|</span>
          {BRANDS.slice(0, 4).map((b) => (
            <Link
              key={`link-${b.label}`}
              href={b.href}
              className="hidden lg:inline text-[10px] text-gray-400 hover:text-nidah-yellow-dark underline-offset-2 hover:underline transition-colors"
            >
              {b.label} sayfası →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inner component (needs useSearchParams — requires Suspense boundary) ──────

function CatalogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items,    setItems]    = useState<ProductItem[]>([]);
  const [meta,     setMeta]     = useState<Meta | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [search,   setSearch]   = useState(() => searchParams.get("search") ?? "");
  const [condition, setCondition] = useState(() => searchParams.get("condition") ?? "all");
  const [brand,    setBrand]    = useState(() => searchParams.get("brand") ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [condition, brand]);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (condition !== "all") params.set("condition", condition);
    if (brand) params.set("brand", brand);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `/parca-katalog?${qs}` : "/parca-katalog", { scroll: false });
  }, [debouncedSearch, condition, brand, page, router]);

  const loadProducts = useCallback(async (p: number, s: string, cond: string, br: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "24" });
    if (s) params.set("search", s);
    if (cond !== "all") params.set("condition", cond);
    if (br) params.set("brand", br);
    try {
      const res  = await fetch(`/api/products?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(page, debouncedSearch, condition, brand);
  }, [page, debouncedSearch, condition, brand, loadProducts]);

  const isEmpty = !loading && items.length === 0;
  const hasFilters = debouncedSearch || condition !== "all" || brand;

  return (
    <>
      <BrandChips activeBrand={brand} onSelect={(b) => setBrand(b)} />

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Parça numarası veya ürün adı…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-gray-200 focus:border-nidah-yellow/50 focus:ring-nidah-yellow/20"
              />
              {loading && search && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 border-gray-200">
                <SelectValue placeholder="Koşul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Koşullar</SelectItem>
                <SelectItem value="new">Sıfır</SelectItem>
                <SelectItem value="used">İkinci El</SelectItem>
                <SelectItem value="remanufactured">Yenilenmiş</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 gap-1.5 whitespace-nowrap"
                onClick={() => { setSearch(""); setCondition("all"); setBrand(""); setPage(1); }}
              >
                <X className="size-3.5" /> Temizle
              </Button>
            )}
          </div>
          {/* Active brand pill in filter bar */}
          {brand && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Aktif filtre:</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-nidah-yellow/15 text-nidah-dark border border-nidah-yellow/40 px-3 py-1 rounded-full">
                {brand}
                <button onClick={() => setBrand("")} className="ml-1 hover:text-red-500 transition-colors">
                  <X className="size-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid area */}
      <section className="bg-nidah-light py-10 min-h-[60vh]">
        <div className="container mx-auto px-4">

          {loading && items.length === 0 ? (
            <>
              <div className="h-4 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            </>
          ) : isEmpty ? (
            <div className="text-center py-28">
              <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <PackageSearch className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                {hasFilters ? "Sonuç bulunamadı" : "Henüz ürün eklenmedi"}
              </h3>
              <p className="text-gray-400 max-w-sm mx-auto text-sm mb-6">
                {hasFilters
                  ? `${brand ? `"${brand}" markası için` : ""} farklı bir arama terimi veya filtre deneyin.`
                  : "Katalog yakında güncelleniyor. İhtiyacınız için bizimle iletişime geçin."}
              </p>
              {hasFilters ? (
                <Button variant="outline" onClick={() => { setSearch(""); setCondition("all"); setBrand(""); }}>
                  Filtreleri Temizle
                </Button>
              ) : (
                <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                  <Link href="/teklif-al">Teklif Al</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Result header */}
              <div className="flex items-center justify-between mb-6">
                <p className={`text-sm text-gray-500 transition-opacity ${loading ? "opacity-50" : ""}`}>
                  {brand && (
                    <span className="font-bold text-nidah-yellow-dark mr-2">{brand}</span>
                  )}
                  {meta ? (
                    <><span className="font-bold text-gray-700">{meta.total}</span> ürün bulundu</>
                  ) : (
                    <><span className="font-bold text-gray-700">{items.length}</span> ürün</>
                  )}
                </p>
                {loading && <Loader2 className="size-4 animate-spin text-gray-400" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((item) => <ProductCard key={item.id} item={item} />)}
              </div>

              {meta && meta.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-14">
                  <Button
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="border-gray-200 text-gray-600 hover:border-nidah-yellow/40 hover:text-nidah-dark"
                  >
                    ← Önceki
                  </Button>
                  <span className="text-sm text-gray-500 tabular-nums px-2">
                    Sayfa {meta.page} / {meta.pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= meta.pages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-gray-200 text-gray-600 hover:border-nidah-yellow/40 hover:text-nidah-dark"
                  >
                    Sonraki →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

// ── Main export (wraps inner with Suspense for useSearchParams) ───────────────

export default function ParcaKatalogClient() {
  return (
    <main>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Search className="size-3.5 text-nidah-yellow" />
            <span>VOLVO · KOMATSU · CAT · HİDROMEK · HAMM · BOMAG ve daha fazlası</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Parça Kataloğu</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Parça numarasıyla hızlı arama, marka filtresi ve anlık teklif talebi.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Parça Kataloğu" }]} />

      <Suspense fallback={
        <div className="bg-nidah-light min-h-[60vh] flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-nidah-yellow" />
        </div>
      }>
        <CatalogInner />
      </Suspense>
    </main>
  );
}
