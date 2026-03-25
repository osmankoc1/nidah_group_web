import { Users, Truck, Globe2, ShieldCheck, Clock, Headphones } from "lucide-react";

const ITEMS = [
  {
    icon: Globe2,
    title: "Global Tedarik Ağı",
    description:
      "3 kıtada 13'ten fazla ülkeye aktif ihracat. Amerika, Orta Doğu, Orta Asya ve Afrika'ya kesintisiz parça tedariki.",
    accent: true,
  },
  {
    icon: ShieldCheck,
    title: "OEM Kalite & Güvenilirlik",
    description:
      "Orijinal, OEM ve yüksek kaliteli muadil seçenekler. Titiz kalite kontrolü ve uluslararası standartlara uygunluk.",
    accent: false,
  },
  {
    icon: Clock,
    title: "Hızlı Teklif & Teslimat",
    description:
      "48 saat içinde teklif dönüşü. Geniş stok ağı ve güçlü lojistik bağlantılarımızla kritik parçalarda hızlı temin.",
    accent: false,
  },
  {
    icon: Users,
    title: "20+ Yıl Uzmanlık",
    description:
      "Hidrolik sistemler, şanzıman ve iş makinası yedek parçalarında 20'den fazla yıllık sektör deneyimi.",
    accent: false,
  },
  {
    icon: Truck,
    title: "Çok Ülkeye Lojistik",
    description:
      "Hava, kara ve deniz yoluyla uluslararası kargo. Gümrükleme desteği, takip ve güvenli teslimat.",
    accent: false,
  },
  {
    icon: Headphones,
    title: "Profesyonel Teknik Destek",
    description:
      "Parça tanımlama, teknik uyumluluk kontrolü ve kurulum desteği. Uzman ekibimiz kritik süreçlerde yanınızda.",
    accent: false,
  },
] as const;

export default function WhyUsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">
            Neden NİDAH GROUP?
          </h2>
          <p className="text-nidah-gray text-lg max-w-2xl mx-auto leading-relaxed">
            Türkiye merkezli, küresel ölçekte çalışan bir yedek parça tedarik ve ihracat firması.
            Yerel hız, uluslararası erişim.
          </p>
          <div className="w-16 h-1 bg-nidah-yellow mx-auto rounded-full mt-6" />
        </div>

        {/* 6-card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group rounded-2xl p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border ${
                  item.accent
                    ? "bg-nidah-dark border-nidah-dark text-white"
                    : "bg-white border-gray-100 hover:border-nidah-yellow/30"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                    item.accent
                      ? "bg-nidah-yellow/20"
                      : "bg-nidah-yellow/10 group-hover:bg-nidah-yellow/20"
                  }`}
                >
                  <Icon
                    className={`size-7 ${
                      item.accent ? "text-nidah-yellow" : "text-nidah-yellow-dark"
                    }`}
                  />
                </div>
                <h3
                  className={`text-lg font-bold mb-3 ${
                    item.accent ? "text-white" : "text-nidah-dark"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    item.accent ? "text-white/70" : "text-nidah-gray"
                  }`}
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
