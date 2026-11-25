# Neon Veritabanı Tüketim ve Maliyet Denetimi

**Tarih:** 2026-11-24 · **Kapsam:** salt okunur denetim · **Uygulanan değişiklik:** yok
**Denetlenen kod sürümü:** `d91764a` (HEAD) · **Canlıdaki dağıtım:** `d91764a`, 2026-11-20 ~13:15 UTC

---

## 0. Yönetici özeti (teknik olmayan okuyucu için)

Neon'da ücret, "veritabanının kaç saat **uyanık** kaldığı" üzerinden hesaplanır — kaç
kayıt tuttuğunuz veya kaç sorgu attığınız değil. Veritabanı 5 dakika hiç soru
almazsa kendi kendine uyur ve uyurken **hiç** ücret işlemez. Ama 5 dakikada bir
tek bir soru bile gelirse hiç uyumaz ve sayaç bütün gün döner.

Bugüne kadarki 96,3 CU-saatin büyük bölümünü bu yüzden tükettiniz: siteniz
**19 Kasım'a kadar** her dakika kendini yeniden üretiyordu (her yeniden üretim
veritabanına bir soru = uyandırma). Bu hata 19–20 Kasım'da düzeltildi ve
düzeltmenin canlıda çalıştığı bu denetimde **ölçülerek doğrulandı**.

Fakat tek bir kapı hâlâ açık: **blog sayfaları hiç önbelleklenmiyor.** Sitemap'teki
63 adresin **48'i** her ziyarette ve Google her uğradığında veritabanını
uyandırıyor. Bu, kalan kapasiteyi eritmeye devam eden kaynaktır.

**Kritik iş riski:** kapasite biterse Neon veritabanını ay sonuna kadar askıya
alır. O durumda **teklif formu çalışmaz ve e-posta da gitmez** — yani gelen
talepler sessizce kaybolur (kodda doğrulandı). Statik sayfalar ayakta kalır,
yönetim paneli çalışmaz.

**Cevaplar kısaca:** Tüketim bir hatadan kaynaklandı, hata düzeltildi; bir kapı
daha kapatılırsa **ücretsiz pakette kalınabilir.** 5.000 ürün için Neon'un
ücretsiz paketi **depolama açısından fazlasıyla yeterli** (tahmini 36 MB / 1 GB);
belirleyici olan compute'tur ve bu da önbellekleme kararlarıyla yönetilir.
Gerekirse ücretli paket aylık **yaklaşık 3–25 USD** aralığındadır — büyük bir
kalem değildir, ama şu an **zorunlu değildir.**

---

## 1. Denetimin erişim sınırları (önce bu okunmalı)

Bu rapor iki tür bilgi içerir ve ikisi her yerde ayrı etiketlenmiştir:

| | |
|---|---|
| **ÖLÇÜLDÜ** | Bu oturumda doğrudan ölçülen/okunan kanıt (kod, HTTP başlıkları, DB boyutları, git geçmişi, Neon resmî fiyatlandırma sayfaları) |
| **MODEL** | Ölçülen verilerden varsayımlarla hesaplanan tahmin — varsayımlar açıkça yazılı |
| **ÖLÇÜLEMEDİ** | Erişimim olmadığı için **tahmin bile edilmemiş** alan |

**Erişemediklerim:**

- **Neon yönetim paneli / Neon API.** Ortamda Neon API anahtarı yok, Neon MCP
  sunucusu yapılandırılmamış. Bu yüzden *"tüketim hangi gün ve saatte yükseldi"*,
  *"hangi branch ne kadar tüketti"*, *"compute endpoint'lerin min/max CU ayarı ne"*
  sorularını **ölçemedim.** İhtiyaç duyduğum ekranlar §9'da listelidir.
- **Vercel paneli ve üretim logları.** Vercel CLI kurulu değil, Vercel MCP
  yetkilendirilmemiş (`/mcp`). İstek sayıları, `/api/health` çağrı sıklığı ve
  deploy sayısı **ölçülemedi.**
- **Google Search Console.** Tarama isteği sayısı **ölçülemedi.**

**Bu denetimin kendi kapasite maliyeti:** üretim veritabanına **tek bir** salt
okunur sorgu gönderildi (tablo boyutları, §4.2) ve canlı siteye 4 HTTP isteği
yapıldı. Tahmini maliyet **~0,02 CU-saat** (kalan 3,7'nin %0,5'i). Ağır sorgu,
yük testi, yazma işlemi, migration ve ayar değişikliği **yapılmadı.**

---

## 2. Neon'un resmî limitleri ve fiyatları (ÖLÇÜLDÜ)

2026-11-24 tarihinde Neon'un resmî sayfalarından okundu.

### Ücretsiz paket

| Kalem | Değer | Not |
|---|---|---|
| Fiyat | 0 USD / ay | Kalıcı, deneme değil |
| **Compute** | **100 CU-saat / ay / PROJE** | **Hesap başına değil — her proje kendi 100'üne sahip** |
| Depolama | 1 GB / proje · tüm projeler toplamı 20 GB | |
| Otomatik ölçekleme | **en çok 2 CU** | Ücretsiz pakette tavan |
| En küçük compute boyutu | 0,25 CU (1 GB RAM) | Tabloda en küçük satır |
| **Scale-to-zero** | **5 dk hareketsizlik · kapatılamaz** | Ücretsizde sabit |
| Uyanma süresi | "birkaç yüz milisaniye" | |
| Branch | 10 / proje (kök dal dahil) | Her branch'in **kendi compute'u** vardır ve projenin CU-saatine yazılır |
| Egress | 5 GB / proje / ay | |
| **Limit aşılırsa** | **Compute, sonraki fatura dönemine kadar ASKIYA ALINIR**; mevcut bağlantılar düşer, yenisi açılamaz (SQLSTATE 53000) | Depolama askıya alınmaz; Neon ücretsizde aşım faturalamaz |
| Sıfırlama | Her fatura döneminin başında | **Dönem başlangıç tarihi sayfalarda tanımlı değil** |

### Hesaplama kuralı

> compute boyutu × çalıştığı saat = CU-saat.
> Askıya alınmış (uyuyan) compute = **0 USD**.

Yani: 0,25 CU × 4 saat = 1 CU-saat. 2 CU × 3 saat = 6 CU-saat.

### Ücretli paketler

| | Launch | Scale |
|---|---|---|
| Aylık sabit ücret | **yok** ("kullandığın kadar") | yok |
| Compute | **0,106 USD / CU-saat** | 0,222 USD / CU-saat |
| Depolama | 0,35 USD / GB-ay | 0,35 USD / GB-ay |
| Dahil CU-saat | **0** (ilk saatten itibaren ücretli) | 0 |
| Otomatik ölçekleme | 16 CU'ya kadar | 16 CU (sabit 56 CU'ya kadar) |
| Scale-to-zero | 5 dk · **kapatılabilir** | 1 dk – hiç uyumama arası ayarlanabilir |
| Egress | 500 GB / proje, sonra 0,10 USD/GB | aynı |
| Depolama tavanı | yok | yok |

