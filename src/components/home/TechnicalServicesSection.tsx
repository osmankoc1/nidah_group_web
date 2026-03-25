import Link from "next/link";
import { Cog, Wrench, Search, ShieldCheck, RotateCcw, ClipboardList, ArrowRight } from "lucide-react";

const SERVICES = [
  { icon: Cog,          title: "Diferansiyel Revizyonu",          desc: "Komple söküm, ölçüm, parça değişimi ve test." },
  { icon: RotateCcw,    title: "Şanzıman Revizyonu",              desc: "Hidrolik ve mekanik şanzımanlarda tam revizyon ve teknik destek." },
  { icon: Wrench,       title: "Hidrolik Sistem Revizyonu",       desc: "Pompa, motor, piston ve valf revizyonu." },
  { icon: ShieldCheck,  title: "Şasi Onarımı & Tamir",           desc: "Yapısal onarım, kaynak ve tadilat işlemleri." },
  { icon: ClipboardList,title: "Periyodik Bakım",                 desc: "Sistematik bakım programı ile önleyici servis." },
  { icon: Search,       title: "Arıza Tespit & Teknik Analiz",   desc: "Dijital teşhis cihazları ile hızlı ve kesin tespit." },
] as const;

export default function TechnicalServicesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-3">Teknik Hizmetler</h2>
            <p className="text-nidah-gray text-base max-w-lg">
              Diferansiyelden hidroliğe, bakımdan arıza tespitine kapsamlı atölye ve saha hizmetleri.
            </p>
          </div>
          <Link
            href="/hizmetler"
            className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-nidah-steel hover:text-nidah-yellow-dark transition-colors whitespace-nowrap"
          >
            Tüm Hizmetler <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            const isDark = i === 0;
            return (
              <div
                key={s.title}
                className={`group rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  isDark
                    ? "bg-nidah-dark border-nidah-dark"
                    : "bg-white border-gray-100 hover:border-nidah-yellow/30"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isDark ? "bg-nidah-yellow/15" : "bg-nidah-yellow/10"}`}>
                  <Icon className={`size-5 ${isDark ? "text-nidah-yellow" : "text-nidah-yellow-dark"}`} />
                </div>
                <h3 className={`font-bold text-sm mb-1.5 ${isDark ? "text-white" : "text-nidah-dark"}`}>{s.title}</h3>
                <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-nidah-gray"}`}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
