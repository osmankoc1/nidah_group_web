import { Fragment } from "react";
import Link from "next/link";
import type { ServiceLink } from "@/lib/services";

/**
 * Mevcut kapanış/CTA alanlarının içine yerleşen küçük bağlamsal link satırı.
 *
 * Yeni bir bölüm veya kart ızgarası DEĞİLDİR — çağıran sayfanın hâlihazırdaki
 * bloğunun içinde tek satır olarak render edilir. Server Component: state,
 * effect, JS etkileşimi ve görsel yoktur; bundle'a hiçbir maliyeti olmaz.
 *
 * Renkler çağıran tarafından verilir (açık CTA / koyu ECU bloğu), böylece
 * bileşen içinde tema varyantı mantığı tutulmaz.
 */
export default function RelatedServiceLinks({
  services,
  label = "İlgili hizmetler:",
  className = "",
  labelClassName = "",
  linkClassName = "",
}: {
  services: readonly ServiceLink[];
  label?: string;
  className?: string;
  labelClassName?: string;
  linkClassName?: string;
}) {
  if (services.length === 0) return null;

  return (
    <nav aria-label="İlgili hizmetler" className={`text-sm ${className}`}>
      <span className={labelClassName}>{label}</span>{" "}
      {services.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <Link
            href={s.href}
            className={`underline underline-offset-4 decoration-current/40 hover:decoration-current transition-colors ${linkClassName}`}
          >
            {s.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