**Önemli sonuç:** `nidah-dev` ayrı bir Neon projesi olduğu için **kendi 100
CU-saatine sahiptir** ve `nidah_group_web` projesinin kotasından harcamaz. Yani
yerel geliştirme, `npm run build`, preview dağıtımları ve `.env.local` kullanan
36 script bu 96,3 CU-saatin **içinde değildir.** (Bu, iki projenin gerçekten ayrı
olduğu varsayımına dayanır — proje CLAUDE.md §4'te doğrulanmış kayıt; Neon
panelinde §9.1 ile teyit edilmesi gerekir.)

---

## 3. Ölçülen kanıtlar

### 3.1 Canlı önbellek durumu (ÖLÇÜLDÜ — HTTP başlıkları, 2026-11-24 ~21:40)

| Adres | `X-Vercel-Cache` | `Age` | `Cache-Control` | Veritabanına dokunur mu |
|---|---|---|---|---|
| `/` | **HIT** | 364.393 s (≈101 saat) | `max-age=0, must-revalidate` | **Hayır** |
| `/sitemap.xml` | **HIT** | 364.340 s | aynı | **Hayır** |
| `/blog` | **MISS** | 0 | `private, no-cache, no-store` | **EVET — her istekte** |

İki okuma birlikte iki şeyi kanıtlıyor:

1. **Zaman tabanlı ISR gerçekten bitmiş.** Ana sayfa ve sitemap son dağıtımdan
   (≈101 saat önce = 20 Kasım ~16:30 TRT; `20-ESIK-DEPLOY-RAPORU.md` 13:15 UTC
   diyor — birebir tutuyor) beri **bir kez bile** yeniden üretilmemiş. `27d0733`
   düzeltmesi canlıda çalışıyor. Yerel son build'de de doğrulandı:
   `.next/prerender-manifest.json` → **31 rotanın 31'i** `initialRevalidateSeconds: false`.
2. **Blog tarafı tamamen dinamik.** `no-store` + `MISS` → CDN hiç önbelleğe
   almıyor, her istek sunucuyu ve veritabanını çalıştırıyor.

### 3.2 Sitemap'teki 63 adresin render kipi (ÖLÇÜLDÜ)

Canlı `sitemap.xml` indirilip (önbellekten geldi, DB maliyeti yok) kod tarafındaki
rota ayarlarıyla eşleştirildi:

| Render kipi | URL sayısı | Veritabanı etkisi |
|---|---|---|
| **`force-dynamic`** | **48** | **Her istek → DB sorgusu → compute uyanır** |
| `revalidate = 60` (blog yazıları) | 4 | 60 sn'den eski ise istek sırasında yeniden üretim → DB |
| Tam statik | 11 | DB'ye hiç dokunmaz |

48'in dağılımı: `/blog`, `/blog/en|ru|ar` listeleri, `/blog/kategori/*`,
`/blog/etiket/*` ve `/blog/{en,ru,ar}/{category,tag}/*`.

Kod kanıtı — `export const dynamic = "force-dynamic"` taşıyan public rotalar:

```
(public)/blog/page.tsx                      (public)/blog/kategori/[slug]/page.tsx
(public)/blog/en/page.tsx                   (public)/blog/etiket/[slug]/page.tsx
(public)/blog/ru/page.tsx                   (public)/blog/en/category/[slug]/page.tsx
(public)/blog/ar/page.tsx                   (public)/blog/en/tag/[slug]/page.tsx
(public)/catalog/[id]/page.tsx              (public)/blog/ru/category/[slug]/page.tsx
                                            (public)/blog/ru/tag/[slug]/page.tsx
                                            (public)/blog/ar/category/[slug]/page.tsx
                                            (public)/blog/ar/tag/[slug]/page.tsx
```

### 3.3 Veritabanına dokunan yüzeyin tamamı (ÖLÇÜLDÜ — kod taraması)

