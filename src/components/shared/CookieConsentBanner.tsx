"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nidah_cookie_consent";

type ConsentValue = "accepted" | "rejected";

function updateGAConsent(value: ConsentValue) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: value === "accepted" ? "granted" : "denied" });
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage erişimi yoksa gösterme
    }
  }, []);

  function handleAccept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* */ }
    updateGAConsent("accepted");
    setVisible(false);
  }

  function handleReject() {
    try { localStorage.setItem(STORAGE_KEY, "rejected"); } catch { /* */ }
    updateGAConsent("rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      aria-modal="false"
      /* Mobilde MobileActionBar (≈57px) ekranın altında sabit duruyor; bant
         onun ÜZERİNDE konumlanır, üstünü örtmez. lg'de çubuk gizli olduğu
         için bant tabana oturur. */
      className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-50 p-2 sm:p-4"
    >
      {/* Mobilde bant bilinçli olarak alçak tutulur: tam ekran hero'da birincil
          CTA'nın (“Ücretsiz Teklif Al”) üzerini kapatmaması gerekir.
          Onay mantığı DEĞİŞMEZ — yalnızca yerleşim ve dokunma alanı. */}
      <div className="mx-auto max-w-4xl bg-nidah-dark border border-white/10 rounded-2xl shadow-2xl shadow-black/40 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">

        {/* Icon + Text */}
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <Cookie className="size-4 sm:size-5 text-nidah-yellow shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-white/75 leading-snug sm:leading-relaxed">
            Deneyimi iyileştirmek için analitik çerez kullanıyoruz. Zorunlu değildir.{" "}
            <Link
              href="/kvkk"
              className="text-nidah-yellow underline underline-offset-2 hover:text-nidah-yellow/80 transition-colors whitespace-nowrap"
            >
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>

        {/* Buttons — mobilde tam genişlik, min 44px dokunma alanı */}
        <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="flex-1 sm:flex-none min-h-11 text-xs text-white/60 hover:text-white/90 transition-colors px-4 rounded-lg hover:bg-white/5"
          >
            Reddet
          </button>
          <Button
            onClick={handleAccept}
            className="flex-1 sm:flex-none min-h-11 bg-nidah-yellow hover:bg-nidah-yellow/90 text-nidah-dark font-bold text-xs px-5"
          >
            Kabul Et
          </Button>
          <button
            onClick={handleReject}
            aria-label="Kapat"
            className="shrink-0 size-11 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
