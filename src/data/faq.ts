export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export const FAQ_CATEGORIES = [
  "Yedek Parça",
  "Teknik Servis & Revizyon",
  "Elektronik Sistemler",
  "İhracat & Uluslararası",
  "Teklif & Sipariş",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const faqItems: FaqItem[] = [
  // ── Yedek Parça ──
  {
    category: "Yedek Parça",
    question: "Hangi markaların yedek parçalarını tedarik ediyorsunuz?",
    answer:
      "VOLVO, CHAMPION, KOMATSU, CAT (Caterpillar), HİDROMEK, HAMM, BOMAG ve AMMANN başta olmak üzere birçok iş makinası markasının yedek parçalarını tedarik ediyoruz. Listede olmayan markalar için de bize danışabilirsiniz; geniş tedarik ağımızla kataloğunuzdaki ürünleri bulmanıza yardımcı oluyoruz.",
  },
  {
    category: "Yedek Parça",
    question: "Orijinal parça mı yoksa muadil mi kullanıyorsunuz?",
    answer:
      "Hem orijinal (OEM) hem de kaliteli muadil (aftermarket) parça seçenekleri sunuyoruz. Müşterilerimiz bütçe ve ihtiyaçlarına göre tercih yapabilir. Tüm muadil parçalarımız ISO standartlarına uygun üretilmiş ve kalite kontrolden geçmiş ürünlerdir.",
  },
  {
    category: "Yedek Parça",
    question: "Parça uyumluluğundan nasıl emin olabilirim?",
    answer:
      "Sipariş öncesinde teknik ekibimiz, parça numarası ve makina model bilgilerinizi kontrol ederek uyumluluk doğrulaması yapar. OEM çapraz referans kataloglarımız ile doğru parçayı tespit etmenize yardımcı oluyoruz. Herhangi bir uyumsuzluk durumunda teknik ekibimizle iletişime geçebilirsiniz.",
  },
  {
    category: "Yedek Parça",
    question: "Parçaların kalitesi hakkında nasıl bilgi alabilirim?",
    answer:
      "Tüm parçalarımız orijinal (OEM) veya ISO standartlarına uygun kaliteli muadil ürünlerdir. Ürün bilgileri, teknik özellikler ve uyumluluk detayları proforma faturada belirtilir. Teknik ekibimiz sipariş öncesinde parça uyumluluğunu doğrular.",
  },

  // ── Teknik Servis & Revizyon ──
  {
    category: "Teknik Servis & Revizyon",
    question: "Revizyon süresi ne kadar?",
    answer:
      "Hidrolik pompa revizyonları genellikle 5-10 iş günü, şanzıman revizyonları 10-15 iş günü, diferansiyel revizyonları ise 7-12 iş günü içinde tamamlanmaktadır. Revizyon süresi, arızanın kapsamına ve yedek parça bulunabilirliğine göre değişkenlik gösterebilir. Acil durumlarda hızlandırılmış revizyon hizmeti de sunulmaktadır.",
  },
  {
    category: "Teknik Servis & Revizyon",
    question: "Revizyon sonrası nasıl bir süreç izleniyor?",
    answer:
      "Revizyon tamamlandıktan sonra müşterimize yapılan işlemleri, kullanılan parçaları ve test sonuçlarını içeren detaylı revizyon raporu sunulur. Teknik ekibimiz süreç sonrası sorularınıza yanıt verir ve destek sağlar. Revizyon süreçlerinde sistemin genel durumu, kullanım koşulları ve uygulama şartları sonuç üzerinde etkili olabilir; bu nedenle doğru teşhis ve uzman değerlendirmesine önem veriyoruz.",
  },
  {
    category: "Teknik Servis & Revizyon",
    question: "Yerinde (saha) servis hizmeti veriyor musunuz?",
    answer:
      "Evet. Büyük çaplı revizyon ve onarım işlemleri için teknik ekibimiz yerinde saha hizmeti verebilmektedir. Detaylar için bizimle iletişime geçin.",
  },

  // ── Elektronik Sistemler ──
  {
    category: "Elektronik Sistemler",
    question: "Hangi araç tiplerinde ECU ve elektronik servis yapıyorsunuz?",
    answer:
      "Ekskavatör, yükleyici ve dozer gibi iş makinaları; ekipmanlı ve ekipmansız kamyonlar; savunma sanayi araçları ve tuz sericiler dahil geniş bir araç yelpazesinde ECU ve elektronik sistem servisi sunuyoruz.",
  },
  {
    category: "Elektronik Sistemler",
    question: "Arızalı ECU tamiri mi yoksa yenisiyle değişim mi öneriyorsunuz?",
    answer:
      "Öncelikle arızalı ECU'nun tamir edilip edilemeyeceğini teşhis ediyoruz. Tamir mümkün ise onarım yapıyor, mümkün değil ise orijinal veya yeni kontrol ünitesi temini seçeneği sunuyoruz. Her iki durumda da müşterimize detaylı rapor ve maliyet karşılaştırması yapıyoruz.",
  },

  // ── İhracat & Uluslararası ──
  {
    category: "İhracat & Uluslararası",
    question: "Yurt dışına kargo süresi ne kadardır?",
    answer:
      "Yurtdışı siparişler DHL Kargo ile gönderilir ve tahmini teslimat süresi 10-14 iş günüdür. Bu süre tahmini olup lojistik koşullara ve hedef ülkeye göre değişebilir.",
  },
  {
    category: "İhracat & Uluslararası",
    question: "Hangi ülkelere ihracat yapıyorsunuz?",
    answer:
      "ABD, Kanada, Meksika, Paraguay, Arjantin, BAE, Suudi Arabistan, Güney Afrika, Rusya, Özbekistan, Hindistan ve Sri Lanka başta olmak üzere 13+ ülkeye ihracat yapıyoruz. Listede olmayan ülkeler için de bizimle iletişime geçebilirsiniz.",
  },
  {
    category: "İhracat & Uluslararası",
    question: "Uluslararası ödeme kabul ediyor musunuz?",
    answer:
      "Evet. Uluslararası müşterilerimizden banka havalesi (SWIFT/IBAN) ile ödeme kabul ediyoruz. Proforma fatura onayından sonra ödeme alındıktan itibaren sipariş hazırlık sürecine başlanır.",
  },

  // ── Teklif & Sipariş ──
  {
    category: "Teklif & Sipariş",
    question: "Teklif almak için nasıl başvurabilirim?",
    answer:
      'Web sitemizdeki "Teklif Al" formunu doldurarak veya WhatsApp hattımızdan bize ulaşarak teklif alabilirsiniz. Parça numarası, marka, makina modeli ve adet bilgilerini paylaşmanız yeterlidir. En kısa sürede size proforma fatura ile dönüş yapacağız.',
  },
  {
    category: "Teklif & Sipariş",
    question: "Ödeme koşullarınız nelerdir?",
    answer:
      "Proforma fatura onayından sonra banka havalesi veya EFT ile ödeme kabul ediyoruz. Ödeme onayı ardından sipariş hazırlık sürecine başlanır. Kurumsal müşterilerimize özel ödeme koşulları hakkında bilgi almak için bizimle iletişime geçebilirsiniz.",
  },
  {
    category: "Teklif & Sipariş",
    question: "Acil durumlarda ne kadar hızlı hizmet alabilir miyim?",
    answer:
      "Acil durumlarda WhatsApp hattımız üzerinden 7/24 ulaşabilirsiniz. Stokta bulunan parçalar için aynı gün kargolama, revizyon hizmetlerinde ise öncelikli işlem imkanı sunuyoruz. Makinanızın durma süresini en aza indirmek için hızlı çözümler üretiyoruz.",
  },
];

/** Backward-compat: some pages may still iterate all items */
export default faqItems;
