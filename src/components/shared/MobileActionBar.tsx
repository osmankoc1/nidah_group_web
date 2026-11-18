"use client";

import Link from "next/link";
import { MessageCircle, Phone, FileText } from "lucide-react";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { trackWhatsAppClick } from "@/lib/analytics";

/**
 * Mobil sabit eylem çubuğu.
 *
 * Ana sayfa 390px'te ~20 ekran uzunluğunda ve birincil CTA sayfanın sonunda.
 * Bu çubuk, ziyaretçinin sayfanın neresinde olursa olsun tek dokunuşla
 * dönüşebilmesini sağlar.
 *
 * - Yalnızca mobil/tablet (`lg:hidden`). Masaüstünde header'daki "Teklif Al"
 *   ve yüzen WhatsApp butonu zaten görünür durumda.
 * - WhatsAppFab mobilde gizlenir; aksi hâlde iki ayrı WhatsApp affordance'ı
 *   üst üste biner.
 * - Güvenli alan (`env(safe-area-inset-bottom)`) iPhone çentik/çubuk alanını
 *   hesaba katar.
 */
export default function MobileActionBar({ teklifAlEnabled }: { teklifAlEnabled: boolean }) {
  const waHref = WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    "Merhaba, yedek parça / servis hakkında bilgi almak istiyorum."
  );

  return (
    <nav
      aria-label="Hızlı iletişim"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-nidah-dark/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-3">
        {teklifAlEnabled && (
          <Link
            href="/teklif-al"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-white transition-colors active:bg-white/10"
          >
            <FileText className="size-5 text-nidah-yellow" aria-hidden="true" />
            <span className="text-xs font-semibold">Teklif Al</span>
          </Link>
        )}

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick("mobil_eylem_cubugu")}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-white transition-colors active:bg-white/10"
        >
          <MessageCircle className="size-5 text-[#25D366]" aria-hidden="true" />
          <span className="text-xs font-semibold">WhatsApp</span>
        </a>

        <a
          href={`tel:+${CONTACTS.mustafa.phoneRaw}`}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-white transition-colors active:bg-white/10"
        >
          <Phone className="size-5 text-white/80" aria-hidden="true" />
          <span className="text-xs font-semibold">Ara</span>
        </a>
      </div>
    </nav>
  );
}
