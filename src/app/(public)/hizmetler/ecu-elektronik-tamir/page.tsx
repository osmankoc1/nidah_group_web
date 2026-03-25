import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Cpu, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "ECU Tamiri & Elektronik Sistem Servisi | İş Makinası | NİDAH GROUP",
  description:
    "İş makinası ECU tamiri ve kontrol ünitesi revizyonu. Ekskavatör, kamyon, savunma araçları için elektronik sistem teşhis, onarım ve yeni ECU temini.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/hizmetler/ecu-elektronik-tamir",
  },
  openGraph: {
    title: "ECU Tamiri & Elektronik Sistem Servisi | İş Makinası | NİDAH GROUP",
    description:
      "İş makinası ECU tamiri ve kontrol ünitesi revizyonu. Ekskavatör, kamyon, savunma araçları için elektronik sistem teşhis, onarım ve yeni ECU temini.",
    url: "https://www.nidahgroup.com.tr/hizmetler/ecu-elektronik-tamir",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ECU Tamiri & Elektronik Sistem Servisi | İş Makinası | NİDAH GROUP",
    description:
      "İş makinası ECU tamiri ve kontrol ünitesi revizyonu. Ekskavatör, kamyon, savunma araçları için elektronik sistem teşhis, onarım ve yeni ECU temini.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "ECU & Elektronik Sistem Tamiri",
  provider: { "@type": "Organization", name: "NİDAH GROUP", url: "https://www.nidahgroup.com.tr" },
  description: "İş makinası ECU tamiri, kontrol ünitesi revizyonu, elektronik sistem teşhisi ve yeni ECU temin hizmeti.",
  serviceType: "Elektronik Sistem Servisi",
  areaServed: { "@type": "Country", name: "Turkey" },
  url: "https://www.nidahgroup.com.tr/hizmetler/ecu-elektronik-tamir",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://www.nidahgroup.com.tr" },
    { "@type": "ListItem", position: 2, name: "Hizmetler", item: "https://www.nidahgroup.com.tr/hizmetler" },
    { "@type": "ListItem", position: 3, name: "ECU & Elektronik Tamir", item: "https://www.nidahgroup.com.tr/hizmetler/ecu-elektronik-tamir" },
  ],
};

const FAILURE_CAUSES = [
  { title: "Nem & Su Sızması", desc: "Yoğuşma veya doğrudan su teması, devre kartlarında korozyon ve kısa devre oluşturur." },
  { title: "Vibrasyon Hasarı", desc: "Sürekli sarsıntı altında lehim noktaları ve bileşen bağlantıları zayıflar, kopma meydana gelir." },
  { title: "Voltaj Dalgalanmaları", desc: "Şarj sistemi arızası veya aküden kaynaklanan aşırı voltaj, ECU bileşenlerini yakar." },
  { title: "Yaşlanma & Termal Stres", desc: "Uzun vadeli ısı döngüleri bileşenlerin elektromekanik ömrünü tüketir." },
  { title: "Sigorta & Kablo Sorunları", desc: "Kısa devre, kopuk kablo veya topraklama sorunları ECU'ya zarar verebilir." },
];

const SYMPTOMS = [
  "Motor arıza lambası veya birden fazla hata kodu",
  "Beklenmedik makine kapanması veya yeniden başlatma",
  "Sensör okuma hataları (yanlış sıcaklık, basınç, devir)",
  "CAN bus veya J1939 iletişim hataları",
  "Rejenerasyon veya DPF sisteminin çalışmaması",
  "Vites kilitlenmesi veya hatalı vites seçimi",
  "Makine performansında açıklanamayan düşüş",
];

const PROCESS_STEPS = [
  { step: "01", title: "ECU Çıkarma", desc: "Aracın elektrik sisteminin güvenli olarak devre dışı bırakılması ve ECU'nun dikkatli söküm işlemi." },
  { step: "02", title: "Teşhis Taraması", desc: "Profesyonel diagnostik ekipmanla arıza kodlarının okunması ve belgelenmesi." },
  { step: "03", title: "Kart Seviyesi Onarım", desc: "Devre kartının mikroskop altında incelenmesi, hasarlı bileşenlerin tespiti ve değişimi." },
  { step: "04", title: "Firmware Kontrolü", desc: "ECU yazılımının güncel ve bütünlüklü olduğunun doğrulanması. Gerekirse yeniden programlama." },
  { step: "05", title: "Tezgah Testi", desc: "Onarılan ECU'nun simülatör ortamında tüm giriş-çıkış fonksiyonlarının test edilmesi." },
  { step: "06", title: "Yeniden Montaj", desc: "ECU'nun araca takılması ve tüm elektrik bağlantılarının kontrolü." },
  { step: "07", title: "Saha Testi", desc: "Araç üzerinde kapsamlı dinamik test. Hata kodları temizleme ve sistem kalibrasyonu." },
];

