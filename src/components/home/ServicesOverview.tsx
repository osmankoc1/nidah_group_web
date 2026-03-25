import Link from "next/link";
import { Cog, Droplets, Search, Package, ArrowRight } from "lucide-react";

const CORE_SERVICES = [
  {
    icon: Cog,
    title: "Hidrolik Şanzıman Revizyonu",
    desc: "Komple sökme, ölçüm, parça değişimi, montaj ve test tezgahında performans kontrolü.",
    href: "/hizmetler",
  },
  {
    icon: Droplets,
    title: "Hidrolik Pompa Revizyonu",
    desc: "Pistonlu, dişli ve kanatlı tüm pompa tiplerinde revizyon, arıza teşhis ve sıfır pompa tedariki.",
    href: "/hizmetler",
  },
  {
    icon: Search,
    title: "Arıza Tespit & Periyodik Bakım",
    desc: "Dijital teşhis, basınç ve sıcaklık analizleri. Sistematik bakım programı ile arızaları önleyin.",
    href: "/hizmetler",
  },
  {
    icon: Package,
    title: "Yedek Parça Tedariği",
    desc: "VOLVO, KOMATSU, CAT ve daha fazlası. Orijinal, OEM ve muadil — Türkiye ve dünya genelinde teslimat.",
    href: "/parca-katalog",
  },
] as const;

export default function ServicesOverview() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-3">
              Temel Hizmetlerimiz
            </h2>
            <div className="w-12 h-1 bg-nidah-yellow rounded-full" />
          </div>
          <Link
            href="/hizmetler"
            className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-nidah-steel hover:text-nidah-yellow-dark transition-colors"
          >
            Tüm Hizmetler <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* 4-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CORE_SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-lg hover:border-nidah-yellow/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5 group-hover:bg-nidah-yellow/20 transition-colors">
                  <Icon className="size-6 text-nidah-yellow-dark" />
                </div>
                <h3 className="font-bold text-nidah-dark text-sm mb-2 leading-snug group-hover:text-nidah-steel transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-nidah-gray leading-relaxed flex-1">
                  {s.desc}
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold text-nidah-steel group-hover:text-nidah-yellow-dark transition-colors mt-4 pt-3 border-t border-gray-50">
                  Detaylı Bilgi <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
