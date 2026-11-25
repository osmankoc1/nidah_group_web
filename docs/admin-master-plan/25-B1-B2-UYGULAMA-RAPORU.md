# B1 + B2 Uygulama ve Test Raporu

**Tarih:** 2026-11-24 · **Dal:** `main` (commit edilmedi) · **Deploy:** YAPILMADI
**Temel denetim:** [24-NEON-TUKETIM-DENETIMI.md](24-NEON-TUKETIM-DENETIMI.md)
**Dokunulan:** 55 dosya değişti, 5 yeni dosya · `+1101 / −353` satır
**Test ortamı:** yalnızca `nidah-dev` Neon projesi ve yerel `next start`.
**Production veritabanına bu oturumda hiçbir sorgu gönderilmedi.**

---

## 0. Yönetici özeti

Dört iş tamamlandı ve **ölçülerek** doğrulandı:

1. **Blog, marka ve ürün sayfaları artık her ziyarette veritabanını
   uyandırmıyor.** Ölçüm: aynı sayfanın ikinci isteğinde sorgu sayısı
   **7 → 0**, ürün sayfasında **5 → 0**, marka sayfasında **4 → 0**.
   Veriler yalnızca yönetim panelinden bir değişiklik yapıldığında tazeleniyor
   ve bu da test edildi: panelden etiket eklendiği anda sayfa yeni veriyi
   gösterdi; panel dışından elle yapılan SQL değişikliği ise (beklendiği gibi)
   görünmedi.
2. **Teklif formu artık veritabanı çökse bile talebi kaybetmiyor.** Neon
   erişilemez durumda yapılan test gönderiminde müşteri "alındı" yanıtı aldı ve
   yönetici e-postası **"⚠️ KAYITSIZ TEKLİF"** konusuyla, gövdesinde "bu talep
   veritabanına kaydedilemedi, elle işleyin" uyarısıyla gitti. Önceki kodda bu
   senaryo 500 dönüyor ve **hiçbir e-posta gönderilmiyordu.**
3. **Sağlık kontrolü ikiye ayrıldı.** `/api/health` artık veritabanına
   dokunmuyor (ölçüm: 1 sorgu → **0 sorgu**); veritabanı kontrolü yalnızca
   `/api/health?deep=1` ile yapılıyor. Dışarıdan dakikalık ping atan bir izleme
   servisi varsa tüketimi bu tek değişiklikle sıfırlanır.
4. **5.000–50.000 ürün için hazırlık:** ürün listesi/arama sorguları
   önbelleğe alındı, parça numarası araması indekslenebilir hâle getirildi
   (migration yazıldı, **uygulanmadı**), 5.000 üründe tüm tabloyu çeken ölü bir
   sorgu düzeltildi.

**Tahmini tasarruf (model):** blog taramasından gelen ~25–35 CU-saat/ay ve
—varsa— health ping'inden gelen ~180 CU-saat/ay ortadan kalkar. Optimizasyon
sonrası beklenen tüketim **ayda 8–20 CU-saat** (ücretsiz paket: 100).

**Onay bekleyen iki şey:** (a) kodun commit + deploy edilmesi, (b) trigram
indeks migration'ının production'da çalıştırılması. İkisi de bağımsızdır.

---

## 1. Yapılan değişiklikler

### 1.1 Yeni dosyalar (5)

| Dosya | Görevi |
|---|---|
| `src/lib/blog-cache.ts` | Blog okumalarının etiket tabanlı önbelleği (`BLOG_CACHE_TAG`, `blogCache()`, ISO tarih yardımcıları) |
| `src/lib/product-cache.ts` | Ürün okumalarının etiket tabanlı önbelleği (`PRODUCTS_CACHE_TAG`, `productCache()`) |
| `src/lib/blog-taxonomy-cache.ts` | `resolveCategory` / `resolveTag`'in public yüzey için önbellekli biçimleri |
| `src/lib/revalidate-public.ts` | **Tek otorite:** `revalidateBlog()`, `revalidateProducts()`, `revalidateProductsById()` |
| `drizzle/0014_part_search_trgm.sql` | Parça numarası / ad / OEM araması için trigram indeksleri (**uygulanmadı**) |

