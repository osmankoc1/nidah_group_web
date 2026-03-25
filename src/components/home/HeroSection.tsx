import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { Globe, Zap, ShieldCheck, Package } from "lucide-react";

const STATS = [
  { icon: Globe,       value: "13+",  label: "Ülke"              },
  { icon: Package,     value: "20+",  label: "Yıl Deneyim"       },
  { icon: Zap,         value: "48h",  label: "Ortalama Teslimat"  },
  { icon: ShieldCheck, value: "OEM",  label: "Kalite Standartı"   },
] as const;

/** Full-width machinery skyline — 4 machines arranged on a horizon */
function MachinerySkyline() {
  return (
    <svg
      viewBox="0 0 1440 220"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* ── DUMP TRUCK (left) ─────────────────────────────── */}
      {/* Cab */}
      <rect x="5"   y="78"  width="108" height="138" rx="6" />
      {/* Cab window */}
      <rect x="18"  y="92"  width="84"  height="68"  rx="4" />
      {/* Dump bed */}
      <rect x="110" y="104" width="196" height="112" rx="4" />
      {/* Bed top brace */}
      <rect x="109" y="94"  width="24"  height="14"  rx="3" />
      {/* Frame rail */}
      <rect x="5"   y="208" width="305" height="9"   rx="3" />
      {/* Front wheel */}
      <circle cx="62"  cy="208" r="28" />
      {/* Rear wheels */}
      <circle cx="216" cy="208" r="28" />
      <circle cx="268" cy="208" r="28" />

      {/* ── ROAD ROLLER (center-left) ─────────────────────── */}
      {/* Front drum */}
      <ellipse cx="437" cy="170" rx="52" ry="52" />
      {/* Rear drum */}
      <ellipse cx="590" cy="176" rx="46" ry="46" />
      {/* Connecting frame */}
      <rect x="437"  y="118" width="153" height="18" rx="5" />
      {/* Cab */}
      <rect x="455"  y="58"  width="102" height="72" rx="5" />
      {/* ROPS bar */}
      <rect x="462"  y="50"  width="88"  height="9"  rx="4" />

      {/* ── EXCAVATOR (center-right, tallest) ─────────────── */}
      {/* Track assembly */}
      <rect x="700"  y="188" width="340" height="30"  rx="15" />
      {/* Track idlers */}
      <circle cx="722"  cy="203" r="22" />
      <circle cx="1018" cy="203" r="22" />
      {/* Mid rollers */}
      <circle cx="820"  cy="203" r="13" />
      <circle cx="920"  cy="203" r="13" />
      {/* Upper body platform */}
      <rect x="718"  y="112" width="282" height="80"  rx="6" />
      {/* Counterweight bump (left rear) */}
      <path d="M718,118 C694,118 676,132 668,156 C676,178 694,188 718,188 Z" />
      {/* Cab */}
      <rect x="888"  y="40"  width="112" height="160" rx="6" />
      {/* Cab window */}
      <rect x="903"  y="56"  width="90"  height="85"  rx="4" />
      {/* Boom arm */}
      <path d="M876,120 L900,158 L634,38 L658,4 Z" />
      {/* Stick arm */}
      <path d="M658,4   L634,38 L582,112 L608,78  Z" />
      {/* Bucket */}
      <path d="M608,78  L582,112 L564,148 L604,158 L626,126 Z" />
      {/* Bucket teeth */}
      <rect x="566" y="154" width="11" height="18" rx="3" />
      <rect x="581" y="156" width="11" height="18" rx="3" />
      <rect x="596" y="155" width="11" height="16" rx="3" />

      {/* ── MOTOR GRADER (right) ──────────────────────────── */}
      {/* Long frame */}
      <rect x="1082" y="124" width="350" height="22"  rx="5" />
      {/* Engine hood (front) */}
      <rect x="1082" y="98"  width="152" height="52"  rx="5" />
      {/* Cab (rear) */}
      <rect x="1282" y="56"  width="122" height="90"  rx="5" />
      {/* Cab window */}
      <rect x="1294" y="70"  width="98"  height="58"  rx="4" />
      {/* Blade */}
      <rect x="1192" y="146" width="192" height="14"  rx="5" />
      {/* Blade arm cylinders */}
      <rect x="1232" y="124" width="12"  height="26"  rx="4" />
      <rect x="1332" y="124" width="12"  height="26"  rx="4" />
      {/* Front articulation wheel */}
      <circle cx="1124" cy="180" r="40" />
      {/* Rear tandem wheels */}
      <circle cx="1348" cy="180" r="36" />
      <circle cx="1404" cy="180" r="36" />

      {/* Ground line */}
      <rect x="0" y="215" width="1440" height="5" rx="0" opacity="0.4" />
    </svg>
  );
}

