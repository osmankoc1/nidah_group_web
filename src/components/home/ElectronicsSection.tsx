import { Cpu, MonitorCheck, Truck, Shield, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

const SERVICES = [
  { icon: Cpu,          title: "ECU / Kontrol Ünitesi Tamiri",         desc: "İş makinesi ve ağır vasıtalara ait ECU'larda teşhis ve onarım." },
  { icon: MonitorCheck, title: "İş Makinesi Elektronik Sistemleri",    desc: "Ekskavatör, yükleyici ve dozer elektronik bileşen servisi." },
  { icon: Truck,        title: "Kamyon Elektronik Sistemleri",         desc: "Ekipmanlı ve ekipmansız tüm ağır vasıtalarda elektronik servis." },
  { icon: Shield,       title: "Savunma Sanayi Araçları",              desc: "Savunma sanayi araçlarının elektronik sistemlerine özel çözümler." },
  { icon: ShoppingBag,  title: "Yeni ECU Satışı & Tedarik",           desc: "Stok durumuna göre orijinal ve yeni kontrol üniteleri temini." },
] as const;

export default function ElectronicsSection() {
  return (
    <section className="py-24 bg-[#0A0F1E] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-5">
              <Zap className="size-3.5" />
              Elektronik Sistem Servisi
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Elektronik Sistemler &amp; ECU
            </h2>
            <p className="text-gray-400 text-base max-w-lg">
              İş makinesi, kamyon ve savunma sanayi araçlarında elektronik teşhis, onarım ve tedarik.
            </p>
          </div>
          <Link
            href="/teklif-al"
            className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm whitespace-nowrap"
          >
            Servis Talebi <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="group bg-white/5 border border-white/8 rounded-2xl p-6 hover:bg-white/8 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Icon className="size-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5 group-hover:text-blue-200 transition-colors">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
