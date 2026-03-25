import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Wrench, AlertTriangle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Şanzıman Revizyonu | Powershift & Hidrolik Şanzıman Servisi | NİDAH GROUP",
  description:
    "İş makinası şanzıman revizyonu: powershift, otomatik ve manuel şanzıman revizyonu. Ekskavatör, yükleyici, dozer için OEM kalitesinde şanzıman tamir ve bakım hizmeti.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler/sanziman-revizyonu",
  },
  openGraph: {
    title: "Şanzıman Revizyonu | Powershift & Hidrolik Şanzıman Servisi | NİDAH GROUP",
    description:
      "İş makinası şanzıman revizyonu: powershift, otomatik ve manuel şanzıman revizyonu. Ekskavatör, yükleyici, dozer için OEM kalitesinde şanzıman tamir ve bakım hizmeti.",
    url: "https://www.nidahgroup.com.tr/hizmetler/sanziman-revizyonu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Şanzıman Revizyonu | Powershift & Hidrolik Şanzıman Servisi | NİDAH GROUP",
    description:
      "İş makinası şanzıman revizyonu: powershift, otomatik ve manuel şanzıman revizyonu. Ekskavatör, yükleyici, dozer için OEM kalitesinde şanzıman tamir ve bakım hizmeti.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Şanzıman Revizyonu",
  provider: { "@type": "Organization", name: "NİDAH GROUP", url: "https://www.nidahgroup.com.tr" },
  description: "İş makinalarında powershift, otomatik, hidrolik-mekanik ve manuel şanzıman revizyonu. Debriyaj paketi değişimi, yatak ve keçe revizyonu, basınç ve yük testi.",
  serviceType: "Şanzıman Servisi",
  areaServed: { "@type": "Country", name: "Turkey" },
  url: "https://www.nidahgroup.com.tr/hizmetler/sanziman-revizyonu",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
    { "@type": "ListItem", position: 2, name: "Hizmetler", item: "https://www.nidahgroup.com.tr/hizmetler" },
    { "@type": "ListItem", position: 3, name: "Şanzıman Revizyonu", item: "https://www.nidahgroup.com.tr/hizmetler/sanziman-revizyonu" },
  ],
};

const TRANSMISSION_TYPES = [
  {
    title: "Powershift Şanzıman",
    desc: "Yükleyici ve teleskopik ekipmanlarda yaygın. Debriyaj paketleri, pistonlar ve selenoidlerin revizyonu. VOLVO, KOMATSU, CATERPILLAR markalarında uzman hizmet.",
  },
  {
    title: "Hidrolik-Mekanik Şanzıman",
    desc: "Greyder ve bazı dozer modellerinde kullanılan hibrit yapı. Hidrolik tork konvertörü ve mekanik vites grubunun birlikte revizyonu.",
  },
  {
    title: "Otomatik Şanzıman",
    desc: "Damperli kamyon ve yol silidindir araçlarında kullanılan tam otomatik şanzımanlar. Elektronik kontrol ünitesi ve hidrolik devre revizyonu dahil.",
  },
  {
    title: "Manuel Şanzıman",
    desc: "Kompaktörler ve hafif iş makinalarında kullanılan mekanik şanzımanlar. Dişli, şaft, rulman ve senkronize elemanlarının revizyonu.",
  },
];

const SYMPTOMS = [
  "Viteslerde zorluk, pas ya da geri takılma",
  "Sürüş sırasında titreşim veya sarsıntı",
  "Aşırı ısınma ve yağ ısısı alarmı",
  "Güç ve tork kaybı, yokuşta geri kayma",
  "Anormal ses (gıcırtı, tıklama, uğultu)",
  "Şanzıman yağı sızıntısı veya renk değişimi",
  "Yavaşlama veya ani devir düşmesi",
];

