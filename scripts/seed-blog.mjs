/**
 * Seed blog posts as drafts.
 * Run: node scripts/seed-blog.mjs
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { readFileSync } from "fs";

// Load .env.local
const env = readFileSync(".env.local", "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!dbUrl) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }

const sql = neon(dbUrl);
const db  = drizzle(sql);

const posts = [
  {
    title: "İş Makinası Hidrolik Pompa Arızaları: Belirtiler ve Çözümler",
    slug:  "is-makinasi-hidrolik-pompa-arizalari",
    excerpt: "Hidrolik pompa arızalarını erken tespit etmek, büyük maliyetleri önler. Belirtiler, nedenleri ve profesyonel revizyon sürecini anlattık.",
    readingTimeMinutes: 6,
    metaTitle: "Hidrolik Pompa Arızaları Belirtileri ve Çözümleri | NİDAH GROUP",
    metaDescription: "İş makinası hidrolik pompa arızalarını erken tespit edin. Belirtiler, nedenleri ve revizyon süreci hakkında uzman rehberi.",
    content: `## İş Makinası Hidrolik Pompa Arızaları

Hidrolik sistem, iş makinalarının kalbidir. Ekskavatörden buldozere, yol silindirinden forklift'e kadar her iş makinesinde hidrolik pompa, gücü harekete dönüştüren kritik bir bileşendir. Pompa arızası, makineyi tamamen devre dışı bırakabilir ve beklenmedik duruş maliyetleri yüzlerce bin liraya ulaşabilir.

Bu yazıda, hidrolik pompa arızalarının nasıl erken tespit edileceğini, yaygın nedenlerini ve profesyonel revizyon sürecini ele alıyoruz.

---

## Hidrolik Pompa Arızasının Erken Belirtileri

### 1. Yavaşlayan veya Güçsüzleşen Hareketler

Kepçenin yavaş çalışması, silindirlerin tam kuvvetle hareket edememesi ya da yükü kaldırma kapasitesinin düşmesi, pompa veriminin azaldığının en net göstergesidir. Yeni pompada verim genellikle %95'in üzerindeyken, aşınan bir pompada bu oran %70'in altına düşebilir.

### 2. Anormal Sesler: Vınlama ve Tıklama

Hidrolik pompa çalışırken **çığlık atar gibi vınlama** veya **metal tıklama** sesleri duyuyorsanız ciddi bir aşınma ya da kavitasyon sorunu söz konusudur.

- **Vınlama sesi** → Genellikle kavitasyon (hava karışımı) işaretidir
- **Tıklama sesi** → Piston veya valf plakasında hasar olduğuna işaret eder

### 3. Hidrolik Yağ Sızıntısı

Pompa şaftı etrafında veya bağlantı noktalarında yağ izleri, sızdırmazlık elemanlarının (keçelerin) ömrünü tamamladığını gösterir. Küçük sızıntılar zamanla büyür ve sistemi tehlikeye atar.

### 4. Yağ Isısının Aşırı Yükselmesi

Normal çalışmada hidrolik yağ sıcaklığı 60-80°C arasında seyretmelidir. Pompa içindeki aşınan yüzeyler sürtünmeyi artırır, bu da yağ ısısını hızla yükseltir. Termal koruma devreye girince makine kendiliğinden durabilir.

### 5. Yağ Renginin Koyulaşması ve Metal Partiküller

Yağ filtrenizi kontrol ettiğinizde **metalik talaş veya siyah partikül** görüyorsanız, pompanın içi aşınıyor demektir. Bu durum acil müdahale gerektirir.

---

## En Sık Karşılaşılan Arıza Nedenleri

### Yetersiz Bakım ve Kirli Yağ

Hidrolik yağ ve filtre değişim aralıklarına uyulmaması, pompa ömrünü yarıya indirebilir. Kirli yağ, hassas toleranslara sahip pistonları ve dağıtım plakasını aşındırır.

> **Öneri:** Hidrolik yağı her 2.000 çalışma saatinde, filtreyi her 500 saatte değiştirin.

### Kavitasyon (Hava Karışımı)

Emme hattındaki kaçak veya tıkanma, pompanın hava emerek çalışmasına neden olur. Kavitasyon, yüzey tahribatına yol açan son derece yıkıcı bir etkidir.

### Yanlış Yağ Viskozitesi

Her makine, üretici firmanın belirlediği viskozitede hidrolik yağ kullanmalıdır. Yanlış viskozite seçimi hem verimi düşürür hem de aşınmayı hızlandırır.

### Aşırı Yükleme

İmalatçının belirlediği maksimum çalışma basıncının sürekli aşılması, pompa ömrünü ciddi ölçüde kısaltır.

---

## Profesyonel Hidrolik Pompa Revizyonu

NİDAH GROUP olarak **VOLVO, KOMATSU, CAT, HAMM, BOMAG** başta olmak üzere tüm marka iş makinalarına yönelik hidrolik pompa revizyonu hizmeti sunuyoruz.

Revizyon sürecimiz:

1. **Söküm ve temizleme** — Pompa makinedan alınarak ultrasonik yıkama
2. **Ölçüm ve hasar tespiti** — Tüm bileşenlerin mikrometre ile kontrolü
3. **Parça değişimi** — Aşınan pistoncuklar, dağıtım plakası, keçeler ve yataklar OEM standartlarında değiştirilir
4. **Test** — Revize pompa; debi, basınç ve sızıntı testlerinden geçirilir
5. **Garanti** — Revizyon sonrası yazılı garanti sunulmaktadır

---

## Revizyon mu, Yeni Pompa mı?

Pek çok durumda **revizyon, yeni pompa alımından %40-60 daha ekonomiktir** ve aynı performansı sağlar. Ancak şu durumlarda yeni pompa tercih edilmelidir:

- Pompa gövdesinde çatlak veya kırılma varsa
- Aşınma eşiğinin ötesindeyse
- Uyumlu stok pompası mevcutsa ve teslimat süresi kritikse

---

## Sonuç

Hidrolik pompa arızalarını erken tespit etmek ve zamanında müdahale etmek, makinenizin ömrünü uzatır ve duruş maliyetlerini minimize eder. Belirtileri gördüğünüzde zaman kaybetmeden uzman desteği alın.

**Ücretsiz teknik danışmanlık ve revizyon fiyat teklifi için:** [Teklif Al](/teklif-al) sayfamızı ziyaret edebilir veya [WhatsApp](https://wa.me/905325000000) üzerinden bizimle iletişime geçebilirsiniz.`,
  },

  {
    title: "OEM mi, Aftermarket mi? İş Makinası Yedek Parçada Doğru Seçim",
    slug:  "oem-vs-aftermarket-is-makinasi-yedek-parca",
    excerpt: "OEM ve aftermarket yedek parça arasındaki farklar, avantajlar ve dezavantajlar. Hangi durumda hangisi tercih edilmeli?",
    readingTimeMinutes: 5,
    metaTitle: "OEM vs Aftermarket Yedek Parça: İş Makinası İçin Doğru Seçim | NİDAH GROUP",
    metaDescription: "OEM ve aftermarket iş makinası yedek parçası arasındaki farklar neler? Uzman görüşü ve doğru tercih rehberi.",
    content: `## OEM mi, Aftermarket mi? İş Makinası Yedek Parçada Doğru Seçim

İş makinası sahipleri ve filolarını yönetenler için yedek parça seçimi, hem maliyet hem de operasyonel güvenilirlik açısından kritik bir karardır. Orijinal ekipman üreticisi (OEM) parçalar mı yoksa aftermarket alternatifler mi? Bu sorunun cevabı, her zaman basit değildir.

---

## OEM Parça Nedir?

OEM (Original Equipment Manufacturer), makinenizin üreticisi tarafından ya da onun yetkilendirdiği tedarikçiler tarafından üretilen parçalardır. Örneğin bir VOLVO ekskavatörü için VOLVO CE markasıyla satılan yedek parça OEM'dir.

**OEM Avantajları:**
- ✅ Makineye tam uyum garantisi
- ✅ Üretici spesifikasyonlarına birebir uygunluk
- ✅ Uzun ömür ve yüksek performans
- ✅ Garanti kapsamını korur
- ✅ Teknik destek ve servis kolaylığı

**OEM Dezavantajları:**
- ❌ Yüksek fiyat (aftermarket'e kıyasla %30-150 daha pahalı olabilir)
- ❌ Bazı eski modeller için temin güçlüğü
- ❌ Uzun teslimat süreleri (ithalat gerekirse haftalar alabilir)

---

## Aftermarket Parça Nedir?

Aftermarket parçalar, orijinal üretici dışındaki firmalar tarafından üretilen ve genellikle OEM parçalarla uyumlu olan bileşenlerdir. Kalite; ürünün markasına ve üretim standardına göre büyük farklılıklar gösterir.

**Aftermarket Avantajları:**
- ✅ Daha düşük maliyet
- ✅ Geniş stok çeşitliliği, hızlı temin
- ✅ Bazı kategorilerde OEM ile eşdeğer kalite

**Aftermarket Dezavantajları:**
- ❌ Kalite tutarsızlığı — marka marka büyük fark var
- ❌ Tolerans farklılıkları nedeniyle erken arıza riski
- ❌ Garanti sorunlarına yol açabilir
- ❌ Güvenlik-kritik parçalarda risk artışı

---

## Hangi Parçada Hangi Tercih?

Tüm parçaları aynı kategoride değerlendirmek doğru değildir. Şöyle bir sınıflandırma yapılabilir:

### Kesinlikle OEM Tercih Edilmeli
- Hidrolik pompa ve motor
- Şanziman ve diferansiyel bileşenleri
- ECU ve elektronik kontrol üniteleri
- Frен sistemi parçaları
- Güvenlik sensörleri

### Aftermarket Kabul Edilebilir (Kaliteli Marka ile)
- Filtreler (yağ, yakıt, hava, hidrolik)
- Körükler ve hortumlar
- Aşınma parçaları (kova dişleri, kesici kenarlar)
- Kabin içi aksesuarlar
- Aydınlatma elemanları

---

## NİDAH GROUP Yaklaşımı: OEM Kalitesinde Tedarik

NİDAH GROUP olarak **13'ten fazla ülkeye** yedek parça tedariki yapıyoruz. Tedarik politikamız:

1. **OEM öncelikli** — Mümkün olan her durumda orijinal veya OEM eşdeğeri parça temin edilir
2. **Onaylı tedarikçi ağı** — Aftermarket seçeneklerde sadece ISO sertifikalı, kanıtlanmış üreticilerle çalışılır
3. **Parça numarası doğrulaması** — Her parça, makinenin teknik spesifikasyonuna göre eşleştirilir
4. **Uyumluluk garantisi** — Tedarik ettiğimiz parçalar için uyumluluk taahhüdü veriyoruz

---

## Maliyet-Fayda Analizi Örneği

Bir KOMATSU PC200 ekskavatörü için hidrolik pompa senaryosu:

| Seçenek | Fiyat Aralığı | Beklenen Ömür | 3 Yıllık Toplam Maliyet |
|---------|--------------|---------------|------------------------|
| OEM Pompa | 45.000-65.000 ₺ | 8.000+ saat | 45.000-65.000 ₺ |
| Kaliteli Aftermarket | 25.000-35.000 ₺ | 4.000-6.000 saat | 50.000-70.000 ₺ |
| Düşük Kalite Aftermarket | 10.000-15.000 ₺ | 1.000-2.000 saat | 60.000-90.000 ₺ |

Görüldüğü gibi, uzun vadede ucuz aftermarket çoğunlukla daha maliyetlidir.

---

## Sonuç

Yedek parça seçiminde **güvenli olmak** her zaman önce gelir. Özellikle güvenlik-kritik ve pahalı revizyon gerektiren sistem parçalarında OEM tercih edilmelidir. Aşınma parçaları ve filtreler gibi kategorilerde ise kaliteli aftermarket ürünler makul bir alternatif olabilir.

**Parça numaranızı bize gönderin**, size en uygun seçeneği, fiyatını ve teslimat süresini hemen bildirelelim: [Teklif Al](/teklif-al)`,
  },

  {
    title: "ECU Tamiri: İş Makinalarında Elektronik Arızalar Nasıl Teşhis Edilir?",
    slug:  "is-makinasi-ecu-tamiri-elektronik-arizalar",
    excerpt: "Modern iş makinalarındaki ECU arızaları, mekanik sorunlar kadar sık karşılaşılan bir sorundur. Teşhis ve onarım sürecini anlattık.",
    readingTimeMinutes: 7,
    metaTitle: "İş Makinası ECU Tamiri ve Elektronik Arıza Teşhisi | NİDAH GROUP",
    metaDescription: "İş makinalarında ECU arızaları nasıl tespit edilir? Hata kodları, teşhis süreci ve ECU onarımı hakkında uzman rehberi.",
    content: `## ECU Tamiri: İş Makinalarında Elektronik Arızalar Nasıl Teşhis Edilir?

Modern iş makinaları artık yüzlerce sensör ve elektronik kontrol ünitesiyle donatılmış birer "bilgisayar" haline gelmiştir. 1990'lardan bu yana üretilen tüm ağır ekipmanlarda **ECU (Electronic Control Unit)** — elektronik kontrol ünitesi — makineyi yöneten beyin konumundadır.

ECU arızaları, salt mekanik sorunlar kadar yaygın ve ciddi bir sorundur. Üstelik yanlış teşhis edilirse hem zaman hem para kaybına yol açar.

---

## ECU Nedir ve Ne Yapar?

ECU, makinenin motor, hidrolik sistem, şanziman ve güvenlik bileşenlerine ait sensör verilerini sürekli okuyarak:

- Yakıt enjeksiyonunu optimize eder
- Emisyon kontrol sistemlerini yönetir
- Hidrolik basınç ve akış değerlerini regüle eder
- Hata durumlarında uyarı verir veya sistemi korumak için kapatar

Tek bir makine üzerinde birden fazla ECU bulunabilir. Örneğin motor ECU'su, şanziman ECU'su ve kombi kontrol paneli ayrı birimler olabilir.

---

## ECU Arızasının Belirtileri

### Gösterge Panelinde Uyarı Işıkları

Motor arıza lambası (check engine), hidrolik uyarısı veya sistem hatası ikaz ışıkları ECU'nun bir sorun kaydettiğinin işaretidir. Bu ışıklar tek başına sorunu çözmez, yalnızca dikkat çeker.

### Makine Aniden Duruyorsa veya Çalışmıyorsa

Özellikle soğuk havada çalışmama, tutarsız rölanti veya aniden kapanma, ECU kaynaklı olabilir.

### Güç Kaybı ve Performans Düşüşü

Motor tam devreye giremiyor, hidrolik yavaş çalışıyor veya şanziman vites geçişleri düzensizse elektronik kontrol sistemi şüphe kapsamına alınmalıdır.

### Yakıt Tüketiminde Ani Artış

ECU yakıt enjeksiyonunu optimize edemez hale gelirse tüketim %15-30 oranında artabilir.

---

## Hata Kodu Okuma: Teşhisin Temeli

Modern iş makinalarında ECU, oluşan her hatayı **DTC (Diagnostic Trouble Code)** olarak kaydeder. Bu kodları okumak için markaya özgü teşhis ekipmanı gerekir:

- **VOLVO:** VCADS Pro / PTT (Premium Tech Tool)
- **KOMATSU:** KOMTRAX, KEPA, WDS
- **CAT:** ET (Electronic Technician), SIS
- **HAMM / BOMAG:** markalara özel teşhis yazılımları

Standart OBD2 cihazları iş makinaları için **genellikle yetersizdir.** Doğru teşhis için marka teşhis sistemine erişim şarttır.

---

## ECU Arızasının Yaygın Nedenleri

### Nem ve Su Girişi

İş makinaları zorlu ortam koşullarında çalışır. ECU muhafazasındaki sızdırmazlık arızalanırsa nem veya su girişi kısa devreye yol açar.

### Titreşim ve Mekanik Stres

Uzun vadeli titreşim, elektronik kartlardaki lehim noktalarını yorabilir ve bağlantı kopukluklarına neden olabilir.

### Voltaj Dalgalanmaları

Şarj sistemindeki arızalar veya yanlış akü bağlantısı, ECU'ya aşırı voltaj göndererek kalıcı hasar oluşturabilir.

### Yazılım Bozulması

Güncelleme hatası veya veri kaybı, ECU'yu yanıt vermez hale getirebilir.

---

## ECU Onarım Süreci

NİDAH GROUP bünyesinde gerçekleştirdiğimiz ECU onarım süreci:

**1. Demontaj ve Görsel Muayene**
ECU makinedan alınarak dıştan ve içten gözle incelenir. Kızarık bileşenler, korozyon veya fiziksel hasar tespit edilir.

**2. Elektronik Kart Analizi**
Özel ölçüm ekipmanlarıyla tüm bileşenlerin (kapasitörler, transistörler, entegreler) değerleri okunur. Arızalı nokta belirlenir.

**3. Onarım**
Hasar gören bileşenler SMD (yüzey montaj) tekniğiyle değiştirilir. Gerekirse flash bellek yeniden programlanır.

**4. Yazılım Güncellemesi**
Üretici son yazılım versiyonu mevcutsa ECU güncellenir.

**5. Test ve Kalibrasyon**
Onarılan ECU simülatör ortamında test edilerek makineye takılmadan önce doğrulanır.

---

## ECU Onarımı mı, Yeni ECU mı?

Yeni bir ECU binlerce dolar değerindedir ve bazı markalar için temin süresi haftalarca uzayabilir. Onarım seçeneği:

- Maliyeti **%50-80 azaltır**
- Programlama ve kalibrasyon gerektiren parçalarda kayıp veriyi korur
- Stok bulunmayan eski model makineler için tek çözüm olabilir

Ancak kart fiziksel olarak parçalanmış veya yanmış ise yeni ECU zorunlu olabilir.

---

## Sonuç

İş makinanızda elektronik arıza belirtileri varsa zaman kaybetmeden profesyonel teşhis yaptırın. Yanlış teşhis, pahalı mekanik parçaların gereksiz değiştirilmesine neden olabilir.

NİDAH GROUP olarak tüm büyük markalar için ECU onarım ve elektronik teşhis hizmeti sunuyoruz.

**Arıza kodunuzu bize iletin, hızlıca değerlendirelim:** [İletişim](/iletisim)`,
  },

  {
    title: "Sanziman Revizyonu: Belirtiler, Süreç ve Maliyet",
    slug:  "sanziman-revizyonu-belirtiler-surec-maliyet",
    excerpt: "İş makinası sanzimanı ne zaman revizyon gerektirir? Erken uyarı belirtileri, revizyon süreci ve maliyet analizi.",
    readingTimeMinutes: 6,
    metaTitle: "İş Makinası Sanziman Revizyonu: Belirtiler ve Maliyet | NİDAH GROUP",
    metaDescription: "İş makinası sanzimanı ne zaman revizyon gerektirir? Belirtiler, revizyon süreci ve maliyet karşılaştırması.",
    content: `## Sanziman Revizyonu: Belirtiler, Süreç ve Maliyet

İş makinalarında şanziman, motordan gelen gücü kontrollü biçimde tahrik sistemine aktaran kritik bir bileşendir. Paletli veya tekerlekli olsun, tüm ağır ekipmanlarda şanziman arızası operasyonel bir felakete dönüşebilir.

Şanziman bakımını ertelemek kısa vadede tasarruf gibi görünse de, uzun vadede çok daha ağır maliyetlere yol açar.

---

## Şanziman Revizyonu Gerektiğini Gösteren Belirtiler

### 1. Vites Geçişlerinde Sertlik veya Gecikme

Otomatik şanzimanlarda vites geçişlerinin sertleşmesi, gecikmesi ya da "çekilme" hissi oluşması, iç basınç kaybına veya valf bloğu sorununa işaret eder.

### 2. Kayma (Slipping)

Vites takılı görünmesine rağmen makinenin yeterli güç üretememesi, friksion paketlerinin aşındığını gösterir.

### 3. Yağ Sızıntısı ve Yağ Renginin Koyulaşması

- Taze şanziman yağı **kırmızımsı veya sarımsı** renktedir
- **Koyu kahverengi veya siyah** yağ yakılmış demektir; acil değişim gereklidir
- Conta veya keçelerden sızıntı, yağ seviyesini düşürerek büyük hasara zemin hazırlar

### 4. Aşırı Isı

Şanziman, çalışma sırasında normal sıcaklık aralığını koruyamazsa sistem koruması devreye girer. Soğutma sistemi kontrol edilmeli; sorun çözülmezse iç hasara işaret eder.

### 5. Titreşim ve Sesler

- **Uğultu veya homurtu:** Yatak veya dişli aşınması
- **Tıkırtı:** Diş kırığı veya yabancı madde girişi
- **Çığlık:** Pompa veya tork konvertör sorunu

---

## Şanziman Revizyonu Süreci

### Söküm ve Yıkama

Şanziman makineden ayrılarak tüm bileşenler titizlikle temizlenir. Parçalar üzerindeki aşınma izleri, çatlaklar ve deformasyonlar görsel olarak incelenir.

### Ölçüm ve Kontrol

Dişliler, friksion paketleri, tork konvertör, pompalar ve valf bloğu standart tolerans değerleriyle kıyaslanır. Ölçüm dışına çıkan her parça değiştirme listesine alınır.

### Parça Değişimi

- Friksion paketleri ve çelik plakalar
- Keçeler ve contalar (tüm kit değiştirilir)
- Rulmanlar ve yataklar
- Gerekirse dişli grupları

### Montaj ve Test

Yenilenen bileşenlerle monte edilen şanziman, basınç testi ve dinamik yük altında çalışma testi ile doğrulanır. Elektronik kontrol (şanziman ECU'su) kalibre edilir.

---

## Hangi Markalar İçin Revizyon Yapıyoruz?

NİDAH GROUP olarak başta aşağıdaki markalar olmak üzere tüm büyük iş makinası markalarına şanziman revizyonu hizmeti sunuyoruz:

- **VOLVO** (A25/A30/A35/A40 artikülatörler, EC serisi ekskavatörler)
- **KOMATSU** (PC, WA, D serisi)
- **CAT / Caterpillar** (320, 330, 336, 966, 980 serisi)
- **HAMM, BOMAG, AMMANN** (silo ve asfalt makinaları)
- **HIDROMEK, CASE, JCB**

---

## Revizyon mu, Yeni Şanziman mı?

| Kriter | Revizyon | Yeni Şanziman |
|--------|----------|---------------|
| Maliyet | Düşük (yeni fiyatın %30-50'si) | Yüksek |
| Süre | 3-7 iş günü | Stoka bağlı (1-8 hafta) |
| Garanti | Evet, revizyon garantisi | Evet, üretici garantisi |
| Eski Model Uygunluğu | Her zaman mümkün | Stok bulunamayabilir |

Gövdede çatlak veya ciddi kırılma yoksa revizyon büyük ölçüde tercih edilmelidir.

---

## Bakım Tavsiyesi: Revizyonu Ertelemek Ne Kadar Maliyetli?

Sanziman revizyonunu ertelemek, içerideki metalik partiküllerin tüm sistemi kirletmesine yol açar. Bu durumda:
- Sadece şanziman değil, tork konvertör ve bağlı pompa da hasar görür
- Revizyon maliyeti 2-3 katına çıkabilir

**Kuralı basit:** Belirtileri gördüğünüzde müdahale edin, büyümesini beklemeyin.

---

Şanziman sorununuzu değerlendirmemizi ister misiniz? **[Teklif Al](/teklif-al)** sayfamızdan bize ulaşın.`,
  },

  {
    title: "VOLVO Ekskavatör Periyodik Bakım Rehberi: 250 Saatte Ne Yapılmalı?",
    slug:  "volvo-ekskavatör-periyodik-bakim-rehberi",
    excerpt: "VOLVO EC serisi ekskavatörlerde 250, 500 ve 1000 saatlik bakım aralıklarında yapılması gereken işlemler ve kullanılacak parçalar.",
    readingTimeMinutes: 7,
    metaTitle: "VOLVO Ekskavatör Periyodik Bakım Rehberi | NİDAH GROUP",
    metaDescription: "VOLVO EC serisi ekskavatörlerde 250, 500 ve 1000 saatlik bakım planı. Yağ, filtre, kontrol listesi ve yedek parça tavsiyeleri.",
    content: `## VOLVO Ekskavatör Periyodik Bakım Rehberi

VOLVO CE, dünyanın en güvenilir ekskavatör üreticilerinden biridir. EC210, EC250, EC300 ve EC380 gibi modeller, Türkiye'deki büyük altyapı projelerinde yaygın olarak kullanılmaktadır. Bu makinelerin uzun ömürlü ve verimli çalışması, bakım takvimlerine sıkı sıkıya uyulmasına bağlıdır.

Bu rehber, VOLVO EC serisi ekskavatörler için **250, 500 ve 1000 saatlik bakım aralıklarını** kapsamaktadır.

---

## Neden Periyodik Bakım Bu Kadar Önemli?

Bir ekskavatörün saatlik işletme maliyeti hesaplandığında, bakımın ihmal edilmesiyle oluşan tamir maliyeti genellikle 5-10 kat daha yüksek çıkar. Üstelik plansız duruşlar, proje teslim tarihlerini tehlikeye atar.

VOLVO CE verilerine göre bakımlı makinelerde büyük arıza oranı **%60 daha düşüktür.**

---

## 10 Saatlik (Günlük) Kontroller

Her vardiya başında yapılmalıdır:

- [ ] Motor yağ seviyesi kontrolü
- [ ] Soğutma suyu seviyesi
- [ ] Hidrolik yağ seviyesi (gözetleme camı)
- [ ] Yakıt seviyesi ve su separator kontrolü (su boşaltma)
- [ ] Hava filtresi gösterge kontrolü
- [ ] Palet/takoz gerginliği
- [ ] Kova, kol ve bom pimi yağlama
- [ ] Kabin camı, güvenlik ekipmanı kontrolü

---

## 250 Saatlik Bakım

Bu, temel periyodik bakım aralığıdır. Yapılması gerekenler:

### Motor Tarafı
- **Motor yağı değişimi** (VOLVO VDS-4.5 onaylı 15W-40 veya 10W-30)
- **Motor yağı filtresi değişimi**
- Klima kompresörü kayış kontrolü

### Yakıt Sistemi
- Yakıt ön filtresi (separator) eleman değişimi
- Yakıt filtresi değişimi (ana filtre)

### Soğutma Sistemi
- Soğutucu katkı madde (SCA) konsantrasyonu kontrolü
- Soğutma suyu filtresi değişimi (cartridge tipi)

### Yağlama
- Tüm pin ve bom yağlama noktaları (gres)
- Dönüş dişlisi yağlaması
- Palet kasnak yağlaması

---

## 500 Saatlik Bakım

250 saatlik bakıma ek olarak:

### Hidrolik Sistem
- **Hidrolik yağ dönüş filtresi değişimi**
- Hidrolik tank hava filtresi kontrolü
- Pompa emme filtresi kontrolü

### Şanziman ve Tahrik
- Tahrik motoru yağ seviyesi kontrolü
- Dönüş yatağı rulman kontrolü (gürültü testi)

### Elektrik
- Akü terminalleri temizliği
- Alternatör şarj voltajı kontrolü

---

## 1000 Saatlik Bakım

500 saatlik bakıma ek olarak:

### Hidrolik Sistem
- **Hidrolik yağ değişimi** (tüm sistem boşaltılarak)
- **Tüm hidrolik filtreler** (dönüş, pilot, tank havalandırma) değişimi
- Hidrolik soğutucu temizliği
- Pompa ve motor kaplin kontrolü

### Soğutma Sistemi
- Soğutma suyu değişimi (VOLVO Coolant VCS, -37°C)
- Soğutucu radyatör eksternal temizliği

### Motor
- Hava filtresi ana ve emniyet elemanı değişimi
- Supap boşluğu kontrolü (gerekirse ayar)

### Genel
- Bom ve kol sınır strokları kontrolü
- Acil stop sistemi testi
- Tüm bağlantı ve cıvata torkları

---

## 2000 Saatlik Bakım (Büyük Bakım)

- Dizel enjektör testi ve gerekirse temizlik/değişim
- Motor ölçüm ve tolerans kontrolü
- Şanziman/tahrik yağı değişimi
- Tüm keçe ve contalar gözden geçirilir

---

## Kullanılan Yağ ve Filtre Spesifikasyonları (VOLVO EC210/EC250)

| Pozisyon | Spesifikasyon | Miktar |
|----------|--------------|--------|
| Motor yağı | VOLVO VDS-4.5, 15W-40 | ~23 L |
| Hidrolik yağ | ISO VG 46 HV | ~220 L |
| Soğutma suyu | VOLVO VCS -37°C | ~26 L |
| Tahrik motoru | Gear Oil 80W-90 | 0.5 L/taraf |
| Dönüş dişlisi | Gear Oil 80W-90 | ~5 L |

---

## NİDAH GROUP VOLVO Yedek Parça Desteği

VOLVO ekskavatörleriniz için tüm periyodik bakım kitlerini tek siparişte temin edebilirsiniz:

- Motor yağ filtresi, yakıt filtresi, hava filtresi kitleri
- Hidrolik dönüş filtresi ve pilot filtre
- Soğutma suyu filtresi ve SCA katkı paketleri
- Gres nipelleri ve yağlama kitleri

**250, 500 veya 1000 saatlik bakım kiti için teklif alın:** [Teklif Al](/teklif-al)`,
  },

  {
    title: "KOMATSU PC200 Ekskavatör: En Sık Aranan Yedek Parçalar",
    slug:  "komatsu-pc200-ekskavatör-yedek-parcalar",
    excerpt: "KOMATSU PC200 serisi ekskavatörlerde en sık değiştirilen yedek parçalar, parça numaraları ve temin süreçleri.",
    readingTimeMinutes: 5,
    metaTitle: "KOMATSU PC200 Yedek Parça Listesi ve Fiyatları | NİDAH GROUP",
    metaDescription: "KOMATSU PC200 ekskavatör yedek parçaları: motor, hidrolik, filtre ve aşınma parçaları. Hızlı teslimat ve OEM kalite.",
    content: `## KOMATSU PC200 Ekskavatör: En Sık Aranan Yedek Parçalar

KOMATSU PC200, Türkiye'deki inşaat, maden ve altyapı projelerinde en yaygın kullanılan ekskavatör modellerinden biridir. Güvenilirliği ve parça bulunabilirliği nedeniyle tercih edilen bu model için yedek parça temin sürecini optimize etmek, operasyon sürekliliği açısından kritik önem taşır.

Bu yazıda, KOMATSU PC200 serisi (PC200-7, PC200-8, PC200LC-8) için en sık talep edilen yedek parçaları ve önerilen temin stratejilerini ele alıyoruz.

---

## Motor Grubu — En Kritik Parçalar

KOMATSU PC200 serisi genellikle **SAA6D107E** motor ailesini kullanır.

### Filtre Seti
Periyodik bakımın temelini oluşturur:
- **Motor yağı filtresi** — Her 250 saatte değişim
- **Yakıt filtresi (ön/arka)** — Her 250-500 saatte
- **Hava filtresi (iç/dış eleman)** — Her 500 saatte

### Motor Parçaları
- Enjektör contası ve O-ring seti
- Supap keçeleri
- Su pompası keçe kiti
- Termostat ve termostat contası
- Fan kayışı ve gergi rulmanı

---

## Hidrolik Sistem

PC200 ekskavatörlerde hidrolik sistem, en fazla bakım ve yedek parça gerektiren sistemdir.

### Filtreler
- Hidrolik dönüş filtresi (her 500 saatte)
- Tank havalandırma filtresi (her 500 saatte)

### Pompa ve Valf Grubu
- Ana hidrolik pompa (çift pompa, pistonlu tip)
- Kontrol valf seti
- Pilot basınç filtresi
- Silindire bağlı keçe kitleri (bom, kol, kova)

### Hortum ve Bağlantı
- Bom, kol ve kova hidrolik hortumları
- O-ring ve keçe setleri

---

## Tahrik ve Yürüme Sistemi

### Palet Grubu
Palet bileşenleri iş sahası koşullarına göre hızlı aşınır:

- **Palet ayakkabıları (triple grouser / single grouser)**
- Üst ve alt rulmanlar
- Kasnak seti (tahrik + idler)
- Palet bağlantı pimi ve bucağı

### Tahrik Motoru
- Tahrik motoru contası ve yağ keçesi
- Yörüngeli motor piston seti

---

## Döner Ekipman

### Dönüş Sistemi
- **Dönüş dişlisi yatağı (slewing ring)** — PC200 için en değerli parçalardan biridir
- Dönüş motoru (hidrolik)
- Dönüş çarkı dişlisi (pinyon)

---

## Kabin ve Elektrik

- Ön cam (laminat, standart ölçü)
- Klima kompresörü ve filtreler
- Operatör koltuğu
- Gösterge paneli
- ECM (Motor Kontrol Modülü)

---

## Aşınma Parçaları (Teçhizat)

İş yerine bağlı olarak çok çabuk tüketilen parçalar:
- **Kova dişleri (bucket teeth)** — Çeşitli tipler: kaya, toprak, kırıcı
- **Yan kesici plakalar**
- **Kova kesici kenar** (cutting edge)
- Kova bom pimi ve burcu

---

## Stok Stratejisi: Hangi Parçaları Elinde Bulundurmalısın?

Makine başına önerilen minimum stok:

| Parça | Adet | Sebep |
|-------|------|-------|
| Motor yağ filtresi | 4 (1 yıllık) | 250 saatlik değişim |
| Yakıt filtresi çifti | 4 set | 250 saatlik değişim |
| Hidrolik dönüş filtresi | 2 | 500 saatlik değişim |
| Palet ayakkabısı | 1 takım | Yoğun şantiye |
| Silindire yönelik keçe kiti | 1 set | Sızıntı anında hazır |

---

## NİDAH GROUP ile KOMATSU Yedek Parça Tedariki

KOMATSU PC200 serisi için stok ve sipariş bazlı tedarik yapıyoruz.

- **Parça numarasıyla hızlı arama** — doğru parça, ilk seferinde
- **OEM ve onaylı eşdeğer** seçenekler
- Türkiye'den **hızlı teslimat**, uluslararası taleplerde kapıya teslim
- Büyük filo sahipleri için **stok anlaşması** imkânı

**Parça numarası veya uygulamanızı gönderin:** [Teklif Al](/teklif-al)`,
  },

  {
    title: "İş Makinası Diferansiyel Revizyonu: Ne Zaman Gerekli?",
    slug:  "is-makinasi-diferansiyel-revizyonu",
    excerpt: "Diferansiyel arızasının erken belirtileri, revizyon süreci ve ihmal edildiğinde oluşan maliyetler.",
    readingTimeMinutes: 5,
    metaTitle: "İş Makinası Diferansiyel Revizyonu: Belirtiler ve Süreç | NİDAH GROUP",
    metaDescription: "Diferansiyel arızası ne zaman başlar, nasıl anlaşılır? Revizyon süreci ve ihmalin maliyeti hakkında uzman rehberi.",
    content: `## İş Makinası Diferansiyel Revizyonu: Ne Zaman Gerekli?

Tekerlekli iş makinalarında — yükleyiciler (loader), greyderler, damperler ve articulated dump truck'lar — diferansiyel; motordan gelen gücü iki tekerleğe paylaştıran kritik bir dişli sistemidir. Diferansiyel arızası, makinenin sürüş kontrolünü yitirmesine ve tamamen devre dışı kalmasına neden olur.

---

## Diferansiyel Arızasının Belirtileri

### 1. Dönüşlerde Gürültü

Diferansiyel hasarının en tipik belirtisi, **virajlarda ortaya çıkan uğultu veya hışırtı sesidir.** Düz seyirde ses yoksa ya da azalıyorsa diferansiyel direkt şüphe kapsamındadır.

### 2. Titreşim

Hız arttıkça belirginleşen titreşim, dişli veya yatak aşınmasına işaret eder.

### 3. Yağ Sızıntısı

Arka aks veya diferansiyel muhafazası çevresindeki yağ lekeleri, keçe veya conta hasarı anlamına gelir. Sızıntı görmezden gelinirse yağ seviyesi düşer ve dişliler kuru çalışarak çok kısa sürede hasar görür.

### 4. Yağ Renginin Koyulaşması veya Metalik Koku

Diferansiyel yağı normal koşullarda sarımsı-kahverengidir. **Metal partiküller veya yanık koku**, kritik hasarın habercisidir.

### 5. Tek Tekerleğin Dönmemesi (Diferansiyel Kilidi Arızası)

Diferansiyel kilitleme (diff-lock) sistemi kullanan makinelerde kilidin tutmaması, aktüatör veya mekanik kilit bileşenlerindeki arızadan kaynaklanabilir.

---

## Diferansiyel Revizyonu Süreci

**NİDAH GROUP** bünyesinde gerçekleştirdiğimiz revizyon adımları:

### 1. Söküm ve Temizleme
Diferansiyel akstan ayrılarak tüm parçalar endüstriyel temizleyiciyle yıkanır.

### 2. Hasar Analizi
- Konik dişliler ve planet dişlileri mikrometreyle ölçülür
- Takozu rulmanlar basınç altında test edilir
- Diferansiyel kutusu ve flanş hasar kontrolü yapılır

### 3. Parça Değişimi
- Aşınan konik dişliler ve planet dişlileri
- Tüm rulmanlar (yatak seti)
- Keçeler ve conta kiti (komple)
- Gerekirse diferansiyel kilitleme pimi/kolonu

### 4. Montaj ve Ayar
Dişli boşlukları üretici toleranslarına göre ayarlanır (backlash ayarı). Hatalı ayar, yeni dişlileri kısa sürede hasar görmesine neden olur.

### 5. Yağ Dolum ve Test
Üreticinin önerdiği viskozitede diferansiyel yağı doldurulur, test sürüşü yapılır.

---

## Hangi Makinelere Diferansiyel Revizyonu Yapıyoruz?

- **VOLVO** A25F, A30F, A35F, A40F Articulated Dump Truck
- **KOMATSU** WA380, WA480 Tekerlekli Yükleyiciler
- **CAT** 950, 966, 980 Serisi Yükleyiciler
- **HAMM** Tekerlekli Yol Silindirleri
- **BOMAG, AMMANN** Silindirler

---

## İhmal Etmenin Maliyeti

Diferansiyel revizyonunu ertelemek şu zincirleme hasarı tetikler:

1. Hasar gören dişlilerden dökülen metal partiküller yağa karışır
2. Partiküller rulmanları, keçeleri ve mil yüzeylerini aşındırır
3. Revizyon yerine **aks değişimi** gündeme gelir — maliyet 5-10 kat artar

**Kural:** Gürültü duyduğunuz anda teşhis yaptırın, dişlilerin "kendiliğinden geçeceğini" beklemeyin.

---

Diferansiyel sorununuz için ücretsiz değerlendirme: **[Teklif Al](/teklif-al)**`,
  },

  {
    title: "İş Makinası Bakımını İhmal Etmenin Gerçek Maliyeti",
    slug:  "is-makinasi-bakimi-ihmal-maliyeti",
    excerpt: "Planlı bakım vs reaktif tamir maliyetlerinin karşılaştırması. Küçük bakım ihmallerinin nasıl büyük faturalara dönüştüğünü anlattık.",
    readingTimeMinutes: 5,
    metaTitle: "İş Makinası Bakımını İhmal Etmenin Maliyeti | NİDAH GROUP",
    metaDescription: "Planlı bakım yapmak mı daha pahalı, yoksa arızayı beklemek mi? Gerçek maliyet karşılaştırması ve uzman tavsiyesi.",
    content: `## İş Makinası Bakımını İhmal Etmenin Gerçek Maliyeti

"Makine çalışıyor, neden para harcayayım?" — Bu düşünce, iş makinası sahipleri arasında en yaygın ve en maliyetli yanılgıdır.

Araştırmalar, düzenli bakım yapılan iş makinalarının **toplam sahip olma maliyetinin (TCO)** reaktif tamir yaklaşımına göre ortalama **%35-45 daha düşük** olduğunu göstermektedir.

---

## Örnek 1: Yağ Filtresi İhmali

**Senaryo:** Bir ekskavatör operatörü 500 saatlik motor yağı değişimini 800 saate kadar erteliyor.

| Yapılan | Maliyet |
|---------|---------|
| Zamanında filtre + yağ değişimi | ~1.500 ₺ |
| Gecikme nedeniyle motor arızası (yatak hasarı) | 45.000-120.000 ₺ |
| Makine duruş süresi (5 gün × 15.000 ₺/gün) | 75.000 ₺ |
| **Toplam ihmal maliyeti** | **120.000-195.000 ₺** |

---

## Örnek 2: Sızıntı Görmezden Gelinmesi

**Senaryo:** Hidrolik silindirde küçük keçe sızıntısı fark edilmesine rağmen müdahale edilmiyor.

| Yapılan | Maliyet |
|---------|---------|
| Silindir keçe kiti değişimi (erkende) | ~3.500 ₺ |
| Sızıntı büyüyünce silindir revizyon + krom kaplama | 22.000-38.000 ₺ |
| Çevre hasarı temizliği (çalışma alanı kirliliği) | ek maliyet |

---

## Örnek 3: Palet Gerginlik Ayarsızlığı

**Senaryo:** Palet çok gevşek bırakılıyor, idler ve üst rulmanlar normalden 3 kat hızlı aşınıyor.

| Yapılan | Maliyet |
|---------|---------|
| Gerginlik ayarı (ücretsiz, operatör yapabilir) | 0 ₺ |
| Erken aşınan tam alt takım seti (rulman, kasnak, palet) | 80.000-150.000 ₺ |

---

## Planlı Bakım vs Reaktif Tamir: Sayılar

| Kriter | Planlı Bakım | Reaktif Tamir |
|--------|-------------|--------------|
| Yıllık bakım maliyeti | 25.000-45.000 ₺ | Değişken |
| Büyük arıza sıklığı | Düşük (%20) | Yüksek (%65) |
| Plansız duruş süresi | Yılda 2-5 gün | Yılda 15-30 gün |
| Makine ömrü | 15.000-20.000 saat | 8.000-12.000 saat |
| 5 yıllık toplam sahip olma maliyeti | Daha düşük (~%40) | Daha yüksek |

---

## Bakımı Değer Kılan Gerçek: Makine Değer Kaybı

Bakımlı bir makine, ikinci el piyasasında **%20-40 daha yüksek** fiyatla satılır. Servis geçmişi belgeli, periyodik bakımları yapılmış bir makine; filo yöneticileri ve ikinci el alıcıları için çok daha cazip görünür.

---

## NİDAH GROUP Bakım Destek Paketi

Filo sahibi firmalar için **bakım takvimi takip desteği** sunuyoruz:

- Makine saatlerine göre bakım hatırlatma
- Periyodik bakım kiti hazır tedarik
- Acil parça temin (stok parça + hızlı kargo)
- Teknik danışmanlık (ücretsiz)

**Filo büyüklüğünüzü ve marka/modellerinizi bildirin, size özel bir teklif hazırlayalım:** [İletişim](/iletisim)`,
  },
];

async function main() {
  console.log(`Seeding ${posts.length} blog posts...`);
  let ok = 0;
  for (const post of posts) {
    try {
      await db.execute(
        `INSERT INTO blog_posts
          (title, slug, content, excerpt, meta_title, meta_description,
           status, author_name, reading_time_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,'draft','NİDAH GROUP',$7)
         ON CONFLICT (slug) DO NOTHING`,
        [
          post.title,
          post.slug,
          post.content,
          post.excerpt,
          post.metaTitle,
          post.metaDescription,
          post.readingTimeMinutes,
        ]
      );
      console.log(`  ✓ ${post.title}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${post.title}:`, err.message);
    }
  }
  console.log(`\nDone: ${ok}/${posts.length} posts seeded.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
