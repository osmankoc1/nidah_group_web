import { HardHat, Snowflake, Truck, Shield, Wrench } from "lucide-react";

const VEHICLES = [
  {
    icon: HardHat,
    title: "İş Makineleri",
    desc: "Ekskavatör, yükleyici, dozer, greyder, kompaktör ve tüm iş makinesi tipleri.",
    dark: true,
  },
  {
    icon: Snowflake,
    title: "Tuz Sericiler",
    desc: "Karayolu bakım araçlarına özel yedek parça ve elektronik sistem desteği.",
    dark: false,
  },
  {
    icon: Truck,
    title: "Ekipmanlı / Ekipmansız Kamyonlar",
    desc: "Standart ve özel donanımlı tüm ağır vasıtalara servis ve parça desteği.",
    dark: false,
  },
  {
    icon: Shield,
    title: "Savunma Sanayi Araçları",
    desc: "Askeri araçların mekanik ve elektronik sistemlerine özel çözümler.",
    dark: false,
  },
  {
    icon: Wrench,
    title: "Özel Amaçlı Ağır Araç Sistemleri",
    desc: "Katalog dışı özel donanımlı araçlar için proje bazlı tedarik ve servis.",
    dark: false,
  },
] as const;

export default function VehicleTypesSection() {
  return (
    <section className="py-24 bg-nidah-light">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-nidah-dark mb-4">Hizmet Verdiğimiz Araçlar</h2>
          <p className="text-nidah-gray text-lg max-w-xl mx-auto">
            İş makinesinden savunma sanayii aracına geniş bir araç yelpazesine hizmet veriyoruz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VEHICLES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className={`group rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  v.dark
                    ? "bg-nidah-dark border-nidah-dark lg:col-span-2"
                    : "bg-white border-gray-100 hover:border-nidah-yellow/30"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${v.dark ? "bg-nidah-yellow/15" : "bg-nidah-yellow/10"}`}>
                  <Icon className={`size-5 ${v.dark ? "text-nidah-yellow" : "text-nidah-yellow-dark"}`} />
                </div>
                <h3 className={`font-bold text-sm mb-1.5 ${v.dark ? "text-white" : "text-nidah-dark"}`}>{v.title}</h3>
                <p className={`text-xs leading-relaxed ${v.dark ? "text-white/60" : "text-nidah-gray"}`}>{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