const PROCESS_STEPS = [
  { step: "01", title: "Komple Söküm", desc: "Şanzımanın araçtan güvenli söküm işlemi ve tam parçalara ayrılması." },
  { step: "02", title: "Temizlik & Muayene", desc: "Tüm bileşenlerin yıkanması ve görsel muayenesi. Aşınma izleri ve hasar tespiti." },
  { step: "03", title: "Rulman & Keçe Değişimi", desc: "Tüm bilyalı ve makaralı rulmanların, keçe ve contaların OEM parçalarla değiştirilmesi." },
  { step: "04", title: "Debriyaj Paketi Revizyonu", desc: "Lamelli debriyaj disklerinin, basınç plakalarının ve yayların muayene ve değişimi." },
  { step: "05", title: "Dişli Grubu Kontrolü", desc: "Tüm dişlilerin profil, diş dibi ve flanş kontrolü. Gerekli durumlarda değişim." },
  { step: "06", title: "Montaj & Ayar", desc: "Belirlenmiş tork değerleriyle montaj. Ön yük, boşluk ve yağ kanal ayarları." },
  { step: "07", title: "Basınç Testi", desc: "Tüm debriyaj devrelerinin hidrolik basınç altında sızdırmazlık ve basınç değer kontrolü." },
  { step: "08", title: "Yük Testi", desc: "Şanzımanın test tezgahında yük altında tüm vites kademelerinde performans ve sıcaklık testi." },
];

const MODELS = [
  "VOLVO L & A serisi yükleyiciler",
  "KOMATSU WA & D serisi",
  "CAT 966 / 972 / 980 yükleyiciler",
  "HİDROMEK backhoe ve yükleyiciler",
  "CHAMPION greyder şanzımanları",
  "HAMM & BOMAG kompaktörler",
  "AMMANN silindir şanzımanları",
];

export default function SanzimanRevizyonuPage() {
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
              <span>Powershift · Otomatik · Hidrolik-Mekanik</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Şanzıman Revizyonu
            </h1>
            <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
              İş makinası ve ağır ekipman şanzımanlarının komple revizyonu.
              Powershift dahil tüm tip şanzımanlarda OEM kalitesinde parça ve uzman revizyon.
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
          { label: "Şanzıman Revizyonu" },
        ]} />

        {/* Transmission types */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Hangi Şanzıman Türlerinde Servis Veriyoruz?
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                İş makinasının tipine ve kullanım alanına göre farklılık gösteren tüm şanzıman tiplerinde uzman hizmet.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {TRANSMISSION_TYPES.map((tt) => (
                <div key={tt.title} className="bg-nidah-light border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-nidah-yellow/30 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-nidah-yellow/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Settings2 className="size-4 text-nidah-yellow-dark" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-base">{tt.title}</h3>
                  </div>
                  <p className="text-nidah-gray text-sm leading-relaxed">{tt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Symptoms */}
        <section className="bg-nidah-light py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <h2 className="text-3xl font-bold text-nidah-dark mb-5">Şanzıman Arıza Belirtileri</h2>
                <p className="text-nidah-gray mb-8 text-sm leading-relaxed">
                  Şanzıman arızaları genellikle önce küçük belirtilerle kendini gösterir.
                  Aşağıdaki semptomları fark ettiğinizde vakit kaybetmeden servise başvurun.
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
              <div>
                <h2 className="text-3xl font-bold text-nidah-dark mb-5">Hizmet Verdiğimiz Modeller</h2>
                <ul className="space-y-2.5">
                  {MODELS.map((m) => (
                    <li key={m} className="flex items-center gap-2.5 text-sm text-nidah-dark bg-white rounded-xl border border-gray-100 px-4 py-3">
                      <CheckCircle2 className="size-4 text-nidah-yellow-dark shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Revizyon Sürecimiz
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Standartlaştırılmış prosesimiz, revizyonu tamamlanan her şanzımanın orijinal performans değerlerine ulaşmasını sağlar.
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

        {/* CTA */}
        <section className="gradient-cta py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-nidah-dark mb-4">Şanzıman Arızası mı Yaşıyorsunuz?</h2>
            <p className="text-nidah-dark/75 mb-8 max-w-xl mx-auto">
              Aracınızın şanzıman durumunu uzman ekibimize danışın. Ücretsiz ön değerlendirme ve hızlı teklif.
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
