import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe2,
  ShieldCheck,
  Zap,
  Award,
  Cog,
  Cpu,
  Package,
  ArrowRight,
  HardHat,
  Snowflake,
  Truck,
  Shield,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Hakkımızda | NİDAH GROUP",
  description:
    "NİDAH GROUP — 20+ yıllık deneyimle iş makinası yedek parça tedariği, teknik servis ve elektronik sistem onarımında global ölçekte faaliyet gösteren kurumsal çözüm ortağınız.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hakkimizda",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hakkımızda | NİDAH GROUP",
    description:
      "NİDAH GROUP — 20+ yıllık deneyimle iş makinası yedek parça tedariği, teknik servis ve elektronik sistem onarımında global ölçekte faaliyet gösteren kurumsal çözüm ortağınız.",
  },
};

const GLOBAL_STATS = [
  { value: "20+",  label: "Yıl Deneyim"        },
  { value: "13+",  label: "İhracat Ülkesi"      },
  { value: "3",    label: "Hizmet Alanı"         },
  { value: "OEM",  label: "Kalite Standardı"     },
] as const;

const CAPABILITIES = [
  {
    icon: Package,
    title: "Yedek Parça Tedariği",
    desc: "Hidrolik pompalar, şanzımanlar, diferansiyeller, motor parçaları ve elektronik bileşenler. Orijinal, OEM ve muadil seçeneklerle geniş stok ağı.",
    accent: "text-amber-600 bg-amber-50",
  },
  {
    icon: Cog,
    title: "Teknik Servis & Revizyon",
    desc: "Diferansiyel, şanzıman ve hidrolik sistem revizyonu; şasi onarımı; arıza tespit ve periyodik bakım. Atölye ve saha hizmeti.",
    accent: "text-slate-600 bg-slate-50",
  },
  {
    icon: Cpu,
    title: "Elektronik Sistemler",
    desc: "ECU / kontrol ünitesi tamiri ve tedariki. İş makinası, kamyon ve savunma sanayi araçlarının elektronik sistem servisi.",
    accent: "text-blue-600 bg-blue-50",
  },
] as const;

const REGIONS = [
  {
    label: "Amerika",
    countries: ["ABD", "Kanada", "Meksika", "Paraguay", "Arjantin"],
  },
  {
    label: "Orta Doğu & Afrika",
    countries: ["BAE", "Suudi Arabistan", "Güney Afrika"],
  },
  {
    label: "Orta & Güney Asya",
    countries: ["Rusya", "Özbekistan", "Hindistan", "Sri Lanka"],
  },
] as const;

const SECTORS = [
  { icon: HardHat, label: "İş Makineleri"               },
  { icon: Snowflake, label: "Tuz Sericiler"              },
  { icon: Truck, label: "Ekipmanlı / Ekipmansız Kamyonlar" },
  { icon: Shield, label: "Savunma Sanayi Araçları"       },
] as const;

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Güvenilirlik",
    desc: "20+ yıllık deneyim ve başarılı projelerle kazanılmış güven. Her işlemde şeffaflık ve dürüstlük.",
  },
  {
    icon: Award,
    title: "Kalite",
    desc: "OEM standartlarında parça ve revizyon hizmeti. Kalite kontrolden geçmiş her ürün.",
  },
  {
    icon: Zap,
    title: "Hız",
    desc: "Geniş stok ağı ve güçlü lojistik altyapı ile acil durumlarda dahi hızlı teslimat.",
  },
  {
    icon: Globe2,
    title: "Global Erişim",
    desc: "13+ ülkeye DHL ile güvenli ihracat ve uluslararası tedarik kanalları.",
  },
] as const;

