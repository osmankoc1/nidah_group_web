"use client";

import { MessageCircle } from "lucide-react";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function WhatsAppFab() {
  const whatsappLink = WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    "Merhaba, bilgi almak istiyorum."
  );

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile iletişime geçin"
      onClick={() => trackWhatsAppClick("fab")}
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
    >
      {/* Pulse ring animation */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />

      {/* Icon container (solid, above the ping) */}
      <span className="relative flex size-14 items-center justify-center rounded-full bg-green-500 hover:bg-green-600">
        <MessageCircle className="size-6" />
      </span>
    </a>
  );
}