export default function HeroSection() {
  const whatsappLink = WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    "Merhaba, iş makinası yedek parça konusunda bilgi almak istiyorum."
  );

  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-hero overflow-hidden">

      {/* ── Machinery skyline — full width, bottom ── */}
      <div className="absolute bottom-0 left-0 w-full text-white opacity-[0.042] pointer-events-none select-none">
        <MachinerySkyline />
      </div>

      {/* ── Warm atmospheric glow ── */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[320px] bg-nidah-yellow/4 rounded-full blur-[80px] pointer-events-none translate-x-32" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-white/[0.015] rounded-full blur-[60px] pointer-events-none" />

      {/* ── Background geometry ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/[0.04]" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-white/[0.04]" />
        <div className="absolute top-1/4 right-1/4 w-5 h-5 rounded-full bg-nidah-yellow/20" />
        <div className="absolute top-1/2 right-16 w-14 h-14 rotate-45 border border-white/[0.04]" />
        <div className="absolute top-1/3 -left-8 w-40 h-40 rotate-45 border border-white/[0.03]" />
        {/* Subtle diagonal rule lines top-left */}
        <div className="absolute top-20 left-10 w-32 h-32 opacity-[0.025]">
          <div className="absolute inset-0 rotate-45 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-full h-px bg-white" />
            ))}
          </div>
        </div>
        {/* Yellow accent lines */}
        <div className="absolute bottom-48 right-1/4 space-y-2 opacity-[0.06]">
          <div className="w-24 h-px bg-nidah-yellow" />
          <div className="w-16 h-px bg-nidah-yellow" />
          <div className="w-20 h-px bg-nidah-yellow" />
        </div>
        {/* Dot grid */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 grid grid-cols-6 gap-5 opacity-[0.05]">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white py-24">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-10">
          <Globe className="size-3.5 text-nidah-yellow shrink-0" />
          <span>Türkiye Merkezli · Global Tedarik Ağı · 13+ Ülkeye İhracat</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-black leading-[1.08] tracking-tight text-balance mb-7">
          Global İş Makinası{" "}
          <span className="text-nidah-yellow">Yedek Parça &amp; Teknik</span>{" "}
          Servis Çözümleri
        </h1>

        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
          Hidrolik sistem, şanzıman ve elektronik serviste 20+ yıl. OEM ve muadil seçenekler.
          Amerika&apos;dan Orta Doğu&apos;ya, Orta Asya&apos;dan Afrika&apos;ya — güvenilir global tedarik.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Button
            asChild
            size="lg"
            className="bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-black px-10 h-14 text-base rounded-xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 transition-all hover:-translate-y-0.5"
          >
            <Link href="/teklif-al">Ücretsiz Teklif Al</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/25 text-white hover:bg-white/10 hover:text-white hover:border-white/45 px-10 h-14 text-base rounded-xl bg-transparent transition-all"
          >
            <Link href="/parca-katalog">Parça Kataloğu</Link>
          </Button>
        </div>

        {/* WhatsApp */}
        <p className="text-sm text-white/45 mb-16">
          veya{" "}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors font-semibold"
          >
            WhatsApp ile hızlı iletişim
          </a>
        </p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8 max-w-3xl mx-auto">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-white/[0.04] hover:bg-white/[0.08] transition-colors px-6 py-5 flex flex-col items-center gap-1.5"
            >
              <Icon className="size-5 text-nidah-yellow mb-0.5" />
              <span className="text-2xl font-black text-white leading-none tracking-tight">{value}</span>
              <span className="text-xs text-white/45 tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