| Yüzey | Dosya sayısı | Önbellek | Değerlendirme |
|---|---|---|---|
| Public blog sayfaları | 4 rota dosyası (13 URL deseni) | **yok / 60 sn** | **Ana sorun** |
| `site_settings` (her public sayfanın layout'u) | 1 | etiket tabanlı, `revalidate: false` | ✅ Doğru kurulmuş |
| `sitemap.xml` | 1 dosya, **8 sorgu** | statik (`false`) | ✅ Yalnızca dağıtımda |
| `/api/products`, `/api/products/[partNumber]` | 2 | `s-maxage=60` CDN | Katalog açılınca ısınacak |
| `/api/rfq`, `/api/contact` | 2 | — | Gerçek iş trafiği, gerekli |
| `/api/admin/**` | 34 rota | `force-dynamic` | Panel kullanımı kadar |
| `/api/health` | 1 | `force-dynamic`, `SELECT 1` | **Dışarıdan ping ediliyorsa kritik — ölçülemedi** |
| `/api/catalog/*` (arama, öneri, parça) | 3 | — | **Neon'a dokunmuyor** — Prosis connector'a gider |

**Sürekli açık bağlantı yok (ÖLÇÜLDÜ).** `src/lib/db/index.ts` yalnızca
`@neondatabase/serverless`'in **HTTP** sürücüsünü kullanır
(`drizzle-orm/neon-http`): her sorgu ayrı bir HTTPS isteğidir, havuz (pool) veya
kalıcı TCP oturumu yoktur. Bu, serverless için doğru seçimdir — klasik
"bağlantı sızıntısı" riski bu projede **yok.** Ama bunun maliyet yüzü şudur:
compute'u uyanık tutan şey bağlantı değil, **isteğin kendisidir**; 5 dakikalık
uyku sayacı her sorguda baştan başlar.

**Cron / keep-alive / zamanlanmış görev yok (ÖLÇÜLDÜ).** `vercel.json` içinde
`crons` tanımı yok, kod tabanında zamanlanmış DB işi yok. Bulunan iki
`setInterval`'ın ikisi de veritabanına dokunmuyor:
`rate-limit.ts` (bellek temizliği) ve admin analytics ekranı (30 sn'de bir
`/api/admin/analytics` → **GA4 API**, Neon değil). Yetkilendirme de DB'siz: `src/proxy.ts`
yalnızca JWT doğrular.

### 3.4 Üretim veritabanı boyutları (ÖLÇÜLDÜ — tek sorgu, 2026-11-24)

| Tablo | Satır | Toplam KB | Veri KB | İndeks KB |
|---|---|---|---|---|
| products | 157 | 320 | 128 | 160 |
| blog_post_translations | — | 256 | 8 | 96 |
| fitments | 302 | 208 | 56 | 120 |
| blog_posts | 2 | 160 | 8 | 96 |
| product_translations | 154 | 128 | 24 | 72 |
| diğer 7 tablo | — | 544 | — | — |
| **İlk 12 tablo toplamı** | | **1.616 KB ≈ 1,6 MB** | | |

1 GB ücretsiz depolama limitinin **binde 1,6'sı** kullanılıyor. Depolama bu
projede bir risk değil.

### 3.5 Çalışma geçmişi ve kod değişiklikleri (ÖLÇÜLDÜ — git + dosya tarihleri)

| Tarih | Olay | Neon etkisi |
|---|---|---|
| ≤ 18 Kasım | `site_settings` önbelleği `revalidate: 60` | **28/31 rota dakikada bir yeniden üretilebilir** |
| 18 Kasım | `scripts/aktarim-154-urun.sql` — 154 ürün aktarımı | tek oturum, kısa |
| 18 Kasım | 34 adet `faz3-*.mjs` script yazıldı (çoğu `.env.local` = **dev projesi**) | prod kotasına yazmaz |
| 19 Kasım | `27d0733` — önbellek etiket tabanlı yapıldı | **ana düzeltme (kod)** |
| 19–24 Kasım | **10 script üretime** bağlandı (`NIDAH_WEB_PROD_URL`) | her çalıştırma ≥5 dk uyanıklık |
| 20 Kasım 13:15 UTC | `d91764a` dağıtımı | **düzeltme canlıya indi** |
| 24 Kasım | Neon kapasite uyarısı: 96,3 / 100 | |

Üretime bağlanan 10 script (hepsi salt okunur, bağlantı adresini yazdırmıyor —
denetlendi): `faz3-deploy-dogrulama`, `faz3-esik-etki`, `faz3-g3-teyit`,
`faz3-g4-cakisma`, `faz3-g4-teyit`, `faz3-grup2-teyit`, `faz3-kalan22`,
`faz3-kolonlar2`, `faz3-kisa-aciklama-adaylari`, `faz3-oring-haritasi`.

---

## 4. 96,3 CU-saat nereye gitti?

### 4.1 Hesap çerçevesi (MODEL)

Varsayımlar — **doğrulanmaları §9'daki ekranlara bağlıdır**:

- **V1:** compute boyutu 0,25 CU (Neon'un en küçük boyutu; ücretsiz paketin
  varsayılanı resmî sayfalarda yazılı değil). Gerçek değer daha büyükse aşağıdaki
  "uyanık saat" sayıları aynı oranda küçülür.
- **V2:** fatura dönemi takvim ayı (1–30 Kasım). Neon dönem başlangıcını
  belgelemiyor; gerçek dönem 24 Ekim–24 Kasım ise aşağıdaki pencere kayar ama
  sonuç değişmez (her iki pencere de hatalı dönemi kapsar).
- **V3:** CU-saat = boyut × uyanık saat (resmî kural).

Buna göre:

```
96,3 CU-saat ÷ 0,25 CU  =  385 saat "uyanık compute"
1–24 Kasım 21:00        =  573 saat takvim süresi
→ veritabanı sürenin yaklaşık %67'sinde uyanık kalmış
```

Günlük bütçe karşılaştırması: ücretsiz paket 100 CU-saat/ay = **günde 3,33
CU-saat = 0,25 CU'da günde 13,3 uyanık saat.** Yani veritabanının günün en az
%45'ini **uyuyarak** geçirmesi gerekiyor. Ölçülen davranış bunun tam tersi.

### 4.2 Birinci kaynak: dakikalık yeniden üretim (19–20 Kasım'a kadar) — düzeltildi

Proje CLAUDE.md'sinde ölçülmüş olan eski durum: `unstable_cache`'e verilen
`revalidate: 60`, değeri render eden rotaya taşıyordu → **31 rotanın 28'i**
`initialRevalidateSeconds: 60`, sayfa başlıkları
`s-maxage=60, stale-while-revalidate=31535940`.

Bu kurulumda site şöyle davranır: 60 saniyeden eski bir sayfaya gelen **herhangi
bir** istek (ziyaretçi, Googlebot, tarayıcı önyüklemesi, link önizlemesi) arka
planda bir yeniden üretim başlatır. Her yeniden üretim `site_settings` sorgusunu
tazeler; `/sitemap.xml` yeniden üretimi **8 sorgu** çalıştırır. Sonuç: dakikada
bir DB dokunuşu → 5 dakikalık uyku sayacı hiç dolmaz → **compute 7/24 uyanık.**

| Pencere | Süre | 7/24 uyanık varsayımıyla |
|---|---|---|
| 1 Kasım – 20 Kasım 16:30 | 472 saat | 472 × 0,25 = **118 CU-saat** |

Ölçülen 96,3, bu üst sınırın **%82'si.** Yani: *"1–20 Kasım arasında veritabanı
neredeyse hiç uyumadı"* tablosu, ölçülen tüketimi **tek başına açıklıyor.**
Bundan sonraki kalemler bu rakamın içinden pay alır, üstüne eklenmez.

**Öncelik: TAMAMLANDI** (`27d0733` + `5cb1279` regresyon koruması). 20 Kasım
16:30'dan bu yana ana sayfa ve sitemap **bir kez bile** yeniden üretilmedi
(§3.1'deki `Age` kanıtı).

### 4.3 İkinci kaynak: önbelleklenmeyen 48 blog adresi — HÂLÂ AÇIK

Düzeltmeden sonra kalan tek sürekli kaynak budur. `/blog` ölçümü (`MISS`,
`no-store`) bunu kanıtlıyor.

Sayısal etki (MODEL): Googlebot 48 adresi tararken istekler arası boşluk 5
dakikadan **büyükse** her adres ayrı bir 5 dakikalık uyanıklık penceresi açar:

```
48 adres × 5 dk = 240 dk = 4 saat uyanıklık  →  1,0 CU-saat / tam tarama turu
```

Günde bir tam tur → **~30 CU-saat/ay.** Tarama yoğunsa (istekler 5 dakikadan sık)
pencereler üst üste biner ve maliyet düşer; tarama seyrekse (her adres ayrı
pencere) maliyet yukarıdaki seviyeye çıkar. Buna ziyaretçi trafiği, sosyal medya
önizleme botları ve uptime kontrolleri eklenir.

**20 Kasım sonrası 4,2 günde ne kadar harcandığı ÖLÇÜLEMEDİ** — bunu ayırmak için
Neon panelindeki günlük CU-saat grafiği gerekiyor (§9.1). Ücretsiz pakette
devam edip etmeyeceğimiz pratikte **bu dört günün rakamına** bakılarak kesinleşir.

### 4.4 Üçüncü kaynak: 19–24 Kasım katalog çalışması (MODEL)

| Kalem | Hesap | Tahmin |
|---|---|---|
| 10 salt okunur script × ~4 çalıştırma × 5 dk uyanıklık | 200 dk | **~0,8 CU-saat** |
| 154 ürün aktarımı (tek SQL oturumu) | ~10 dk | ~0,04 CU-saat |
| Yönetim paneli oturumları (her sayfa gezinmesi DB'ye gider) | 20 saat aktif panel varsayımıyla | **~5 CU-saat** |
| Üretim dağıtımları (build sırasında sitemap + sayfa üretimi) | 2 dağıtım × ~5 dk | ~0,04 CU-saat |

Toplam **~6 CU-saat** mertebesinde — yani 96,3'ün **%6'sı kadar.** Katalog
araştırma çalışmanız bu tüketimin **sebebi değil.** Ancak önemli bir uyarı var:
scriptlerin her çalıştırması, sorgu 1 saniye sürse de **en az 5 dakika**
uyanıklık yazar. Kalan 3,7 CU-saat ≈ **0,25 CU'da ~15 uyanık saat** demektir;
bugünkü hızda script çalıştırmaya devam etmek bu kalanı tüketebilir.

### 4.5 Ölçülemeyen kaynak: `/api/health`

`force-dynamic` + `SELECT 1`. Dışarıdan bir uptime izleme servisi (UptimeRobot,
Better Stack, Pingdom vb.) bu adresi 1–5 dakikada bir çağırıyorsa **tek başına
compute'u 7/24 uyanık tutar: ~180 CU-saat/ay.** Böyle bir izleyici olup
olmadığını göremiyorum — **tahmin de etmiyorum.** §9.2'de Vercel log
sorgusuyla 1 dakikada doğrulanabilir.

---

## 5. Bulgular ve çözümler

Her bulgu: kaynak → kanıt → etki → çözüm → tasarruf → risk → öncelik.

### B1 — Blog rotaları hiç önbelleklenmiyor · **ÖNCELİK: YÜKSEK**

- **Kaynak:** 13 blog rota dosyasında `export const dynamic = "force-dynamic"`.
- **Kanıt:** `/blog` → `X-Vercel-Cache: MISS`, `Cache-Control: no-store` (canlı
  ölçüm); sitemap'teki 63 adresin 48'i bu kipte.
- **Etki:** Her ziyaret ve her Google taraması veritabanını uyandırıyor.
  Düzeltme sonrası kalan **birincil** tüketim kaynağı. Ayrıca her sayfa
  görüntülemesi sunucu render'ı gerektirdiği için TTFB de statik sayfalardan
  yavaş.
- **Çözüm:** Blog içeriği dakikada bir değişmiyor — `site_settings` için zaten
  kurduğunuz **etiket tabanlı** modele geçirilmesi gerekir: `force-dynamic`
  kaldırılır, veri okumaları `unstable_cache(..., { tags: ["blog"], revalidate: false })`
  içine alınır, `/api/admin/blog/**` yazma yollarına
  `revalidateTag("blog", { expire: 0 })` + `revalidatePath` eklenir. Sayfalama
  `searchParams` ile yapıldığı için `?page=N` davranışının korunması gerekir
  (bu yüzden işin %80'i düşünmek, %20'si yazmaktır — ayrı bir görev olarak
  planlanmalı).
- **Tahmini tasarruf (MODEL):** Tarama ve ziyaret kaynaklı uyandırmaların
  tamamına yakını kalkar → **ayda ~25–35 CU-saat.**
- **Uygulama riski:** **Orta.** Yanlış yapılırsa yeni bir yazı yayınlandığında
  listede görünmez. Proje CLAUDE.md'sindeki iki kural geçerli: `unstable_cache`'e
  **sayısal `revalidate` verilmez**, ve `(public)/` köküne `loading.tsx` eklenmez.
  Dağıtım sonrası doğrulama: `HIT` → yazı yayınla → `MISS` → tekrar `HIT`.
- **Not:** Ücretsiz pakette kalmanın pratikte **tek şartı** bu maddedir.

### B2 — Kapasite bitişi teklif formunu sessizce öldürür · **ÖNCELİK: YÜKSEK (iş riski)**

- **Kaynak:** `src/app/api/rfq/route.ts` — DB'ye `INSERT` **önce**, e-posta
  gönderimi **sonra** yapılıyor; `INSERT` hata verirse `catch` bloğu 500 döner ve
  **e-posta hiç gönderilmez.**
- **Kanıt:** Kodda satır sırası: `await db.insert(...)` (72) → e-posta işleri (95+)
  → `catch` → `{ success: false }` + HTTP 500 (108-116). Ayrıca `if (!db)` dalı
  503 döner.
- **Etki:** Neon compute askıya alınırsa (kota bitişi, geçici arıza) müşteri
  "Sunucu hatası" görür, kayıt oluşmaz, **size hiçbir bildirim ulaşmaz.** Talep
  tamamen kaybolur. Statik sayfalar ve iletişim bilgileri ayakta kalır, yönetim
  paneli çalışmaz.
- **Çözüm:** `INSERT` başarısız olsa bile e-postanın gönderilmesi (yedek kanal) —
  "kayıt düşemedi ama talep şu bilgilerle geldi" içerikli bir uyarı e-postası.
  Ek olarak `/api/contact` aynı açıdan gözden geçirilmeli.
- **Tahmini tasarruf:** Kapasite tasarrufu **yok** — bu bir **dayanıklılık**
  düzeltmesidir.
- **Uygulama riski:** Düşük (yalnızca hata yoluna ekleme).

### B3 — Kalan 3,7 CU-saat, script çalıştırmaya devam ederse yetmez · **ÖNCELİK: YÜKSEK (işletme kuralı)**

- **Kanıt:** 5 dk scale-to-zero (resmî) → her script çalıştırması ≥ 0,021
  CU-saat. Kalan kapasite 0,25 CU'da **~15 uyanık saate** denk.
- **Çözüm (kod değişikliği gerektirmez):**
  1. Üretime bağlanan script çalıştırmaları **durdurulur**; zorunlu olanlar tek
     bir script içinde **tek çalıştırmada** birleştirilir (10 ayrı çalıştırma =
     10 ayrı 5 dk penceresi; 1 çalıştırma = 1 pencere).
  2. Araştırma/analiz sorguları `nidah-dev` projesine (kendi 100 CU-saati var)
     alınır; üretim yalnızca **son teyit** için kullanılır.
  3. Yönetim panelini açık bırakmamak: panel açıkken her gezinme DB'ye gider.
- **Tasarruf:** kalan kapasitenin korunması.
- **Risk:** yok (yalnızca çalışma disiplini).

### B4 — `/api/health` dış izleyici tarafından ping ediliyorsa 7/24 uyanıklık · **ÖNCELİK: YÜKSEK (önce doğrulanmalı)**

- **Kaynak:** `/api/health` → `force-dynamic` + `SELECT 1`.
- **Kanıt:** Kod doğrulandı; **çağrı sıklığı ölçülemedi.**
- **Etki (MODEL):** 5 dakikada bir ping → compute hiç uyumaz → **~180 CU-saat/ay.**
  Böyle bir izleyici varsa bu, B1'den de büyük bir kalemdir.
- **Çözüm:** Önce doğrula (§9.2). Varsa: ping aralığı 15+ dakikaya çekilir **veya**
  sağlık ucu DB kontrolünü yalnızca `?deep=1` parametresiyle yapar, varsayılan
  çağrı DB'ye dokunmaz.
- **Risk:** Düşük. (DB kontrolünü tamamen kaldırmak izlemeyi körleştirir — tercih
  edilmemeli.)

### B5 — Blog yazısı sorgusu her render'da iki kez çalışıyor · **ÖNCELİK: ORTA**

- **Kaynak:** `(public)/blog/[slug]/page.tsx` → `getTrPost()` hem
  `generateMetadata` hem sayfa gövdesinde çağrılıyor ve **React `cache()` ile
  sarılmamış.**
- **Kanıt:** Aynı dosyada `getTrPost` iki çağrı noktası; fonksiyon içinde 2 sorgu
  (yazı + çeviriler) → render başına **2 yerine 4 sorgu.** Karşılaştırma:
  `src/lib/queries/product.ts` bunu **doğru** yapıyor
  (`export const getProductBySegment = cache(...)`).
- **Etki:** Sorgu sayısı iki katı. Compute *süresine* etkisi küçük (uyanıklık
  penceresi aynı), ama gereksiz.
- **Çözüm:** `getTrPost`'u `cache()` ile sar; `en/ru/ar` eşdeğerlerini de denetle.
- **Tasarruf:** Sorgu sayısında %50; CU-saatte **ölçülebilir ölçüde değil.**
- **Risk:** Çok düşük.

### B6 — `lib/catalog.ts` içinde ölü ve ölçeklenemeyen sorgu · **ÖNCELİK: ORTA (katalog açılmadan önce)**

- **Kaynak:** `listProducts()` içindeki görsel sorgusu **tüm tablodaki** birincil
  görselleri çekiyor (`where isPrimary = true`, ürün filtresi **yok**), sonra
  JavaScript'te `ids.includes()` ile süzüyor.
- **Kanıt:** `src/lib/catalog.ts:75-88`. Ayrıca kod taramasında **hiçbir çağıran
  bulunamadı** — şu an ölü kod. Public katalog `/api/products` üzerinden çalışıyor.
- **Etki:** Bugün sıfır. 5.000 ürüne geçildiğinde bu fonksiyon kullanılırsa her
  liste görüntülemesi 5.000 satır çeker ve O(n²) süzer.
- **Çözüm:** Ölü kod **kaldırılır** (tercih edilen) veya `inArray(productImages.productId, ids)`
  ile düzeltilir.
- **Tasarruf:** Gelecekte oluşacak maliyetin önlenmesi.
- **Risk:** Düşük (kullanılmayan kod).

### B7 — Metin aramasında indeks yok · **ÖNCELİK: ORTA (5.000 ürüne geçmeden önce)**

- **Kaynak:** `/api/products` ve `lib/catalog.ts`: `ilike(partNumber, '%q%')`
  `OR ilike(name, '%q%')`.
- **Kanıt:** `%...%` deseni B-tree indeksini kullanamaz. Mevcut indeksler
  (`idx_products_part_number`, `uq_products_pn_norm` vb. — şema zengin ve
  genel olarak iyi kurulmuş) bu sorgu için **devreye girmez.**
- **Etki:** 157 satırda önemsiz. 5.000–50.000 satırda her arama tam tablo
  taraması → CPU yükselir → Neon **2 CU'ya kadar otomatik ölçeklenir** → CU-saat
  tüketimi **4 katına** kadar çıkabilir. Aynı sorun `oem_numbers` aramalarında da
  ortaya çıkacaktır.
- **Çözüm:** `pg_trgm` eklentisi + `gin_trgm_ops` indeksi, **ya da** aramayı
  `part_number_normalized` üzerinden önek (`LIKE 'q%'`) aramasına çevirmek
  (zaten normalize edilmiş kolon ve benzersiz indeks mevcut — mimariye uygun yol
  bu). Migration dosyası yazılabilir; **çalıştırmak ayrı onaya tabidir.**
- **Tasarruf (MODEL):** Yüksek trafikte autoscale'in 0,25 CU'da kalması →
  **CU-saatte 2–4 kat fark.**
- **Risk:** Orta (migration). Deploy sırası kuralı geçerli: **migration önce,
  kod sonra.**

### B8 — 5.000 ürün sayfası ilk kez üretilirken uzun uyanıklık · **ÖNCELİK: ORTA (katalog açılışı planına girmeli)**

- **Kaynak:** Üründe `generateStaticParams` **yok** (tüm projede hiç yok) →
  ürün sayfaları ilk istekte üretilip önbelleğe alınır (on-demand ISR).
- **Kanıt:** Kod taraması; `seo-gate.ts:154`'te `generateStaticParams`'tan
  "gelecek" olarak söz ediliyor ama uygulanmamış.
- **Etki (MODEL):** Google 5.000 ürün adresini **seyrek** tararsa (istekler arası
  > 5 dk) her sayfa ayrı bir 5 dakikalık uyanıklık penceresi açar:
  `5.000 × 5 dk = 416 saat → 0,25 CU'da ~104 CU-saat`. Yoğun tarama bunu
  ~4–17 saate (1–4 CU-saat) indirir. Yani maliyet **Google'ın tarama ritmine**
  bağlıdır — kontrolümüzde değil.
- **Çözüm:** Katalog açılmadan önce `generateStaticParams` ile `seo_ready = true`
  ürünlerin **build sırasında** üretilmesi (build Vercel'de çalışır, tek uzun
  uyanıklık penceresi = ~birkaç dakika). Böylece tarama CDN'den karşılanır,
  veritabanına hiç inmez. 4 dilli ürün sayfası planlanıyorsa bu madde **zorunlu**
  hâle gelir (20.000 URL).
- **Risk:** Orta — build süresi uzar; Vercel build limitleri gözetilmeli.

### B9 — `/api/products` önbelleği 60 saniye · **ÖNCELİK: DÜŞÜK–ORTA**

- **Kanıt:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`
  (kodda, üç yerde). İstemci tarafında 300 ms debounce var — iyi.
- **Etki:** Her farklı `search`/`brand`/`page` kombinasyonu 60 saniyede bir
  DB'ye iner. Katalog açılıp arama trafiği başladığında bu, iş saatleri boyunca
  compute'u uyanık tutan yeni bir kaynak olur.
- **Çözüm:** Ürün verisi nadiren değişiyor → `s-maxage` 300–900 sn'ye çıkarılır ve
  admin yazma yollarında etiketle geçersiz kılınır.
- **Tasarruf (MODEL):** Arama trafiğinden gelen DB dokunuşlarında 5–15 kat azalma.
- **Risk:** Düşük (fiyat/stok gösterilmiyor; gecikme kabul edilebilir).

### B10 — Proje CLAUDE.md §10 güncel değil · **ÖNCELİK: DÜŞÜK (kayıt doğruluğu)**

- **Kanıt:** CLAUDE.md "Vercel Analytics / Speed Insights ❌ Yok" diyor; ancak
  `src/app/layout.tsx:4-5,185-186` ikisini de **mount ediyor** ve `package.json`
  bağımlılıkları içeriyor.
- **Etki:** Ölçüm imkânının olduğu hâlde yok sanılması. Vercel Analytics, §9'da
  istediğim sayfa görüntüleme verisini zaten topluyor olabilir.
- **Çözüm:** CLAUDE.md §10 güncellenir. **CLAUDE.md değişikliği ayrı onaya
  tabidir** (global kural) — bu denetimde değiştirilmedi.

---

## 6. 5.000 ürün kapasite analizi

### 6.1 Depolama (ÖLÇÜLEN veriden türetildi)

Ölçülen birim maliyetler (§3.4): ürün satırı **2,04 KB** (indeks dahil),
uyumluluk satırı 0,69 KB (ürün başına ~2 adet ölçüldü: 302/157), çeviri satırı
0,83 KB.

| Senaryo | Ürün | Uyumluluk | Çeviri (4 dil) | Görsel kaydı | **Toplam** | 1 GB limitin |
|---|---|---|---|---|---|---|
| **5.000 ürün** | 10 MB | 7 MB | 17 MB | ~2 MB | **~36 MB** | **%3,6** |
| **10.000 ürün** | 20 MB | 14 MB | 33 MB | ~4 MB | **~71 MB** | %7 |
| **50.000 ürün** | 102 MB | 69 MB | 166 MB | ~20 MB | **~357 MB** | %36 |

**Varsayımlar:** mevcut ortalama satır boyutu korunur (uzun açıklamalar bugünkü
uzunlukta kalır — 42 ürüne uzun açıklama yazma çalışmanız bu ortalamayı
yükseltirse rakamlar orantılı artar); görseller **Cloudinary'de** durur,
veritabanında yalnızca URL kaydı tutulur (mevcut mimari — doğrulandı); instant
restore geçmişi (ücretsizde 6 saat) hesaba katılmadı.

**Sonuç: depolama hiçbir senaryoda ücretsiz paketi zorlamıyor.** 50.000 üründe
bile %36'da kalıyor. Teknik kataloglar (PDF) veritabanına konulmazsa bu geçerli
kalır — konulmamalıdır.

### 6.2 Compute (MODEL — belirleyici kalem)

Compute'u ziyaretçi sayısı değil, **kaç isteğin veritabanına inebildiği**
belirler. İki mimari halde çok farklı sonuç çıkar:

**A hâli — "önbellek doğru" (B1 + B8 + B9 uygulanmış):** ürün ve blog sayfaları
build/ISR ile üretilmiş, CDN'den servis ediliyor. Veritabanına yalnızca form
gönderimleri, panel kullanımı ve içerik güncellemeleri iniyor.

| Günlük ziyaretçi | DB'ye inen istek/gün (MODEL) | Uyanık saat/gün | CU-saat/ay (0,25 CU) | Ücretsiz paket (100) |
|---|---|---|---|---|
| 100 | ~5 (form + panel) | ~1 | **~8** | ✅ rahat |
| 1.000 | ~30 | ~2,5 | **~19** | ✅ rahat |
| 5.000 | ~120 | ~5 | **~38** | ✅ |
| 10.000 | ~250 | ~8 | **~60** | ⚠️ sınıra yaklaşır |

**B hâli — bugünkü mimari (blog dinamik, ürün araması her 60 sn DB'ye iniyor):**

| Günlük ziyaretçi | DB'ye inen istek/gün (MODEL) | Uyanık saat/gün | CU-saat/ay | Ücretsiz paket |
|---|---|---|---|---|
| 100 | ~150 | ~10 | **~75** | ⚠️ sınırda |
| 1.000 | ~900 | ~14 (iş saatleri sürekli) | **~105** | ❌ aşar |
| 5.000 | ~3.500 | ~18 | **~135** (+ autoscale ile 2–4 kat) | ❌ aşar |
| 10.000 | ~7.000 | ~20 | **~150** (+ autoscale) | ❌ aşar |

**Varsayımlar:** ziyaretçi başına 3 sayfa; trafiğin 14 saatlik bir pencereye
yayılması; 5 dk scale-to-zero; 0,25 CU sabit (B7 çözülmezse arama yükünde 0,5–1
CU'ya ölçeklenir ve CU-saat **o oranda** artar); Googlebot taraması ayrı
sayılmadı (A hâlinde CDN'den karşılanır, B hâlinde eklenir).

### 6.3 Özel yükler

| Yük | Değerlendirme |
|---|---|
| **Çok dilli ürün sayfaları** | URL sayısını 4'e katlar (5.000 → 20.000). **A hâlinde** maliyeti build'e taşır, çalışma zamanına yük bindirmez. **B hâlinde** maliyeti 4'e katlar. B8 bu yüzden çok dilli planda zorunludur. |
| **Parça numarası aramaları** | En riskli sorgu tipi. B7 (indeks) çözülmezse 5.000+ satırda tam tablo taraması → autoscale → **CU-saatte 2–4 kat.** |
| **Google indeksleme** | A hâlinde maliyet **sıfıra yakın** (CDN). B hâlinde taranan her URL bir DB dokunuşu. Bugünkü durum: 48 adres B hâlinde (§4.3). |
| **Ürün görselleri** | Cloudinary'de — Neon compute/depolamasına **etkisi yok.** `next/image` dönüşümleri **Vercel** tarafında maliyet üretir; bu denetimin kapsamı dışında. |
| **Teknik kataloglar (PDF)** | Veritabanına **konulmamalı.** Cloudinary veya Vercel Blob uygundur. 5.000 PDF × 2 MB = 10 GB → Neon'un 1 GB ücretsiz limitinin 10 katı. |

### 6.4 Ücretli pakete geçilirse maliyet (MODEL, Launch: 0,106 USD/CU-saat)

| Senaryo | CU-saat/ay | Compute | Depolama | **Aylık toplam** |
|---|---|---|---|---|
| 5.000 ürün, 1.000 ziyaretçi/gün, A hâli | 19 | 2,0 USD | 0,01 USD | **~2 USD** |
| 5.000 ürün, 10.000 ziyaretçi/gün, A hâli | 60 | 6,4 USD | 0,01 USD | **~6,5 USD** |
| 5.000 ürün, 10.000 ziyaretçi/gün, B hâli | 150 | 15,9 USD | 0,01 USD | **~16 USD** |
| 50.000 ürün, 10.000 ziyaretçi/gün, B hâli + autoscale 0,5 CU | ~300 | 31,8 USD | 0,13 USD | **~32 USD** |

Launch paketinin **aylık sabit ücreti yoktur** — yalnızca kullanım faturalanır.
Yani ücretli pakete geçmek "aylık 20 USD taahhüt" değil, "ücretsiz tavanı aşan
kısmı ödemek" anlamına gelir. Bu, 0 TL ilkesi açısından yine de **yeni bir
harcamadır ve onayınıza tabidir.**

---

## 7. Ücretsiz pakette kalabilir miyiz?

**Evet — B1 çözülürse ve B4 doğrulanıp gerekiyorsa düzeltilirse.** Gerekçe:

- Tüketimin ezici kısmı **bir yapılandırma hatasından** doğdu, trafikten değil.
  O hata 19–20 Kasım'da düzeltildi ve düzeltme canlıda **ölçülerek** teyit edildi.
- Hata sonrası kalan tek sürekli kaynak 48 dinamik blog adresidir; bu, aynı
  projede zaten başarıyla kurulmuş olan etiket tabanlı önbellek modeline
  geçirilerek kapatılabilir.
- Depolama hiçbir senaryoda sorun değil (5.000 üründe 1 GB'ın %3,6'sı).
- A hâlinde 5.000 ürün + günlük 1.000 ziyaretçi **~19 CU-saat/ay** mertebesinde
  kalır — 100 CU-saat tavanının beşte biri.

**Bu ayın geri kalanı ayrı bir sorudur.** Kalan 3,7 CU-saat ≈ 0,25 CU'da ~15
uyanık saat. B1 düzeltmesi yapılıp dağıtılmazsa ve blog taranmaya devam ederse
kapasite **ay sonundan önce** bitebilir; o anda B2 nedeniyle teklif talepleri
kaybolmaya başlar. Dolayısıyla seçenekler:

1. **B1'i hızlıca yapıp dağıtmak** (tercih edilen; kalıcı çözüm).
2. **Geçici kaldıraç:** Admin → Sayfalar → Blog toggle'ını kapatmak. Toggle
   kapalıyken blog rotaları `notFound()`'a düşer ve blog sorguları **hiç
   çalışmaz** (`isPageEnabled` önbellekten okunur) — yani 48 adresin DB
   dokunuşu **anında** sıfırlanır. Bedeli: Google 52 blog adresini 404 görür
   (SEO kaybı). Bunu **önermiyorum**, yalnızca kapasite bitmek üzereyse acil
   fren olarak masada tutulmalı.
3. **Fatura dönemi tarihini öğrenmek:** sıfırlama birkaç gün içindeyse risk
   kendiliğinden küçülür (§9.1).
4. **Launch'a geçmek:** askıya alınma riskini tamamen kaldırır, tahmini maliyet
   bu ay için **1 USD altı.** Yeni harcama olduğu için **onayınız gerekir.**

---

## 8. Önceliklendirilmiş çözüm planı (hiçbiri uygulanmadı — onay bekliyor)

| # | İş | Tür | Etki | Risk | Onay |
|---|---|---|---|---|---|
| **1** | §9'daki Neon + Vercel verilerinin toplanması | ölçüm | Kalan belirsizliği kapatır; B4'ü doğrular | — | — |
| **2** | **B3** — üretim script'lerini durdurmak, analizi `nidah-dev`'e almak | çalışma kuralı | Kalan 3,7 CU-saati korur | yok | — |
| **3** | **B4** — `/api/health` ping'i varsa aralığı/derinliği ayarlamak | kod + dış servis | Varsa ~180 CU-saat/ay | düşük | kod onayı |
| **4** | **B1** — blog rotalarını etiket tabanlı önbelleğe geçirmek | kod + deploy | **~25–35 CU-saat/ay** | orta | kod + **deploy onayı** |
| **5** | **B2** — RFQ'da DB hatasında e-postayı yine göndermek | kod + deploy | iş sürekliliği | düşük | kod + deploy onayı |
| **6** | **B5** — `getTrPost`'u `cache()` ile sarmak | kod | sorgu sayısı yarıya | çok düşük | kod onayı |
| **7** | **B9** — `/api/products` önbelleğini 300–900 sn'ye çıkarmak | kod | arama yükünde 5–15 kat | düşük | kod onayı |
| **8** | **B6** — `lib/catalog.ts` ölü sorgusunu kaldırmak | kod | gelecek riskini siler | düşük | kod onayı |
| **9** | **B7** — parça numarası arama indeksi (migration) | migration | 5.000+ üründe 2–4 kat | orta | **migration onayı** |
| **10** | **B8** — ürün sayfaları için `generateStaticParams` | kod + deploy | tarama maliyetini sıfıra indirir | orta | kod + deploy onayı |
| **11** | **B10** — CLAUDE.md §10 güncellemesi | belge | kayıt doğruluğu | yok | **CLAUDE.md onayı** |

4, 9 ve 10 numaralı maddeler **katalog açılışından önce** tamamlanmalıdır; 5.000
ürün yayına alındıktan sonra yapılırsa maliyet zaten oluşmuş olur.

---

## 9. İhtiyaç duyduğum veriler (bunlar olmadan kapatılamayan sorular)

### 9.1 Neon Console (ekran görüntüsü)

1. **Project `nidah_group_web` → Monitoring / Usage → Compute (CU-hours)**,
   son 30 gün, **günlük** kırılım. *(Bu tek grafik §4.2 ile §4.3 arasındaki payı
   kesinleştirir: tüketim 20 Kasım'dan sonra düştü mü?)*
2. Aynı ekranda varsa **saatlik** görünüm (yoğunluk saatleri).
3. **Billing → fatura döneminin başlangıç tarihi** (kota ne zaman sıfırlanıyor).
4. **Branches** listesi: kaç branch var, her birinin compute endpoint'i ve
   **son aktiflik zamanı**. *(Unutulmuş bir branch compute'u ayrı tüketir.)*
5. Her endpoint için **Edit compute** çekmecesi: **min CU / max CU** ve
   **scale-to-zero** ayarı. *(Min CU'nun 0,25 olup olmadığı bu rapordaki tüm
   "uyanık saat" hesaplarını doğrudan etkiler.)*
6. `nidah-dev` projesinin **aynı Neon organizasyonunda** olup olmadığı ve onun
   CU-saat kullanımı.

### 9.2 Vercel (yetki verilirse ben de okuyabilirim)

7. **Logs** → son 7 gün, `/api/health` istek sayısı ve `User-Agent` dağılımı.
   *(B4'ü doğrulayan tek veri. Dış uptime servisi kullanıyorsanız adını
   söylemeniz de yeterli.)*
8. **Logs** → `/blog*` istek sayısı ve bot/insan dağılımı.
9. **Analytics** → son 30 gün, rota bazında sayfa görüntüleme
   (`@vercel/analytics` zaten kurulu — B10).
10. **Deployments** → Kasım ayındaki production dağıtım sayısı.

### 9.3 Diğer

11. **Google Search Console → Ayarlar → Tarama istatistikleri:** günlük tarama
    isteği sayısı ve yanıt kodu dağılımı.
12. `/api/health`'i çağıran bir izleme servisi var mı? (varsa adı ve aralığı)

Vercel MCP'ye `/mcp` ile yetki verilirse 7–10 arasını kendim ölçebilirim.

---

## 10. Sekiz soruya net cevaplar

**1) 96,3 CU-saati ne tüketti?**
Baskın kaynak, 19–20 Kasım'a kadar yürürlükte olan **zaman tabanlı yeniden
üretim** ayarıdır: `site_settings` önbelleğine verilen `revalidate: 60`, bu değeri
31 public rotanın 28'ine taşıyordu; gelen her istek dakikada bir yeniden üretim
tetikliyor, her yeniden üretim veritabanını uyandırıyordu. Veritabanı böylece
neredeyse hiç uyumadı. 1–20 Kasım penceresinde 7/24 uyanıklık **118 CU-saat**
eder; ölçülen 96,3 bunun %82'sidir — yani bu tek kalem tüketimi **tek başına**
açıklar. Katalog çalışmanızın payı **~6 CU-saat** (%6) mertebesindedir.
*(Günlük kırılım ölçülemedi — §9.1.1 bunu kesinleştirir.)*

**2) Bu tüketim normal mi?**
**Hayır.** 157 ürünlü, düşük trafikli bir kurumsal site ücretsiz paketin
tamamına yakınını tüketmemeli. Normal seviye, §6.2 A hâli tablosuna göre
**ayda 8–20 CU-saat** mertebesidir. Tüketim trafikten değil, bir yapılandırma
hatasından doğdu.

**3) Gereksiz tüketim var mı?**
**Evet, tüketimin büyük kısmı gereksizdi.** Dakikada bir yeniden üretilen içerik
dakikada bir değişmiyordu (toggle'lar ve blog yazıları haftalarda bir değişiyor).
Hâlâ açık olan gereksizlikler: 48 önbelleklenmeyen blog adresi (B1), render
başına ikiye katlanan blog sorgusu (B5), 60 saniyelik ürün API önbelleği (B9) ve
üretime 5 dakikalık uyanıklık penceresi açan tek tek script çalıştırmaları (B3).

**4) En büyük tüketim kaynakları hangileri?**
Sırayla: **(1)** zaman tabanlı ISR (düzeltildi), **(2)** önbelleklenmeyen 48 blog
adresi — tarama ve ziyaret kaynaklı sürekli uyandırma, **(3)** yönetim paneli
oturumları, **(4)** üretime bağlanan araştırma script'leri, **(5)** dağıtım
build'leri. Doğrulanmayı bekleyen ve doğrulanırsa listenin başına geçecek kalem:
`/api/health`'in dış izleyici tarafından ping edilmesi (B4).

**5) Optimizasyon sonrası tahmini aylık tüketim?**
Bugünkü trafikle, B1 + B4 + B9 uygulandığında **ayda 8–20 CU-saat** (100'ün
%8–20'si). 5.000 ürün ve günlük 1.000 ziyaretçi ile **~19 CU-saat.** Varsayımlar
§6.2'de.

**6) Ücretsiz paketle devam edebilir miyiz?**
**Evet** — B1 çözülür ve B4 doğrulanıp gerekirse düzeltilirse, 5.000 ürün ve
günlük binlerce ziyaretçi dahil ücretsiz paket yeterlidir. **Bu ayın kalanı**
için risk ayrıdır: kalan 3,7 CU-saat ≈ ~15 uyanık saat; B1 dağıtılmazsa kapasite
ay sonundan önce bitebilir (§7'de dört seçenek).

**7) 5.000 ürün için Neon yeterli mi?**
**Yeterli.** Depolama tarafında fazlasıyla (tahmini 36 MB / 1 GB). Compute
tarafında yeterliliğin şartı mimaridir: ürün sayfaları build/ISR ile üretilip
CDN'den servis edilirse (B8) ve parça numarası aramasına indeks eklenirse (B7),
5.000 ürün ücretsiz paket içinde kalır. Bu iki madde yapılmazsa Google'ın
5.000 adresi taraması tek başına **~104 CU-saate** kadar çıkabilir.

**8) Şu anda acilen ne yapmamız gerekiyor?**
Bugün, sırayla: **(a)** üretim veritabanına script çalıştırmayı durdurmak ve
paneli gereksiz açık bırakmamak (B3 — kalan kapasiteyi korur); **(b)** §9.1'deki
Neon ekranlarını almak — özellikle **günlük CU-saat grafiği** ve **fatura dönemi
başlangıç tarihi**; **(c)** `/api/health`'i çağıran bir izleme servisi olup
olmadığını söylemek (B4); **(d)** B1 düzeltmesine onay vermek. Ayrıca B2'nin
**bugün** yapılması önerilir: kapasite biterse teklif talepleri sessizce
kaybolur ve bunu fark etmenin bir yolu yoktur.

---

## 11. Bu denetimde yapılmayanlar

Talimata uygun olarak: üretim veritabanında **hiçbir yazma işlemi** yapılmadı,
migration çalıştırılmadı, branch silinmedi, compute ayarı değiştirilmedi, ücretli
pakete geçilmedi, yük testi ve ağır sorgu çalıştırılmadı, katalog çalışmasına
dokunulmadı, **hiçbir proje dosyası değiştirilmedi** (yalnızca bu rapor yazıldı).
Bağlantı adresleri, parolalar ve anahtar değerleri hiçbir çıktıya yazılmadı —
`.env` dosyaları yalnızca **anahtar adı** düzeyinde incelendi.

### Kaynaklar

- [Neon — Plans](https://neon.com/docs/introduction/plans)
- [Neon — Pricing](https://neon.com/pricing)
- [Neon — Free plan limits and quotas (FAQ)](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Neon — Autoscaling](https://neon.com/docs/introduction/autoscaling)
- [Neon — Scale to zero](https://neon.com/docs/introduction/scale-to-zero)
- [Neon — About billing](https://neon.com/docs/introduction/about-billing)
