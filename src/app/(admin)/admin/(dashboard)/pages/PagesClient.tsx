"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe, Eye, EyeOff, Loader2 } from "lucide-react";
import type { PageKey } from "@/lib/site-settings";

interface PageRow {
  key: PageKey;
  path: string;
  label: string;
  enabled: boolean;
}

export default function PagesClient({ initialPages }: { initialPages: PageRow[] }) {
  const [pages, setPages] = useState(initialPages);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(key: PageKey, current: boolean) {
    setLoading(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: !current }),
      });

      if (!res.ok) throw new Error("Sunucu hatası");

      setPages((prev) =>
        prev.map((p) => (p.key === key ? { ...p, enabled: !current } : p))
      );

      toast.success(
        `"${pages.find((p) => p.key === key)?.label}" sayfası ${!current ? "yayına alındı" : "yayından kaldırıldı"}.`
      );
    } catch {
      toast.error("Ayar kaydedilemedi, tekrar deneyin.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sayfa Yönetimi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kapatılan sayfalar ziyaretçilere 404 gösterir. Değişiklik en fazla 60 saniye içinde aktif olur.
        </p>
      </div>

      <div className="space-y-3">
        {pages.map((page) => {
          const isLoading = loading === page.key;
          return (
            <div
              key={page.key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <Globe className="size-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{page.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{page.path}</p>
                </div>
              </div>

              <button
                onClick={() => toggle(page.key, page.enabled)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all
                  ${page.enabled
                    ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                    : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : page.enabled ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
                {page.enabled ? "Yayında" : "Kapalı"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        * Ana sayfa (/), iletişim ve hizmetler gibi temel sayfalar her zaman açık kalmalıdır.
      </p>
    </div>
  );
}
