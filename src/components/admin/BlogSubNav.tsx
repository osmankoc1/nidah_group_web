"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderOpen, Tag } from "lucide-react";

const TABS = [
  { label: "Yazılar",     href: "/admin/blog",            icon: BookOpen },
  { label: "Kategoriler", href: "/admin/blog/categories", icon: FolderOpen },
  { label: "Etiketler",   href: "/admin/blog/tags",        icon: Tag },
] as const;

export function BlogSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-0 border-b mb-6 overflow-x-auto">
      {TABS.map(({ label, href, icon: Icon }) => {
        // "Yazılar" is active for all /admin/blog/* routes except categories and tags
        const active =
          href === "/admin/blog"
            ? pathname === "/admin/blog" ||
              (pathname.startsWith("/admin/blog/") &&
                !pathname.startsWith("/admin/blog/categories") &&
                !pathname.startsWith("/admin/blog/tags"))
            : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active
                ? "border-nidah-yellow text-nidah-dark"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
