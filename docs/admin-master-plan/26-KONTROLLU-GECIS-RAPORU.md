# NİDAH GROUP — Kontrollü Canlıya Geçiş Raporu (B1 + B2 + Aşama 3)

**Tarih:** 25 Kasım 2026
**Kapsam:** Neon tüketim optimizasyonu (B1), teklif talebi dayanıklılığı (B2),
sağlık kontrolü ayrımı, 5.000–50.000 ürünlük katalog altyapı hazırlığı
**Durum:** B1 + B2 + health **canlıda**. Aşama 3 geliştirmeleri **commit edildi, push EDİLMEDİ** — onayınızı bekliyor.

---

## 0. Yönetici Özeti (teknik bilgi gerektirmez)

### Şu anda neredeyiz?

Sitede, veritabanının gereksiz yere "uyanık" kalmasına yol açan yapı
düzeltildi ve **canlıya alındı**. Teklif formu artık veritabanı tamamen
erişilemez olsa bile talebi size e-posta ile ulaştırıyor. Site çalışıyor;
ölçülebilen bütün SEO değerleri (sitemap, yönlendirmeler, canonical,
hreflang, kapalı sayfaların gerçek 404'ü) deploy sonrası tek tek kontrol
edildi ve **hiçbiri bozulmadı**.

### Neleri tamamladık?

1. **Blog ve ürün sayfaları artık her ziyaretçide veritabanına inmiyor.**
   Veriyi bir kez okuyup saklıyor; yalnızca yönetim panelinden bir değişiklik
   yapıldığında yeniden okuyor. Yerelde ölçtük: tekrar isteklerde veritabanı
   sorgusu **sıfır**.
2. **Teklif talebi artık kaybolmuyor.** Eskiden veritabanı erişilemezse
   müşteri "sunucu hatası" görüyor ve size hiçbir bildirim gitmiyordu. Artık
   talep e-posta ile geliyor; konu satırı "⚠️ KAYITSIZ TEKLİF" diyor, yani
   panelde görünmeyeceğini ve elle işlenmesi gerektiğini açıkça söylüyor.
3. **İki kanal da çalışmıyorsa müşteriye asla "alındı" demiyoruz.** O durumda
   WhatsApp ve e-posta adresimizi veren bir hata mesajı gösteriliyor.
4. **Aynı talebin iki kez gelmesi** (çift tıklama, sayfa yenileme, farklı
   sunucu örnekleri) artık tek kayıt ve tek e-posta üretiyor.
5. **Sağlık kontrolü** (`/api/health`) artık veritabanını uyandırmıyor.
6. **5.000–50.000 ürün için asıl hazırlık yapıldı** (henüz yayına
   alınmadı): ürün sayfaları ilk ziyaretten sonra hazır sayfa olarak
   saklanıyor, Google binlerce sayfayı tararken veritabanına hiç inilmiyor.

Bunların yanında yol üstünde bulunan **iki gerçek hata** da düzeltildi:
- E-posta servisi bir gönderimi reddettiğinde eski kod bunu "gönderildi"
  sayıyordu. Artık reddi görüyor ve gerekiyorsa yeniden deniyor.
- Forma yazılan metin e-posta içeriğine ham gömülüyordu (içerik
  manipülasyonu riski). Artık kaçışlı gömülüyor.

### Bu çalışmada ne kazandık?

Tüketimin asıl sebebi **ziyaretçi sayısı değil, veritabanının uyanık kalma
süresiydi**. Her istek veritabanına indiğinde 5 dakikalık uyanık pencere
yeniden başlıyordu; sürekli tarama alan bir sitede bu, veritabanının hiç
uyumaması demek. Artık normal ziyaretçi ve Google trafiği veritabanına
inmiyor. Veritabanına yalnızca **panelden içerik değiştirdiğinizde** ve
henüz hiç görüntülenmemiş bir sayfanın ilk açılışında iniliyor.

**Dürüst sınır:** iyileşmenin gerçek büyüklüğü ancak Neon panelindeki
**önümüzdeki 24–48 saatlik** tüketim grafiğiyle ölçülebilir. Bugünkü
rakamlardan "şu kadar CU-saat kazandık" demek tahmin olur; tahmini ölçüm
gibi sunmuyorum. §6'da hangi ekranı ne zaman kontrol etmeniz gerektiğini
yazdım.

### Canlı sitemiz sorunsuz çalışıyor mu?

Evet — ölçülen kadarıyla. Deploy sonrası kontrol edilenler: sitemap 63 URL
(katalog 0, tekrar 0), `/blog/tr → /blog` ve `/en/blog → /blog/en` 308,
kapalı katalog sayfaları gerçek 404, ana sayfada canonical tam 1, blog
yazısında 5 hreflang bağı ve geçerli JSON-LD tarihleri, `/api/health`
veritabanına dokunmuyor. Teklif formu canlıda 200 döndü.

### Neon'a para ödememiz gerekiyor mu?

**Şu an gerekmiyor.** Kalan 3,14 CU-saat 1 Aralık'ta sıfırlanıyor ve ücretsiz
paket 100 CU-saat'e dönüyor. Depolama tarafında da yer bol: ücretsiz paket
proje başına 1 GB veriyor, biz 33,54 MB kullanıyoruz; 50.000 ürünlük bir
katalog bile modele göre ~330 MB (§10).

**Asıl maliyet riski Neon değil, ürün fotoğrafları.** 50.000 ürün × 3 fotoğraf
Cloudinary'nin ücretsiz paketini (25 kredi/ay) aşar. İlk para istenecek yer
burasıdır, veritabanı değil (§10.4).

### 5.000 ürünü yayınlamaya hazır mıyız?

**Teknik altyapı tarafında büyük ölçüde hazır** — ama iki şartla:

1. Aşama 3 commit'i (ürün sayfalarının hazır sayfa olarak saklanması)
   **yayına alınmalı**. Onayınızı bekliyor. Bu olmadan 5.000 ürün sayfası
   Google tarafından taranırken her istek sunucuyu çalıştırır.
2. Yayın öncesi **bir kerelik "önbellek ısıtma"** yapılmalı (§10.3): ürün
   sayfaları kontrollü bir pencerede bir kez gezilir, sonrasında tarama
   trafiği veritabanına hiç inmez. Bu adım atlanırsa, Google 5.000–50.000
   sayfayı haftalar boyunca yavaş yavaş tararken veritabanı sürekli uyanık
   kalabilir — tam da bu ayki sorunun tekrarı olur.

Ayrıca **yayının asıl kapısı altyapı değil, içerik**: doğrulanmış fotoğraf
sayısı hâlâ 0 (bkz. rapor 19). Altyapı hazır olsa da ürünler fotoğraf turu
tamamlanmadan yayına girmiyor.

### Bundan sonra ne yapacağız?

1. Neon panelinden §6'daki ekran görüntülerini alın (en önemlisi 24 saat
   sonraki tüketim grafiği).
