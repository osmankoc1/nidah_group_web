import { TR, GB, RU, SA } from "country-flag-icons/react/3x2";
import type { Locale } from "@/lib/blog-locales";

const FLAGS: Record<Locale, typeof TR> = { tr: TR, en: GB, ru: RU, ar: SA };

interface Props {
  locale: Locale;
  className?: string;
}

export function FlagIcon({ locale, className = "inline-block w-5 h-3.5 rounded-[2px] shadow-sm" }: Props) {
  const Flag = FLAGS[locale];
  return <Flag className={className} aria-hidden />;
}
