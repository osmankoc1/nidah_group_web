import type { Metadata } from "next";
import { JsonLd } from "@/lib/json-ld";
import { isPageEnabled } from "@/lib/site-settings";
import { OG_IMAGE, TWITTER_IMAGE } from "@/lib/constants";
import HeroSection               from "@/components/home/HeroSection";
import ServicesSection            from "@/components/home/ServicesSection";
import ElectronicsSection         from "@/components/home/ElectronicsSection";
import WhyUsSection               from "@/components/home/WhyUsSection";
import FeaturedParts              from "@/components/home/FeaturedParts";
import BrandsSection              from "@/components/home/BrandsSection";
import GlobalReachSection         from "@/components/home/GlobalReachSection";
import TestimonialsSection        from "@/components/home/TestimonialsSection";
import CtaSection                 from "@/components/home/CtaSection";

export const metadata: Metadata = {
  title: { absolute: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis" },
  description:
    "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr",
  },
  // NOT: sayfa seviyesindeki openGraph, root layout'taki objenin TAMAMINI ezer.
  // siteName / locale / images burada tekrar verilmezse sosyal paylaşımda kaybolur.
  openGraph: {
    title: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis",
    description:
      "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
    url: "https://www.nidahgroup.com.tr",
    type: "website",
    siteName: "NİDAH GROUP",
    locale: "tr_TR",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis",
    description:
      "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
    images: [TWITTER_IMAGE],
  },
};

function buildWebsiteJsonLd(catalogEnabled: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NİDAH GROUP",
    url: "https://www.nidahgroup.com.tr",
    // SearchAction yalnızca katalog admin toggle'ıyla yayındayken sunulur —
    // kapalı bir sayfayı Google'a site içi arama hedefi olarak göstermeyiz.
    ...(catalogEnabled && {
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.nidahgroup.com.tr/parca-katalog?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    }),
  };
}

export default async function HomePage() {
  const websiteJsonLd = buildWebsiteJsonLd(await isPageEnabled("page_parca_katalog"));
  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <main>
      {/* Bölüm sırası — Aşama 2.
          Önceki sıra 10 bölümdü ve birincil CTA 10. sıradaydı; mobilde sayfa
          ~20 ekran uzunluğunda olduğu için ziyaretçilerin çoğu dönüşüm
          noktasını hiç görmüyordu. Yeni sırada "ne yapıyoruz" ve "neden biz"
          öne alındı, marka duvarı aşağı indi. Nerede olursa olsun tek
          dokunuşla dönüşüm için ayrıca MobileActionBar eklendi. */}

      {/* 1. Hero — ne yaptığımız + parça arama + birincil CTA */}
      <HeroSection />

      {/* 2. Hizmetler — eski "Temel" + "Teknik" bölümleri birleştirildi.
             İkisi 10 kart gösteriyor ama yalnızca 5 benzersiz sayfaya
             gidiyordu (periyodik-bakım 3, şanzıman 2, hidrolik pompa 2 kez). */}
      <ServicesSection />

      {/* 3. Elektronik & ECU — ayrı tutuldu: farklı bir uzmanlık ve ayırt edici */}
      <ElectronicsSection />

      {/* 4. Neden NİDAH — güven unsurları, 7. sıradan yukarı alındı */}
      <WhyUsSection />

      {/* 5. Öne Çıkan Parçalar */}
      <FeaturedParts />

      {/* 6. Markalar — en yüksek bloktu (1213px), tedarik gücü kanıtı olarak
             global erişimin hemen yanına taşındı */}
      <BrandsSection />

      {/* 7. Global Erişim — ülkeler */}
      <GlobalReachSection />

      {/* 8. Referanslar */}
      <TestimonialsSection />

      {/* 9. CTA — kapanış */}
      <CtaSection />
    </main>
    </>
  );
}
