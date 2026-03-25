import Link from "next/link";
import { CheckCircle2, Home, MessageCircle, Clock, Package, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";

export const metadata = {
  title: "Teklif Talebiniz Alındı | NİDAH GROUP",
  robots: { index: false },
};

const steps = [
  {
    icon: Clock,
    title: "Talebi Aldık",
    desc: "Ekibimiz talebinizi incelemeye başladı.",
    color: "bg-blue-500",
  },
  {
    icon: Package,
    title: "Proforma Hazırlanıyor",
    desc: "En kısa sürede fiyat teklifi hazırlayıp göndereceğiz.",
    color: "bg-nidah-yellow",
  },
  {
    icon: CreditCard,
    title: "Ödeme & Hazırlık",
    desc: "Onay sonrası ürün hazırlanır ve paketlenir.",
    color: "bg-purple-500",
  },
  {
    icon: Truck,
    title: "DHL ile Teslimat",
    desc: "Dünya geneline ~14 iş günü içinde kargo.",
    color: "bg-green-500",
  },
];

export default function TeklifBasariliPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-nidah-dark via-nidah-navy to-nidah-steel">
      {/* Hero area */}
      <div className="relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          {/* Success badge */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-400 blur-xl opacity-30 animate-pulse" />
              <div className="relative flex size-24 items-center justify-center rounded-full border-2 border-green-400/40 bg-green-500/20 backdrop-blur-sm">
                <CheckCircle2 className="size-12 text-green-400" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-8 text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Teklif Talebiniz Alındı!
            </h1>
            <p className="mt-3 text-base text-white/60">
              Ekibimiz en kısa sürede sizinle iletişime geçecek.
            </p>
          </div>

          {/* Process steps */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <div
                    className={`mb-3 flex size-10 items-center justify-center rounded-xl ${step.color} bg-opacity-90`}
                  >
                    <Icon className="size-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="absolute right-4 top-4 text-3xl font-black text-white/5 select-none">
                    {i + 1}
                  </div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Contact card */}
          <div className="mt-8 rounded-2xl border border-nidah-yellow/30 bg-nidah-yellow/10 p-6 backdrop-blur-sm">
            <p className="text-center text-sm font-medium text-nidah-yellow">
              Acil mi? Satış ekibimize direkt ulaşın
            </p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={WHATSAPP_URL(
                  CONTACTS.mustafa.phoneRaw,
                  "Merhaba, teklif talebimi takip etmek istiyorum."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-900/30 transition-all hover:bg-green-400 hover:shadow-green-900/50"
              >
                <MessageCircle className="size-4" />
                WhatsApp — {CONTACTS.mustafa.phone}
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/">
                <Home className="size-4" />
                Ana Sayfa
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-nidah-yellow text-nidah-dark hover:bg-amber-400"
            >
              <Link href="/teklif-al">Yeni Teklif Talebi</Link>
            </Button>
          </div>

          {/* Fine print */}
          <p className="mt-8 text-center text-xs text-white/30">
            Teslimat süreleri tahminidir; ürün bulunabilirliği ve lojistik koşullara göre değişebilir.
          </p>
        </div>
      </div>
    </main>
  );
}
