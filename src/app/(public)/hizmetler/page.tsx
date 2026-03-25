import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  Droplets,
  RotateCcw,
  Settings2,
  Wrench,
  ShieldCheck,
  ClipboardList,
  Search,
  Cpu,
  MonitorCheck,
  Truck,
  Shield,
  ShoppingBag,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Hizmetlerimiz | NİDAH GROUP",
  description:
    "Yedek parça tedariği, diferansiyel ve şanzıman revizyonu, hidrolik sistem servisi, ECU onarımı ve elektronik sistem desteği — NİDAH GROUP kapsamlı teknik hizmetleri.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hizmetlerimiz | NİDAH GROUP",
    description:
      "Yedek parça tedariği, diferansiyel ve şanzıman revizyonu, hidrolik sistem servisi, ECU onarımı ve elektronik sistem desteği — NİDAH GROUP kapsamlı teknik hizmetleri.",
  },
};

const PARTS_CATEGORIES = [
  { label: "Hidrolik Pompalar & Motorlar" },
  { label: "Diferansiyel & Şanzıman Parçaları" },
  { label: "Motor ve Soğutma Sistemi Parçaları" },
  { label: "Elektrik, Elektronik & Sensörler" },
  { label: "Filtreler ve Genel Yedek Parçalar" },
  { label: "Özel Sipariş & Katalog Dışı Tedarik" },
] as const;

const TECHNICAL_SERVICES = [
  { icon: Settings2,   title: "Diferansiyel Revizyonu",         desc: "Komple söküm, ölçüm, parça değişimi ve test." },
  { icon: RotateCcw,   title: "Şanzıman Revizyonu",             desc: "Hidrolik ve mekanik şanzımanlarda tam revizyon ve teknik destek." },
  { icon: Droplets,    title: "Hidrolik Sistem Revizyonu",      desc: "Pompa, motor, piston ve valf revizyonu." },
  { icon: ShieldCheck, title: "Şasi Onarımı & Tamir",           desc: "Yapısal onarım, kaynak ve tadilat işlemleri." },
  { icon: ClipboardList, title: "Periyodik Bakım",              desc: "Sistematik bakım programı ile önleyici servis." },
  { icon: Search,      title: "Arıza Tespit & Teknik Analiz",   desc: "Dijital teşhis cihazları ile hızlı ve kesin tespit." },
] as const;

const ELECTRONIC_SERVICES = [
  { icon: Cpu,         title: "ECU / Kontrol Ünitesi Tamiri",   desc: "İş makinası ve ağır vasıtalarda ECU teşhis ve onarımı." },
  { icon: MonitorCheck, title: "İş Makinesi Elektronik Servisi", desc: "Ekskavatör, yükleyici ve dozer elektronik bileşen servisi." },
  { icon: Truck,       title: "Kamyon Elektronik Sistemleri",   desc: "Ekipmanlı ve ekipmansız ağır vasıtalarda elektronik servis." },
  { icon: Shield,      title: "Savunma Sanayi Araçları",        desc: "Savunma araçlarının elektronik sistemlerine özel çözümler." },
  { icon: ShoppingBag, title: "Yeni ECU Satışı & Tedarik",      desc: "Stok durumuna göre orijinal ve yeni kontrol üniteleri temini." },
] as const;

