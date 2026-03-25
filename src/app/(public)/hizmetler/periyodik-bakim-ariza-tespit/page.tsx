import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Wrench, Search, ClipboardList, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Periyodik Bakım & Arıza Tespit | İş Makinası Servisi | NİDAH GROUP",
  description:
    "İş makinası periyodik bakım ve kapsamlı arıza tespit hizmeti. Dijital teşhis cihazları, yağ analizi, filtre değişimi ve önleyici bakım programı.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler/periyodik-bakim-ariza-tespit",
  },
  openGraph: {
    title: "Periyodik Bakım & Arıza Tespit | İş Makinası Servisi | NİDAH GROUP",
    description:
      "İş makinası periyodik bakım ve kapsamlı arıza tespit hizmeti. Dijital teşhis cihazları, yağ analizi, filtre değişimi ve önleyici bakım programı.",
    url: "https://www.nidahgroup.com.tr/hizmetler/periyodik-bakim-ariza-tespit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Periyodik Bakım & Arıza Tespit | İş Makinası Servisi | NİDAH GROUP",
    description:
      "İş makinası periyodik bakım ve kapsamlı arıza tespit hizmeti. Dijital teşhis cihazları, yağ analizi, filtre değişimi ve önleyici bakım programı.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Periyodik Bakım & Arıza Tespit",
  provider: { "@type": "Organization", name: "NİDAH GROUP", url: "https://www.nidahgroup.com.tr" },
  description: "İş makinası periyodik bakım, yağ-filtre değişimi, dijital teşhis ve önleyici bakım programı hizmetleri. Atölye ve saha hizmeti.",
  serviceType: "Periyodik Bakım & Arıza Tespit Servisi",
  areaServed: { "@type": "Country", name: "Turkey" },
  url: "https://www.nidahgroup.com.tr/hizmetler/periyodik-bakim-ariza-tespit",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
    { "@type": "ListItem", position: 2, name: "Hizmetler", item: "https://www.nidahgroup.com.tr/hizmetler" },
    { "@type": "ListItem", position: 3, name: "Periyodik Bakım & Arıza Tespit", item: "https://www.nidahgroup.com.tr/hizmetler/periyodik-bakim-ariza-tespit" },
  ],
};

const MAINTENANCE_CHECKLIST = [
  { cat: "Motor & Soğutma", items: ["Motor yağı ve filtre değişimi", "Soğutucu sıvı kontrolü ve değişimi", "Hava filtresi temizliği / değişimi", "Yakıt filtresi değişimi", "V-kayış kontrolü"] },
  { cat: "Hidrolik Sistem", items: ["Hidrolik yağı ve filtre değişimi", "Hidrolik hortum ve bağlantı kontrolü", "Silindir ve pompa sızdırmazlık kontrolü", "Rezervuar temizliği", "Sistem basınç testi"] },
  { cat: "Elektrik & Elektronik", items: ["Akü voltaj ve kapasite testi", "Elektrik kablo ve konektör kontrolü", "Şarj sistemi testi", "Aydınlatma ve ikaz sistemleri kontrolü", "Diagnostik hata kodu taraması"] },
  { cat: "Fren & Güvenlik", items: ["Fren diski / pabuç aşınma kontrolü", "Fren hidroliği seviye ve sızdırmazlık kontrolü", "Park freni testi", "Güvenlik sensörleri kontrolü"] },
  { cat: "Şasi & Tahrik", items: ["Lastik / palet aşınma ve basınç kontrolü", "Yağlama noktaları ve gres yağlama", "Diferansiyel ve şanzıman yağ seviyesi", "Aks ve bağlantı elemanları kontrolü"] },
];

const DIAGNOSTIC_EQUIPMENT = [
  { title: "Dijital Hata Kodu Okuyucu", desc: "Tüm büyük markalar için uyumlu OBD2, J1939 ve marka özel diagnostik ekipmanlar. Anlık ve geçmiş hata kodları." },
  { title: "Basınç & Debi Test Kiti", desc: "Hidrolik sistem basıncını ve debi değerlerini fabrika değerleriyle karşılaştırmalı ölçüm. Pompa ve valf verimliliği testi." },
  { title: "Termografi Kamerası", desc: "Aşırı ısınan bileşenlerin görünmez hasarının tespiti. Elektrik sistemi ve mekanik bileşen sıcaklık analizi." },
  { title: "Yağ Analiz Kiti", desc: "Yağdaki metal partikülleri, kirlilik seviyesini ve yağın ömrünü belirleyen anlık analiz. Erken uyarı sistemi." },
];

const INTERVALS = [
  { interval: "250 Saat", tasks: ["Yağ seviyesi ve görsel kontrol", "Hava filtresi ön temizliği", "Yağlama noktaları gresileme", "Lastik / palet kontrolü"] },
  { interval: "500 Saat", tasks: ["Motor yağı ve filtre değişimi", "Yakıt filtresi değişimi", "Diagnostik hata kodu taraması", "Akü ve şarj sistemi kontrolü"] },
  { interval: "1000 Saat", tasks: ["Hidrolik yağ ve filtre değişimi", "Soğutucu sıvı değişimi", "Şanzıman yağı kontrolü", "Fren sistemi kapsamlı muayene"] },
  { interval: "2000 Saat", tasks: ["Diferansiyel yağı değişimi", "Tüm keçe ve conta kontrolü", "Kapsamlı mekanik revizyon değerlendirmesi", "Yağ analizi ve raporu"] },
];

