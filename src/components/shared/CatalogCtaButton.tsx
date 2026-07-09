import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCatalogAccess, catalogWhatsAppHref } from "@/lib/catalog-access";

interface CatalogCtaButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  /** Katalog AÇIKKEN gösterilecek etiket */
  label?: React.ReactNode;
  /** Katalog KAPALIYKEN gösterilecek etiket */
  fallbackLabel?: React.ReactNode;
}

/**
 * Admin katalog toggle'ına duyarlı ikincil CTA butonu.
 *
 * - Toggle AÇIK  → /parca-katalog'a gider.
 * - Toggle KAPALI → WhatsApp parça sorgusuna gider (birincil CTA'sı zaten
 *   /teklif-al olan sayfalarda ikili buton çakışmasını önler).
 *
 * Tek otorite admin panelindeki "Parça Kataloğu" anahtarıdır; kod değişikliği
 * gerektirmeden tüm kullanıldığı yerlerde otomatik günceller.
 */
export default async function CatalogCtaButton({
  className,
  size = "lg",
  label = "Parça Kataloğu",
  fallbackLabel = "WhatsApp ile Parça Sorgula",
}: CatalogCtaButtonProps) {
  const catalog = await getCatalogAccess();

  return (
    <Button asChild size={size} variant="outline" className={className}>
      {catalog.enabled ? (
        <Link href={catalog.hubHref}>{label}</Link>
      ) : (
        <a href={catalogWhatsAppHref()} target="_blank" rel="noopener noreferrer">
          {fallbackLabel}
        </a>
      )}
    </Button>
  );
}
