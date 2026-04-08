import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CONTACTS, NAV_ITEMS, WHATSAPP_URL, SITE_CONFIG } from "@/lib/constants";

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/osman-ko%C3%A7-930751354",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/nidahgroup",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@nidahgroup",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
] as const;

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

            {/* Social media */}
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
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
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-gray-600">
              &copy; {currentYear} {SITE_CONFIG.legalName} — Tüm hakları saklıdır.
            </p>
            <Link
              href="/kvkk"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
            >
              KVKK & Gizlilik
            </Link>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
