export interface Product {
  slug: string;
  partNumber: string;
  name: string;
  brand: string;
  category: string;
  compatibility: string[];
  condition: "Yeni" | "Revizyon";
  description: string;
  shippingEstimate: string;
  leadTime: string;
  inStock: boolean;
}

export const CATEGORIES = [
  { label: "Hidrolik Pompalar", value: "hidrolik-pompalar" },
  { label: "Hidrolik Şanzımanlar", value: "hidrolik-sanziman" },
  { label: "Hidrolik Motorlar", value: "hidrolik-motorlar" },
  { label: "Dişli Kutuları", value: "disli-kutulari" },
  { label: "Filtreler", value: "filtreler" },
  { label: "Contalar & Keçeler", value: "contalar-keceler" },
  { label: "Pistonlar & Silindir", value: "pistonlar-silindir" },
  { label: "Valfler", value: "valfler" },
] as const;

export const products: Product[] = [
  {
    slug: "volvo-hidrolik-pompa-voe-15172797",
    partNumber: "VOE 15172797",
    name: "Hidrolik Ana Pompa",
    brand: "VOLVO",
    category: "hidrolik-pompalar",
    compatibility: ["Volvo EC210B", "Volvo EC240B", "Volvo EC290B"],
    condition: "Yeni",
    description:
      "Volvo ekskavatörler için orijinal muadili hidrolik ana pompa. Yüksek basınç dayanımı, uzun ömür.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Stokta / 3-5 iş günü hazırlık",
    inStock: true,
  },
  {
    slug: "komatsu-sanziman-714-07-20701",
    partNumber: "714-07-20701",
    name: "Hidrolik Şanzıman (Torque Converter)",
    brand: "KOMATSU",
    category: "hidrolik-sanziman",
    compatibility: ["Komatsu WA380-6", "Komatsu WA470-6"],
    condition: "Revizyon",
    description:
      "Komatsu yükleyiciler için komple revize hidrolik şanzıman. Tüm iç parçalar yenilenmiş, test edilmiş.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "7-10 iş günü revizyon süresi",
    inStock: false,
  },
  {
    slug: "cat-hidrolik-pompa-2959663",
    partNumber: "295-9663",
    name: "Piston Tipi Hidrolik Pompa",
    brand: "CAT",
    category: "hidrolik-pompalar",
    compatibility: ["CAT 320D", "CAT 320E", "CAT 323D"],
    condition: "Yeni",
    description:
      "Caterpillar ekskavatörler için yüksek performanslı piston tipi hidrolik pompa. OEM muadili, yüksek performans.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Stokta / 3-5 iş günü hazırlık",
    inStock: true,
  },
  {
    slug: "hidromek-sanziman-pompa-hmk102b",
    partNumber: "HMK-102B-TP",
    name: "Şanzıman Pompası",
    brand: "HİDROMEK",
    category: "hidrolik-pompalar",
    compatibility: ["Hidromek HMK 102B", "Hidromek HMK 102S"],
    condition: "Yeni",
    description:
      "Hidromek kazıcı yükleyiciler için şanzıman pompası. Yerli üretim, hızlı tedarik.",
    shippingEstimate: "Yurtiçi kargo ile 3-5 iş günü",
    leadTime: "Stokta mevcut",
    inStock: true,
  },
  {
    slug: "bomag-titresim-pompasi-bw213",
    partNumber: "BW213-VP-01",
    name: "Titreşim Pompası",
    brand: "BOMAG",
    category: "hidrolik-pompalar",
    compatibility: ["BOMAG BW213D-4", "BOMAG BW211D-4"],
    condition: "Revizyon",
    description:
      "BOMAG silindir için titreşim pompası revizyonu. Komple iç parça yenilemesi yapılmıştır.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "5-7 iş günü revizyon süresi",
    inStock: false,
  },
  {
    slug: "volvo-hidrolik-motor-voe-14531612",
    partNumber: "VOE 14531612",
    name: "Sürüş Hidrolik Motoru",
    brand: "VOLVO",
    category: "hidrolik-motorlar",
    compatibility: ["Volvo EC210B", "Volvo EC210C"],
    condition: "Yeni",
    description:
      "Volvo ekskavatör paletli sürüş için final drive hidrolik motoru. Orijinal muadili.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Stokta / 3-5 iş günü hazırlık",
    inStock: true,
  },
  {
    slug: "champion-greydr-disli-kutusu-cg740",
    partNumber: "CG740-DK-01",
    name: "Greyder Dişli Kutusu",
    brand: "CHAMPION",
    category: "disli-kutulari",
    compatibility: ["Champion 740A", "Champion 720A"],
    condition: "Revizyon",
    description:
      "Champion greyder için komple dişli kutusu revizyonu. Tüm rulmanlar ve dişliler kontrol edilmiş.",
    shippingEstimate: "DHL Kargo ile tahmini 14-21 iş günü",
    leadTime: "10-15 iş günü revizyon süresi",
    inStock: false,
  },
  {
    slug: "hamm-yurume-motoru-h11ix",
    partNumber: "HAMM-H11-YM",
    name: "Yürüme Motoru",
    brand: "HAMM",
    category: "hidrolik-motorlar",
    compatibility: ["HAMM H11ix", "HAMM H13ix"],
    condition: "Yeni",
    description:
      "HAMM kompaktörler için yürüme motoru. Yüksek tork, dayanıklı yapı.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Siparişe göre / 5-7 iş günü",
    inStock: false,
  },
  {
    slug: "ammann-titresim-valf-asw330",
    partNumber: "AMM-ASW330-TV",
    name: "Titreşim Kontrol Valfi",
    brand: "AMMANN",
    category: "valfler",
    compatibility: ["Ammann ASC 110", "Ammann ASW 330"],
    condition: "Yeni",
    description:
      "Ammann silindirler için titreşim kontrol valfi. Hassas titreşim ayarı sağlar.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Stokta / 3-5 iş günü hazırlık",
    inStock: true,
  },
  {
    slug: "komatsu-hidrolik-filtre-seti-pc200",
    partNumber: "KOM-PC200-FS",
    name: "Hidrolik Filtre Seti (3'lü)",
    brand: "KOMATSU",
    category: "filtreler",
    compatibility: ["Komatsu PC200-8", "Komatsu PC210-8", "Komatsu PC220-8"],
    condition: "Yeni",
    description:
      "Komatsu ekskavatörler için 3'lü hidrolik filtre seti. Basınç hattı, dönüş hattı ve emme filtresi dahil.",
    shippingEstimate: "Yurtiçi kargo ile 2-4 iş günü",
    leadTime: "Stokta mevcut",
    inStock: true,
  },
  {
    slug: "cat-conta-kece-seti-320d",
    partNumber: "CAT-320D-CKS",
    name: "Hidrolik Silindir Conta Kiti",
    brand: "CAT",
    category: "contalar-keceler",
    compatibility: ["CAT 320D", "CAT 320E", "CAT 325D"],
    condition: "Yeni",
    description:
      "Caterpillar ekskavatör boom, arm ve kova silindiri için komple conta kiti. NOK orijinal muadili.",
    shippingEstimate: "Yurtiçi kargo ile 2-4 iş günü",
    leadTime: "Stokta mevcut",
    inStock: true,
  },
  {
    slug: "volvo-piston-silindir-ec360",
    partNumber: "VOE-14618181",
    name: "Boom Silindir Pistons",
    brand: "VOLVO",
    category: "pistonlar-silindir",
    compatibility: ["Volvo EC360B", "Volvo EC360C"],
    condition: "Yeni",
    description:
      "Volvo EC360 serisi için boom silindir pistonu. Krom kaplı, yüksek dayanım.",
    shippingEstimate: "DHL Kargo ile tahmini 10-14 iş günü",
    leadTime: "Siparişe göre / 5-7 iş günü",
    inStock: false,
  },
];
