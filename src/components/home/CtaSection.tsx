import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { MessageCircle, ArrowRight, Zap } from "lucide-react";

const TRUST_ITEMS = [
  "Ücretsiz teklif",
  "48 saat içinde yanıt hedefi",
  "Uluslararası kargo",
  "Orijinal & OEM parça",
] as const;

export default function CtaSection() {
  const whatsappLink = WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    "Merhaba, iş makinası yedek parça fiyat teklifi almak istiyorum."
  );

  return (
    <section className="py-24 bg-nidah-dark relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full border border-white/5" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nidah-yellow/20 to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow font-medium mb-8">
          <Zap className="size-3.5" />
          Hızlı Teklif · Güvenli Teslimat
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
          Dünyanın Her Yerinden{" "}
          <span className="text-nidah-yellow">Parça Temin Ediyoruz</span>
        </h2>

        <p className="text-white/65 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
          Aradığınız parçayı katalogumuzda bulamadınız mı?
          Parça numarasını, marka ve modelini paylaşın — uzman ekibimiz
          en kısa sürede size dönüş yapsın.
        </p>

        {/* Trust pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {TRUST_ITEMS.map((item) => (
            <span
              key={item}
              className="text-xs text-white/50 border border-white/10 rounded-full px-3 py-1"
            >
              ✓ {item}
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-nidah-yellow hover:bg-nidah-yellow-dark text-nidah-dark font-bold px-10 h-13 text-base rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
          >
            <Link href="/teklif-al">
              Teklif Al
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-10 h-13 text-base rounded-xl shadow-lg shadow-green-900/30 hover:shadow-green-900/40 transition-all hover:-translate-y-0.5"
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-5 mr-2" />
              WhatsApp ile Sor
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
