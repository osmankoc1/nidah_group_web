"use client";

import { useState, type FormEvent } from "react";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  User,
  Globe2,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { CONTACTS, WHATSAPP_URL, SITE_CONFIG } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export default function IletisimClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Mesajınız gönderilemedi. Lütfen tekrar deneyin veya WhatsApp ile ulaşın."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const contactPeople = [CONTACTS.mustafa, CONTACTS.osman] as const;

  return (
    <main>

      {/* ── Hero ── */}
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "36px 36px" }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Globe2 className="size-3.5 text-nidah-yellow" />
            <span>Ankara, Türkiye · 13+ Ülke Operasyonu</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">İletişim</h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Yedek parça, revizyon veya elektronik sistem ihtiyaçlarınız için uzman ekibimizle iletişime geçin.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "İletişim" }]} />

      {/* ── Main contact grid ── */}
      <section className="bg-nidah-light py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">

            {/* ── Left: Form (3 / 5) ── */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-nidah-dark mb-1">Bize Mesaj Gönderin</h2>
                <p className="text-sm text-nidah-gray mb-6">
                  Parça numarası, araç modeli ve ihtiyacınızı belirtirseniz daha hızlı yanıt verebiliriz.
                </p>

                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="size-7 text-green-600" />
                    </div>
                    <h3 className="font-bold text-nidah-dark text-lg mb-2">Mesajınız İletildi</h3>
                    <p className="text-nidah-gray text-sm max-w-xs mx-auto">
                      En kısa sürede dönüş yapacağız. Acil konular için WhatsApp&apos;tan ulaşabilirsiniz.
                    </p>
                    <Button
                      className="mt-6 bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold"
                      onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                    >
                      Yeni Mesaj Gönder
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ad Soyad <span className="text-red-500">*</span></Label>
                      <Input id="name" name="name" placeholder="Adınız Soyadınız" required value={formData.name} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-posta <span className="text-red-500">*</span></Label>
                        <Input id="email" name="email" type="email" placeholder="ornek@firma.com" required value={formData.email} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input id="phone" name="phone" type="tel" placeholder="+90 5XX XXX XX XX" value={formData.phone} onChange={handleChange} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Konu <span className="text-red-500">*</span></Label>
                      <Input id="subject" name="subject" placeholder="Teklif talebi, teknik destek, genel bilgi…" required value={formData.subject} onChange={handleChange} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mesajınız <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="message" name="message"
                        placeholder="Parça numarası, araç modeli ve ihtiyacınızı detaylı açıklayınız…"
                        rows={5} required
                        value={formData.message} onChange={handleChange}
                        className="resize-none"
                      />
                    </div>

                    {submitError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        {submitError}
                      </div>
                    )}

                    <Button
                      type="submit" size="lg"
                      className="w-full bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? <><span className="animate-pulse">Gönderiliyor…</span></>
                        : <><Send className="size-4 mr-2" />Mesaj Gönder</>}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* ── Right: Info (2 / 5) ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Contact people */}
              {contactPeople.map((person) => (
                <div key={person.email} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-nidah-dark flex items-center justify-center shrink-0">
                      <User className="size-5 text-nidah-yellow" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-nidah-dark text-sm leading-none mb-0.5">{person.name}</p>
                      <p className="text-xs text-nidah-gray mb-3">{person.role}</p>
                      <div className="space-y-2">
                        <a href={`tel:${person.phoneRaw}`} className="flex items-center gap-2 text-sm text-nidah-dark hover:text-nidah-yellow-dark transition-colors group">
                          <Phone className="size-3.5 text-nidah-gray group-hover:text-nidah-yellow-dark shrink-0" />
                          {person.phone}
                        </a>
                        <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-sm text-nidah-dark hover:text-nidah-yellow-dark transition-colors group truncate">
                          <Mail className="size-3.5 text-nidah-gray group-hover:text-nidah-yellow-dark shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </a>
                      </div>
                      <Button asChild size="sm" className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold w-full">
                        <a
                          href={WHATSAPP_URL(person.phoneRaw, `Merhaba ${person.name}, NİDAH GROUP web sitesinden ulaşıyorum.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="size-4 mr-1.5" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Location card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-nidah-dark flex items-center justify-center shrink-0">
                    <MapPin className="size-5 text-nidah-yellow" />
                  </div>
                  <div>
                    <p className="font-bold text-nidah-dark text-sm mb-1">{SITE_CONFIG.location.city}, {SITE_CONFIG.location.country}</p>
                    <p className="text-xs text-nidah-gray leading-relaxed">Ankara merkezli operasyon</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Globe2 className="size-3.5 text-nidah-yellow shrink-0" />
                      <p className="text-xs text-nidah-gray">13+ ülkeye DHL ile ihracat</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7/24 emergency block */}
              <div className="bg-nidah-dark rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-nidah-yellow" />
                  <p className="font-bold text-white text-sm">7/24 Acil Destek</p>
                </div>
                <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                  Acil iş makinası arızaları için WhatsApp hattımız her zaman açık.
                </p>
                <Button asChild size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
                  <a
                    href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, "Acil destek talebi — NİDAH GROUP web sitesinden ulaşıyorum.")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4 mr-2" />
                    WhatsApp Destek Hattı
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