2. Posta kutusunu kontrol edin: gönderdiğim TEST talebinin e-postası geldi mi
   (§5). Bunu ben doğrulayamıyorum.
3. Aşama 3 commit'inin yayına alınmasını onaylayın.
4. 5.000 ürün yayınından **önce** trigram migration'ı (§12) ve önbellek
   ısıtmayı planlayın.

---

## 1. Tamamlanan işlemler

| # | İş | Durum |
|---|---|---|
| 1 | Git diff denetimi, ilgisiz katalog değişikliklerinin ayrılması | ✅ |
| 2 | `tsc`, `eslint`, `build`, ISR yazma koruması | ✅ |
| 3 | Önbellek geçersiz kılma — ürün ekle / güncelle / sil | ✅ ölçüldü |
| 4 | RFQ mükerrer koruması — eşzamanlı istek | ✅ ölçüldü |
| 5 | RFQ mükerrer koruması — ayrı serverless örnekleri | ✅ ölçüldü |
| 6 | DB kapalıyken e-posta mükerrer riski | ✅ çözüldü (`Idempotency-Key`) |
| 7 | İki kanalın ayrı ayrı başarısız olduğu senaryolar | ✅ ölçüldü |
| 8 | Yanlış başarı mesajı kontrolü | ✅ ölçüldü |
| 9 | Gerçek Resend testi | ⚠️ kısmen — §5 |
| 10 | Commit + push + production deploy | ✅ |
| 11 | Deploy sonrası doğrulama (minimum istek) | ✅ |
| 12 | Toggle / 404 / sitemap / SEO korunumu | ✅ ölçüldü |
| 13 | `/api/health` Neon'u uyandırmıyor | ✅ canlıda ölçüldü |
| 14 | Aşama 3: `generateStaticParams` ISR | ✅ geliştirildi, **yayına alınmadı** |
| 15 | Aşama 3: arama önbelleğinin sınırlandırılması | ✅ geliştirildi, **yayına alınmadı** |
| 16 | Trigram migration değerlendirmesi | ✅ hazır, **uygulanmadı** |
| 17 | Dev rolü ETIMEDOUT araştırması | ✅ çözüldü — §13 |
| 18 | Geçici test verisi temizliği | ✅ doğrulandı |
| 19 | Kapasite ve maliyet senaryoları | ✅ §10 |

---

## 2. Değiştirilen dosyalar

### Canlıda (push edildi)

| Commit | Dosya | İçerik |
|---|---|---|
| `60e0464` | **56 dosya** | B1 önbellek: 17 blog rotası, 4 blog bileşeni, marka katalog sayfası, `lib/queries/product.ts`, 2 public ürün API'si, 4 yeni önbellek/geçersiz kılma modülü, 28 admin yazma yolu, `lib/catalog.ts`, `lib/db/index.ts` |
| `0302da6` | **2 dosya** | B2: `api/rfq/route.ts`, `lib/email/index.ts` |
| `6ac35c7` | **4 dosya** | `api/health/route.ts`, `drizzle/0014_part_search_trgm.sql`, rapor 24, rapor 25 |

### Commit edildi, YAYINA ALINMADI (onay bekliyor)

| Commit | Dosya | İçerik |
|---|---|---|
| `dd70e5c` | **6 dosya** | Aşama 3: `parca-katalog/[slug]`, `blog/[slug]`, `blog/{en,ru,ar}/[slug]` → `generateStaticParams`; `api/products/route.ts` → önbellek anahtar sınırları |

### Commit'e DAHİL EDİLMEYENLER (katalog çalışması — bilinçli)

`docs/admin-master-plan/01-BULGU-DURUM.md`, `19-ESIK-KALDIRMA-UYGULAMA-RAPORU.md`
(değişiklikler), `docs/10–23` ve `scripts/faz3-*` (45 dosya), `scripts/aktarim-154-urun.sql`.
Bunlar mevcut katalog araştırma/yayın çalışmasına ait; hiçbirine dokunulmadı.

### Yeni modüller

| Dosya | Görevi |
|---|---|
| `src/lib/blog-cache.ts` | Blog okumaları için etiket tabanlı sarmalayıcı + `Date → ISO` yardımcıları |
| `src/lib/product-cache.ts` | Ürün okumaları için aynısı |
| `src/lib/blog-taxonomy-cache.ts` | Kategori/etiket çözümlemesi (istemci paketini kirletmemek için ayrı modül) |
| `src/lib/revalidate-public.ts` | Geçersiz kılmanın **tek otoritesi** |
| `drizzle/0014_part_search_trgm.sql` | Trigram indeksleri (uygulanmadı) |

---

## 3. Commit ve deployment bilgileri

| | |
|---|---|
| Dal | `main` (force push / amend / rebase / merge yok) |
| Geri dönüş çapası | `d91764a` (öncesi HEAD) |
| Canlıdaki son commit | `6ac35c7` |
| Yayına alınmayan commit | `dd70e5c` |
| Deploy | GitHub → Vercel otomatik (manuel `vercel --prod` çalıştırılmadı) |
| Deploy kanıtı | Ana sayfa `Age: 412130` → **`Age: 0`, `X-Vercel-Cache: PRERENDER`**; `/api/health` artık `depth: "shallow"` döndürüyor (yeni kodun kesin imzası) |
| Migration | **Çalıştırılmadı** |
| Neon paketi / compute ayarı | **Değiştirilmedi** |
| Yeni ücretli servis | **Yok** |

Yan not: deploy öncesi ana sayfanın `Age` değeri 412.130 saniye (≈4,8 gün) idi.
Bu, 20 Kasım deploy'undan beri ana sayfanın **bir kez bile** yeniden
üretilmediğini bağımsız olarak doğruluyor — yani 19 Kasım'daki
`revalidate: 60` düzeltmesi gerçekten tutmuş.

---

## 4. Test sonuçları

### 4.1 Statik kontroller

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | **Temiz** |
| `npx eslint .` | **34 sorun (19 error, 15 warning)** — belgelenmiş baseline 38 (19/19). Hata sayısı artmadı, uyarı sayısı azaldı |
| `npm run build` | **Başarılı** |
| ISR yazma koruması | **36/36 prerender rotası süreyle eskimiyor** (öncesi 31/31) |
| `prerender-manifest.json` | 31 prerender rotası + 5 dinamik ISR şablonu; `initialRevalidateSeconds !== false` olan rota sayısı **0** |

### 4.2 Önbellek — ürün ekle / güncelle / sil (yerel, soğuk `.next/cache`)

