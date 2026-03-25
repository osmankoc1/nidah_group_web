import { Droplets, Settings2, Thermometer, Lightbulb, Filter, ArrowRight } from "lucide-react";
import Link from "next/link";

const GROUPS = [
  {
    icon: Droplets,
    title: "Hidrolik Sistem Parçaları",
    desc: "Pompalar, hidromotorlar, pistonlar, valfler ve valf imalatları.",
    iconCls: "text-blue-600 bg-blue-50",
  },
  {
    icon: Settings2,
    title: "Aktarma Organları",
    desc: "Diferansiyel ve şanzıman parçaları, revizyon ve tedarik hizmetleriyle birlikte.",
    iconCls: "text-slate-600 bg-slate-50",
  },
  {
    icon: Thermometer,
    title: "Motor & Soğutma",
    desc: "Motor parçaları ve radyatörler; tüm iş makinesi markalarına uyumlu.",
    iconCls: "text-orange-600 bg-orange-50",
  },
  {
    icon: Lightbulb,
    title: "Elektrik & Elektronik",
    desc: "Farlar, sensörler, elektronik bileşenler ve ECU kontrol üniteleri.",
    iconCls: "text-amber-600 bg-amber-50",
  },
  {
    icon: Filter,
    title: "Filtreler & Genel Parçalar",
    desc: "Tüm marka filtreler ve katalogda olmayan parçaların özel temini.",
    iconCls: "text-green-600 bg-green-50",
  },
] as const;

export default function ProductPortfolioSection() {
  return (
    <section className="py-24 bg-nidah-light">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">Parça Grupları</h2>
          <p className="text-nidah-gray text-lg max-w-xl mx-auto">
            Hidrolikten aktarma organlarına, motordan elektroniğe geniş parça portföyü.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.title}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-nidah-yellow/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${g.iconCls}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="font-bold text-nidah-dark text-sm mb-1.5">{g.title}</h3>
                <p className="text-xs text-nidah-gray leading-relaxed">{g.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/parca-katalog"
            className="inline-flex items-center gap-2 text-sm font-bold text-nidah-steel hover:text-nidah-yellow-dark transition-colors"
          >
            Tüm Parça Kataloğunu İncele <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
