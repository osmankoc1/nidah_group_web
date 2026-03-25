import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFab from "@/components/shared/WhatsAppFab";
import SplashOverlay from "@/components/splash/SplashOverlay";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SplashOverlay variant="site" />
      <Header />
      <PageTransitionWrapper>{children}</PageTransitionWrapper>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