Ölçüm yöntemi: `DB_QUERY_LOG=1` ile Drizzle sorgu günlüğü; istek başına
`^Query:` satırı sayıldı.

| Adım | DB sorgusu | Sonuç |
|---|---|---|
| `GET /api/products` 1. istek | **4** | — |
| `GET /api/products` 2. istek | **0** | önbellekten |
| **Ürün EKLE** (`POST /api/admin/products` → 201) | — | — |
| sonraki `GET /api/products` | **4** | yeni ürün listede: **EVET** |
| tekrar `GET /api/products` | **0** | yine önbellekten |
| `GET /api/products/<pn>` 1. / 2. istek | **4 / 0** | — |
| **Ürün GÜNCELLE** (`PATCH` → 200) | — | — |
| sonraki `GET /api/products/<pn>` | **4** | ad = yeni değer |
| **Ürün SİL** (`DELETE` → 200) | — | — |
| sonraki `GET /api/products/<pn>` | **1** | **http 404** (doğru) |
| sonraki `GET /api/products` | **4** | silinen ürün listede: **HAYIR** |

Üç yazma işleminin üçünde de geçersiz kılma doğru çalıştı.

Ek düzeltme: ürün `DELETE` yolunda parça numarası artık **silmeden önce**
okunuyor; silindikten sonra okunamadığı için o ürünün detay sayfası yolu
ayrıca düşürülemiyordu. Ürün sayfaları ISR'ye alındığında (Aşama 3) bu fark
görünür hâle gelirdi.

### 4.3 RFQ dayanıklılığı (yerel, gerçek Resend yerine yerel saplama)

Kurulum: iki ayrı Next.js süreci (biri çalışan DB, ikisi erişilemez DB) ve
`RESEND_BASE_URL` ile yerel bir e-posta saplaması. **Dışarıya hiçbir e-posta
gönderilmedi.** Rate limit'i aşmamak için her senaryo farklı
`x-forwarded-for` kullandı.

| Senaryo | Beklenen | Ölçülen |
|---|---|---|
| A — DB ✅, e-posta ✅ | 200, 2 e-posta | **200**, yönetici + müşteri; idempotency anahtarları mevcut |
| B — **eşzamanlı** çift gönderim (aynı örnek) | tek iş | iki istek de **200**, toplam e-posta **2** (4 değil) |
| C — ardı ardına çift gönderim (3 dk) | tek kayıt | toplam e-posta **2** |
| D — **DB ❌**, e-posta ✅ | 200 + uyarı | **200**; konu **"⚠️ KAYITSIZ TEKLİF"**, gövdede "panelde görünmeyecek" uyarısı, talep kimliği satırı |
| E — DB ❌, **ayrı iki süreç**, aynı talep | tek teslim | iki süreç de gönderdi, **anahtarlar aynı**, ikinci istek saplama tarafından **mükerrer** olarak tanındı → Resend ikinci e-postayı göndermez |
| F — DB ❌ + e-posta ❌ (500) | 503, yanlış başarı yok | **503**, "WhatsApp / e-posta ile iletin"; 3 deneme × 2 e-posta = 6 istek |
| G — e-posta kalıcı hata (422) | yeniden deneme yok | **503**, **tek** deneme |
| H — e-posta geçici hata (429) sonra başarı | yeniden dene | **200**, 2 deneme |
| I — rate limit (5/15 dk) | 6. istek 429 | 1–5 **200**, 6–7 **429** |
| J — honeypot / geçersiz şema | reddedilsin | **400** (ikisi de) |
| K — e-posta HTML'ine script enjeksiyonu | kaçışlı | ham `<script` / `<img ` **yok**, `&lt;script&gt;` var |

### 4.4 Aşama 3 — ISR ve SEO regresyonu (yerel)

| Kontrol | ÖNCE | SONRA |
|---|---|---|
| Ürün detay `Cache-Control` | `private, no-cache, no-store` | **`s-maxage=31536000`** |
| Ürün detay `x-nextjs-cache` | (yok) | **MISS → HIT** |
| Ürün detay tekrar isteğinde DB sorgusu | her istek | **0** (5 ardışık istek) |
| Blog yazısı | `no-store` | **`s-maxage=31536000`** |
| Build çıktısı | `ƒ (Dynamic)` | **`● (SSG)`** |
| **Toggle KAPALI → ürün sayfası** | 404 | **404** (soft-404 değil) |
| Toggle KAPALI → `/parca-katalog`, `/catalog` | 404 | **404** |
| Toggle KAPALI → sitemap katalog URL | 0 | **0** |
| Toggle TEKRAR AÇIK → sayfalar | 200 | **200** (önbellekteki 404 düştü) |
| Admin'den ürün adı değişti → ISR sayfası | — | **yeni ad ilk istekte göründü** |

Arama önbelleği sınırları:

| İstek | Sonuç |
|---|---|
| `?page=999999` | sayfa **500**'e sıkıştı |
| `?search=...` | arama **yok sayıldı** (harf/rakam yok) |
| `?search=a` | yok sayıldı (2 karakterden kısa) |
| `?condition=zararli-deger` | **null**'a indirildi (önbelleğe gitmeden doğrulanıyor) |
| `?search=60325-08300` | gerçek arama, 1 sonuç |

### 4.5 Deploy sonrası canlı doğrulama (minimum istek)

| Kontrol | Sonuç |
|---|---|
| `/api/health` | `depth: "shallow"`, `database: "skipped"`, `Cache-Control: no-store` → **Neon'a dokunmuyor** |
| `/api/health?deep=1` | `database: "ok"` (bilinçli tek sorgu) |
| `sitemap.xml` | **63 URL**, katalog 0, tekrar 0, `application/xml` |
| `/parca-katalog`, `/parca-katalog/volvo`, `/catalog` | **404 / 404 / 404** |
| `/blog/tr`, `/en/blog` | **308 / 308** |
| Ana sayfa | canonical **1**, `Organization` **1**, katalog bağı **0** |
| `/blog` | 200 |
| `/blog/motor-greyder-nedir` | 200, canonical 1, **5 hreflang** (`tr/en/ru/ar/x-default`), `BlogPosting` 1, `BreadcrumbList` 1, `datePublished` ve `dateModified` geçerli ISO |
| `/blog/en/what-is-a-motor-grader` | aynı sonuçlar |
| `/api/products` | `X-Vercel-Cache: MISS → HIT` (CDN 600 sn devrede) |
| Teklif formu | **200** |

`datePublished` kontrolü özellikle önemliydi: önbellek sınırından geçen
`Date` değerleri dizeye dönüşüyor; dönüşüm ele alınmasaydı JSON-LD tarihleri
canlıda boş kalacaktı.

### 4.6 Test verisi temizliği

