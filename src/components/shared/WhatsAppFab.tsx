"use client";

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
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
    >
      {/* Pulse ring */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />

      {/* WhatsApp SVG logo */}
      <span className="relative flex size-14 items-center justify-center rounded-full">
        <svg viewBox="0 0 32 32" className="size-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.002 2C8.269 2 2 8.268 2 16c0 2.49.65 4.829 1.788 6.86L2 30l7.335-1.762A13.94 13.94 0 0 0 16.002 30C23.733 30 30 23.731 30 16S23.733 2 16.002 2zm0 25.453a11.42 11.42 0 0 1-5.824-1.594l-.418-.248-4.352 1.046 1.087-4.23-.272-.434A11.388 11.388 0 0 1 4.57 16c0-6.3 5.13-11.43 11.432-11.43S27.43 9.7 27.43 16c0 6.302-5.128 11.453-11.428 11.453zm6.27-8.566c-.344-.172-2.034-1.003-2.348-1.118-.315-.115-.544-.172-.773.172-.229.344-.887 1.118-1.087 1.348-.2.229-.4.258-.744.086-.344-.172-1.452-.535-2.765-1.707-1.022-.912-1.712-2.037-1.913-2.381-.2-.344-.021-.53.15-.701.155-.154.344-.4.516-.6.172-.2.229-.344.344-.573.115-.229.057-.43-.028-.601-.086-.172-.773-1.863-1.059-2.55-.278-.672-.562-.58-.773-.59l-.658-.012c-.229 0-.601.086-.916.43s-1.2 1.175-1.2 2.866 1.229 3.323 1.4 3.552c.172.229 2.42 3.695 5.864 5.18.82.354 1.459.565 1.958.723.822.261 1.571.224 2.162.136.659-.098 2.034-.831 2.32-1.634.286-.802.286-1.49.2-1.634-.085-.143-.314-.229-.658-.4z"/>
        </svg>
      </span>
    </a>
  );
}
