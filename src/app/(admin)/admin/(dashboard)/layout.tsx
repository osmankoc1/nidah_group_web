import Link from "next/link";
import { LayoutDashboard, FileText, Package, Cog, Upload, LogOut, BookOpen, BarChart3, ToggleLeft, FolderTree } from "lucide-react";
import { Toaster } from "sonner";
import SplashOverlay from "@/components/splash/SplashOverlay";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

/**
 * Yönetim paneli gezinme bağlantıları — TEK KAYNAK.
 *
 * Aynı liste iki yerde render edilir (masaüstü satırı ve küçük ekran şeridi);
 * elle kopyalanmış iki liste zamanla ayrışacağı için dizi hâlinde tutulur.
 */
const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/rfq",       label: "Teklifler", Icon: FileText },
  { href: "/admin/products",  label: "Ürünler",   Icon: Package },
  { href: "/admin/categories", label: "Kategoriler", Icon: FolderTree },
  { href: "/admin/machines",  label: "Makineler", Icon: Cog },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/admin/blog",      label: "Blog",      Icon: BookOpen },
  { href: "/admin/import",    label: "Import",    Icon: Upload },
  { href: "/admin/pages",     label: "Sayfalar",  Icon: ToggleLeft },
] as const;

const LINK_CLASS =
  "flex shrink-0 items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SplashOverlay variant="admin" />

      {/*
        Üst gezinme — üç kırılma noktası:
          · lg ve üzeri : bağlantılar marka ile AYNI satırda (masaüstü tasarımı
                          birebir korunur: gap-6, aynı sınıflar, aynı sıra)
          · lg altı     : bağlantılar ikinci satıra iner ve yatay kaydırılır
                          (`w-max` + `overflow-x-auto`), böylece BELGE taşmaz
          · ~768px      : 8 bağlantı tek satıra sığar, kaydırma gerekmez

        ÖNCEKİ SORUN: tüm bağlantılar sarmalanmayan tek bir flex satırındaydı;
        836px genişliğe ulaşıp belgeyi 905px'e zorluyordu. 375px'te yönetim
        panelinin tamamı yatay kayıyordu (yalnızca bu sayfada değil, admin
        düzenini kullanan HER sayfada).
      */}
      <nav className="border-b bg-[#1A1A2E] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-6">
              <span className="shrink-0 text-sm font-bold tracking-widest text-[#F59E0B]">
                NİDAH ADMIN
              </span>
              {/* Masaüstü: marka ile aynı satır */}
              <div className="hidden items-center gap-6 lg:flex">
                {NAV_LINKS.map(({ href, label, Icon }) => (
                  <Link key={href} href={href} className={LINK_CLASS}>
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <a
              href="/api/admin/logout"
              className="flex shrink-0 items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Çıkış</span>
              <span className="sr-only sm:hidden">Çıkış</span>
            </a>
          </div>

          {/* Telefon / tablet: ikinci satır, gerekirse yatay kaydırılır */}
          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex w-max items-center gap-5">
              {NAV_LINKS.map(({ href, label, Icon }) => (
                <Link key={href} href={href} className={LINK_CLASS}>
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
