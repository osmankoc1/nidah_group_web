import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFab from "@/components/shared/WhatsAppFab";
import MobileActionBar from "@/components/shared/MobileActionBar";
import SplashOverlay from "@/components/splash/SplashOverlay";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import { getNavVisibility } from "@/lib/site-settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await getNavVisibility();

  return (
    <>
      <SplashOverlay variant="site" />
      <Header navItems={nav.navItems} teklifAlEnabled={nav.teklifAlEnabled} />
      <PageTransitionWrapper>{children}</PageTransitionWrapper>
      <Footer
        navItems={nav.navItems}
        teklifAlEnabled={nav.teklifAlEnabled}
        hizmetlerEnabled={nav.hizmetlerEnabled}
      />
      {/* Mobilde sabit eylem çubuğu footer'ın üzerine biner; son içeriğin
          çubuğun altında kalmaması için alt boşluk bırakılır. */}
      <div className="lg:hidden h-16" aria-hidden="true" />
      <MobileActionBar teklifAlEnabled={nav.teklifAlEnabled} />
      <WhatsAppFab />
    </>
  );
}
