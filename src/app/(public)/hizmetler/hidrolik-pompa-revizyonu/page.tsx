import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Wrench, AlertTriangle, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Hidrolik Pompa Revizyonu | İş Makinası Hidrolik Servis | NİDAH GROUP",
  description:
    "İş makinası hidrolik pompa revizyonu hizmeti. Ekskavatör, yükleyici, dozer, greyder için dişli, pistonlu ve paletli pompa revizyonu. OEM kalitesinde parça, titiz test.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler/hidrolik-pompa-revizyonu",
  },
  openGraph: {
    title: "Hidrolik Pompa Revizyonu | İş Makinası Hidrolik Servis | NİDAH GROUP",
    description:
      "İş makinası hidrolik pompa revizyonu hizmeti. Ekskavatör, yükleyici, dozer, greyder için dişli, pistonlu ve paletli pompa revizyonu. OEM kalitesinde parça, titiz test.",
    url: "https://www.nidahgroup.com.tr/hizmetler/hidrolik-pompa-revizyonu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hidrolik Pompa Revizyonu | İş Makinası Hidrolik Servis | NİDAH GROUP",
    description:
      "İş makinası hidrolik pompa revizyonu hizmeti. Ekskavatör, yükleyici, dozer, greyder için dişli, pistonlu ve paletli pompa revizyonu. OEM kalitesinde parça, titiz test.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Hidrolik Pompa Revizyonu",
  provider: { "@type": "Organization", name: "NİDAH GROUP", url: "https://www.nidahgroup.com.tr" },
  description: "İş makinaları için dişli pompa, pistonlu pompa ve palet tipi pompa revizyonu. OEM kalitesinde parça ve kapsamlı test süreci.",
  serviceType: "Hidrolik Sistem Servisi",
  areaServed: { "@type": "Country", name: "Turkey" },
  url: "https://www.nidahgroup.com.tr/hizmetler/hidrolik-pompa-revizyonu",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
    { "@type": "ListItem", position: 2, name: "Hizmetler", item: "https://www.nidahgroup.com.tr/hizmetler" },
    { "@type": "ListItem", position: 3, name: "Hidrolik Pompa Revizyonu", item: "https://www.nidahgroup.com.tr/hizmetler/hidrolik-pompa-revizyonu" },
  ],
};

const PUMP_TYPES = [
  {
    title: "Dişli Pompalar",
    desc: "En yaygın hidrolik pompa tipi. Basit yapısı ve dayanıklılığıyla yükleyici ve kompaktörlerde yoğun kullanım alanı bulur. İç dişli ve dış dişli tüm varyantlar.",
  },
  {
    title: "Eksenel Pistonlu Pompalar",
    desc: "Yüksek basınç ve debi gerektiren ekskavatör ve ağır dozer uygulamalarında tercih edilen pompa tipi. Değişken deplasmanlı modeller dahil.",
  },
  {
    title: "Palet (Vane) Pompalar",
    desc: "Düşük gürültü seviyesi ve stabil basınç üretimiyle öne çıkan pompa tipi. Endüstriyel ve hafif iş makinalarında kullanılır.",
  },
  {
    title: "Radyal Pistonlu Pompalar",
    desc: "Çok yüksek basınç gerektiren özel uygulamalar için. Kompakt boyutlarda yüksek güç yoğunluğu sağlar.",
  },
];

const SYMPTOMS = [
  "Düşük sistem basıncı veya güç kaybı",
  "Anormal ses (uğultu, tıklama, çığlık)",
  "Aşırı sıcaklık artışı",
  "Yavaş veya zorlanarak yapılan hidrolik hareketler",
  "Pompa gövdesinde yağ sızıntısı",
  "Yüksek gürültü ve titreşim",
  "Hidrolik yağ kirlenmesi veya renk değişimi",
];

const PROCESS_STEPS = [
  { step: "01", title: "Söküm & Temizlik", desc: "Pompanın araçtan güvenli söküm işlemi ve tüm bileşenlerin ultrasonik temizliği." },
  { step: "02", title: "Boyut Ölçümü", desc: "Tüm tolerans değerlerinin hassas ölçüm aletleri ile kontrolü ve standartlarla karşılaştırılması." },
  { step: "03", title: "Görsel Muayene", desc: "Çizik, korozyon, kavitasyon hasarı ve anormal aşınma izlerinin tespiti." },
  { step: "04", title: "Arıza Tespiti", desc: "Pompa veriminin test tezgahında basınç-debi eğrisiyle karşılaştırmalı analizi." },
  { step: "05", title: "Parça Değişimi", desc: "OEM standartlarında rulman, sızdırmazlık elemanı, silindir bloğu ve pistonların değişimi." },
  { step: "06", title: "Montaj", desc: "Belirlenmiş tork değerleri ve prosedürlerine göre pompa montajı." },
  { step: "07", title: "Test & Kalibrasyon", desc: "Yüksek basınç altında sızdırmazlık, debi ve verimlilik testleri." },
  { step: "08", title: "Raporlama", desc: "Yapılan işlemler, kullanılan parçalar ve test sonuçlarını içeren revizyon raporu." },
];

const BRANDS = ["VOLVO", "KOMATSU", "CAT", "HİDROMEK", "LIEBHERR", "DOOSAN", "HITACHI", "HAMM", "BOMAG", "AMMANN"];

