export interface Service {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  features: string[];
  icon: string;
}

export const services: Service[] = [
  {
    slug: "hidrolik-sanziman-revizyonu",
    title: "Hidrolik Şanzıman Revizyonu",
    shortDescription:
      "İş makinası hidrolik şanzımanlarının komple revizyonu ve onarımı.",
    description:
      "Tüm marka ve model iş makinası hidrolik şanzımanlarının profesyonel revizyonu. Komple sökme, temizleme, ölçüm, yıpranmış parçaların değişimi ve montaj işlemleri uzman ekibimiz tarafından gerçekleştirilir. Revizyon sonrası test tezgahında performans testleri yapılarak teslim edilir.",
    features: [
      "Komple sökme ve temizleme",
      "Hassas ölçüm ve raporlama",
      "OEM standartlarında yedek parça kullanımı",
      "Test tezgahında performans kontrolü",
      "Test raporu ile teslim",
      "Tüm marka ve modellere uyumluluk",
    ],
    icon: "Cog",
  },
  {
    slug: "hidrolik-pompa-revizyonu",
    title: "Hidrolik Pompa Revizyonu",
    shortDescription:
      "Piston, dişli ve kanatlı tip pompaların revizyonu ve değişimi.",
    description:
      "Ekskavatör, yükleyici, dozer ve diğer iş makinalarında kullanılan tüm tip hidrolik pompaların revizyonu. Pistonlu pompalar, dişli pompalar ve kanatlı pompalar dahil olmak üzere tüm pompa tiplerinde uzmanız. Arıza tespiti, revizyon ve sıfır pompa tedariki hizmetleri sunulmaktadır.",
    features: [
      "Tüm pompa tiplerinde uzmanlık",
      "Arıza teşhis ve raporlama",
      "Orijinal ve muadil parça seçenekleri",
      "Basınç ve debi testleri",
      "Acil servis imkanı",
      "Yerinde veya atölyede revizyon",
    ],
    icon: "Droplets",
  },
  {
    slug: "ariza-tespit-bakim",
    title: "Arıza Tespit & Bakım",
    shortDescription:
      "İş makinası hidrolik sistemlerinde profesyonel arıza tespit ve periyodik bakım.",
    description:
      "Deneyimli teknik ekibimiz ile iş makinası hidrolik sistemlerinde kapsamlı arıza tespit hizmeti sunuyoruz. Basınç testleri, sıcaklık analizleri ve yağ numune analizleri ile sorunun kaynağını hızlı ve doğru şekilde belirliyoruz. Periyodik bakım programları ile arızaları önlüyor, makinanızın ömrünü uzatıyoruz.",
    features: [
      "Yerinde arıza tespit hizmeti",
      "Hidrolik sistem basınç testleri",
      "Yağ numune analizi",
      "Periyodik bakım programları",
      "81 ilde servis ağı",
      "7/24 acil destek hattı",
    ],
    icon: "Search",
  },
  {
    slug: "yedek-parca-tedariği",
    title: "Yedek Parça Tedariği",
    shortDescription:
      "Tüm marka iş makinaları için orijinal ve muadil yedek parça tedariği.",
    description:
      "VOLVO, KOMATSU, CAT, HİDROMEK, CHAMPION, HAMM, BOMAG ve AMMANN başta olmak üzere tüm iş makinası markalarının hidrolik yedek parçalarını tedarik ediyoruz. Pompalar, motorlar, valfler, contalar, filtreler ve daha fazlası... Geniş stok ağımız ve uluslararası tedarik kanallarımız sayesinde hızlı ve güvenilir teslimat sağlıyoruz.",
    features: [
      "8+ marka yedek parça stoğu",
      "Orijinal ve kaliteli muadil seçenekler",
      "Parça numarası ile hızlı arama",
      "DHL ile güvenli kargo",
      "Toplu alımlarda özel fiyat",
      "Teknik danışmanlık desteği",
    ],
    icon: "Package",
  },
];