| Veri | Durum |
|---|---|
| Dev DB sentetik teklif satırı | 10 → **0** (silindi) |
| Dev DB test ürünü (`TEST-NEON%`) | **0** |
| Dev DB ürün sayısı | **166** (başlangıçla aynı) |
| Dev DB blog / ayar satırı | 0 / 0 (başlangıçla aynı) |
| Yerel test sunucuları (3100–3105, 3201) | **tamamı kapatıldı** |
| Production DB'ye yazma | **yok** (tek istisna: §5'teki TEST teklif kaydı) |

---

## 5. Gerçek Resend e-posta testi sonucu

**Kısmen yapıldı. Teslim teyidi sizde.**

Önce engel: `.env.local` içindeki **`RESEND_API_KEY` ve `ADMIN_EMAIL` boş**.
Yani yerelden gerçek e-posta göndermek teknik olarak mümkün değil. (Not:
proje `CLAUDE.md` §4 "RESEND_API_KEY yerelde tanımlı olduğu için gerçek
e-posta gönderilir" diyor — bu **artık doğru değil**. CLAUDE.md değişikliği
ayrı onay gerektirdiği için dosyaya dokunmadım, bildiriyorum.)

Bu nedenle testi deploy sonrası **canlı** ortamda yaptım:

- Gönderilen: **tek** teklif talebi, `POST /api/rfq`
- Ad alanı: `TEST - ALTYAPI DOGRULAMASI (islem gerekmez)` → yönetici
  e-postasının konusu bu metni taşır, yani kutuda açıkça TEST olarak görünür
- Mesaj gövdesi: "BU BIR TESTTIR … Gerçek bir müşteri talebi DEĞİLDİR;
  işlem yapılmasına gerek yoktur."
- Alıcı: `bilgi@nidahgroup.com.tr` — hem müşteri makbuzu hem yönetici
  bildirimi bu şirket adresine gider. **Gerçek bir müşteriye e-posta
  gönderilmedi.**
- Yanıt: **HTTP 200**, `{"success":true}`
- Ardından aynı talep **ikinci kez** gönderildi → yine 200, ve yanıt süresi
  1,59 s'den 0,92 s'ye düştü; bu, mükerrer korumasının devreye girip e-posta
  göndermeden döndüğüne işaret eder.

**Doğrulayamadıklarım — açıkça söylüyorum:**

1. **E-postanın kutuya düştüğünü göremiyorum.** 200 yanıtı "kayıt VEYA
   e-posta başarılı" demektir; production veritabanı çalıştığı için kayıt
   düşmüş olabilir ve 200 tek başına e-postanın gittiğini kanıtlamaz. Vercel
   fonksiyon loglarına erişimim yok (Vercel CLI kurulu değil, Vercel MCP
   yetkilendirilmemiş), Gmail bağlantısı da geçersiz durumda.
2. **İkinci isteğin gerçekten kayıt açmadığını** panelden teyit etmek
   gerekiyor.

**Sizden gereken:** `bilgi@nidahgroup.com.tr` kutusunda
**"🔔 Yeni Teklif: TEST - ALTYAPI DOGRULAMASI…"** konulu e-postayı arayın.
Bir tane mi geldi, iki tane mi? Yönetim panelindeki Teklifler listesinde de
`TEST-0000` parça numaralı **kaç kayıt** olduğuna bakın. Beklenen: **1
e-posta çifti (yönetici + makbuz) ve 1 kayıt.** Kayıt panelden silinebilir;
veri silme ayrı onay gerektirdiği için ben dokunmadım.

---

## 6. Neon panelinden almam gereken ekran görüntüleri

Modelin doğrulanması için aşağıdakiler gerekiyor. **En kritik olan 1. ve 2.
maddedir ve ikisi de "24 saat bekleyip" alınmalıdır.**

**6.1 — Tüketim grafiği, 26 Kasım (bugünden 24 saat sonra)**
Neon Console → projeyi seçin (`nidah_group_web`) → **Monitoring** → **Compute**
→ zaman aralığı **son 24 saat**. Aradığım: deploy saatinden (25 Kasım ~07:40
UTC) sonraki aktif süre. Beklenen: aktif süre dilimlerinin **belirgin şekilde
seyrekleşmesi**. Bu tek ekran, "ne kadar kazandık" sorusunun tek dürüst
cevabı.

**6.2 — Kümülatif tüketim, 1 Aralık sonrası**
Yeni fatura döneminin ilk 3–4 gününde **Billing → Usage** ekranı. 100 CU-saat'in
yüzde kaçının yakıldığı. Kasım'da 25 günde %96,9 yakılmıştı; Aralık'ta aynı
takvim gününde çok daha düşük bir oran görmemiz gerekir.

**6.3 — Branch ve compute ayarları**
Proje → **Branches** → production branch → compute detayı. İhtiyacım olan:
min CU, max CU, **scale-to-zero süresi** ve branch sayısı. (Siz 0,25 / 2 CU
ve otomatik uyku dediniz; ekran görüntüsü bunu kayda geçirir.)

**6.4 — `nidah-dev` projesinin tüketimi**
`nidah-dev` → Monitoring → Compute, son 30 gün. Bu proje **ayrı** bir 100
CU-saat kotasına sahiptir; yerel geliştirme oradan yiyor. Doğrulamak istediğim:
dev projesinin kotasının ne kadarının kullanıldığı.

**6.5 — Son 30 gün (geçmiş)**
`nidah_group_web` → Monitoring → Compute → **son 30 gün**. Bu, Kasım'daki
96,9 CU-saat'in günlere nasıl dağıldığını gösterir. 19–20 Kasım'daki
`revalidate: 60` düzeltmesinden sonra günlük tüketimde bir **kırılma**
görünüyorsa, denetimdeki kök neden analizi ölçümle doğrulanmış olur.
(Bu grafik olmadan kök neden **model** düzeyinde kalır — denetim raporunda da
böyle etiketlenmiştir.)

**6.6 — Vercel tarafı (Neon değil)**
Vercel → proje → **Logs**, filtre `/api/health`. Aradığım: düzenli aralıklı
dış istek var mı (uptime monitörü). Varsa onu `?deep=1` olmadan çağırdığından
emin olmak gerekir — yoksa Neon'u uyandırmaya devam eder.

**6.7 — Google Search Console**
Ayarlar → **Tarama istatistikleri**. 5.000 ürün yayınından önce Google'ın
günlük tarama hızını bilmek gerekiyor; §10.3'teki ısıtma penceresi buna göre
planlanır.

---

## 7. Optimizasyon öncesi ve sonrası karşılaştırma

