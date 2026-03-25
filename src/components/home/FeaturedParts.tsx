import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { products } from "@/data/products";
import { Package, ArrowRight, ChevronRight } from "lucide-react";

const CONDITION_STYLE: Record<string, { cls: string; label: string }> = {
  Yeni:        { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Sıfır" },
  "İkinci El": { cls: "bg-sky-50 text-sky-700 border-sky-200",            label: "İkinci El" },
  Yenilenmiş:  { cls: "bg-violet-50 text-violet-700 border-violet-200",   label: "Yenilenmiş" },
};

export default function FeaturedParts() {
  const featured = products.slice(0, 4);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow-dark font-medium mb-4">
              <Package className="size-3.5" />
              Parça Kataloğu
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark">
              Öne Çıkan Parçalar
            </h2>
          </div>
          <Link
            href="/parca-katalog"
            className="text-sm font-semibold text-nidah-steel hover:text-nidah-yellow-dark transition-colors inline-flex items-center gap-1 shrink-0"
          >
            Tümünü Gör <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {featured.map((product) => {
            const cond = CONDITION_STYLE[product.condition] ?? { cls: "", label: product.condition };
            return (
              <Link
                key={product.slug}
                href={`/parca-katalog/${product.slug}`}
                className="group flex flex-col bg-white rounded-2xl border border-gray-100 hover:border-nidah-yellow/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Image / placeholder */}
                <div className="relative h-44 bg-gradient-to-br from-nidah-dark to-nidah-steel flex items-center justify-center overflow-hidden">
                  <Package className="size-16 text-white/10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }} />
                  {/* Condition badge overlay */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className={`text-xs font-semibold bg-white/90 backdrop-blur-sm ${cond.cls}`}>
                      {cond.label}
                    </Badge>
                  </div>
                  {/* Part number bottom left */}
                  <div className="absolute bottom-3 left-3">
                    <span className="font-mono text-xs text-white/50 tracking-wider">
                      {product.partNumber}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5 gap-2">
                  <p className="text-xs font-bold text-nidah-yellow-dark uppercase tracking-wider">
                    {product.brand}
                  </p>
                  <h3 className="text-sm font-bold text-nidah-dark leading-snug group-hover:text-nidah-steel transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-nidah-gray leading-relaxed line-clamp-2 mt-1 flex-1">
                    {product.description}
                  </p>
                </div>

                {/* CTA footer */}
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-nidah-steel group-hover:text-nidah-yellow-dark transition-colors border-t border-gray-50 pt-4">
                    <span>Detay & Teklif Al</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <Button
            asChild
            size="lg"
            className="bg-nidah-dark hover:bg-nidah-navy text-white px-10 h-12 text-base rounded-xl transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
          >
            <Link href="/parca-katalog">
              Tüm Kataloğu İncele
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
