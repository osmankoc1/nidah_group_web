import Link from "next/link";
import { Home, SearchX, Wrench, MessageCircle, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNavVisibility, type NavItem } from "@/lib/site-settings";
import { NAV_ITEMS, CONTACTS, WHATSAPP_URL } from "@/lib/constants";

export default async function NotFound() {
  // Nav görünürlüğü admin toggle'larına saygılı — kapalı sayfa 404'te bile
  // önerilmez. DB erişilemezse varsayılan menüyle devam et (404 sayfası
  // hiçbir koşulda kendisi hata vermemeli).
  let navItems: readonly NavItem[] = NAV_ITEMS;
  let teklifAlEnabled = true;
  try {
    const nav = await getNavVisibility();
    navItems = nav.navItems;
    teklifAlEnabled = nav.teklifAlEnabled;
  } catch {
    /* varsayılanlarla devam */
  }

  const whatsappHref = WHATSAPP_URL(
    CONTACTS.mustafa.phoneRaw,
    "Merhaba, sitenizde aradığım sayfaya ulaşamadım, bilgi almak istiyorum."
  );

  return (
    <div className="min-h-screen flex flex-col bg-nidah-light">
      {/* Mini header — marka sürekliliği */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-nidah-yellow rounded-lg flex items-center justify-center shrink-0">
              <span className="text-nidah-dark font-black text-sm leading-none">N</span>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-nidah-dark block leading-none">
                NİDAH GROUP
              </span>
              <span className="text-[9px] text-nidah-gray tracking-widest uppercase leading-none hidden sm:block mt-0.5">
                Global Parts &amp; Service
              </span>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-nidah-dark/10">
            <SearchX className="size-10 text-nidah-dark" />
          </div>

          <p className="text-6xl font-black text-nidah-yellow">404</p>

          <h1 className="mt-4 text-2xl font-bold text-nidah-dark sm:text-3xl">
            Sayfa Bulunamadı
          </h1>

          <p className="mx-auto mt-3 max-w-md text-nidah-gray">
            Aradığınız sayfa mevcut değil, taşınmış veya henüz yayına alınmamış
            olabilir. Size aşağıdan yardımcı olalım.
          </p>

          {/* Birincil aksiyonlar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold"
            >
              <Link href="/">
                <Home className="size-4" />
                Ana Sayfaya Dön
              </Link>
            </Button>
            {teklifAlEnabled && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-nidah-dark/20 text-nidah-dark hover:bg-nidah-dark hover:text-white"
              >
                <Link href="/teklif-al">
                  <FileText className="size-4" />
                  Teklif Al
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
          </div>

          {/* Popüler sayfalar — yalnızca yayında olanlar */}
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-widest text-nidah-gray mb-4">
              Popüler Sayfalar
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {navItems
                .filter((item) => item.href !== "/")
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-nidah-dark bg-white border border-gray-200 rounded-full px-4 py-2 hover:border-nidah-yellow hover:shadow-sm transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>

          {/* İletişim şeridi */}
          <div className="mt-12 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-white border border-gray-100 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-nidah-gray">
              <Wrench className="size-4 text-nidah-yellow shrink-0" />
              Parça veya servis mi arıyordunuz?
            </div>
            <a
              href={`tel:${CONTACTS.mustafa.phoneRaw}`}
              className="flex items-center gap-2 text-sm font-bold text-nidah-dark hover:text-nidah-yellow-dark transition-colors"
            >
              <Phone className="size-4 text-nidah-yellow shrink-0" />
              {CONTACTS.mustafa.phone}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
