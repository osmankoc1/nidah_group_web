import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Wrench, AlertTriangle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Diferansiyel Revizyonu | Aks & Tahrik Sistemi Servisi | NİDAH GROUP",
  description:
    "İş makinası ve ağır vasıta diferansiyel revizyonu. Greyder, damperli kamyon, yol silindiri için aks tamiri ve diferansiyel revizyon hizmeti. OEM parça kalitesi, titiz test.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler/diferansiyel-revizyonu",
  },
  openGraph: {
    title: "Diferansiyel Revizyonu | Aks & Tahrik Sistemi Servisi | NİDAH GROUP",
    description:
      "İş makinası ve ağır vasıta diferansiyel revizyonu. Greyder, damperli kamyon, yol silindiri için aks tamiri ve diferansiyel revizyon hizmeti. OEM parça kalitesi, titiz test.",
    url: "https://www.nidahgroup.com.tr/hizmetler/diferansiyel-revizyonu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diferansiyel Revizyonu | Aks & Tahrik Sistemi Servisi | NİDAH GROUP",
    description:
      "İş makinası ve ağır vasıta diferansiyel revizyonu. Greyder, damperli kamyon, yol silindiri için aks tamiri ve diferansiyel revizyon hizmeti. OEM parça kalitesi, titiz test.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Diferansiyel Revizyonu",
  provider: { "@type": "Organization", name: "NİDAH GROUP", url: "https://www.nidahgroup.com.tr" },
  description: "Motorlu greyder, damperli kamyon, yol silindiri ve ekskavatörler için diferansiyel ve aks revizyonu.",
  serviceType: "Diferansiyel & Aks Servisi",
  areaServed: { "@type": "Country", name: "Turkey" },
  url: "https://www.nidahgroup.com.tr/hizmetler/diferansiyel-revizyonu",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
    { "@type": "ListItem", position: 2, name: "Hizmetler", item: "https://www.nidahgroup.com.tr/hizmetler" },
    { "@type": "ListItem", position: 3, name: "Diferansiyel Revizyonu", item: "https://www.nidahgroup.com.tr/hizmetler/diferansiyel-revizyonu" },
  ],
};

const SYMPTOMS = [
  "Dönüşlerde çıkan ses veya tıklama",
  "Titreşim ve sarsıntı",
  "Diferansiyel yağı sızıntısı",
  "Düzensiz lastik aşınması",
  "Araçta çekiş kaybı veya dengesizlik",
  "Aksın aşırı ısınması",
  "ABS veya tahrik sistemi uyarı lambaları",
];

const PROCESS_STEPS = [
  { step: "01", title: "Yağ Boşaltma", desc: "Diferansiyel yağının tahliyesi ve analizi. Yağdaki metal partiküller arıza ipuçları verir." },
  { step: "02", title: "Komple Söküm", desc: "Diferansiyelin araçtan sökülmesi ve tüm bileşenlere ayrılması." },
  { step: "03", title: "Rulman Muayenesi", desc: "Konik ve makaralı rulmanların aşınma kontrolü ve gerekli değişimler." },
  { step: "04", title: "Keçe & Conta Değişimi", desc: "Tüm sızdırmazlık elemanlarının OEM parçalarla değiştirilmesi." },
  { step: "05", title: "Dişli Grubu Kontrolü", desc: "Ringpinyon dişlilerin profil, temas yüzeyinin ve boşluğunun ölçümü." },
  { step: "06", title: "Geri Vurma Ölçümü", desc: "Dişli geri vuruş (backlash) değerinin standart aralıkta olduğunun doğrulanması." },
  { step: "07", title: "Montaj & Ön Yük Ayarı", desc: "Ringpinyon setinin ve diferansiyel kafesinin standartlara göre montaj ve ayarı." },
  { step: "08", title: "Yağ Doldurma & Test", desc: "Doğru viskozitede yağ dolumu ve dinamik test sürüşü." },
];

const VEHICLES = [
  { title: "Motorlu Greyder", brands: "CHAMPION, VOLVO, KOMATSU, CAT" },
  { title: "Damperli Kamyon", brands: "VOLVO, KOMATSU, CAT, LIEBHERR" },
  { title: "Yol Silindiri", brands: "HAMM, BOMAG, AMMANN, DYNAPAC" },
  { title: "Ekskavatör (Tekerlekli)", brands: "VOLVO, KOMATSU, CAT, HİDROMEK" },
  { title: "Kamyonet & Hafif Ticari", brands: "Tüm markalar" },
  { title: "Savunma Araçları", brands: "Özel uygulamalar" },
];

export default function DiferanstiyelRevizyonuPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main>
        {/* Hero */}
        <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
              <Wrench className="size-3.5 text-nidah-yellow" />
              <span>Greyder · Kamyon · Silindir · Ekskavatör</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Diferansiyel Revizyonu
            </h1>
            <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
              İş makinası ve ağır vasıtalarda diferansiyel ve aks tamiri.
              Komple revizyon, OEM parça ve titiz test süreci.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/teklif-al">Servis Talebi Al</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                <Link href="/parca-katalog">Parça Kataloğu</Link>
              </Button>
            </div>
          </div>
        </section>

        <PageBreadcrumb items={[
          { label: "Hizmetler", href: "/hizmetler" },
          { label: "Diferansiyel Revizyonu" },
        ]} />

        {/* Why needed */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-5">
                  Diferansiyel Revizyonu Neden Gereklidir?
                </h2>
                <p className="text-nidah-gray leading-relaxed mb-4">
                  Diferansiyel, aracın dönüş sırasında tekerleklerin farklı hızlarda dönmesini sağlayan kritik bir aktarma organı bileşenidir.
                  Özellikle yoğun off-road kullanımı, aşırı yükleme veya yetersiz yağlama sonucunda diferansiyel bileşenleri
                  hızla aşınır.
                </p>
                <p className="text-nidah-gray leading-relaxed mb-6">
                  Zamanında revize edilmeyen bir diferansiyel; aks kırılması, vites kutusu hasarı ve teker kaybı gibi
                  ciddi kazalara yol açabilir. Düzenli kontrol ve periyodik revizyon, aracınızın güvenli ve verimli
                  çalışmasını sağlar.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-sm font-bold text-amber-800 mb-2">Erken Müdahalenin Faydaları</p>
                  <ul className="space-y-1.5">
                    {["Aks kırılması ve kaza riskinin azaltılması", "Teker ve lastik ömrünün uzatılması", "Yakıt tüketiminin optimizasyonu", "Büyük onarım maliyetlerinin önlenmesi"].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-amber-700">
                        <CheckCircle2 className="size-3.5 shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-nidah-dark mb-6">Arıza Belirtileri</h2>
                <ul className="space-y-3">
                  {SYMPTOMS.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-sm text-nidah-dark bg-nidah-light rounded-xl px-4 py-3 border border-gray-100">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="bg-nidah-light py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Revizyon Sürecimiz
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROCESS_STEPS.map((ps) => (
                <div key={ps.step} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="text-3xl font-black text-nidah-yellow/40 mb-3 leading-none">{ps.step}</div>
                  <h3 className="font-bold text-nidah-dark text-sm mb-2">{ps.title}</h3>
                  <p className="text-xs text-nidah-gray leading-relaxed">{ps.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vehicle types */}
        <section className="bg-white py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-nidah-dark mb-10 text-center">
              Uyumlu Araç Tipleri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VEHICLES.map((v) => (
                <div key={v.title} className="bg-nidah-light rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-nidah-yellow/15 flex items-center justify-center shrink-0">
                      <Settings2 className="size-4 text-nidah-yellow-dark" />
                    </div>
                    <div>
                      <h3 className="font-bold text-nidah-dark text-sm mb-1">{v.title}</h3>
                      <p className="text-xs text-nidah-gray">{v.brands}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="gradient-cta py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-nidah-dark mb-4">Kalite & Güvence</h2>
            <p className="text-nidah-dark/75 mb-4 max-w-xl mx-auto">
              Revizyonu tamamlanan tüm diferansiyeller revizyon raporu ile teslim edilir.
              Doğru teşhis, doğru parça ve titiz uygulama temel ilkemizdir.
            </p>
            <p className="text-nidah-dark/50 text-xs mb-8 max-w-xl mx-auto italic">
              Revizyon ve onarım süreçlerinde sistemin genel durumu ve kullanım koşulları sonuç üzerinde etkili olabilir.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-dark hover:bg-nidah-navy text-white font-bold">
                <Link href="/teklif-al">
                  Servis Talebi Al <ArrowRight className="size-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-nidah-dark text-nidah-dark hover:bg-nidah-dark hover:text-white font-semibold">
                <Link href="/hizmetler">Tüm Hizmetler</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
