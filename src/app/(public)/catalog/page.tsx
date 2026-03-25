"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Package,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PartSummary {
  id: string;
  part_number: string;
  description: string;
  brand_name: string;
  machine_count: number;
  supersession_count: number;
  has_image: boolean;
}

interface SearchResponse {
  parts: PartSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

interface SuggestItem {
  part_number: string;
  description: string;
}

const PAGE_SIZE = 20;

// Known brand prefixes (displayed in filter)
const BRAND_OPTIONS = [
  { label: "Tümü", value: "" },
  { label: "Volvo CE (VOE)", value: "VOE" },
  { label: "Volvo (SA)", value: "SA" },
  { label: "Volvo CE (RM)", value: "RM" },
  { label: "Champion (CH)", value: "CH" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Part Card ──────────────────────────────────────────────────────────────────
function PartCard({ part }: { part: PartSummary }) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {part.part_number}
          </Badge>
          {part.has_image && (
            <span title="Diyagram mevcut">
                <ImageIcon className="w-3.5 h-3.5 text-nidah-steel shrink-0 mt-0.5" aria-hidden="true" />
              </span>
          )}
        </div>
        <CardTitle className="text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
          {part.description || "—"}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <div className="flex flex-wrap gap-1.5">
          {part.brand_name && (
            <Badge className="text-[10px] bg-nidah-navy text-white px-2 py-0.5">
              {part.brand_name}
            </Badge>
          )}
          {part.machine_count > 0 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-nidah-gray">
              {part.machine_count} makine
            </Badge>
          )}
          {part.supersession_count > 0 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-amber-600 border-amber-300">
              {part.supersession_count} süpersesyon
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/catalog/${encodeURIComponent(part.id)}`}>Detay</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="flex-1 bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-semibold"
        >
          <Link
            href={`/teklif-al?partNumber=${encodeURIComponent(part.part_number)}`}
          >
            Teklif Al
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [query, setQuery]           = useState("");
  const [brand, setBrand]           = useState("");
  const [page, setPage]             = useState(1);
  const [results, setResults]       = useState<SearchResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [serviceError, setServiceError] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions]   = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const inputWrapRef    = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 400);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchResults = useCallback(async (q: string, p: number, br: string) => {
    setLoading(true);
    setServiceError(false);
    try {
      const qs = new URLSearchParams({ q, page: String(p), pageSize: String(PAGE_SIZE) });
      if (br) qs.set("brand", br);
      const res  = await fetch(`/api/catalog/search?${qs}`);
      const data: SearchResponse = await res.json();
      if (!res.ok || data.error) setServiceError(true);
      setResults(data);
    } catch {
      setServiceError(true);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults(debouncedQuery, page, brand);
  }, [debouncedQuery, page, brand, fetchResults]);

  // Reset page when query or brand changes
  useEffect(() => { setPage(1); }, [debouncedQuery, brand]);

  // ── Autocomplete ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestAbortRef.current?.abort();
    const ctrl  = new AbortController();
    suggestAbortRef.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(
          `/api/catalog/suggest?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSuggestions(true);
      } catch { /* AbortError expected */ }
    }, 200);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSuggestionClick = (item: SuggestItem) => {
    setQuery(item.part_number);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setQuery("");
    setBrand("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const hasFilters = query || brand;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="gradient-hero py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Canlı Parça Kataloğu
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Stok veritabanımızda binlerce parça numarasını gerçek zamanlı
            olarak arayın ve sorgulayın.
          </p>
        </div>
      </section>

      {/* ── Search + Filters ──────────────────────────────────────────────── */}
      <section className="bg-white border-b py-5 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">

            {/* Search input */}
            <div ref={inputWrapRef} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nidah-gray pointer-events-none" />
              <Input
                type="text"
                placeholder="Parça numarası ile arayın…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="pl-10 pr-9 h-11 text-base"
                aria-label="Parça ara"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nidah-gray hover:text-nidah-dark transition-colors"
                  aria-label="Aramayı temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        onMouseDown={() => handleSuggestionClick(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-nidah-light flex items-center gap-3 transition-colors"
                      >
                        <Package className="w-4 h-4 text-nidah-steel shrink-0" />
                        <span className="font-mono text-sm font-semibold text-nidah-dark">
                          {s.part_number}
                        </span>
                        {s.description && (
                          <span className="text-sm text-nidah-gray truncate">
                            — {s.description}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Brand filter */}
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-nidah-dark min-w-[160px] focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Marka filtresi"
            >
              {BRAND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Clear all */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearSearch} className="h-11 shrink-0">
                <RefreshCw className="w-4 h-4 mr-1" />
                Sıfırla
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <section className="bg-nidah-light py-12 min-h-[400px]">
        <div className="container mx-auto px-4">

          {/* Service error */}
          {serviceError && !loading && (
            <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Katalog servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar
              deneyin veya{" "}
              <Link href="/iletisim" className="underline font-medium hover:text-orange-900">
                bizimle iletişime geçin
              </Link>
              .
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-nidah-steel" />
              <p className="text-nidah-gray text-sm">Aranıyor…</p>
            </div>
          )}

          {/* Results grid */}
          {!loading && results && results.parts.length > 0 && (
            <>
              <p className="text-sm text-nidah-gray mb-6">
                <span className="font-semibold text-nidah-dark">
                  {results.total.toLocaleString("tr-TR")}
                </span>{" "}
                parça bulundu
                {(query || brand) && (
                  <>
                    {" "}—{" "}
                    {query && (
                      <span className="font-mono text-nidah-dark">&quot;{query}&quot;</span>
                    )}
                    {query && brand && " / "}
                    {brand && (
                      <span className="text-nidah-dark">{BRAND_OPTIONS.find(o => o.value === brand)?.label ?? brand}</span>
                    )}
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {results.parts.map((part) => (
                  <PartCard key={part.id} part={part} />
                ))}
              </div>

              {/* Pagination */}
              {results.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <Button
                    variant="outline" size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki
                  </Button>
                  <span className="text-sm text-nidah-gray px-2">
                    Sayfa{" "}
                    <span className="font-semibold text-nidah-dark">{page}</span>
                    {" "}/ {results.totalPages.toLocaleString("tr-TR")}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= results.totalPages}
                    onClick={() => setPage((p) => Math.min(results.totalPages, p + 1))}
                  >
                    Sonraki
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!loading && results && results.parts.length === 0 && !serviceError && (
            <div className="text-center py-20">
              <PackageSearch className="w-16 h-16 text-nidah-gray/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-nidah-dark mb-2">Sonuç Bulunamadı</h3>
              <p className="text-nidah-gray max-w-md mx-auto">
                {hasFilters
                  ? `Seçili filtrelerle eşleşen parça bulunamadı. Farklı bir arama terimi veya marka deneyin.`
                  : "Katalog yükleniyor veya henüz kayıt bulunmuyor."}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-5" onClick={clearSearch}>
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-white py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-nidah-dark mb-3">
            Aradığınız Parçayı Bulamadınız mı?
          </h2>
          <p className="text-nidah-gray mb-6 max-w-lg mx-auto">
            Kataloğumuzda olmayan parçalar için de tedarik hizmeti sunuyoruz.
            Parça numaranızı paylaşın, en kısa sürede size dönelim.
          </p>
          <Button
            asChild size="lg"
            className="bg-nidah-dark hover:bg-nidah-navy text-white font-semibold"
          >
            <Link href="/iletisim">İletişime Geçin</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
