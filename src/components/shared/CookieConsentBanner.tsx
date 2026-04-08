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
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto max-w-4xl bg-nidah-dark border border-white/10 rounded-2xl shadow-2xl shadow-black/40 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">

        {/* Icon + Text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="size-5 text-nidah-yellow shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-white/75 leading-relaxed">
            Sitemizde kullanıcı deneyimini iyileştirmek amacıyla analitik çerezler kullanılmaktadır.
            Kabul etmek zorunlu değilsiniz.{" "}
            <Link
              href="/kvkk"
              className="text-nidah-yellow underline underline-offset-2 hover:text-nidah-yellow/80 transition-colors whitespace-nowrap"
            >
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleReject}
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Reddet
          </button>
          <Button
            onClick={handleAccept}
            size="sm"
            className="bg-nidah-yellow hover:bg-nidah-yellow/90 text-nidah-dark font-bold text-xs px-5"
          >
            Kabul Et
          </Button>
          <button
            onClick={handleReject}
            aria-label="Kapat"
            className="text-white/30 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/5 ml-1"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