export default function HidrolikPompaRevizyonuPage() {
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
              <span>Teknik Servis · Revizyon · Uzman Ekip</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Hidrolik Pompa Revizyonu
            </h1>
            <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
              Tüm marka ve tiplerde iş makinası hidrolik pompalarının komple revizyonu.
              OEM kalitesinde parça, hassas test ve kapsamlı revizyon süreci.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/teklif-al">Servis Talebi Al</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent">
                <Link href="/parca-katalog">Parça Kataloğu</Link>
              </Button>
            </div>
          </div>
        </section>

        <PageBreadcrumb items={[
          { label: "Hizmetler", href: "/hizmetler" },
          { label: "Hidrolik Pompa Revizyonu" },
        ]} />

        {/* Pump types */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Hangi Pompa Türlerine Hizmet Veriyoruz?
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Tüm hidrolik pompa tiplerinde komple revizyon, parça değişimi ve test hizmeti sunuyoruz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PUMP_TYPES.map((pt) => (
                <div key={pt.title} className="bg-nidah-light border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-nidah-yellow/30 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-nidah-yellow/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Settings2 className="size-4 text-nidah-yellow-dark" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-base">{pt.title}</h3>
                  </div>
                  <p className="text-nidah-gray text-sm leading-relaxed">{pt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Symptoms */}
        <section className="bg-nidah-light py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-5">
                  Arıza Belirtileri
                </h2>
                <p className="text-nidah-gray mb-8">
                  Hidrolik pompa revizyonu gerektiren durumları zamanında tespit etmek, büyük maliyetlerin önüne geçer.
                  Aşağıdaki belirtileri fark ettiğinizde gecikmeden teknik ekibimize başvurun.
                </p>
                <ul className="space-y-3">
                  {SYMPTOMS.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-sm text-nidah-dark">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5">
                  <ShieldCheck className="size-6 text-nidah-yellow-dark" />
                </div>
                <h3 className="font-bold text-nidah-dark text-xl mb-3">Neden Erken Müdahale Önemli?</h3>
                <p className="text-nidah-gray text-sm leading-relaxed mb-5">
                  Hidrolik pompa arızaları zamanında tespit edilmediğinde hidrolik motor, silindir ve valf gibi diğer
                  sistem bileşenlerine yayılır. Erken revizyon, toplam onarım maliyetini %60&apos;a kadar azaltabilir.
                </p>
                <div className="space-y-2.5">
                  {["Sistem hasarının önlenmesi", "Düşük toplam onarım maliyeti", "Daha kısa bakım süresi"].map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-nidah-yellow-dark shrink-0" />
                      <span className="text-sm text-nidah-dark font-medium">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Revizyon Sürecimiz (8 Adım)
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Standartlaştırılmış 8 adımlı prosesimiz, her pompanın fabrika performansına yönelik titiz bir yaklaşımla revizyonunu sağlar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROCESS_STEPS.map((ps) => (
                <div key={ps.step} className="bg-nidah-light rounded-2xl p-5 border border-gray-100">
                  <div className="text-3xl font-black text-nidah-yellow/40 mb-3 leading-none">{ps.step}</div>
                  <h3 className="font-bold text-nidah-dark text-sm mb-2">{ps.title}</h3>
                  <p className="text-xs text-nidah-gray leading-relaxed">{ps.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brands */}
        <section className="bg-nidah-dark py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Hizmet Verdiğimiz Marka ve Modeller
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {BRANDS.map((brand) => (
                <span key={brand} className="bg-white/8 border border-white/12 text-gray-300 font-bold text-sm px-5 py-2.5 rounded-full tracking-wide">
                  {brand}
                </span>
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm mt-6">
              Listede yer almayan markalar için de hizmet veriyoruz — lütfen iletişime geçin.
            </p>
          </div>
        </section>

        {/* Post-service */}
        <section className="bg-nidah-light py-20 md:py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 shadow-sm">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-nidah-dark mb-4">
                    Revizyon Sonrası Destek
                  </h2>
                  <p className="text-nidah-gray leading-relaxed mb-4">
                    Revize ettiğimiz her hidrolik pompada OEM standartlarında parça kullanılır ve detaylı test raporu ile teslim edilir.
                    İşimizin her zaman arkasındayız — süreç sonrası teknik sorularınız için ekibimiz yanınızdadır.
                  </p>
                  <p className="text-xs text-nidah-gray/70 leading-relaxed mb-6 italic">
                    Revizyon süreçlerinde sistemin genel durumu, kullanım koşulları ve uygulama şartları sonuç üzerinde etkili olabilir.
                    Bu nedenle doğru teşhis, doğru parça ve doğru uygulama ilkemiz temeldir.
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      "OEM standartlarında parça kullanımı",
                      "Test raporu ile şeffaf teslim",
                      "Süreç sonrası teknik bilgilendirme",
                      "Uzman ekip desteği",
                      "Saha montaj desteği (talep üzerine)",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-nidah-dark">
                        <CheckCircle2 className="size-4 text-nidah-yellow-dark shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:w-72 shrink-0 space-y-3">
                  <Button asChild size="lg" className="w-full bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                    <Link href="/teklif-al">Servis Talebi Al <ArrowRight className="size-4 ml-2" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full border-gray-200 text-nidah-steel">
                    <Link href="/hizmetler">Tüm Hizmetler</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full border-gray-200 text-nidah-steel">
                    <Link href="/parca-katalog">Parça Kataloğu</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
