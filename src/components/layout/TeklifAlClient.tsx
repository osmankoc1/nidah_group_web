"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MessageCircle,
  Send,
  Loader2,
  Package,
  Wrench,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANDS, CONTACTS, WHATSAPP_URL } from "@/lib/constants";
import { trackRfqSubmit } from "@/lib/analytics";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

type RequestType = "parts" | "service" | null;

const SERVICE_TYPES = [
  "Diferansiyel Revizyonu",
  "Şanzıman Revizyonu",
  "Hidrolik Sistem Revizyonu",
  "ECU / Kontrol Ünitesi Onarımı",
  "İş Makinesi Elektronik Sistem Servisi",
  "Kamyon Elektronik Sistem Servisi",
  "Şasi Onarımı & Tamir",
  "Periyodik Bakım",
  "Arıza Tespit & Teknik Analiz",
  "Diğer",
] as const;

const URGENCY_OPTIONS = [
  { value: "normal",   label: "Normal — 1-3 iş günü içinde" },
  { value: "urgent",   label: "Acil — En kısa sürede"        },
  { value: "critical", label: "Kritik — Makina durdu"        },
] as const;

// ── Side Panel ─────────────────────────────────────────────────────────────────

function SidePanel({ whatsappMsg }: { whatsappMsg: string }) {
  return (
    <div className="space-y-5">
      {/* WhatsApp quick quote */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-gray-800 mb-1">Hızlı Teklif</p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Acil durumlarda WhatsApp üzerinden doğrudan ulaşabilirsiniz.
        </p>
        <Button asChild className="w-full bg-green-600 text-white hover:bg-green-700 font-bold">
          <a href={WHATSAPP_URL(CONTACTS.mustafa.phoneRaw, whatsappMsg)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 mr-2" />
            WhatsApp ile Teklif Al
          </a>
        </Button>
      </div>

      {/* Contact people */}
      {([CONTACTS.mustafa, CONTACTS.osman] as const).map((person) => (
        <div key={person.email} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-nidah-gray mb-2.5">{person.role}</p>
          <a href={`tel:${person.phoneRaw}`} className="flex items-center gap-2 text-sm text-nidah-dark hover:text-nidah-yellow-dark transition-colors mb-2">
            <Phone className="size-3.5 text-nidah-yellow shrink-0" />
            {person.phone}
          </a>
          <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-sm text-nidah-dark hover:text-nidah-yellow-dark transition-colors truncate">
            <Mail className="size-3.5 text-nidah-yellow shrink-0" />
            <span className="truncate text-xs">{person.email}</span>
          </a>
        </div>
      ))}

      {/* Trust points */}
      <div className="bg-nidah-dark rounded-2xl p-4 space-y-2.5">
        {[
          "Ücretsiz fiyat teklifi",
          "48 saat içinde yanıt hedefi",
          "Güvenli ödeme",
          "13+ ülkeye teslimat",
        ].map((t) => (
          <div key={t} className="flex items-center gap-2">
            <CheckCircle className="size-3.5 text-nidah-yellow shrink-0" />
            <span className="text-xs text-gray-400">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Parts Form ─────────────────────────────────────────────────────────────────

function PartsForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formData, setFormData] = useState({
    type: "parts",
    fullName: "",
    company: "",
    phone: "",
    email: "",
    partNumber: searchParams.get("partNumber") || "",
    brand: searchParams.get("brand") || "",
    machineModel: "",
    quantity: 1,
    country: "Türkiye",
    description: "",
    website: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "quantity" ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, message: formData.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
      trackRfqSubmit("parts", formData.brand || undefined);
      router.push("/teklif-al/basarili");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMsg = formData.partNumber
    ? `Merhaba, ${formData.partNumber} parça numaralı ürün için teklif almak istiyorum.`
    : "Merhaba, yedek parça teklifi almak istiyorum.";

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-50">
            <div className="w-10 h-10 bg-nidah-yellow/10 rounded-xl flex items-center justify-center">
              <Package className="size-5 text-nidah-yellow-dark" />
            </div>
            <div>
              <h2 className="font-bold text-nidah-dark text-base leading-none">Parça Teklif Formu</h2>
              <p className="text-xs text-nidah-gray mt-0.5">Parça bilgilerini doldurun, proforma faturayla dönelim</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contact — top of form */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-nidah-gray uppercase tracking-widest">İletişim Bilgileriniz</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad <span className="text-red-500">*</span></Label>
                  <Input id="fullName" name="fullName" placeholder="Adınız ve soyadınız" required value={formData.fullName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Firma Adı <span className="text-red-500">*</span></Label>
                  <Input id="company" name="company" placeholder="Şirketinizin adı" required value={formData.company} onChange={handleChange} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta <span className="text-red-500">*</span></Label>
                  <Input id="email" name="email" type="email" placeholder="ornek@firma.com" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon <span className="text-gray-400 font-normal text-xs">(opsiyonel)</span></Label>
                  <Input id="phone" name="phone" placeholder="+90 / +971 / +44…" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Part details */}
            <div className="border-t pt-5 space-y-4">
              <p className="text-xs font-bold text-nidah-gray uppercase tracking-widest">Parça Bilgileri</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Parça Numarası</Label>
                  <Input id="partNumber" name="partNumber" placeholder="Örn: VOE 15172797" value={formData.partNumber} onChange={handleChange}
                    className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka</Label>
                  <Select value={formData.brand} onValueChange={(v) => setFormData((p) => ({ ...p, brand: v }))}>
                    <SelectTrigger><SelectValue placeholder="Marka seçiniz" /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => <SelectItem key={b.slug} value={b.name}>{b.name}</SelectItem>)}
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="machineModel">Makina Modeli</Label>
                  <Input id="machineModel" name="machineModel" placeholder="Örn: Volvo EC210B" value={formData.machineModel} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Adet</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} value={formData.quantity} onChange={handleChange} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Teslimat Ülkesi</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Ek Açıklama</Label>
                <Textarea
                  id="description" name="description"
                  placeholder="Ürün hakkında ek bilgi, özel gereksinimler veya alternatif parça numaraları…"
                  rows={3} className="resize-none"
                  value={formData.description} onChange={handleChange}
                />
              </div>
            </div>

            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={formData.website}
                onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))} />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Gönderiliyor…</> : <><Send className="size-4 mr-2" />Parça Teklifi İste</>}
            </Button>
          </form>
        </div>
      </div>
      <SidePanel whatsappMsg={whatsappMsg} />
    </div>
  );
}