export default function HakkimizdaPage() {
  return (
    <main>

      {/* ── Hero ── */}
      <section className="gradient-hero py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
            <Globe2 className="size-3.5 text-nidah-yellow" />
            <span>Türkiye Merkezli · Global Operasyon</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance leading-tight">
            20 Yılı Aşkın Deneyimle<br />
            <span className="text-nidah-yellow">Global İş Makinası Çözümleri</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-14 leading-relaxed">
            Yedek parça tedariği, teknik revizyon ve elektronik sistem servisinde
            Ankara merkezli, dünya genelinde güvenilir çözüm ortağı.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 max-w-2xl mx-auto">
            {GLOBAL_STATS.map(({ value, label }) => (
              <div key={label} className="bg-white/5 px-6 py-5 flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-white leading-none">{value}</span>
                <span className="text-xs text-white/50 tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Hakkımızda" }]} />

      {/* ── Biz Kimiz ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-6 leading-tight">
                Biz Kimiz?
              </h2>
              <p className="text-nidah-gray leading-relaxed mb-5 text-base">
                NİDAH GROUP, 20 yılı aşkın sektör deneyimiyle Ankara merkezli faaliyet gösteren,
                global ölçekte iş makinası yedek parça tedariği, teknik servis ve elektronik sistem
                onarımı alanlarında uzmanlaşmış kurumsal bir çözüm ortağıdır.
              </p>
              <p className="text-nidah-gray leading-relaxed mb-5 text-base">
                Ekskavatör, yükleyici, dozer, greyder, kamyon, tuz serici ve savunma sanayi araçları
                gibi geniş bir araç yelpazesine hizmet veriyoruz. VOLVO, KOMATSU, CAT, HİDROMEK, HAMM,
                BOMAG ve daha pek çok marka için yedek parça temin ediyor; diferansiyel, şanzıman ve
                hidrolik sistem revizyonlarını gerçekleştiriyor; ECU ve elektronik sistemleri onarıyoruz.
              </p>
              <p className="text-nidah-gray leading-relaxed text-base">
                Amerika kıtasından Orta Doğu&apos;ya, Orta Asya&apos;dan Afrika&apos;ya 13+ ülkeye ihracat yapıyor;
                DHL Kargo ve uluslararası lojistik ağımızla dünyanın her noktasına güvenli teslimat sağlıyoruz.
              </p>
            </div>

            <div className="space-y-4">
              {CAPABILITIES.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.title} className="flex items-start gap-4 bg-nidah-light rounded-2xl p-5 border border-gray-100">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.accent}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-nidah-dark text-sm mb-1">{c.title}</h3>
                      <p className="text-xs text-nidah-gray leading-relaxed">{c.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Global Operasyon ── */}
      <section className="bg-nidah-dark py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow font-medium mb-5">
              <Globe2 className="size-3.5" />
              Global Operasyon
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              13+ Ülkeye İhracat ve Tedarik
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto">
              Ankara merkezli operasyonlarımızla dünyanın dört bir yanındaki müşterilerimize
              güvenilir tedarik ve hızlı teslimat sağlıyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {REGIONS.map((region) => (
              <div key={region.label} className="bg-white/5 border border-white/8 rounded-2xl p-6">
                <h3 className="text-nidah-yellow font-bold text-sm mb-3 uppercase tracking-wider">{region.label}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {region.countries.map((c) => (
                    <span key={c} className="text-xs text-gray-400 bg-white/5 border border-white/8 rounded-full px-2.5 py-1">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-xl px-5 py-3 text-sm text-nidah-yellow">
              <MapPin className="size-4 shrink-0" />
              Merkez: Ankara, Türkiye — DHL ile uluslararası teslimat
            </div>
          </div>
        </div>
      </section>

      {/* ── Hizmet Verilen Sektörler ── */}
      <section className="bg-nidah-light py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
              Hizmet Verdiğimiz Sektörler
            </h2>
            <p className="text-nidah-gray text-base max-w-xl mx-auto">
              İnşaattan madenciliğe, karayolu bakımından savunma sanayiine geniş bir sektör yelpazesi.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SECTORS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center hover:shadow-md hover:border-nidah-yellow/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-3">
                    <Icon className="size-6 text-nidah-yellow-dark" />
                  </div>
                  <p className="text-sm font-bold text-nidah-dark leading-snug">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Misyon & Vizyon ── */}
      <section className="bg-white py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-nidah-dark rounded-2xl p-8 md:p-10">
              <div className="w-12 h-12 rounded-xl bg-nidah-yellow/15 flex items-center justify-center mb-5">
                <Zap className="size-6 text-nidah-yellow" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Misyonumuz</h3>
              <p className="text-white/65 leading-relaxed">
                Müşterilerimizin iş makinası operasyonlarını küresel ölçekte
                kesintisiz sürdürebilmeleri için en kaliteli yedek parça, en hızlı teknik servis
                ve güvenilir elektronik sistem desteği sunmak.
              </p>
            </div>

            <div className="bg-nidah-light rounded-2xl border border-gray-100 p-8 md:p-10">
              <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5">
                <Globe2 className="size-6 text-nidah-yellow-dark" />
              </div>
              <h3 className="text-2xl font-bold text-nidah-dark mb-4">Vizyonumuz</h3>
              <p className="text-nidah-gray leading-relaxed">
                İş makinası yedek parça, teknik revizyon ve elektronik sistem servisinde
                Türkiye&apos;nin en güvenilir global markası olmak; ulaştığımız ülke ve müşteri sayısını
                sürekli büyüterek dünya genelinde tanınan bir çözüm ortağı konumuna gelmek.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Değerlerimiz ── */}
      <section className="bg-nidah-light py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-nidah-dark mb-4">Değerlerimiz</h2>
            <p className="text-nidah-gray max-w-xl mx-auto">
              Her projeimizde bu temel değerler doğrultusunda hareket ediyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              const isDark = i === 0;
              return (
                <div
                  key={v.title}
                  className={`rounded-2xl p-6 border transition-all ${isDark ? "bg-nidah-dark border-nidah-dark" : "bg-white border-gray-100 hover:shadow-md hover:border-nidah-yellow/30"}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isDark ? "bg-nidah-yellow/15" : "bg-nidah-yellow/10"}`}>
                    <Icon className={`size-5 ${isDark ? "text-nidah-yellow" : "text-nidah-yellow-dark"}`} />
                  </div>
                  <h3 className={`font-bold text-sm mb-1.5 ${isDark ? "text-white" : "text-nidah-dark"}`}>{v.title}</h3>
                  <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-nidah-gray"}`}>{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="gradient-cta py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-nidah-dark mb-4">
            Bizimle Çalışmak İster misiniz?
          </h2>
          <p className="text-nidah-dark/75 mb-8 max-w-xl mx-auto">
            Yedek parça, teknik servis veya elektronik sistem ihtiyaçlarınız için
            uzman ekibimizle hemen iletişime geçin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-nidah-dark hover:bg-nidah-navy text-white font-bold">
              <Link href="/teklif-al">
                Teklif Al
                <ArrowRight className="size-5 ml-2" />
              </Link>
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