### 1.2 B1 — Önbellekleme

**Mimari karar:** projede `site_settings` için zaten kurulmuş ve doğrulanmış
olan **etiket tabanlı** model aynen izlendi. `unstable_cache`'e hiçbir yerde
**sayısal `revalidate` verilmedi** (proje CLAUDE.md'deki tuzak: Next 16 o
değeri çağıran rotaya taşıyor ve site zaman tabanlı ISR'ye dönüyor). Her
önbellek kaydı `revalidate: false` taşır; tazeleme yalnızca olay tabanlıdır.

| Kaldırılan | Nerede | Yerine |
|---|---|---|
| `export const dynamic = "force-dynamic"` | 12 blog rotası (TR + EN/RU/AR liste, kategori, etiket) | Veri okumaları `blogCache()` içine alındı |
| `export const revalidate = 60` | 4 blog yazısı rotası (TR + 3 dil) | Aynı şekilde `blogCache()` |

Önbelleğe alınan okumalar:

- `blog/page.tsx` → liste + kategori çipleri (2 sorgu)
- `blog/[slug]` → yazı + çeviriler (2) ve etiketler + ilgili yazılar (2)
- `blog/kategori/[slug]`, `blog/etiket/[slug]` → taksonomi çözümlemesi (≤4) + liste (1)
- `LocaleBlogList`, `LocaleBlogPost`, `LocaleCategoryHub`, `LocaleTagHub` → EN/RU/AR karşılıkları
- `BrandCatalogPage.fetchBrandPage` → marka sayfaları (4 sorgu)
- `lib/queries/product.ts → loadDetail` → ürün detay sayfası (5 sorgu)
- `/api/products` ve `/api/products/[partNumber]` → public ürün API'si

**Tarih tuzağı:** veri önbelleği değerleri serileştirerek saklar; önbellekten
dönen bir `Date` artık **string**'tir. Bu yüzden önbelleğe giren her fonksiyon
tarih alanlarını bilinçli olarak ISO string'e çevirir ve tip imzası gerçeği
söyler. `tsc` bu sayede iki gerçek hatayı derleme zamanında yakaladı
(`post.publishedAt?.toISOString()` → `isoOrUndefined(...)`), yani JSON-LD
`datePublished` alanı canlıda bozulmadan düzeltildi.

**Geçersiz kılma (en kritik kısım):** 28 admin yazma yoluna çağrı eklendi —
blog tarafında 8 handler (`revalidateBlog()`), ürün tarafında 20 handler
(`revalidateProducts()` / `revalidateProductsById()`). Her çağrı üç şeyi
birlikte düşürür: ilgili **etiket** (veri önbelleği), ilgili **yollar** (üretilmiş
sayfa çıktıları) ve **`/sitemap.xml`**.

**Değiştirilmeyenler (bilinçli):**

- `/catalog` ve `/catalog/[id]` (Prosis canlı katalog) `force-dynamic` kaldı:
  canlı stok verisi önbelleğe alınmamalı ve bu rotalar **Neon'a dokunmuyor**
  (`lib/prosis` üzerinden çalışıyorlar — doğrulandı).
- Yönetim paneli rotaları `force-dynamic` kaldı: panel her zaman taze veri
  görmeli. Admin API'leri önbelleksiz `resolveCategory`/`resolveTag`
  kullanmaya devam ediyor.
- `(public)/blog/loading.tsx` **yerinde bırakıldı** (CLAUDE.md kuralı).
- `src/lib/site-settings.ts` mekanizmasına dokunulmadı.

### 1.3 B2 — Teklif talebi güvenilirliği

`src/app/api/rfq/route.ts` ve `src/lib/email/index.ts` yeniden yazıldı.

| Konu | ÖNCE | SONRA |
|---|---|---|
| Sıra | DB `INSERT` → sonra e-posta | İki kanal **bağımsız**: DB denenir (ölümcül değil), yönetici e-postası **her durumda ve beklenerek** gönderilir |
| DB hatası | `catch` → 500, **e-posta hiç gönderilmez**, talep kaybolur | Talep e-posta ile iletilir; konu **"⚠️ KAYITSIZ TEKLİF"**, gövdede "panelde görünmeyecek, elle işleyin" uyarısı |
| E-posta tetikleme | `Promise.allSettled(...)` fire-and-forget — yanıt dönünce serverless örneği donabildiği için e-posta hiç gitmeyebilirdi | Yönetici e-postası `await`; müşteri makbuzu `after()` ile (çalışması garanti, yanıtı bekletmez) |
| Yeniden deneme | yok | 3 deneme, artan bekleme (400/800 ms), en kötü ~2 sn |
| Mükerrer kayıt | koruma yok (çift tıklama = 2 satır) | 3 dakikalık pencere: bellek içi parmak izi + DB sorgusu |
| Mükerrer e-posta | koruma yok | Aynı iki katman e-postayı da engeller |
| Yanlış başarı | DB yoksa 503 "DATABASE_URL is not configured" (teknik mesaj) | **İki kanal da başarısızsa 503** + "WhatsApp / e-posta ile iletin" (yanlış başarı YOK) |
| İzleme | `console.error` | `[RFQ]` önekli aşamalı loglar + `Sentry.captureException` (3 aşama etiketli) |
| HTML güvenliği | kullanıcı girdisi e-posta HTML'ine **ham** gömülüyordu | `escapeHtml()` ile kaçışlı |
| Rate limit / honeypot / şema | — | **Aynen korundu** (test edildi) |

Dönüş sözleşmesi: `sendAdminNotification` / `sendCustomerReceipt` artık `void`
değil `EmailResult` döner; "gönderildi mi" bilgisi olmadan müşteriye başarı
denmiyor.

### 1.4 Sağlık kontrolü

| İstek | Kontrol | Neon uyanır mı |
|---|---|---|
| `/api/health` | yalnızca uygulama | **HAYIR** (ölçüldü: 0 sorgu) |
| `/api/health?deep=1` | uygulama + DB + Prosis | evet (1 sorgu) |

Sığ yanıt yine `200` + `status: "ok"` döndüğü için mevcut bir izleyici
kırmızıya düşmez. `Cache-Control: no-store` eklendi.

**Repo taraması (doğrulandı):** `vercel.json`'da `crons` YOK, `.github`
klasörü YOK, kodda `/api/health` çağıran bir yer YOK, Sentry cron monitor YOK.
Yani dakikalık bir ping varsa **kaynağı haricidir** ve kod tarafından
görülemez — §5.2'deki Vercel log kontrolü bunu kesinleştirir.

### 1.5 Katalog kapasitesi (5.000–50.000 ürün)

| İş | Durum |
|---|---|
| Ürün listesi/detay API'si önbellekte | ✅ yapıldı |
| CDN süresi 60 sn → 600 sn (`s-maxage`) | ✅ yapıldı (olay tabanlı geçersiz kılma devrede olduğu için güvenli) |
| Parça numarası araması normalize kolona taşındı | ✅ yapıldı — ek kazanç: `"ch76281"` yazımı artık `"CH 76281"` ile eşleşiyor (eskiden eşleşmiyordu) |
| Trigram indeksleri | ⏸ `drizzle/0014` **yazıldı, uygulanmadı** (onay bekliyor) |
| `lib/catalog.ts` tüm tabloyu çeken görsel sorgusu | ✅ `inArray` ile düzeltildi (5.000 üründe 5.000 satır çekiyordu) + fonksiyon "kullanımda değil" olarak işaretlendi |
| Sorgu günlüğü (`DB_QUERY_LOG=1`) | ✅ eklendi — ölçüm aracı, varsayılan kapalı |

---

## 2. Test sonuçları

### 2.1 Ölçüm yöntemi

`DB_QUERY_LOG=1` ile Drizzle'ın her sorgusu sunucu loguna yazıldı; her HTTP
isteğinin öncesi/sonrası sayılarak **istek başına gerçek sorgu sayısı**
bulundu. Önce/sonra karşılaştırması için değişiklikler `git stash` ile geri
alınıp aynı testler tekrarlandı; her iki ölçümden önce `.next/cache`
silinerek **soğuk önbellek** sağlandı.

### 2.2 İstek başına veritabanı sorgusu — ÖNCE / SONRA

| Rota | ÖNCE (her istek) | SONRA (1. istek) | SONRA (2. ve sonrası) |
|---|---|---|---|
| `/blog` | 2 (ilk: 7) | 7 | **0** |
| `/blog/<yazı>` | **6 — her defasında** | 6 | **0** |
| `/blog/en` | 2 | 2 | **0** |
| `/blog/kategori/<slug>` | **7 — her defasında** | 7 | **0** |
| `/parca-katalog/volvo` | **4 — her defasında** | 4 | **0** |
| `/parca-katalog/volvo?sayfa=2` | 4 | 4 | **0** |
| `/parca-katalog/<parça>` | **5 — her defasında** | 5 | **0** |
| `/api/products?page=1` | **4 — her defasında** | 4 | **0** |
| `/api/products?search=…` | **4 — her defasında** | 4 | **0** |
| `/api/products/<parça>` | **4 — her defasında** | 4 | **0** |
| `/api/health` | **1 — her defasında** | **0** | **0** |
| `/api/health?deep=1` | — | 1 | 1 (amaçlanan) |
| `/parca-katalog` (liste) | 0 (statik, `HIT`) | 0 | 0 |
| `/sitemap.xml` | 0 (statik, `HIT`) | 0 | 0 |

### 2.3 Geçersiz kılma testi (uçtan uca)

Yerel `next start` + admin girişi ile:

```
0) admin girişi: 200, token alındı
1) /blog ısınmış                       → sorgu=0            ✔ beklenen 0
2) panel DIŞINDAN elle SQL ile başlık değiştirildi
   /blog                               → sorgu=0, yeni başlık görünmüyor  ✔ önbellek tutuyor
3) panelden etiket oluşturuldu (POST /api/admin/blog/tags) → 201
4) /blog                               → sorgu=2, YENİ BAŞLIK GÖRÜNÜYOR  ✔ geçersiz kılma çalışıyor
5) ürün sayfası ısınmış                → sorgu=0            ✔
6) panelden üretici oluşturuldu (POST /api/admin/manufacturers) → 201
7) ürün sayfası                        → sorgu=5            ✔ geçersiz kılma çalışıyor
8) sentetik kayıtlar temizlendi
```

2. ve 4. adım birlikte şunu kanıtlıyor: önbellek süreyle değil **olayla**
tazeleniyor. Buradan çıkan **işletme kuralı:** `products`, `blog_*` ve
`site_settings` tabloları **yalnızca yönetim paneli üzerinden** değiştirilmeli;
elle SQL ile yapılan değişiklik canlıda görünmez (tazeleme için deploy ya da
panelden herhangi bir yazma gerekir).

### 2.4 Toggle regresyon testi — SEO değişmezleri korundu

Önbellekleme en çok bu değişmezi tehdit ediyordu: kapalı sayfalar **gerçek
404** dönmeli, soft-404 olmamalı.

| Rota | Toggle AÇIK | Toggle KAPALI |
|---|---|---|
| `/blog` | 200 | **404** |
| `/blog/<yazı>` | 200 | **404** |
| `/blog/en` | 200 | **404** |
| `/blog/kategori/<slug>` | 200 | **404** |
| `/parca-katalog` | 200 | **404** |
| `/parca-katalog/volvo` | 200 | **404** |
| `/parca-katalog/<parça>` | 200 | **404** |
| `/sitemap.xml` | 200 (blog+katalog URL'leri var) | 200, **URL sayısı 11'e düştü** (blog ve katalog URL'si yok) |

Toggle değişikliği admin API'sinden yapıldı ve **ilk istekte** etkili oldu.

### 2.5 B2 senaryo testleri

| # | Senaryo | Sonuç | Beklenen | ✔ |
|---|---|---|---|---|
| A1 | DB açık, e-posta yapılandırılmamış | `200 success`, 1 kayıt oluştu | başarı (kayıt tuttu) | ✔ |
| A2 | A1'in **aynısı**, farklı IP'den tekrar | `200 success`, **yeni kayıt OLUŞMADI** (toplam 1) | mükerrer engellendi | ✔ |
| A3 | Honeypot alanı dolu | `400` (şema reddi) | bot geçmedi | ✔ (not §4.5) |
| A4 | Geçersiz e-posta | `400` "Geçerli bir e-posta adresi giriniz." | doğrulama korundu | ✔ |
| B1 | **DB ERİŞİLEMEZ** + e-posta çalışıyor | `200 success`; yöneticiye **"⚠️ KAYITSIZ TEKLİF: …"** konulu, uyarı kutulu e-posta; müşteri makbuzu da gitti | talep kaybolmadı | ✔ |
| C1 | **DB ERİŞİLEMEZ + e-posta YOK** | `503` + "Lütfen WhatsApp (+90 530 884 59 79) veya bilgi@… üzerinden iletin." | yanlış başarı YOK | ✔ |
| C2 | Aynı IP'den 6 istek | 5 geçti, 6. `429` | rate limit korundu | ✔ |

Log izleri (C senaryosu):

```
[RFQ] mükerrer kontrolü başarısız (Error) — devam ediliyor
[RFQ] KAYIT DÜŞMEDİ (Error) — talep yalnızca e-posta ile iletilecek
[Email] RESEND_API_KEY tanımlı değil — yönetici bildirimi GÖNDERİLEMEDİ
[RFQ] TALEP ALINAMADI — ne kayıt ne e-posta başarılı
```

**E-posta testi hakkında dürüst not:** hiçbir gerçek e-posta gönderilmedi.
B1 senaryosunda Resend yerine **yerel bir saplama sunucusu** kullanıldı
(`RESEND_BASE_URL=http://127.0.0.1:3101`); saplamanın aldığı istekler konu
satırı ve uyarı kutusu dahil doğrulandı. Gerçek Resend üzerinden uçtan uca
test ayrı onayınıza bağlıdır (dışarıya e-posta göndermek demektir).

### 2.6 Statik denetimler

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | **0 hata** |
| `eslint` | **34 sorun (19 error, 15 warning)** — baseline 38 (19/19); **artmadı**, 4 uyarı azaldı. Kalan bulguların tamamı önceden vardı (doğrulandı: `catalog.ts`'teki `categories` uyarısı HEAD'de de var) |
| `next build` | **başarılı** (3 kez: önce / sonra / son hâl) |
| `scripts/isr-yazma-korumasi.mjs` | **TAMAM — 31 prerender rotasının tamamı süreyle eskimiyor** (zaman tabanlı ISR geri gelmedi) |
| Dokunulmayan alanlar | `site-settings.ts`, `catalog-access.ts`, parça kataloğu toggle'ı, `(public)/blog/loading.tsx` — hiçbiri değişmedi |

### 2.7 Test verisi temizliği

Dev veritabanına 1 sentetik blog yazısı + kategori + etiket + çeviriler,
2 sentetik teklif kaydı ve 2 `site_settings` satırı yazıldı; **hepsi
silindi.** Son durum başlangıçtakiyle birebir aynı: `blog_posts=0`,
`blog_categories=0`, `blog_tags=0`, `rfq_submissions=0`, `site_settings=0`,
`products=166`, `manufacturers=11`.

---

## 3. Tahmini compute tasarrufu

Varsayımlar açıkça yazılı — Neon panel verisi olmadan kesinleştirilemez (§5).

| Kaynak | ÖNCE (model) | SONRA (model) | Dayanak |
|---|---|---|---|
| Googlebot'un 48 dinamik blog adresini taraması | ~25–35 CU-saat/ay | **~0** | Tarama artık DB'ye inmiyor (ölçüm: 2. istek 0 sorgu) |
| Ziyaretçi trafiği (blog + marka + ürün) | trafikle doğru oranlı | **~0** | Aynı |
| `/api/health` dış ping (varsa, 5 dk aralık) | ~180 CU-saat/ay | **0** | Sığ uç artık DB'ye dokunmuyor (ölçüm: 0 sorgu) |
| Yönetim paneli oturumları | ~5 CU-saat/ay | ~5 CU-saat/ay (değişmedi — panel bilinçli olarak önbelleksiz) | — |
| Form gönderimleri, deploy'lar, önbellek ilk dolumları | küçük | küçük | — |

**Optimizasyon sonrası beklenen tüketim: ayda 8–20 CU-saat** (ücretsiz paket
100 CU-saat/proje). Bu rakam, 24 numaralı raporun §6.2 "A hâli" tablosuyla
aynı mertebededir ve 5.000 ürün + günlük 1.000 ziyaretçi senaryosunda
~19 CU-saat'e karşılık gelir.

**Bu ayın kalanı:** kalan 3,7 CU-saat (≈ 0,25 CU'da ~15 uyanık saat) deploy
edildiği anda korunmaya başlar. Deploy edilmezse blog taraması tüketmeye
devam eder.

---

## 4. Kalan riskler ve açık maddeler

### 4.1 Veri önbelleğinin Vercel'deki davranışı doğrulanamadı — **orta risk**

Ölçümler **yerel** `next start` ile yapıldı. Vercel'de veri önbelleği bölge
bazlı paylaşımlı bir servistir; yine de "ilk istek" sayısı bölge sayısı kadar
artabilir. Yönü aynıdır (her istek değil, kayıt başına bir kez), ama kesin
rakam ancak deploy sonrası Neon grafiğinden görülür.

### 4.2 Sayfalar hâlâ "dinamik" — Neon korunuyor, Vercel çağrısı sürüyor

Build çıktısında blog, marka ve ürün sayfaları `ƒ (Dynamic)` olarak işaretli
ve yanıt başlıkları `private, no-cache, no-store`. Nedeni `searchParams`
(`?page=`, `?sayfa=`) kullanımı ve ürün rotalarında `generateStaticParams`
olmamasıdır. Sonuç:

- **Neon açısından çözüldü** (sorgular önbellekten).
- **Vercel açısından** her istek bir fonksiyon çağrısıdır; TTFB statik
  sayfalardan yavaştır.

Tam rota önbelleği (CDN'den servis) için iki iş gerekir ve **bu çalışmanın
kapsamında değildi**: (a) sayfalamanın `?page=` yerine rota segmentine
taşınması — URL değişikliği, SEO etkisi var; (b) ürün sayfaları için
`generateStaticParams`. Kapasite planı açısından (b) 5.000 ürün yayına
alınmadan önce yapılmalıdır (24 numaralı rapor, B8).

### 4.3 Trigram migration uygulanmadı — **düşük risk, beklemede**

`drizzle/0014_part_search_trgm.sql` yazıldı ama **çalıştırılmadı**. Kod bu
indeks olmadan da doğru çalışır (yalnızca yavaş olur), bu yüzden "migration
önce, kod sonra" zorunluluğu bu dosya için geçerli değildir. `CREATE EXTENSION
pg_trgm` **owner bağlantısı** gerektirir; sınırlı `nidah_web` rolüyle çalışmaz.

### 4.4 Elle SQL ile yapılan değişiklikler artık canlıda görünmez — **işletme riski**

`site_settings` için zaten geçerli olan kural artık `products` ve `blog_*` için
de geçerli: panel dışından (script, psql) yapılan değişiklik önbelleği
tazelemez. Katalog çalışmasında veri **panelden** veya aktarım sonrası bir
panel yazmasıyla güncellenmelidir. Bu, 2.3'te ölçülerek gösterildi.

### 4.5 Honeypot 400 dönüyor (önceden de böyleydi) — **düşük**

Şemadaki `website: z.string().max(0)` kuralı honeypot dolu isteği doğrulama
aşamasında 400 ile reddediyor; koddaki "sahte başarı" dalına hiç ulaşılmıyor.
Bu **önceden de böyleydi** (değiştirmedim), ama bota "yakalandın" sinyali
veriyor. İsterseniz ayrı bir iş olarak sessiz 200'e çevrilebilir.

### 4.6 Dev veritabanı rolü bağlantı anomalisi — **çözülmedi, bilginize**

`.env.local`'deki bağlantı (sınırlı dev rolü) ile yapılan her denemede
**ETIMEDOUT** alındı; aynı host ve aynı veritabanına owner bağlantısıyla
bağlanmak sorunsuz çalıştı. Bu yüzden tüm yerel testler owner bağlantısıyla
yapıldı. Olası neden rolün bağlantı limiti (CLAUDE.md §4: limit 20) veya sızmış
bağlantılar; Neon panelinden rol/limit kontrolü gerekir. Production'ı
etkilemiyor.

### 4.7 Gerçek e-posta ile uçtan uca test yapılmadı — **bilinçli**

§2.5'teki not. Resend saplaması kullanıldı; dışarıya tek bir e-posta
gönderilmedi.

---

## 5. Production deploy planı (onay bekliyor)

### 5.1 Sıra

1. **Commit** (tek commit, `main`): `perf(cache): blog/urun onbellegini etiket tabanli yap, teklif formunu DB'den bagimsizlastir`
2. **Deploy**: GitHub → Vercel otomatik. `vercel --prod` elle çalıştırılmaz.
3. **Migration (bağımsız, istenirse sonra):** `drizzle/0014` — owner
   bağlantısıyla, Docker `postgres:17` üzerinden, hedef uç nokta doğrulanarak.
   Kod sırası bağımlılığı **yok**.

### 5.2 Deploy sonrası doğrulama (10 dakika)

| # | Kontrol | Beklenen |
|---|---|---|
| 1 | `curl -sI https://www.nidahgroup.com.tr/` | `X-Vercel-Cache: HIT` (deploy sonrası ilk istekte MISS/PRERENDER normaldir) |
| 2 | `/sitemap.xml` → URL sayısı | **63**, katalog URL'si **0**, duplicate 0 |
| 3 | `/blog` iki kez | 200; ikinci istek belirgin şekilde hızlı |
| 4 | `/blog/tr` ve `/en/blog` | **308** yönlendirme (değişmedi) |
| 5 | `/parca-katalog`, `/parca-katalog/volvo`, bir ürün URL'si | **404** (katalog kapalı) |
| 6 | `/api/health` | `200`, `checks.database: "skipped"` |
| 7 | `/api/health?deep=1` | `200`, `checks.database: "ok"` |
| 8 | Panelden bir blog yazısı başlığını değiştir → `/blog` | Yeni başlık **ilk istekte** görünmeli |
| 9 | Panelden bir ürün kaydet → ürün sayfası (katalog açılırsa) | Yeni veri görünmeli |
| 10 | Teklif formundan **gerçek** bir test gönderimi | 200 + yönetici e-postası + müşteri makbuzu (kayıt panelde görünür) |
| 11 | Vercel Logs → `/api/health` çağrıları | Dış ping varsa artık DB sorgusu yok |

**4., 5. ve 2. maddeler SEO değişmezleridir** — biri bozulursa regresyondur:
rollback yapılmaz, raporlanır ve durulur (CLAUDE.md §11).

### 5.3 Geri dönüş

Tek commit olduğu için `git revert <commit>` + deploy yeterlidir. Migration
uygulanmışsa geri alma `DROP INDEX` ile tek adımdır (dosyanın sonunda yazılı);
indeks veriyi değiştirmediği için kod ile indeks arasında sıra bağımlılığı
yoktur.

---

## 6. Neon panelinden almanız gereken ekran görüntüleri (adım adım)

Amaç: §3'teki tahmini **gerçek kullanım verisiyle** doğrulamak. Neon arayüzü
zamanla değişebilir; adımlar bulunamazsa ekranın tamamının görüntüsü de işe
yarar.

### 6.1 Günlük compute tüketimi — **en önemli ekran**

1. [console.neon.tech](https://console.neon.tech) → giriş yapın.
2. Sol üstteki proje seçicisinden **`nidah_group_web`** projesini seçin.
3. Sol menüden **Monitoring** (bazı sürümlerde **Usage** veya proje
   ayarlarındaki **Billing & usage**).
4. Üstteki metrik seçiminden **Compute** / **CU-hours** grafiğini seçin.
5. Zaman aralığını **Last 30 days** yapın.
6. Ekran görüntüsünü alın. **Grafikte 20 Kasım'ın işaretli olması önemli:**
   düzeltme o gün 13:15 UTC'de canlıya indi; eğri o tarihten sonra düşmüş
   olmalı.

### 6.2 Saatlik dağılım

7. Aynı ekranda aralığı **Last 7 days** veya **Last 24 hours** yapın →
   ekran görüntüsü. (Hangi saatlerde uyanık kaldığını gösterir; dış ping
   varsa düz bir çizgi olarak görünür.)

### 6.3 Fatura dönemi başlangıcı

8. Sol menü → **Billing** (veya sağ üst profil → **Billing**).
9. "Current billing period" / "Resets on" tarihini içeren alanın ekran
   görüntüsü. **Kotanın hangi gün sıfırlandığını** öğrenmemiz gerekiyor.

### 6.4 Branch ve compute endpoint listesi

10. Sol menü → **Branches**. Listenin tamamının ekran görüntüsü (kaç branch
    var, her birinin "Last active" bilgisi).
11. Her branch için **Compute** / endpoint satırına girin → **Edit compute**
    (veya "Compute settings") çekmecesini açın.
12. Şu üç değerin göründüğü ekran görüntüsü: **Minimum CU**, **Maximum CU**,
    **Scale to zero / Suspend compute after**.
    Bu, raporlardaki tüm "uyanık saat" hesaplarının dayandığı 0,25 CU
    varsayımını doğrular veya çürütür.

### 6.5 Projeler arası kontrol

13. Proje seçicisine dönün → **`nidah-dev`** projesinin de **Monitoring →
    Compute** ekranının görüntüsü. (Dev projesinin kendi 100 CU-saati var;
    ayrı olduğunu teyit etmek istiyoruz.)
14. Her iki projenin **aynı organizasyonda** olup olmadığı: sol üstteki
    organizasyon adının göründüğü bir görüntü yeterli.

### 6.6 Neon dışı iki veri

15. **Vercel → Logs**, son 7 gün, arama kutusuna `/api/health` yazın →
    istek sayısı ve `User-Agent` dağılımının görüntüsü. *(Dış izleme servisi
    var mı sorusunu kesin yanıtlar. Alternatif: kullandığınız izleme
    servisinin adını ve ping aralığını söylemeniz de yeterli.)*
16. **Google Search Console → Ayarlar → Tarama istatistikleri** → günlük
    tarama isteği sayısı grafiğinin görüntüsü.

Vercel MCP'ye `/mcp` ile yetki verirseniz 15. maddeyi kendim ölçebilirim.

---

## 7. Bu oturumda yapılmayanlar

- **Commit edilmedi, push edilmedi, deploy edilmedi.**
- Production veritabanına **tek sorgu bile gönderilmedi** (tüm testler
  `nidah-dev` projesinde).
- Migration **çalıştırılmadı**.
- Neon paketi, compute ayarı, branch yapısı **değiştirilmedi**.
- Ücretli hizmet alınmadı.
- Dışarıya **hiç e-posta gönderilmedi**.
- Katalog çalışmasının verilerine ve `scripts/faz3-*` dosyalarına
  dokunulmadı; dev veritabanındaki 166 ürün ve 11 üretici aynen duruyor.
- `CLAUDE.md` değiştirilmedi. (Not: §10'daki "Vercel Analytics ❌ yok" kaydı
  güncel değil — `src/app/layout.tsx` ikisini de mount ediyor. Düzeltme ayrı
  onaya tabidir.)
