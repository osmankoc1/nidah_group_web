import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { faqItems, FAQ_CATEGORIES, type FaqCategory } from "@/data/faq";
import { CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular | NİDAH GROUP",
  description:
    "Yedek parça tedariği, teknik revizyon, ECU onarımı, ihracat koşulları ve teklif süreci hakkında sıkça sorulan sorular.",
  alternates: {
    canonical: "https://www.nidahgroup.com.tr/sss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sıkça Sorulan Sorular | NİDAH GROUP",
    description:
      "Yedek parça tedariği, teknik revizyon, ECU onarımı, ihracat koşulları ve teklif süreci hakkında sıkça sorulan sorular.",
  },
};

const CATEGORY_META: Record<FaqCategory, { emoji: string; color: string }> = {
  "Yedek Parça":               { emoji: "📦", color: "bg-amber-50 border-amber-100 text-amber-700"  },
  "Teknik Servis & Revizyon":  { emoji: "🔧", color: "bg-slate-50  border-slate-100  text-slate-700"  },
  "Elektronik Sistemler":      { emoji: "💡", color: "bg-blue-50   border-blue-100   text-blue-700"   },
  "İhracat & Uluslararası":    { emoji: "🌍", color: "bg-green-50  border-green-100  text-green-700"  },
  "Teklif & Sipariş":          { emoji: "📋", color: "bg-violet-50 border-violet-100 text-violet-700" },
};

export default function SSSPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const grouped = FAQ_CATEGORIES.map((cat) => ({
    cat,
    items: faqItems.filter((f) => f.category === cat),
  })).filter(({ items }) => items.length > 0);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <span className="text-nidah-yellow text-base leading-none">❓</span>
            <span>{faqItems.length} Soru · 5 Kategori</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Parça tedariği, teknik servis, elektronik onarım, ihracat ve teklif süreçleri hakkında bilmeniz gerekenler.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Sıkça Sorulan Sorular" }]} />

      {/* Category nav pills */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {grouped.map(({ cat }) => {
            const meta = CATEGORY_META[cat];
            return (
              <a
                key={cat}
                href={`#${encodeURIComponent(cat)}`}
                className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${meta.color}`}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                {cat}
              </a>
            );
          })}
        </div>
      </div>

      {/* FAQ grouped by category */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 space-y-14">
          {grouped.map(({ cat, items }) => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} id={encodeURIComponent(cat)} className="scroll-mt-32">
                {/* Category header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${meta.color}`}>
                    <span aria-hidden="true">{meta.emoji}</span>
                    {cat}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-nidah-gray tabular-nums">{items.length}</span>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-0">
                  {items.map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`${cat}-${idx}`}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <AccordionTrigger className="text-left text-sm font-semibold text-nidah-dark hover:text-nidah-yellow-dark hover:no-underline py-4 gap-3">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-nidah-gray text-sm leading-relaxed pb-5 pr-8">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-nidah-light py-16 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-nidah-dark mb-3">
              Sorunuzun Cevabını Bulamadınız mı?
            </h2>
            <p className="text-nidah-gray mb-8 text-sm leading-relaxed">
              Teknik ekibimiz her türlü sorunuzu en kısa sürede yanıtlar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
                <Link href="/iletisim">
                  İletişime Geçin
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-green-500 text-green-600 hover:bg-green-600 hover:text-white font-semibold">
                <a
                  href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, "Merhaba, SSS sayfasında cevabını bulamadığım bir sorum var.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4 mr-1.5" />
                  WhatsApp ile Sorun
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
