import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
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
                <Link
                  href={item.href}
                  className="hover:text-nidah-dark transition-colors"
                >
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
  );
}