| | ÖNCE | SONRA |
|---|---|---|
| `/blog/<yazı>` istek başına DB sorgusu | 6 | **0** |
| `/blog/kategori/<slug>` | 7 | **0** |
| `/parca-katalog/<parça>` | 5 | **0** |
| `/parca-katalog/volvo` | 4 | **0** |
| `/api/products` | 4 | **0** |
| `/api/health` | 1 | **0** (derin modda 1) |
| `/api/products` CDN ömrü | 60 sn | **600 sn** |
| Public rotalarda `force-dynamic` | 48/63 URL | **0** |
| Ürün detay sayfası (Aşama 3) | `no-store`, her istek render | **`s-maxage=31536000`, MISS→HIT** |
| Blog yazısı (Aşama 3) | `no-store` | **`s-maxage=31536000`** |
| Prerender rotası | 31 | **36** |
| Süreyle eskiyen rota | 0 | **0** (korundu) |
| DB erişilemezken teklif talebi | **HTTP 500, e-posta yok, talep kayıp** | **HTTP 200 + "⚠️ KAYITSIZ TEKLİF" e-postası** |
| İki kanal da kapalıyken | 500, "sunucu hatası" | **503 + WhatsApp/e-posta yönlendirmesi** |
| Eşzamanlı çift gönderim | 2 kayıt + 4 e-posta riski | **1 kayıt + 2 e-posta** |
| Ayrı örneklerden çift gönderim (DB ❌) | koruma **yok** | **`Idempotency-Key`** |
| Resend reddi | **"gönderildi" sayılıyordu** | yakalanıyor, geçicilerde yeniden deneniyor |
| E-posta HTML'i | kullanıcı girdisi **ham** | **kaçışlı** |
| Parça no arama | `ch76281` ≠ `CH 76281` | **eşleşiyor** (normalize kolon) |
| Arama önbelleği anahtar uzayı | **sınırsız** | sayfa ≤500, arama ≤32 karakter, durum 4 değer |

---

## 8. Neon tüketiminde beklenen iyileşme

**Bu bölümün tamamı MODEL'dir, ölçüm değildir.** Gerçek değer §6.1'deki
grafikle belirlenecek.

Hesap mantığı: tüketim = compute boyutu × uyanık süre. 0,25 CU'da bir saat
uyanık kalmak 0,25 CU-saat eder. Tek başına duran bir "uyandırma" en az 5
dakika uyanıklık demektir → **0,0208 CU-saat**. 100 CU-saat ≈ birbirinden
bağımsız **4.800 uyandırma** ya da **400 saat** kesintisiz uyanıklık.

| Senaryo | Uyandırma kaynağı | Model |
|---|---|---|
| ÖNCE | her ziyaretçi + her bot isteği | sürekli uyanık → ayda ~180 CU-saat üst sınır |
| ŞİMDİ (B1 canlıda) | admin yazmaları + ilk render'lar + derin health | **ayda ~5–20 CU-saat** |
| Aşama 3 sonrası | yalnızca admin yazmaları + ısıtılmamış sayfaların ilk render'ı | **ayda ~3–10 CU-saat** |

Modelin en zayıf varsayımı: panelde geçirilen süre. İki saatlik kesintisiz
bir içerik düzenleme oturumu tek başına **0,5 CU-saat** yakar — ve bu
kaçınılmazdır, panel veritabanına inmek zorundadır. Ayda 20 saat panel
çalışması ≈ 5 CU-saat. Yani yeni tabandaki en büyük kalem büyük olasılıkla
**ziyaretçi değil, sizin panel kullanımınız** olacak; bu da iyi haber,
çünkü öngörülebilir ve 100 CU-saat'in çok altında.

---

## 9. Vercel performans ve maliyet değerlendirmesi

### Performans (canlı ölçüm)

| Rota | Süre | CDN |
|---|---|---|
| `/` | — | `HIT`, `Age` artıyor |
| `/sitemap.xml` | — | `HIT` |
| `/api/products?limit=5` | 0,51 s → 0,19 s | `MISS → HIT` |
| `/blog` | 0,46–0,56 s | **her zaman MISS** (dinamik) |
| `/api/health` (sığ) | ~0,33–0,38 s | `no-store` |
| `/api/health?deep=1` | ~0,31–0,34 s | `no-store` |

**Ölçülemeyen:** Vercel tarafında **veri önbelleğinin** gerçekten çalıştığını
dışarıdan kanıtlayamadım. Sığ ve derin health aynı süreyi veriyor; yani tek
bir Neon sorgusunun gecikmesi ölçüm gürültüsünün altında ve zamanlamadan
sonuç çıkarmak mümkün değil. Yerelde sorgu sayarak kanıtlandı; canlıdaki
kanıt §6.1 grafiğidir.

Dikkat: Neon sorgusunun **gecikmesi** düşük olsa da **uyandırma** etkisi
aynıdır. Maliyeti yaratan gecikme değil, uyanık kalma süresidir.

### Maliyet

Aşağıdaki Vercel rakamları **ikincil kaynaklardan** alınmıştır (Vercel'in
kendi fiyat sayfası doğrulanmadı), bu yüzden mertebe tahmini olarak okunmalı:
Hobby ayda 1M ISR okuma / 200K ISR yazma / 1M fonksiyon çağrısı içeriyor;
aşım fiyatları ~**1M fonksiyon çağrısı $0,60**, ~**1M ISR okuma $0,40**,
~**1M ISR yazma $4** mertebesinde.

Buradaki asıl değişiklik şudur: **Aşama 3 yayına alınırsa ürün sayfası
trafiği fonksiyon çağrısı olmaktan çıkıp CDN okumasına dönüşür.** Fonksiyon
çağrısı ISR okumasından ~1,5 kat pahalıdır ve çok daha yavaştır; 50.000
sayfalık bir katalogda bu fark belirleyicidir.

Yeni gider kalemi: her sayfanın ilk üretimi bir **ISR yazması**dır. 50.000
ürün = 50.000 yazma (Hobby'nin 200K aylık payının içinde; Pro'da ~$0,20).
Ancak **her deploy build kimliğini değiştirir ve tam rota önbelleğini
boşaltır**, yani sayfalar yeniden üretilir. Ayda çok sayıda deploy +
50.000 sayfa = Hobby payının zorlanması. Pratik kural: **5.000+ ürün
yayındayken deploy'ları toplu yapın**, her küçük düzeltme için ayrı deploy
çıkmayın.

---

## 10. 5.000–50.000 ürün kapasite değerlendirmesi

### 10.1 Depolama (ÖLÇÜM + model)

Ölçülen (dev DB, 166 ürün, `pg_total_relation_size`): `products` 360 kB
(2,17 kB/satır), `fitments` 216 kB (0,71 kB/satır), `product_translations`
136 kB (0,87 kB/satır).

Varsayım: ürün başına 1 ürün satırı + 2 uyumluluk + 1 çeviri + 3 OEM numarası.