// ── Service Form ───────────────────────────────────────────────────────────────

function ServiceForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    type: "service",
    fullName: "",
    company: "",
    phone: "",
    email: "",
    serviceType: "",
    machineBrand: "",
    machineModel: "",
    problemDescription: "",
    urgency: "normal",
    country: "Türkiye",
    website: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceType) { setError("Lütfen hizmet türünü seçiniz."); return; }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, message: formData.problemDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu. Lütfen tekrar deneyin.");
      trackRfqSubmit("service", formData.machineBrand || undefined);
      router.push("/teklif-al/basarili");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMsg = formData.serviceType
    ? `Merhaba, ${formData.serviceType} hizmeti için teklif almak istiyorum.`
    : "Merhaba, teknik servis talebi hakkında bilgi almak istiyorum.";

  const selectedUrgency = URGENCY_OPTIONS.find((o) => o.value === formData.urgency);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-50">
            <div className="w-10 h-10 bg-nidah-steel/10 rounded-xl flex items-center justify-center">
              <Wrench className="size-5 text-nidah-steel" />
            </div>
            <div>
              <h2 className="font-bold text-nidah-dark text-base leading-none">Servis / Onarım Teklif Formu</h2>
              <p className="text-xs text-nidah-gray mt-0.5">Arıza bilgilerini paylaşın, teknik ekibimiz size ulaşsın</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contact — top of form */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-nidah-gray uppercase tracking-widest">İletişim Bilgileriniz</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sFullName">Ad Soyad <span className="text-red-500">*</span></Label>
                  <Input id="sFullName" name="fullName" placeholder="Adınız ve soyadınız" required value={formData.fullName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sCompany">Firma Adı <span className="text-red-500">*</span></Label>
                  <Input id="sCompany" name="company" placeholder="Şirketinizin adı" required value={formData.company} onChange={handleChange} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sEmail">E-posta <span className="text-red-500">*</span></Label>
                  <Input id="sEmail" name="email" type="email" placeholder="ornek@firma.com" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sPhone">Telefon <span className="text-gray-400 font-normal text-xs">(opsiyonel)</span></Label>
                  <Input id="sPhone" name="phone" placeholder="+90 / +971 / +44…" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Service details */}
            <div className="border-t pt-5 space-y-4">
              <p className="text-xs font-bold text-nidah-gray uppercase tracking-widest">Servis Bilgileri</p>

              {/* Service type */}
              <div className="space-y-2">
                <Label>Hizmet Türü <span className="text-red-500">*</span></Label>
                <Select value={formData.serviceType} onValueChange={(v) => setFormData((p) => ({ ...p, serviceType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Hizmet türünü seçiniz" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Machine brand + model */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Araç Markası</Label>
                  <Select value={formData.machineBrand} onValueChange={(v) => setFormData((p) => ({ ...p, machineBrand: v }))}>
                    <SelectTrigger><SelectValue placeholder="Marka seçiniz" /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => <SelectItem key={b.slug} value={b.name}>{b.name}</SelectItem>)}
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sMachineModel">Araç Modeli</Label>
                  <Input id="sMachineModel" name="machineModel" placeholder="Örn: Volvo EC210B" value={formData.machineModel} onChange={handleChange} />
                </div>
              </div>

              {/* Problem description */}
              <div className="space-y-2">
                <Label htmlFor="problemDescription">
                  Arıza / Sorun Açıklaması <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="problemDescription" name="problemDescription"
                  placeholder="Aracın belirtileri, ne zamandan beri devam ettiği ve bilinen arıza kodlarını detaylı açıklayınız…"
                  rows={4} required className="resize-none"
                  value={formData.problemDescription} onChange={handleChange}
                />
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <Label>Aciliyet</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, urgency: opt.value }))}
                      className={`text-left rounded-xl border-2 px-3.5 py-3 text-xs font-semibold transition-all ${
                        formData.urgency === opt.value
                          ? opt.value === "critical"
                            ? "border-red-400 bg-red-50 text-red-700"
                            : opt.value === "urgent"
                            ? "border-amber-400 bg-amber-50 text-amber-700"
                            : "border-nidah-yellow bg-nidah-yellow/5 text-nidah-yellow-dark"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt.value === "critical" && <AlertTriangle className="size-3.5 mb-1" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="sCountry">Ülke</Label>
                <Input id="sCountry" name="country" value={formData.country} onChange={handleChange} />
              </div>
            </div>

            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={formData.website}
                onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))} />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {selectedUrgency?.value === "critical" && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                Kritik arızalar için WhatsApp hattımızdan da doğrudan ulaşabilirsiniz.
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-nidah-dark text-white hover:bg-nidah-navy font-bold">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Gönderiliyor…</> : <><Send className="size-4 mr-2" />Servis Talebi Gönder</>}
            </Button>
          </form>
        </div>
      </div>
      <SidePanel whatsappMsg={whatsappMsg} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function TeklifContent() {
  const [requestType, setRequestType] = useState<RequestType>(null);

  return (
    <>
      {requestType === null && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-base text-nidah-gray">Talebinizin türünü seçerek devam edin:</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button
              onClick={() => setRequestType("parts")}
              className="group text-left bg-white rounded-2xl border-2 border-gray-100 p-7 hover:border-nidah-yellow hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-nidah-yellow/10 flex items-center justify-center mb-5 group-hover:bg-nidah-yellow/20 transition-colors">
                <Package className="size-6 text-nidah-yellow-dark" />
              </div>
              <h3 className="font-black text-nidah-dark text-base mb-2">Parça Talebi</h3>
              <p className="text-sm text-nidah-gray leading-relaxed mb-5">
                Belirli bir parça numarası veya marka için fiyat ve tedarik teklifi alın.
              </p>
              <span className="text-xs font-bold text-nidah-yellow-dark inline-flex items-center gap-1">
                Devam Et →
              </span>
            </button>

            <button
              onClick={() => setRequestType("service")}
              className="group text-left bg-white rounded-2xl border-2 border-gray-100 p-7 hover:border-nidah-steel hover:shadow-lg transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-nidah-steel/8 flex items-center justify-center mb-5 group-hover:bg-nidah-steel/12 transition-colors">
                <Wrench className="size-6 text-nidah-steel" />
              </div>
              <h3 className="font-black text-nidah-dark text-base mb-2">Servis / Onarım Talebi</h3>
              <p className="text-sm text-nidah-gray leading-relaxed mb-5">
                Revizyon, bakım, arıza tespit veya elektronik sistem servisi için talep oluşturun.
              </p>
              <span className="text-xs font-bold text-nidah-steel inline-flex items-center gap-1">
                Devam Et →
              </span>
            </button>
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              "Ücretsiz Teklif",
              "48h Yanıt",
              "13+ Ülke",
              "OEM Kalite",
            ].map((t) => (
              <div key={t} className="text-center bg-white border border-gray-100 rounded-xl py-3 px-2">
                <CheckCircle className="size-4 text-nidah-yellow mx-auto mb-1" />
                <span className="text-xs font-semibold text-nidah-dark">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestType !== null && (
        <div className="mb-7">
          <button
            onClick={() => setRequestType(null)}
            className="inline-flex items-center gap-1.5 text-sm text-nidah-gray hover:text-nidah-dark transition-colors font-medium"
          >
            <ArrowLeft className="size-4" />
            Teklif türünü değiştir
          </button>
        </div>
      )}

      {requestType === "parts"   && <PartsForm />}
      {requestType === "service" && <ServiceForm />}
    </>
  );
}

export default function TeklifAlClient() {
  return (
    <main className="bg-nidah-light min-h-screen">
      <section className="gradient-hero py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
            <Send className="size-3.5 text-nidah-yellow" />
            <span>Ücretsiz Teklif · Hızlı Yanıt</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">Teklif Al</h1>
          <p className="text-lg text-white/70 max-w-xl">
            Parça tedariği veya teknik servis için hemen teklif isteyin.
            Uzman ekibimiz en kısa sürede dönüş yapar.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Teklif Al" }]} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-nidah-yellow" /></div>}>
          <TeklifContent />
        </Suspense>
      </section>
    </main>
  );
}
