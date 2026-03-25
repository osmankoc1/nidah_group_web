import { BRANDS } from "@/lib/constants";
import { Globe, TrendingUp } from "lucide-react";

// Extra brands beyond the main 8 — shown as text list
const ALSO_SUPPORTED = ["LIEBHERR", "JOHN DEERE", "HITACHI", "DOOSAN", "CASE", "JCB", "TADANO", "MANITOWOC"];

export default function BrandsSection() {
  return (
    <section className="py-20 bg-nidah-light">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow-dark font-medium mb-5">
            <TrendingUp className="size-3.5" />
            Orijinal · OEM · Muadil
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">
            Hizmet Verdiğimiz Markalar
          </h2>
          <p className="text-nidah-gray text-lg max-w-2xl mx-auto leading-relaxed">
            Dünyanın önde gelen iş makinası markalarına orijinal, OEM ve muadil
            yedek parça tedariki — Türkiye&apos;den dünyaya.
          </p>
        </div>

        {/* Main brands grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {BRANDS.map((brand, i) => (
            <div
              key={brand.slug}
              className="group relative bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-nidah-yellow/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
            >
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-nidah-yellow/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Brand initial circle */}
              <div className="w-12 h-12 rounded-full bg-nidah-dark/5 flex items-center justify-center mb-3 group-hover:bg-nidah-yellow/10 transition-colors">
                <span className="text-lg font-black text-nidah-dark/50 group-hover:text-nidah-yellow-dark transition-colors">
                  {brand.name[0]}
                </span>
              </div>

              <span className="text-base font-bold text-nidah-dark tracking-wide leading-tight">
                {brand.name}
              </span>
              <span className="text-xs text-nidah-gray/60 mt-1">İş Makinası</span>

              {/* Rank badge */}
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-nidah-dark/5 flex items-center justify-center">
                <span className="text-[9px] font-bold text-nidah-dark/30">{i + 1}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Also supported */}
        <div className="bg-white/70 border border-gray-100 rounded-xl px-6 py-4 flex flex-wrap items-center gap-3 mb-10">
          <span className="text-xs font-semibold text-nidah-gray/60 uppercase tracking-wider shrink-0">
            Ayrıca:
          </span>
          {ALSO_SUPPORTED.map((b) => (
            <span key={b} className="text-xs font-semibold text-nidah-dark/50 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
              {b}
            </span>
          ))}
          <span className="text-xs text-nidah-gray/40 ml-1">ve daha fazlası…</span>
        </div>

        {/* Global note */}
        <div className="flex items-center justify-center gap-3 text-sm text-nidah-gray">
          <Globe className="size-4 text-nidah-yellow-dark shrink-0" />
          <span>
            Tüm bu markalara ait yedek parçalar <strong className="text-nidah-dark">13&apos;ten fazla ülkeye</strong> ihraç edilmektedir.
            Türkiye, ABD, BAE, Suudi Arabistan, Rusya ve daha fazlası.
          </span>
        </div>
      </div>
    </section>
  );
}
