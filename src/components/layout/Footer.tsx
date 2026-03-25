import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CONTACTS, NAV_ITEMS, WHATSAPP_URL, SITE_CONFIG } from "@/lib/constants";

const EXPORT_COUNTRIES = [
  "ABD", "Kanada", "BAE", "Suudi Arabistan",
  "Rusya", "Özbekistan", "Güney Afrika", "Hindistan",
  "Sri Lanka", "Meksika", "Paraguay", "Arjantin",
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-nidah-dark text-white">

      {/* Global strip */}
      <div className="border-b border-white/5 bg-[#111827]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-nidah-yellow font-semibold uppercase tracking-wider shrink-0">
              <Globe2 className="size-3.5" />
              İhracat Ülkeleri:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_COUNTRIES.map((c) => (
                <span key={c} className="text-xs text-gray-500 border border-white/5 rounded-full px-2.5 py-0.5">
                  {c}
                </span>
              ))}
              <span className="text-xs text-gray-600 self-center">ve daha fazlası…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">

          {/* Col 1: Company */}
          <div className="space-y-5">
            <Link href="/" className="inline-block">
              <div>
                <span className="text-xl font-black tracking-tight text-white">NİDAH GROUP</span>
                <p className="text-[10px] text-nidah-yellow font-semibold tracking-widest uppercase mt-0.5">
                  Global Parts &amp; Supply
                </p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              {SITE_CONFIG.description}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="size-3.5 shrink-0 text-nidah-yellow" />
                <span>{SITE_CONFIG.location.city}, {SITE_CONFIG.location.country}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Globe2 className="size-3.5 shrink-0 text-nidah-yellow" />
                <span>13+ ülkeye ihracat &amp; tedarik</span>
              </div>
            </div>
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-lg px-3 py-2 text-xs text-nidah-yellow font-medium">
              <Globe2 className="size-3" />
              Uluslararası Operasyon
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-nidah-yellow">
              Hızlı Bağlantılar
            </h3>
            <nav className="flex flex-col gap-2.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-400 transition-colors hover:text-white hover:pl-1 duration-200"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/teklif-al"
                className="text-sm text-nidah-yellow hover:text-nidah-yellow-dark transition-colors font-medium"
              >
                → Teklif Al
              </Link>
            </nav>
          </div>

          {/* Col 3: Services */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-nidah-yellow">
              Hizmetlerimiz
            </h3>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: "Yedek Parça Tedariği", href: "/hizmetler" },
                { label: "Teknik Servis & Arıza Tespiti", href: "/hizmetler/periyodik-bakim-ariza-tespit" },
                { label: "Elektronik Sistemler & ECU", href: "/hizmetler/ecu-elektronik-tamir" },
                { label: "Diferansiyel & Şanzıman", href: "/hizmetler/sanziman-revizyonu" },
                { label: "Hidrolik Sistem Revizyonu", href: "/hizmetler/hidrolik-pompa-revizyonu" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-gray-400 transition-colors hover:text-white hover:pl-1 duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-nidah-yellow">
              İletişim
            </h3>

            {/* Mustafa */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                {CONTACTS.mustafa.role}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="size-3.5 shrink-0 text-nidah-yellow" />
                <a href={`tel:${CONTACTS.mustafa.phoneRaw}`} className="transition-colors hover:text-white">
                  {CONTACTS.mustafa.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="size-3.5 shrink-0 text-nidah-yellow" />
                <a href={`mailto:${CONTACTS.mustafa.email}`} className="transition-colors hover:text-white">
                  {CONTACTS.mustafa.email}
                </a>
              </div>
              <Button asChild size="sm" className="mt-1 bg-green-700 hover:bg-green-600 text-white w-full justify-start gap-2">
                <a href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, "Merhaba, bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" />
                  WhatsApp — {CONTACTS.mustafa.name}
                </a>
              </Button>
            </div>

            <Separator className="bg-white/5" />

            {/* Osman */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                {CONTACTS.osman.role}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="size-3.5 shrink-0 text-nidah-yellow" />
                <a href={`tel:${CONTACTS.osman.phoneRaw}`} className="transition-colors hover:text-white">
                  {CONTACTS.osman.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="size-3.5 shrink-0 text-nidah-yellow" />
                <a href={`mailto:${CONTACTS.osman.email}`} className="transition-colors hover:text-white">
                  {CONTACTS.osman.email}
                </a>
              </div>
              <Button asChild size="sm" className="mt-1 bg-green-700 hover:bg-green-600 text-white w-full justify-start gap-2">
                <a href={WHATSAPP_URL(CONTACTS.osman.phoneRaw, "Merhaba, bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" />
                  WhatsApp — {CONTACTS.osman.name}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 bg-[#111827]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-gray-600">
              &copy; {currentYear} {SITE_CONFIG.legalName} — Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-700">
              <span>{SITE_CONFIG.location.city}, Türkiye</span>
              <span className="text-gray-800">·</span>
              <span className="text-nidah-yellow/50">Global Tedarik &amp; İhracat</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
