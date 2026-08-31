import Link from "next/link";
import { JsonLd } from "@/lib/json-ld";
import { ChevronRight, Home } from "lucide-react";

const BASE_URL = "https://www.nidahgroup.com.tr";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Sitedeki TEK BreadcrumbList structured data üreticisi.
 * Sayfalar ayrıca kendi BreadcrumbList şemasını tanımlamamalıdır — aksi hâlde
 * aynı sayfada iki BreadcrumbList düğümü oluşur.
 *
 * `currentUrl`: son (linksiz) öğe için yalnızca ŞEMADA kullanılacak URL.
 * Görsel breadcrumb'da son öğe her zaman düz metindir; bu prop onu link yapmaz.
 */
export function PageBreadcrumb({
  items,
  currentUrl,
}: {
  items: BreadcrumbItem[];
  currentUrl?: string;
}) {
  const allItems = [
    { label: "Ana Sayfa", href: "/" },
    ...items,
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, i) => {
      const isLast = i === allItems.length - 1;
      const url = item.href ?? (isLast ? currentUrl : undefined);
      return {
        "@type": "ListItem",
        position: i + 1,
        name: item.label,
        ...(url ? { item: `${BASE_URL}${url}` } : {}),
      };
    }),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-2.5">
          <ol className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
            <li>
              <Link
                href="/"
                className="inline-flex items-center gap-1 hover:text-nidah-dark transition-colors"
              >
                <Home className="size-3" />
                <span>Ana Sayfa</span>
              </Link>
            </li>
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3 text-gray-300 shrink-0" />
                {item.href ? (
                  <Link href={item.href} className="hover:text-nidah-dark transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-800 font-semibold">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
