import Link from "next/link";
import { LayoutDashboard, FileText, Package, Cog, Upload, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import SplashOverlay from "@/components/splash/SplashOverlay";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SplashOverlay variant="admin" />

      {/* Top nav */}
      <nav className="border-b bg-[#1A1A2E] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold tracking-widest text-[#F59E0B]">
              NİDAH ADMIN
            </span>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/rfq"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <FileText className="size-4" />
              Teklifler
            </Link>
            <Link
              href="/admin/products"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <Package className="size-4" />
              Ürünler
            </Link>
            <Link
              href="/admin/machines"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <Cog className="size-4" />
              Makineler
            </Link>
            <Link
              href="/admin/import"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <Upload className="size-4" />
              Import
            </Link>
          </div>

          <a
            href="/api/admin/logout"
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <LogOut className="size-4" />
            Çıkış
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