const VEHICLE_TYPES = [
  "Ekskavatör (tüm tonajlar)",
  "Lastikli ve paletli yükleyici",
  "Buldozer & dozer",
  "Damperli kamyon",
  "Tuz serici araçlar",
  "Savunma sanayi araçları",
  "Ekipmanlı kamyonlar (vinçli, hidroborlu)",
  "Yol yapım ekipmanları",
];

export default function EcuElektronikTamirPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <main>
        {/* Hero */}
        <section className="py-20 md:py-24 bg-[#0A0F1E] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
              <Cpu className="size-3.5" />
              <span>ECU · Kontrol Ünitesi · Elektronik Sistemler</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              ECU &amp; Elektronik Sistem Tamiri
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              İş makinası, kamyon ve savunma araçlarında elektronik kontrol ünitelerinin
              teşhis, onarım ve temin hizmeti. Uzman ekip ve titiz süreç.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/teklif-al">Servis Talebi Al</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                <Link href="/hizmetler">Tüm Hizmetler</Link>
              </Button>
            </div>
          </div>
        </section>

        <PageBreadcrumb items={[
          { label: "Hizmetler", href: "/hizmetler" },
          { label: "ECU & Elektronik Tamir" },
        ]} />

        {/* Why ECU fails */}
        <section className="bg-white py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-nidah-dark mb-4">
                Neden ECU Arızalanır?
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                ECU arızalarının büyük çoğunluğu önlenebilir nedenlerden kaynaklanır. Erken teşhis maliyeti önemli ölçüde düşürür.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FAILURE_CAUSES.map((fc) => (
                <div key={fc.title} className="bg-nidah-light border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-nidah-yellow/30 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Zap className="size-4 text-blue-500" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-sm">{fc.title}</h3>
                  </div>
                  <p className="text-nidah-gray text-sm leading-relaxed">{fc.desc}</p>
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
                <h2 className="text-3xl font-bold text-nidah-dark mb-5">Arıza Belirtileri</h2>
                <ul className="space-y-3">
                  {SYMPTOMS.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-sm text-nidah-dark bg-white rounded-xl border border-gray-100 px-4 py-3">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-nidah-dark mb-5">Hizmet Verdiğimiz Araç Tipleri</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VEHICLE_TYPES.map((vt) => (
                    <div key={vt} className="flex items-center gap-2 text-sm text-nidah-dark bg-white rounded-xl border border-gray-100 px-4 py-3">
                      <CheckCircle2 className="size-4 text-nidah-yellow-dark shrink-0" />
                      {vt}
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
                Teşhis &amp; Onarım Sürecimiz
              </h2>
              <p className="text-nidah-gray max-w-2xl mx-auto">
                Her ECU onarımı, fabrika prosedürlerine dayalı standartlaştırılmış 7 adımlı prosesimizle gerçekleştirilir.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROCESS_STEPS.map((ps) => (
                <div key={ps.step} className="bg-nidah-light rounded-2xl p-5 border border-gray-100">
                  <div className="text-3xl font-black text-blue-200 mb-3 leading-none">{ps.step}</div>
                  <h3 className="font-bold text-nidah-dark text-sm mb-2">{ps.title}</h3>
                  <p className="text-xs text-nidah-gray leading-relaxed">{ps.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* New ECU + Support */}
        <section className="bg-nidah-dark py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                  <Cpu className="size-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">Yeni ECU Temin</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">
                  Onarım mümkün olmadığı durumlarda veya tercih edilmesi halinde orijinal ve sertifikalı
                  yeni ECU temin edebiliyoruz. Geniş stok ağımız sayesinde çoğu model için 24-48 saat içinde teslimat.
                </p>
                <ul className="space-y-2">
                  {["Orijinal OEM kontrol üniteleri", "Yeniden üretilmiş (remanufactured) seçenekler", "Programlama ve aktivasyon dahil", "Test raporu ile teslim"].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle2 className="size-3.5 text-blue-400 shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5">
                  <Zap className="size-6 text-nidah-yellow" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">Teknik Destek & Kalite</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  Onarılan veya temin edilen tüm kontrol üniteleri titiz test sürecinden geçirilir ve teknik bilgilendirme ile teslim edilir.
                  İşimizin her zaman arkasındayız.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed mb-5 italic">
                  Elektronik sistem onarımlarında aracın genel durumu ve diğer sistem koşulları sonuç üzerinde etkili olabilir.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                    <Link href="/teklif-al">Servis Talebi Al <ArrowRight className="size-4 ml-2" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
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
