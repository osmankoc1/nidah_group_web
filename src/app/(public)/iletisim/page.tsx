import type { Metadata } from "next";
import IletisimClient from "@/components/layout/IletisimClient";

export const metadata: Metadata = {
  title: "İletişim | NİDAH GROUP — Global Yedek Parça & Teknik Servis",
  description:
    "NİDAH GROUP ile iletişime geçin. Yedek parça, teknik servis veya ihracat talepleriniz için Ankara merkezli ekibimiz hazır. WhatsApp, telefon veya e-posta.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/iletisim",
  },
  twitter: {
    card: "summary_large_image",
    title: "İletişim | NİDAH GROUP — Global Yedek Parça & Teknik Servis",
    description:
      "NİDAH GROUP ile iletişime geçin. Yedek parça, teknik servis veya ihracat talepleriniz için Ankara merkezli ekibimiz hazır. WhatsApp, telefon veya e-posta.",
  },
};

export default function IletisimPage() {
  return <IletisimClient />;
}
