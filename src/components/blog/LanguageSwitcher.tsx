import Link from "next/link";
import { LOCALES, LOCALE_CONFIG, type Locale, blogPostHref } from "@/lib/blog-locales";
import { FlagIcon } from "@/components/blog/FlagIcon";

interface Props {
  currentLocale: Locale;
  /** Slug per locale — omit a locale key if that translation doesn't exist */
  slugsByLocale: Partial<Record<Locale, string>>;
}

export function LanguageSwitcher({ currentLocale, slugsByLocale }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label="Language / Dil / Язык / اللغة">
      {LOCALES.map((locale, i) => {
        const cfg     = LOCALE_CONFIG[locale];
        const slug    = slugsByLocale[locale];
        const current = locale === currentLocale;

        return (
          <span key={locale} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300 text-xs select-none">|</span>}
            {current ? (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-nidah-yellow text-nidah-dark">
                <FlagIcon locale={locale} className="inline-block w-4 h-3 rounded-[2px] shadow-sm" /> {cfg.label}
              </span>
            ) : slug ? (
              <Link
                href={blogPostHref(locale, slug)}
                className="px-2 py-0.5 rounded text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                title={cfg.name}
              >
                <FlagIcon locale={locale} className="inline-block w-4 h-3 rounded-[2px] shadow-sm" /> {cfg.label}
              </Link>
            ) : (
              <span
                className="px-2 py-0.5 rounded text-xs text-gray-300 cursor-not-allowed"
                title={`${cfg.name} — translation not available`}
              >
                <FlagIcon locale={locale} className="inline-block w-4 h-3 rounded-[2px] shadow-sm" /> {cfg.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
