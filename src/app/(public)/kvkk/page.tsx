import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { CONTACTS, SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni & Gizlilik Politikası | NİDAH GROUP",
  description:
    "NİDAH GROUP kişisel verilerin işlenmesine ilişkin KVKK kapsamındaki aydınlatma metni ve çerez politikası.",
  alternates: { canonical: "https://www.nidahgroup.com.tr/kvkk" },
  robots: { index: false },
};

export default function KvkkPage() {
  return (
    <main>
      <section className="gradient-hero py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            KVKK Aydınlatma Metni
          </h1>
          <p className="text-white/60 text-base">
            6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "KVKK Aydınlatma Metni" }]} />

      <section className="bg-white py-14">
        <div className="max-w-3xl mx-auto px-4 prose prose-sm prose-headings:text-nidah-dark prose-a:text-nidah-steel max-w-none">

          <h2>Veri Sorumlusu</h2>
          <p>
            <strong>{SITE_CONFIG.legalName}</strong> ("NİDAH GROUP") olarak,{" "}
            6698 Sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu
            sıfatıyla aşağıdaki bilgileri kamuoyuyla paylaşmaktayız.
          </p>
          <ul>
            <li><strong>Şirket:</strong> {SITE_CONFIG.legalName}</li>
            <li><strong>Adres:</strong> Ostim OSB. Mah. 1139. Sk. No:8, Yenimahalle, Ankara</li>
            <li><strong>E-posta:</strong>{" "}
              <a href={`mailto:${CONTACTS.mustafa.email}`}>{CONTACTS.mustafa.email}</a>
            </li>
          </ul>

          <h2>İşlenen Kişisel Veriler ve Amaçları</h2>
          <p>
            Web sitemizi ziyaret etmeniz veya teklif formu doldurmanız durumunda aşağıdaki veriler işlenmektedir:
          </p>
          <ul>
            <li><strong>İletişim bilgileri</strong> (ad, e-posta, telefon): Teklif talebinizi yanıtlamak ve teknik destek sağlamak amacıyla.</li>
            <li><strong>Analitik veriler</strong> (sayfa görüntülemeleri, tarayıcı, cihaz): Google Analytics 4 aracılığıyla, sitenin kullanımını iyileştirmek amacıyla. Bu veriler yalnızca çerez onayınız alındıktan sonra toplanır.</li>
          </ul>

          <h2>Çerez (Cookie) Politikası</h2>
          <p>
            Sitemizde aşağıdaki çerez kategorileri kullanılmaktadır:
          </p>
          <ul>
            <li>
              <strong>Zorunlu Çerezler:</strong> Sitenin çalışması için teknik olarak gereklidir
              (oturum yönetimi, güvenlik). Bu çerezler için ayrıca onay gerekmez.
            </li>
            <li>
              <strong>Analitik Çerezler (Google Analytics 4):</strong> Ziyaretçi davranışlarını
              anonim olarak ölçmek için kullanılır. Bu çerezler yalnızca açık onayınız ile etkinleştirilir.
              Onay vermezseniz herhangi bir analitik veri toplanmaz.
            </li>
          </ul>
          <p>
            Çerez tercihlerinizi istediğiniz zaman tarayıcınızın ayarlarından veya sitemizin
            alt kısmında beliren onay penceresini kapatarak değiştirebilirsiniz.
          </p>

          <h2>Verilerin Aktarılması</h2>
          <p>
            Kişisel verileriniz; yürürlükteki mevzuat hükümleri çerçevesinde yetkili kamu
            kuruluşlarına aktarılabilir. Analitik verileri Google LLC ile (ABD) paylaşılmakta
            olup Google, GDPR/SCCs kapsamında işleme yapmaktadır.
          </p>

          <h2>Haklarınız</h2>
          <p>KVKK Madde 11 kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>Yanlış işlenmiş verilerin düzeltilmesini isteme</li>
            <li>KVKK Madde 7&apos;de öngörülen koşullarda silinmesini talep etme</li>
            <li>İşlemenin otomatik sistemler vasıtasıyla gerçekleştirilmesi halinde aleyhte sonuçlara itiraz etme</li>
          </ul>
          <p>
            Bu haklarınızı kullanmak için{" "}
            <a href={`mailto:${CONTACTS.mustafa.email}`}>{CONTACTS.mustafa.email}</a>{" "}
            adresine yazabilirsiniz. Talepler 30 gün içinde yanıtlanır.
          </p>

          <h2>Güncelleme</h2>
          <p>
            Bu metin en son <strong>Nisan 2026</strong> tarihinde güncellenmiştir.
            Değişiklikler bu sayfada duyurulur.
          </p>
        </div>
      </section>
    </main>
  );
}