| Ürün | `products` | `fitments` | çeviri | OEM | **toplam (indeks dahil)** | Neon Free 1 GB |
|---|---|---|---|---|---|---|
| 5.000 | 11 MB | 7 MB | 4 MB | 5 MB | **~30 MB** | %3 |
| 10.000 | 22 MB | 14 MB | 9 MB | 9 MB | **~57 MB** | %6 |
| 50.000 | 108 MB | 71 MB | 44 MB | 45 MB | **~270 MB** | %27 |

Trigram indeksleri eklenirse +%15–25 → 50.000 ürün ≈ **330 MB**. Buna history
(şu an 1,54 MB) ve WAL eklenir. **Sonuç: depolama 50.000 üründe bile
ücretsiz paketin sınırını zorlamıyor.**

### 10.2 Compute — ziyaretçi senaryoları (MODEL)

Önemli olan nokta: **sayfalar CDN'den servis edildiğinde ziyaretçi sayısı
Neon tüketimini neredeyse hiç etkilemez.** Aşağıdaki tablo bu yüzden
"Aşama 3 yayında" varsayar.

| Günlük ziyaretçi | Neon'a inen istek | Aylık CU-saat (model) | Ücretsiz paket |
|---|---|---|---|
| 100 | ~0 (CDN) | 3–10 (yalnız admin + ilk render) | ✅ bol |
| 1.000 | ~0 | 3–10 | ✅ bol |
| 5.000 | ~0 | 4–12 | ✅ bol |
| 10.000 | ~0 | 5–15 | ✅ bol |

Ziyaretçi tarafı değil, **Google taraması** belirleyici (§10.3).

### 10.3 Asıl risk: ilk tarama penceresi (ÖNEMLİ)

Bir ürün sayfası ilk kez istendiğinde üretilir ve o render Neon'a iner.
50.000 sayfa = 50.000 ilk render. Tek tek bakıldığında her biri küçüktür,
ama **yavaş ve sürekli** bir tarama 5 dakikalık uyku sayacını sürekli
sıfırlar: Google 50.000 sayfayı iki hafta boyunca dakikada birkaç sayfa
hızında tararsa Neon **o iki hafta boyunca kesintisiz uyanık** kalır.

> 14 gün × 24 saat × 0,25 CU = **84 CU-saat.** Yani tek başına bu pencere
> ücretsiz paketin tamamını yiyebilir. Bu, Kasım ayında yaşadığımız sorunun
> birebir tekrarıdır — sebebi farklı olsa da mekanizması aynı.

**Çözüm: kontrollü önbellek ısıtma.** Yayından hemen sonra ürün URL'lerinin
tamamı kontrollü bir pencerede bir kez istenir:

| Ürün | Hız | Pencere | Neon maliyeti |
|---|---|---|---|
| 5.000 | 10 istek/sn | ~8 dakika | ~0,04 CU-saat |
| 50.000 | 20 istek/sn | ~42 dakika | ~0,18 CU-saat |

42 dakikalık kesintisiz uyanıklık 0,18 CU-saat eder; aynı işi Google'ın iki
haftaya yayarak yapması 84 CU-saat eder. **Fark ~460 kat.** Isıtma, her
deploy'dan sonra tekrarlanmalıdır (deploy rota önbelleğini boşaltır).

Isıtma script'i henüz **yazılmadı** — Aşama 3 yayına alınmasına karar
verildiğinde yazılacak iş olarak bırakıyorum (tek dosya, yalnızca HTTP GET,
veritabanına doğrudan dokunmaz).

### 10.4 Görseller, teknik çizimler ve PDF kataloglar

Mevcut mimari **doğru**: dosyalar Cloudinary'de, veritabanında yalnızca URL
duruyor. Binary veriyi Postgres'te tutmak hem depolamayı hem yedek boyutunu
şişirirdi; buna gerek yok.

Ancak ölçek maliyeti buraya kayıyor. Cloudinary ücretsiz paket **25 kredi/ay**;
1 kredi = 1 GB depolama **veya** 1 GB bant genişliği **veya** 1.000 dönüşüm
ve hepsi aynı havuzdan düşüyor. Üretilen (resize/webp) kopyalar da depolamaya
sayılıyor.

| Ürün | Fotoğraf | Orijinal (~250 kB) | Türevlerle | Kredi (yalnız depolama) |
|---|---|---|---|---|
| 5.000 | 3/ürün | 3,8 GB | ~6 GB | ~6 / 25 |
| 10.000 | 3/ürün | 7,5 GB | ~12 GB | ~12 / 25 |
| 50.000 | 3/ürün | 37,5 GB | ~60 GB | **~60 / 25 → aşım** |

Buna bant genişliği de eklenir. **Sonuç: 10.000 ürün civarında Cloudinary
ücretsiz paketi sıkışır, 50.000'de kesin aşar.** Ekonomik seçenekler
(uygulanmadı, yalnız değerlendirme):

1. **Yükleme öncesi sıkıştırma** — 250 kB yerine 80–120 kB hedefleyin
   (1600 px uzun kenar, WebP/AVIF). Tek başına krediyi 2–3 kat düşürür.
2. **Türev sayısını sınırlayın** — `next/image` kaç farklı genişlik isterse o
   kadar türev saklanır. `sizes` değerlerini azaltmak depolamayı düşürür.
3. **PDF katalogları Cloudinary'e değil** — PDF'ler dönüşüm gerektirmez;
   Vercel Blob ya da herhangi bir statik nesne deposu daha ucuzdur.
4. **Ürün başına fotoğraf sayısını sınırlayın** — 3 değil 1–2 doğrulanmış
   fotoğraf, yayın kapısı için yeterlidir.

Bu kalemin hiçbiri bugün acil değil: doğrulanmış fotoğraf sayısı **0**.

### 10.5 Sitemap — 50.000'de bölünmesi ZORUNLU

Google tek bir sitemap dosyasında en fazla **50.000 URL** kabul eder. Şu an
63 URL var. 5.000 üründe ~5.063 (sorun yok), 10.000'de ~10.063 (sorun yok),
ancak **50.000 üründe ~50.063 URL** → sınır aşılır ve sitemap geçersiz olur.
50.000 ürüne yaklaşıldığında **sitemap index** yapısına geçilmelidir. Bu iş
henüz yapılmadı; 5.000 ürün yayını için gerekmiyor.

### 10.6 Listeleme, filtreleme, sayfalama

- `/api/products` artık önbellekli ve anahtar uzayı sınırlı (§4.4).
- **Derin sayfalama** `OFFSET` kullanıyor; `OFFSET 40000` Postgres'te
  40.000 satırı okuyup atmak demektir. Sayfa 500 sınırı bunu bir tavana
  oturttu, ama ölçeklenebilir çözüm **keyset (cursor) sayfalama**dır
  (`where created_at < :son` gibi). 50.000 ürüne gidilirken yapılacak iş.
