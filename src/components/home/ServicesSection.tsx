import Link from "next/link";
import {
  Cog, Droplets, Search, Package, Wrench, ShieldCheck, ArrowRight,
} from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/services";
import { getCatalogAccess } from "@/lib/catalog-access";

/**
 * Birleşik hizmetler bölümü.
 *
 * NEDEN BİRLEŞTİRİLDİ: "Temel Hizmetlerimiz" (4 kart) ve "Teknik Hizmetler"
 * (6 kart) toplam 10 kart gösteriyordu ama yalnızca 5 benzersiz hizmet
 * sayfasına gidiyordu — `periyodik-bakim-ariza-tespit` 3 kez,
 * `sanziman-revizyonu` ve `hidrolik-pompa-revizyonu` 2'şer kez tekrarlıyordu.
 * Ziyaretçi aynı sayfaya giden kartları farklı hizmet sanıyordu.
 *
 * Link topolojisinin TEK KAYNAĞI `src/lib/services.ts`. Buradaki ikon ve
 * açıklama yalnızca sunum katmanıdır — registry'ye taşınmaz (bkz. services.ts
 * başlığındaki kapsam notu).
 */

const PRESENTATION: Record<ServiceKey, { icon: typeof Cog; desc: string }> = {
  "sanziman": {
    icon: Cog,
    desc: "Komple sökme, ölçüm, parça değişimi, montaj ve test tezgâhında performans kontrolü.",
  },
  "hidrolik-pompa": {
    icon: Droplets,
    desc: "Pistonlu, dişli ve kanatlı tüm pompa tiplerinde revizyon, arıza teşhisi ve sıfır pompa tedariki.",
  },
  "diferansiyel": {
    icon: Wrench,
    desc: "Komple söküm, ölçüm, parça değişimi ve yük altında test.",
  },
  "ecu": {
    icon: Search,
    desc: "İş makinesi ve ağır vasıta ECU'larında teşhis, onarım ve yazılım desteği.",
  },
  "periyodik-bakim": {
    icon: ShieldCheck,
    desc: "Dijital teşhis, basınç ve sıcaklık analizi. Sistematik bakımla arızayı önleyin.",
  },
};

/** services.ts'teki sıra değil, ana sayfada gösterilmek istenen sıra. */
const ORDER: ServiceKey[] = [
  "sanziman",
  "hidrolik-pompa",
  "diferansiyel",
  "ecu",
  "periyodik-bakim",
];

export default async function ServicesSection() {
  const catalog = await getCatalogAccess();

  return (
    <section className="py-14 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-3">
              Hizmetlerimiz
            </h2>
            <div className="w-12 h-1 bg-nidah-yellow rounded-full mb-4" />
            <p className="text-nidah-gray text-base max-w-lg">
              Şanzımandan hidroliğe, diferansiyelden elektroniğe — atölye ve saha
              hizmetleriyle makinanızı üretime geri döndürüyoruz.
            </p>
          </div>
          <Link
            href="/hizmetler"
            className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-nidah-steel hover:text-nidah-yellow-dark transition-colors whitespace-nowrap"
          >
            Tüm Hizmetler
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Grid — 5 benzersiz hizmet + şasi + parça tedariği */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ORDER.map((key) => {
            const { label, href } = SERVICES[key];
            const { icon: Icon, desc } = PRESENTATION[key];
            return (
              <Link
                key={key}
                href={href}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-nidah-yellow/30 hover:shadow-lg"
              >
                <Icon className="size-8 text-nidah-yellow-dark mb-4" aria-hidden="true" />
                <h3 className="text-base font-bold text-nidah-dark mb-2 group-hover:text-nidah-yellow-dark transition-colors">
                  {label}
                </h3>
                <p className="text-sm text-nidah-gray leading-relaxed flex-1">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-nidah-steel">
                  Detay <ArrowRight className="size-3.5" />
                </span>
              </Link>
            );
          })}

          {/* Şasi Onarımı — detay sayfası YOK, bilinçli olarak link değil.
              Uydurma URL üretmek yerine kart linksiz render edilir. */}
          <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <ShieldCheck className="size-8 text-nidah-gray/50 mb-4" aria-hidden="true" />
            <h3 className="text-base font-bold text-nidah-dark mb-2">Şasi Onarımı &amp; Tamir</h3>
            <p className="text-sm text-nidah-gray leading-relaxed flex-1">
              Yapısal onarım, kaynak ve tadilat işlemleri.
            </p>
          </div>

          {/* Yedek parça — hedef admin katalog toggle'ına göre belirlenir */}
          <Link
            href={catalog.hubHref}
            className="group flex flex-col rounded-2xl border border-nidah-yellow/30 bg-nidah-yellow/5 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <Package className="size-8 text-nidah-yellow-dark mb-4" aria-hidden="true" />
            <h3 className="text-base font-bold text-nidah-dark mb-2 group-hover:text-nidah-yellow-dark transition-colors">
              Yedek Parça Tedariği
            </h3>
            <p className="text-sm text-nidah-gray leading-relaxed flex-1">
              VOLVO, KOMATSU, CAT ve daha fazlası. Orijinal, OEM ve muadil —
              Türkiye ve dünya genelinde teslimat.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-nidah-yellow-dark">
              {catalog.hubLabel} <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