export default function HizmetlerPage() {
  return (
    <main>

      {/* ── Hero ── */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Wrench className="size-3.5 text-nidah-yellow" />
            <span>Parça Tedariği · Teknik Servis · Elektronik Sistemler</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Kapsamlı Teknik Hizmetler
          </h1>
          <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
            Yedek parça tedariğinden teknik revizyona, elektronik sistem servisinden
            periyodik bakıma — iş makinanızın tüm ihtiyaçları için tek çatı altında çözüm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
              <Link href="/teklif-al">Teklif Al</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent">
              <Link href="/parca-katalog">Parça Kataloğu</Link>
            </Button>
          </div>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Hizmetler" }]} />

      {/* ── Hizmet Detay Sayfaları ── */}
      <section className="bg-white py-14 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-nidah-dark mb-2">Hizmet Detay Sayfaları</h2>
            <p className="text-nidah-gray text-sm max-w-xl mx-auto">
              Teknik hizmetlerimiz hakkında detaylı bilgi almak için ilgili sayfayı ziyaret edin.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { href: "/hizmetler/hidrolik-pompa-revizyonu", icon: Droplets, title: "Hidrolik Pompa Revizyonu", desc: "Tüm pompa tiplerinde komple revizyon" },
              { href: "/hizmetler/sanziman-revizyonu", icon: RotateCcw, title: "Şanzıman Revizyonu", desc: "Powershift & tüm şanzıman tipleri" },
              { href: "/hizmetler/diferansiyel-revizyonu", icon: Settings2, title: "Diferansiyel Revizyonu", desc: "Aks & tahrik sistemi servisi" },
              { href: "/hizmetler/ecu-elektronik-tamir", icon: Cpu, title: "ECU & Elektronik Tamir", desc: "Kontrol ünitesi onarım & temin" },
              { href: "/hizmetler/periyodik-bakim-ariza-tespit", icon: ClipboardList, title: "Periyodik Bakım", desc: "Dijital teşhis & önleyici bakım" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group flex flex-col bg-nidah-light border border-gray-100 rounded-2xl p-5 hover:border-nidah-yellow/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-4 group-hover:bg-nidah-yellow/20 transition-colors">
                    <Icon className="size-5 text-nidah-yellow-dark" />
                  </div>
                  <h3 className="font-bold text-nidah-dark text-sm mb-1 leading-snug">{s.title}</h3>
                  <p className="text-xs text-nidah-gray leading-relaxed flex-1">{s.desc}</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-nidah-yellow-dark mt-3">
                    Detaylar <ArrowRight className="size-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 1. Yedek Parça Tedariği ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-full px-4 py-1.5 text-sm text-amber-700 font-medium mb-6">
                <Package className="size-3.5" />
                Hizmet 1 / 3
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-5 leading-tight">
                Yedek Parça Tedariği
              </h2>
              <p className="text-nidah-gray leading-relaxed mb-6">
                VOLVO, KOMATSU, CAT, HİDROMEK, CHAMPION, HAMM, BOMAG, AMMANN ve daha pek çok
                marka için hidrolik parçalar, aktarma organı bileşenleri, motor parçaları ve
                elektronik bileşenler. Orijinal, OEM ve muadil seçenekleriyle geniş stok ağı.
                Dünya genelinde 13+ ülkeye DHL ile güvenli ihracat.
              </p>

              <ul className="space-y-2.5 mb-8">
                {[
                  "Orijinal, OEM ve muadil seçenekler",
                  "Parça numarası ile hızlı arama ve doğrulama",
                  "Toplu alımlarda özel fiyatlandırma",
                  "13+ ülkeye DHL ile ihracat",
                  "Stok dışı parçalarda özel tedarik",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-nidah-dark">
                    <CheckCircle2 className="size-4 text-nidah-yellow-dark shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                  <Link href="/teklif-al">Parça Teklifi Al</Link>
                </Button>
                <Button asChild variant="outline" className="border-gray-200 text-nidah-steel hover:border-nidah-yellow/40">
                  <Link href="/parca-katalog">Kataloğu İncele <ArrowRight className="size-4 ml-1" /></Link>
                </Button>
              </div>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PARTS_CATEGORIES.map((c) => (
                <div key={c.label} className="flex items-center gap-3 bg-nidah-light rounded-xl px-4 py-3.5 border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-nidah-yellow shrink-0" />
                  <span className="text-sm font-medium text-nidah-dark">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Teknik Servis & Revizyon ── */}
      <section className="bg-nidah-light py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
            <div>
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200/60 rounded-full px-4 py-1.5 text-sm text-slate-700 font-medium mb-5">
                <Wrench className="size-3.5" />
                Hizmet 2 / 3
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-3">
                Teknik Servis &amp; Revizyon
              </h2>
              <p className="text-nidah-gray text-base max-w-lg">
                Diferansiyelden hidroliğe, bakımdan arıza tespitine kapsamlı atölye ve saha hizmetleri.
                OEM standartlarında parça ve titiz revizyon süreci.
              </p>
            </div>
            <Link
              href="/teklif-al"
              className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-nidah-steel hover:text-nidah-yellow-dark transition-colors whitespace-nowrap"
            >
              Servis Talebi <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECHNICAL_SERVICES.map((s, i) => {
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

      {/* ── 3. Elektronik Sistemler ── */}
      <section className="py-20 md:py-28 bg-[#0A0F1E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-5">
                <Zap className="size-3.5" />
                Hizmet 3 / 3
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Elektronik Sistemler &amp; ECU
              </h2>
              <p className="text-gray-400 text-base max-w-lg">
                İş makinası, kamyon ve savunma sanayi araçlarında elektronik teşhis, onarım ve tedarik.
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
            {ELECTRONIC_SERVICES.map((s) => {
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

      {/* ── Bottom CTA ── */}
      <section className="gradient-cta py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-nidah-dark mb-4">
            İhtiyacınız İçin Teklif Alın
          </h2>
          <p className="text-nidah-dark/75 mb-8 max-w-xl mx-auto">
            Parça, revizyon veya elektronik servis fark etmeksizin teknik ekibimiz
            size en hızlı çözümü sunmak için hazır.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-nidah-dark hover:bg-nidah-navy text-white font-bold">
              <Link href="/teklif-al">Teklif Al</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-nidah-dark text-nidah-dark hover:bg-nidah-dark hover:text-white font-semibold">
              <Link href="/iletisim">İletişime Geçin</Link>
            </Button>
          </div>
        </div>
      </section>

    </main>
  );
}
