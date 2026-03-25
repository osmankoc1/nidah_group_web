import { Globe2, ArrowRight } from "lucide-react";
import Link from "next/link";

const REGIONS = [
  {
    name: "Amerika Kıtası",
    color: "bg-blue-500",
    countries: [
      { name: "Amerika Birleşik Devletleri", flag: "🇺🇸" },
      { name: "Kanada",                       flag: "🇨🇦" },
      { name: "Meksika",                      flag: "🇲🇽" },
      { name: "Paraguay",                     flag: "🇵🇾" },
      { name: "Arjantin",                     flag: "🇦🇷" },
    ],
  },
  {
    name: "Orta Doğu & Afrika",
    color: "bg-amber-500",
    countries: [
      { name: "Birleşik Arap Emirlikleri", flag: "🇦🇪" },
      { name: "Suudi Arabistan",           flag: "🇸🇦" },
      { name: "Güney Afrika",              flag: "🇿🇦" },
    ],
  },
  {
    name: "Orta Asya & Güney Asya",
    color: "bg-emerald-500",
    countries: [
      { name: "Rusya",       flag: "🇷🇺" },
      { name: "Özbekistan",  flag: "🇺🇿" },
      { name: "Hindistan",   flag: "🇮🇳" },
      { name: "Sri Lanka",   flag: "🇱🇰" },
    ],
  },
] as const;

const KEY_STATS = [
  { value: "13+",  label: "Aktif Ülke"      },
  { value: "3",    label: "Kıta"             },
  { value: "24/7", label: "Teklif Desteği"   },
  { value: "48h",  label: "Ort. Yanıt Süresi"},
] as const;

export default function GlobalReachSection() {
  return (
    <section className="py-24 bg-[#0F1B2D] relative overflow-hidden">

      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nidah-yellow/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow font-medium mb-6">
            <Globe2 className="size-3.5" />
            Uluslararası Operasyon
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Dünya Genelinde Tedarik &amp; İhracat Ağı
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Türkiye merkezli operasyonumuzla 3 kıtada 13'ten fazla ülkeye
            iş makinası yedek parçası tedarik ediyoruz.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {KEY_STATS.map(({ value, label }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center">
              <p className="text-3xl font-bold text-nidah-yellow mb-1">{value}</p>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Regions grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {REGIONS.map((region) => (
            <div
              key={region.name}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] hover:border-white/20 transition-all"
            >
              {/* Region header */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className={`w-2 h-2 rounded-full ${region.color} shrink-0`} />
                <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest">
                  {region.name}
                </h3>
              </div>

              {/* Country list — 2 cols on wider cards */}
              <div className="grid grid-cols-1 gap-y-2">
                {region.countries.map((country) => (
                  <div key={country.name} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <span className="text-base leading-none">{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                ))}
              </div>

              {/* Count */}
              <div className="mt-5 pt-4 border-t border-white/5">
                <span className="text-xs text-gray-600 font-medium">
                  {region.countries.length} ülke / bölge
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA banner */}
        <div className="bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white font-bold text-lg mb-1">
              Ülkenize Parça Gönderelim
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
              Listede ülkenizi görmüyor musunuz? Sorun değil —
              dünya geneline ihracat yapıyoruz. Bize ihtiyacınızı iletin,
              en uygun lojistik çözümü birlikte belirleyelim.
            </p>
          </div>
          <Link
            href="/teklif-al"
            className="shrink-0 inline-flex items-center gap-2 bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 text-sm whitespace-nowrap"
          >
            Teklif Al
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
