import type { Metadata } from "next";
import HeroSection               from "@/components/home/HeroSection";
import BrandsSection              from "@/components/home/BrandsSection";
import ServicesOverview           from "@/components/home/ServicesOverview";
import TechnicalServicesSection   from "@/components/home/TechnicalServicesSection";
import ElectronicsSection         from "@/components/home/ElectronicsSection";
import FeaturedParts              from "@/components/home/FeaturedParts";
import WhyUsSection               from "@/components/home/WhyUsSection";
import GlobalReachSection         from "@/components/home/GlobalReachSection";
import TestimonialsSection        from "@/components/home/TestimonialsSection";
import CtaSection                 from "@/components/home/CtaSection";

export const metadata: Metadata = {
  title: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis",
  description:
    "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr",
  },
  openGraph: {
    title: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis",
    description:
      "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
    url: "https://www.nidahgroup.com.tr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NİDAH GROUP | Global İş Makinası Yedek Parça & Teknik Servis",
    description:
      "İş makinası yedek parça tedariği, hidrolik şanzıman & pompa revizyonu, ECU onarımı. VOLVO, KOMATSU, CAT, HİDROMEK için OEM kalitesinde parça. 13+ ülkeye DHL ile ihracat.",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NİDAH GROUP",
  url: "https://www.nidahgroup.com.tr",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.nidahgroup.com.tr/parca-katalog?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <main>
      {/* 1. Hero — güçlü giriş, global mesajlar */}
      <HeroSection />

      {/* 2. Markalar — global tedarik gücü */}
      <BrandsSection />

      {/* 3. Temel Hizmetler — 4 kart özet */}
      <ServicesOverview />

      {/* 4. Teknik Hizmetler — revizyon, bakım, onarım */}
      <TechnicalServicesSection />

      {/* 5. Elektronik Sistemler — ECU, savunma, kamyon */}
      <ElectronicsSection />

      {/* 6. Öne Çıkan Parçalar */}
      <FeaturedParts />

      {/* 7. Neden Nidah — güven unsurları */}
      <WhyUsSection />

      {/* 8. Global Erişim — ülkeler */}
      <GlobalReachSection />

      {/* 9. Referanslar */}
      <TestimonialsSection />

      {/* 10. CTA */}
      <CtaSection />
    </main>
    </>
  );
}
