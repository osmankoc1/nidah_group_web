import type { Metadata } from "next";
import TeklifAlClient from "@/components/layout/TeklifAlClient";

export const metadata: Metadata = {
  title: "Teklif Al | İş Makinası Yedek Parça & Servis | NİDAH GROUP",
  description:
    "İş makinası yedek parça veya teknik servis için ücretsiz teklif alın. VOLVO, KOMATSU, CAT ve daha fazlası için hızlı parça talebi. Türkiye merkezli, dünya geneline.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/teklif-al",
  },
  twitter: {
    card: "summary_large_image",
    title: "Teklif Al | İş Makinası Yedek Parça & Servis | NİDAH GROUP",
    description:
      "İş makinası yedek parça veya teknik servis için ücretsiz teklif alın. VOLVO, KOMATSU, CAT ve daha fazlası için hızlı parça talebi. Türkiye merkezli, dünya geneline.",
  },
};

export default function TeklifAlPage() {
  return <TeklifAlClient />;
}