- **Marka sayfaları hâlâ dinamik** (`?sayfa=`). `searchParams` okuyan bir
  rota CDN'de önbelleklenemez. Çözüm: sayfalamayı segmente taşımak
  (`/parca-katalog/volvo/sayfa/2`). Bu URL değişikliğidir; canonical,
  sitemap ve iç bağlantılar birlikte güncellenmeli ve ayrı SEO doğrulaması
  gerektirir. **Bilinçli olarak yapılmadı.** Neon açısından zaten güvenli
  (veri önbellekten geliyor); etkisi yalnızca Vercel fonksiyon çağrısı.
  11 markada bu kabul edilebilir.

---

## 11. Kalan sorunlar ve riskler

| # | Risk | Etki | Durum |
|---|---|---|---|
| 1 | Canlıdaki veri önbelleği etkisi **ölçülemedi** | iyileşme büyüklüğü bilinmiyor | §6.1 grafiği bekleniyor |
| 2 | Gerçek e-posta **teslimi** doğrulanamadı | B2'nin son halkası teyitsiz | §5 — posta kutusu kontrolü sizde |
| 3 | İlk tarama penceresi ısıtılmazsa kota yanabilir | **yüksek** | §10.3 — ısıtma script'i yazılmadı |
| 4 | Marka sayfaları dinamik | Vercel fonksiyon çağrısı | kabul edildi, §10.6 |
| 5 | 50.000'de sitemap 50K sınırını aşar | sitemap geçersiz | §10.5 — 5.000 için sorun değil |
| 6 | Derin sayfalama `OFFSET` | yavaş sorgu | sayfa 500 ile sınırlandı |
| 7 | Cloudinary ücretsiz paketi ~10.000 üründe sıkışır | **ilk gerçek para kalemi** | §10.4 |
| 8 | Panel dışından elle SQL ile yapılan değişiklik canlıya yansımaz | yanlış içerik yayında kalır | mimari gereği — yalnız panelden değiştirin |
| 9 | Her deploy tam rota önbelleğini boşaltır | ISR yazması + ilk render dalgası | deploy'ları toplayın |
| 10 | Mükerrer koruması `Idempotency-Key`'e dayanıyor | Resend davranışı **saplamayla** doğrulandı, gerçek API ile değil | §4.3-E |
| 11 | Honeypot 400 döndürüyor (sessiz 200 değil) | bota bilgi verir | **önceden beri böyle**, değiştirilmedi |
| 12 | Sentry istemci tarafı DSN'i yok | tarayıcı hataları görünmüyor | önceden beri böyle |
| 13 | Lint baseline 19 hata | — | artmadı, ayrı iş |

---

## 12. Trigram migration değerlendirmesi (`drizzle/0014`)

### Gereklilik

Parça numarası ve ad aramaları `LIKE '%…%'` / `ILIKE '%…%'` kullanıyor.
Bu desen **hiçbir btree indeksini kullanamaz**. Ölçüm (dev, 166 ürün):

```
Seq Scan on products (actual time=0.085..0.085 rows=0)
  Filter: part_number_normalized ~~ '%76281%' OR name ~~* '%76281%'
  Rows Removed by Filter: 166
```

166 satırda 0,1 ms — önemsiz. Ama `products` satır başına ~2,17 kB; 50.000
satır ≈ **108 MB** ve her arama bu tablonun tamamını okur. Ücretsiz paketin
0,25 CU'su ~1 GB RAM demek; tablo RAM'e sığar ama her arama yine tam tarama
yapar ve CPU yakar.

**Karar: 5.000 üründe gerekli değil, 10.000+ üründe gerekli.** Önbellek
sayesinde aynı arama ikinci kez veritabanına inmiyor; indeksin faydası
"ilk kez sorulan arama" sayısıyla doğru orantılı.

### Performans faydası (model)

`pg_trgm` GIN indeksi `%…%` desenini indeksten karşılar: tam tarama yerine
trigram eşleşen satır kümesi okunur. Beklenen: 50.000 satırda arama başına
**tam tarama → indeks taraması**, tipik olarak 10–50 kat daha az okuma.
Gerçek sayı ancak 50.000 satırlık bir veri setinde ölçülebilir; uydurmuyorum.

### Yetki (ÖLÇÜLDÜ)

```
pg_available_extensions: pg_trgm 1.6 mevcut, installed_version = null
neondb_owner : rolsuper=false, rolcreatedb=true,  rolcreaterole=true
nidah_dev    : rolsuper=false, rolcreatedb=false, rolcreaterole=false
```

`CREATE EXTENSION` **owner bağlantısıyla** çalıştırılmalıdır; `nidah_dev`
rolü bunu yapamaz. Uygulama rolünün yetkisi olmaması doğrudur ve
değiştirilmemelidir.

### Sıra bağımlılığı yok

Normalde kural "migration ÖNCE, kod SONRA"dır. Burada geçerli değil: 0014
yalnızca **indeks** ekler, kolon eklemez. Kod bu indeks olmadan da doğru
çalışır (yalnız yavaştır). Yani migration koddan önce de sonra da
uygulanabilir; acil değildir.

### Geri dönüş planı

```sql
DROP INDEX IF EXISTS idx_products_pn_norm_trgm;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_pn_raw_trgm;
DROP INDEX IF EXISTS idx_oem_number_norm_trgm;
-- Eklenti yalnızca başka hiçbir indeks kullanmıyorsa:
-- DROP EXTENSION IF EXISTS pg_trgm;
```

Dosya idempotenttir (`IF NOT EXISTS`), tekrar çalıştırmak güvenlidir.
`CREATE INDEX` (CONCURRENTLY olmadan) yazma kilidi alır; 50.000 satırda
birkaç saniye sürer, trafiği olan bir anda `CREATE INDEX CONCURRENTLY`
tercih edilmelidir.

### Öneri

**Şimdi uygulamayın.** 5.000 ürün yayınından hemen önce, owner bağlantısıyla,
ürün aktarımı tamamlandıktan sonra uygulayın (indeksi dolu tabloda bir kez
kurmak, boş tabloda kurup 5.000 kez güncellemekten hızlıdır).

---

## 13. Dev veritabanı bağlantı sorununun durumu

**Çözüldü: kalıcı bir sorun yok.**

Önceki oturumda `.env.local`'deki `DATABASE_URL` ve `NIDAH_DEV_URL`
bağlantıları ısrarla `ETIMEDOUT` veriyordu; yalnızca owner bağlantısı
çalışıyordu. Bu oturumda yapısal teşhis (gizli değer yazdırmadan):

