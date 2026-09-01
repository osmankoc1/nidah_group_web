import Link from "next/link";
import { BRANDS } from "@/lib/constants";
import { getCatalogAccess } from "@/lib/catalog-access";
import { Globe, TrendingUp } from "lucide-react";

/**
 * Markalar bölümü — 16 iş makinası markası, tamamı gerçek kurumsal SVG logo.
 * Varsayılan görünüm monokrom (grayscale), hover'da markanın kurumsal
 * renklerine döner. Logo kutusu sabit (h-12) → CLS oluşturmaz.
 */

// Ana 8 marka BRANDS sabitinden gelir (Volvo…Ammann) — sıra korunur.
// Genişletilmiş 8 marka aşağıda; hepsi public/images/brands/<slug>.svg bekler.
const EXTENDED_BRANDS = [
  { name: "LIEBHERR",   slug: "liebherr"   },
  { name: "JOHN DEERE", slug: "john-deere" },
  { name: "HITACHI",    slug: "hitachi"    },
  { name: "DOOSAN",     slug: "doosan"     },
  { name: "CASE",       slug: "case"       },
  { name: "JCB",        slug: "jcb"        },
  { name: "TADANO",     slug: "tadano"     },
  { name: "MANITOWOC",  slug: "manitowoc"  },
] as const;

const ALL_BRANDS = [...BRANDS, ...EXTENDED_BRANDS];

// Yalnızca /parca-katalog/<slug> hub route'u GERÇEKTEN bulunan markalar.
// Tek kaynak: constants.ts BRANDS — genişletilmiş markaların route'u yoktur,
// onlara asla link üretilmez (hayali URL / ölü link riski sıfır).
const BRAND_SLUGS_WITH_HUB = new Set<string>(BRANDS.map(b => b.slug));

// Alt şerit: komponent / OEM tedarikçi markaları (logoları repoda mevcut,
// kart yerine kompakt rozet olarak gösterilir).
const COMPONENT_BRANDS = [
  "BOSCH REXROTH", "ZF", "CUMMINS", "PARKER", "DANFOSS",
  "PERKINS", "DEUTZ", "EATON", "KAWASAKI", "POCLAIN",
];

export default async function BrandsSection() {
  // Admin katalog toggle'ı KAPALIYKEN hiçbir marka kartı link olmaz —
  // görünüm birebir korunur, kapalı katalog URL'lerine ölü link üretilmez.
  const catalog = await getCatalogAccess();
  return (
    <section className="py-16 sm:py-20 bg-nidah-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-nidah-yellow/10 border border-nidah-yellow/20 rounded-full px-4 py-1.5 text-sm text-nidah-yellow-dark font-medium mb-5">
            <TrendingUp className="size-3.5" />
            Orijinal · OEM · Muadil
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">
            Hizmet Verdiğimiz Markalar
          </h2>
          <p className="text-nidah-gray text-lg max-w-2xl mx-auto leading-relaxed">
            Dünyanın önde gelen iş makinası markalarına orijinal, OEM ve muadil
            yedek parça tedariki — Türkiye&apos;den dünyaya.
          </p>
        </div>

        {/* Brand grid — 16 kart, tamamı gerçek logo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {ALL_BRANDS.map((brand, i) => {
            const cardClass =
              "group relative bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-nidah-yellow/40 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden";
            const linkable = catalog.enabled && BRAND_SLUGS_WITH_HUB.has(brand.slug);
            const inner = (
              <>
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-nidah-yellow/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Logo — sabit yükseklikli kutu (CLS yok); monokrom → hover'da kurumsal renk */}
              <div className="h-12 w-full flex items-center justify-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG wordmark, next/image optimizasyonu gerektirmez */}
                <img
                  src={`/images/brands/${brand.slug}.svg`}
                  alt={`${brand.name} logosu`}
                  width={130}
                  height={40}
                  className="h-8 sm:h-9 w-auto max-w-[80%] object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>

              <span className="text-sm sm:text-base font-bold text-nidah-dark tracking-wide leading-tight">
                {brand.name}
              </span>
              <span className="text-xs text-nidah-gray/60 mt-1">İş Makinası</span>

              {/* Rank badge */}
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-nidah-dark/5 flex items-center justify-center">
                <span className="text-[10px] font-bold text-nidah-dark/40">{i + 1}</span>
              </div>
              </>
            );
            return linkable ? (
              <Link key={brand.slug} href={`/parca-katalog/${brand.slug}`} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <div key={brand.slug} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* Komponent / OEM markaları */}
        <div className="bg-white/70 border border-gray-100 rounded-xl px-4 sm:px-6 py-4 flex flex-wrap items-center gap-2 sm:gap-3 mb-10">
          <span className="text-xs font-semibold text-nidah-gray/60 uppercase tracking-wider shrink-0">
            Komponent:
          </span>
          {COMPONENT_BRANDS.map((b) => (
            <span key={b} className="text-xs font-semibold text-nidah-dark/50 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
              {b}
            </span>
          ))}
          <span className="text-xs text-nidah-gray/40 ml-1">ve daha fazlası…</span>
        </div>

        {/* Global note */}
        <div className="flex items-center justify-center gap-3 text-sm text-nidah-gray">
          <Globe className="size-4 text-nidah-yellow-dark shrink-0" />
          <span>
            Tüm bu markalara ait yedek parçalar <strong className="text-nidah-dark">13&apos;ten fazla ülkeye</strong> ihraç edilmektedir.
            Türkiye, ABD, BAE, Suudi Arabistan, Rusya ve daha fazlası.
          </span>
        </div>
      </div>
    </section>
  );
}
