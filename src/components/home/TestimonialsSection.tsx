import { CheckCircle2, Building2, Wrench, Package } from "lucide-react";

const CASE_STUDIES = [
  {
    icon: Package,
    sector: "Hafriyat & Altyapı",
    machine: "Volvo ekskavatör",
    challenge: "Saha dışı arıza — hidrolik pompa ani devreden çıktı, makine durdu.",
    result:
      "Aynı gün parça temin edildi, saha teknik ekibi tarafından montaj tamamlandı. Makine ertesi sabah operasyona döndü.",
    tags: ["Acil Parça Temini", "Saha Desteği"],
  },
  {
    icon: Wrench,
    sector: "Yol Yapımı",
    machine: "Komatsu motor greyder",
    challenge:
      "Şanzıman kayması ve aşırı ısınma şikayeti — standart bakım çözüm üretemedi.",
    result:
      "Tam şanzıman revizyonu ve OEM standartlarında parça değişimi. Test raporu ile teslim. Sezon boyunca sorunsuz çalışma.",
    tags: ["Şanzıman Revizyonu", "Test Raporu"],
  },
  {
    icon: Building2,
    sector: "İnşaat Makinası Kiralama",
    machine: "CAT & HİDROMEK — çoklu makine filolu",
    challenge:
      "3 farklı marka için düzensiz parça temini, uzun bekleme süreleri.",
    result:
      "Düzenli parça tedarik anlaşması. Parça numarası ile hızlı sorgulama, 13+ ülkeye DHL kargo. Filonun duruş süresi önemli ölçüde azaldı.",
    tags: ["Düzenli Tedarik", "Çoklu Marka"],
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-nidah-light">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">
            Sahadan Örnekler
          </h2>
          <p className="text-nidah-gray text-base max-w-xl mx-auto">
            Farklı sektörlerden müşterilerimizle yaşadığımız gerçek süreçlerden
            kesitler. Referans için iletişime geçebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CASE_STUDIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.sector}
                className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col hover:shadow-md hover:border-nidah-yellow/20 transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-10 rounded-xl bg-nidah-yellow/10 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-nidah-yellow" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-nidah-yellow uppercase tracking-wide">
                      {c.sector}
                    </p>
                    <p className="text-sm font-bold text-nidah-dark">
                      {c.machine}
                    </p>
                  </div>
                </div>

                {/* Challenge */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-nidah-gray uppercase tracking-wide mb-1">
                    Durum
                  </p>
                  <p className="text-sm text-nidah-gray leading-relaxed">
                    {c.challenge}
                  </p>
                </div>

                {/* Result */}
                <div className="flex-1 mb-5">
                  <p className="text-xs font-semibold text-nidah-gray uppercase tracking-wide mb-1">
                    Sonuç
                  </p>
                  <p className="text-sm text-nidah-dark leading-relaxed font-medium">
                    {c.result}
                  </p>
                </div>

                {/* Tags */}
                <div className="pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-nidah-yellow/8 text-nidah-dark px-2.5 py-1 rounded-full"
                    >
                      <CheckCircle2 className="size-3 text-nidah-yellow" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-nidah-gray/60 mt-8">
          * Gizlilik nedeniyle şirket isimleri paylaşılmamaktadır. Sektöre özel
          referans için{" "}
          <a
            href="/iletisim"
            className="underline underline-offset-2 hover:text-nidah-yellow transition-colors"
          >
            iletişime geçin
          </a>
          .
        </p>
      </div>
    </section>
  );
}