| Bağlantı | Endpoint | Pooler | Veritabanı | DNS | TCP 443 | Sorgu |
|---|---|---|---|---|---|---|
| `DEV_OWNER_URL` | `ep-summer-dream-…` | hayır | `neondb` | ✅ | açık | **başarılı 672 ms**, rol `neondb_owner` |
| `NIDAH_DEV_URL` | **aynı** | hayır | **aynı** | ✅ | açık | **başarılı 157 ms**, rol `nidah_dev` |
| `.env.local DATABASE_URL` | **aynı** | hayır | **aynı** | ✅ | açık | **başarılı 159 ms**, rol `nidah_dev` |

Üç bağlantı aynı endpoint ve aynı veritabanına gidiyor; fark yalnızca roldür.
Dev rolü **sorunsuz çalışıyor**. Önceki `ETIMEDOUT`'lar büyük olasılıkla
**compute uykudan kalkarken** oluşan geçici zaman aşımlarıydı (ilk bağlantı
soğuk başlatmayı beklemek zorundadır). İlginç olan, owner bağlantısının ilk
sorgusunun 672 ms, sonrakilerin ~157 ms sürmesi — bu da uyandırma etkisiyle
tutarlı.

**Sonuç:** owner bağlantısı kalıcı uygulama bağlantısı olarak
**kullanılmıyor** ve kullanılmamalıdır. Yerel sunucu `.env.local`'deki
`nidah_dev` rolüyle baştan sona çalıştırıldı ve doğrulandı (katalog sayfası
`x-nextjs-cache: HIT`, tekrar isteklerde 0 sorgu). Owner bağlantısı yalnızca
migration ve `CREATE EXTENSION` için gereklidir.

---

## 14. 5.000 ürünün yayınlanmasına altyapı hazır mı?

| Bileşen | Durum |
|---|---|
| Depolama (Neon) | ✅ 5.000 ürün ≈ 30 MB / 1 GB |
| Ürün detay sayfası ölçeklenebilirliği | ⚠️ **Aşama 3 commit'i yayına alınmalı** |
| Ürün listesi / arama önbelleği | ⚠️ aynı commit |
| Parça no arama doğruluğu | ✅ normalize kolon üzerinden |
| Parça no arama **hızı** | ⚠️ 5.000'de yeterli, 10.000+ için trigram |
| Sitemap | ✅ 5.000'de ~5.063 URL, sınır 50.000 |
| Tarama penceresi | ❌ **ısıtma script'i yazılmadı** (§10.3) |
| Önbellek tazeleme (panel → site) | ✅ ekle/güncelle/sil ölçüldü |
| Teklif akışı | ✅ dayanıklı |
| Görsel altyapısı | ✅ 5.000 için yeterli (~6/25 kredi) |
| **İçerik kapısı** | ❌ doğrulanmış fotoğraf **0** (bkz. rapor 19) |

**Cevap: teknik altyapı, Aşama 3 yayına alınır ve ısıtma yapılırsa 5.000 ürün
için hazırdır.** Yayını bugün bloke eden şey altyapı değil, fotoğraf
doğrulama turudur.

---

## 15. Benden gereken işlemler ve onaylar

| # | Konu | Neden gerekli |
|---|---|---|
| 1 | **Posta kutusu kontrolü** — `bilgi@nidahgroup.com.tr`, konu "🔔 Yeni Teklif: TEST - ALTYAPI DOGRULAMASI…" | Gerçek e-posta teslimini ben doğrulayamıyorum (§5) |
| 2 | **Panelde `TEST-0000` kaydı** kaç tane? | Mükerrer korumasının canlı teyidi; kaydı silmek de ayrı onay gerektirir |
| 3 | **Aşama 3 commit'inin (`dd70e5c`) yayına alınması onayı** | Kuralınız: Aşama 3 deployment'ı ayrı onay |
| 4 | **Neon ekran görüntüleri** (§6.1–6.7) | İyileşmenin gerçek büyüklüğü ancak böyle ölçülür |
| 5 | **Trigram migration onayı** (5.000 ürün yayınından önce) | Canlı DB'de şema değişikliği |
| 6 | **Önbellek ısıtma script'i** yazılsın mı? | Yayın öncesi kritik; §10.3 |
| 7 | **CLAUDE.md §4 ve §10 düzeltmesi** onayı | §4 "yerelde gerçek e-posta gider" diyor — artık doğru değil (anahtar boş). §10 Vercel Analytics yok diyor — aslında kurulu. CLAUDE.md değişikliği ayrı onay |
| 8 | Vercel'de `/api/health` çağıran bir uptime monitörü **var mı**? | Varsa `?deep=1` kullanmamalı, yoksa Neon'u uyandırmaya devam eder |

---

## 16. Bundan sonraki çalışma planı

**Hemen (bu hafta)**
1. §6.1 grafiğini alın (26 Kasım) → iyileşmeyi ölçelim.
2. TEST e-postasını ve panel kaydını teyit edin.
3. Aşama 3 commit'ini onaylayın → push + deploy + canlıda ISR doğrulaması.

**5.000 ürün yayınından önce**
4. Önbellek ısıtma script'i (onayınızla).
5. Trigram migration (owner bağlantısı, aktarım tamamlandıktan sonra).
6. Fotoğraf doğrulama turu — yayının asıl kapısı.
7. 1 Aralık sonrası ilk hafta tüketimini izleyin (§6.2).

**10.000+ ürüne giderken**
8. Marka sayfalarında segment tabanlı sayfalama (ayrı SEO doğrulaması ile).
9. Keyset sayfalama.
10. Cloudinary sıkıştırma ve türev sayısı optimizasyonu.
11. Sentry istemci DSN'i — tarayıcı hataları şu an görünmüyor.

**50.000 ürüne giderken**
12. Sitemap index yapısı (50.000 URL sınırı).
13. PDF kataloglarını Cloudinary dışına taşımak.
14. Arama için ayrı bir indeks stratejisi (trigram yetmezse `tsvector`).

---

## Kaynaklar

Ücret ve limit bilgileri için kullanılan kaynaklar (Neon'un kendi FAQ'si
dışındakiler ikincil kaynaktır ve doğrulanmamıştır):

- [Neon — Free plan limits and quotas](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Neon — New usage-based pricing](https://neon.com/blog/new-usage-based-pricing)
- [Neon pricing 2026 (ikincil)](https://justinmckelvey.com/blog/neon-pricing)
- [Cloudinary — Billing and plans](https://cloudinary.com/documentation/billing_and_plans)
- [Cloudinary — Credits FAQ](https://cloudinary.com/documentation/developer_onboarding_faq_credits)
- [Vercel pricing 2026 (ikincil)](https://www.stork.ai/blog/vercel-pricing-2026)
- [Vercel pricing & hidden costs (ikincil)](https://schematichq.com/blog/vercel-pricing)