export default function PeriyodikBakimArizaTespitPage() {
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
              <ClipboardList className="size-3.5 text-nidah-yellow" />
              <span>Önleyici Bakım · Dijital Teşhis · Saha Hizmeti</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Periyodik Bakım &amp; Arıza Tespit
            </h1>
            <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8">
              Makina ömrünü uzatır, beklenmedik arızaları önler.
              Kapsamlı bakım programı, dijital teşhis ve saha hizmet imkanı.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/teklif-al">Bakım Talebi Al</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
                <Link href="/parca-katalog">Filtre & Yağ Parçaları</Link>
              </Button>
            </div>
          </div>
        </section>

        <PageBreadcrumb items={[
          { label: "Hizmetler", href: "/hizmetler" },
          { label: "Periyodik Bakım & Arıza Tespit" },
        ]} />

        {/* Maintenance checklist */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Kapsamlı Bakım Programı
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Her bakım ziyaretinde beş ana alanda sistematik kontrol ve bakım gerçekleştiriyoruz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {MAINTENANCE_CHECKLIST.map((mc) => (
                <div key={mc.cat} className="bg-nidah-light border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-nidah-yellow/15 flex items-center justify-center">
                      <Wrench className="size-4 text-nidah-yellow-dark" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-sm">{mc.cat}</h3>
                  </div>
                  <ul className="space-y-2">
                    {mc.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-nidah-gray">
                        <CheckCircle2 className="size-3.5 text-nidah-yellow-dark shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diagnostic methods */}
        <section className="bg-nidah-light py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Arıza Tespit Yöntemlerimiz
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Modern teşhis ekipmanlarımızla arızaları görünür hale gelmeden önce tespit ediyoruz.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {DIAGNOSTIC_EQUIPMENT.map((de) => (
                <div key={de.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-nidah-yellow/30 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-nidah-yellow/10 flex items-center justify-center shrink-0">
                      <Search className="size-4 text-nidah-yellow-dark" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-sm">{de.title}</h3>
                  </div>
                  <p className="text-nidah-gray text-sm leading-relaxed">{de.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Maintenance schedule */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Bakım Takvimi
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Çalışma saatine göre önerilen bakım aralıkları. Ağır koşullar için aralıklar kısaltılabilir.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {INTERVALS.map((interval, idx) => (
                <div key={interval.interval} className={`rounded-2xl p-6 ${idx === 0 ? "bg-nidah-dark" : "bg-nidah-light border border-gray-100"}`}>
                  <div className={`text-2xl font-black mb-4 ${idx === 0 ? "text-nidah-yellow" : "text-nidah-yellow-dark"}`}>
                    {interval.interval}
                  </div>
                  <ul className="space-y-2">
                    {interval.tasks.map((task) => (
                      <li key={task} className={`flex items-start gap-2 text-xs leading-relaxed ${idx === 0 ? "text-gray-300" : "text-nidah-gray"}`}>
                        <CheckCircle2 className={`size-3.5 shrink-0 mt-0.5 ${idx === 0 ? "text-nidah-yellow" : "text-nidah-yellow-dark"}`} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile service + Why preventive */}
        <section className="bg-nidah-light py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5">
                  <Truck className="size-6 text-nidah-yellow-dark" />
                </div>
                <h2 className="text-xl font-bold text-nidah-dark mb-3">Saha Hizmet İmkanı</h2>
                <p className="text-nidah-gray text-sm leading-relaxed mb-5">
                  Şantiye veya maden sahasında çalışan makinalar için atölyeye getirmek gerekmez.
                  Mobil servis ekibimiz, aracınızın bulunduğu konumda bakım ve arıza tespit hizmeti sunar.
                </p>
                <ul className="space-y-2">
                  {["Şantiye ve maden sahası hizmeti", "Tam teçhizatlı mobil servis araçları", "Acil arıza müdahale", "Bakım sırasında operasyonu durdurmadan hizmet"].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-nidah-dark">
                      <CheckCircle2 className="size-3.5 text-nidah-yellow-dark shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-nidah-dark rounded-2xl p-8">
                <h2 className="text-xl font-bold text-white mb-3">Neden Önleyici Bakım?</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Reaktif (arıza sonrası) bakıma kıyasla düzenli önleyici bakım programı;
                  toplam bakım maliyetini ortalama <strong className="text-nidah-yellow">%30-50</strong> azaltır,
                  makina kullanılabilirliğini <strong className="text-nidah-yellow">%20-25</strong> artırır.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Plansız duruş sürelerinin minimuma indirilmesi",
                    "Yedek parça maliyetlerinin öngörülebilir hale gelmesi",
                    "Büyük revizyonların ertelenmesi",
                    "Operatör güvenliğinin artırılması",
                    "Makina ömrünün uzatılması",
                  ].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle2 className="size-3.5 text-nidah-yellow shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="gradient-cta py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-nidah-dark mb-4">Bakım Programı Başlatın</h2>
            <p className="text-nidah-dark/75 mb-8 max-w-xl mx-auto">
              Makinanızın çalışma saatine özel bakım programı için uzman ekibimizle iletişime geçin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-dark hover:bg-nidah-navy text-white font-bold">
                <Link href="/teklif-al">
                  Bakım Talebi Al <ArrowRight className="size-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-nidah-dark text-nidah-dark hover:bg-nidah-dark hover:text-white font-semibold">
                <Link href="/iletisim">İletişime Geçin</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
