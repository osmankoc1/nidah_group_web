# 27 — Aşama 3 Yayını, Kontrollü Önbellek Isıtma, Arama ve Görsel Altyapı

**Tarih:** 25 Kasım 2026
**Kapsam:** Aşama 3 commit'inin canlıya alınması · kontrollü önbellek ısıtma sistemi · trigram ve arama performansı ölçümleri · arama önbelleği büyüme sınavı · görsel depolama karşılaştırması · teklif formu idempotency belgelemesi
**Önceki rapor:** `26-KONTROLLU-GECIS-RAPORU.md`

---

## YÖNETİCİ ÖZETİ

**Nerede duruyoruz?** Aşama 3 canlıya alındı. Ürün ve blog yazı sayfaları artık ilk istekte bir kez üretiliyor, sonrasında Neon'a hiç inmeden CDN'den veriliyor. Deploy sonrası bütün SEO kontrolleri geçti; site sağlıklı çalışıyor.

**Ne ölçtük?** Bu oturumda tahmin yerine ölçüm koydum. 50.000 ürünlük sentetik bir veritabanı kurup (Neon kotası harcanmadan, yerelde) aramayı, depolamayı ve sayfa maliyetini ölçtüm. Sonuçlar:

- **Arama:** 50.000 üründe trigram indeksi olmadan her arama 54–65 ms. İndeksle 0,2–1,2 ms. Yani indeks arama maliyetini **50 kata kadar** düşürüyor. 5.000 üründe fark henüz kritik değil (5,5 ms → 0,4 ms).
- **Depolama:** 50.000 ürün + muadil numaralar + makine uyumlulukları = **170 MB**. Neon'un ücretsiz 1 GB sınırının çok içinde. Önceki 330 MB tahminim ölçümle düzeltildi.
- **Isıtma:** 50.000 sayfanın yaklaşık **42 dakikada** ısıtılabileceği tahmini ölçümle **doğrulandı**, ama CU-saat maliyeti 0,18 değil **0,19–1,56** aralığında. Neon 2 CU'ya kadar ölçeklendiği için üst değer gerçekçi.

**Ne kazandık?** Yavaş tarama senaryosuna göre ısıtma Neon tüketimini **54–430 kat** azaltıyor. Tarama penceresi riski bu araçla yönetilebilir hâle geldi.

**Canlı site iyi mi?** Evet. Sitemap 63 URL, katalog kapalı sayfalar gerçek 404, canonical/hreflang/JSON-LD bozulmadı, `/api/health` Neon'a dokunmuyor.

**Neon'a para vermemiz gerekiyor mu?** Hayır — ama **1 Aralık'tan önce 5.000 ürün yayınlanmamalı.** Kalan 3,14 CU-saat, hem içe aktarma hem ısıtma için yeterli değil. Kota 1 Aralık'ta sıfırlanıyor; o tarihten sonra 100 CU-saatin tamamı elimizde olacak.

**5.000 ürünü yayınlamaya hazır mıyız?** Altyapı olarak **evet**, dört koşulla: (1) 1 Aralık'ı bekle, (2) trigram migration'ını önceden uygula, (3) yayından hemen sonra ısıtmayı çalıştır, (4) fotoğraf yükleme politikasını yükleme ÖNCESİNDE belirle. Ayrıntı §13'te.

**Sırada ne var?** Benden onay bekleyen 6 kalem §12'de. İkisi para, ikisi production, ikisi karar.

---

## 1. Tamamlanan işler

| # | İş | Durum |
|---|---|---|
| 1 | Aşama 3 ön kontrolleri (tsc / lint / build / regresyon) | ✅ geçti |
| 2 | Aşama 3 commit'inin push + production deploy | ✅ canlıda |
| 3 | Deploy sonrası canlı doğrulama (ISR, CDN, toggle, 404, sitemap, canonical, hreflang, JSON-LD) | ✅ geçti |
| 4 | Kontrollü önbellek ısıtma sistemi | ✅ yazıldı, dev'de ölçüldü |
| 5 | Isıtma veriminin gerçek ölçümü (1/3/6 eşzamanlılık) | ✅ ölçüldü |
| 6 | Trigram migration'ının 5k / 10k / 50k ürün senaryolarında değerlendirilmesi | ✅ ölçüldü |
| 7 | Tam / kısmi / benzerlik arama sınavları | ✅ ölçüldü |
| 8 | Arama önbelleğinin bot sorgularıyla büyüme sınavı | ✅ ölçüldü — **sınırlar yetersiz çıktı** |
| 9 | Görsel depolama karşılaştırması ve geçiş planı | ✅ hesaplandı |
| 10 | Gerçek Resend teslimatı + idempotency belgelemesi | ✅ belgelendi |
| 11 | CLAUDE.md ortam değişkeni düzeltmesi | ✅ yapıldı |
| 12 | Production TEST-0000 kaydının silinmesi | ❌ **yapılamadı** — §12.1 |
| 13 | Yöneticiye e-posta hatası uyarısı | 📋 öneri — §10 |

---

## 2. Commit ve deployment

### Canlıya alınan (push edildi)

```
2ab4a3b  docs: kontrollü canlıya geçiş raporu (B1, B2, Aşama 3, kapasite)
dd70e5c  perf(isr): ürün ve blog yazı sayfalarını istek üzerine ISR'ye al,
         arama önbelleğini sınırla
```

`origin/main` → `2ab4a3b`. Vercel entegrasyonu deploy'u otomatik yaptı; manuel `vercel --prod` çalıştırılmadı.

### Ön kontroller

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | **0 hata** |
| `npm run lint` | **34 sorun** = 19 error + 15 warning. Baseline 38 (19 error + 19 warning); **artış yok** |
| `npm run build` | başarılı |
| ISR koruması | **36/36** prerender rotası süreyle eskimiyor |
| Build çıktısı | `● /parca-katalog/[slug]`, `● /blog/[slug]`, `● /blog/{en,ru,ar}/[slug]` — hepsi SSG |

### Deploy'un indiğinin kanıtı

Önceki raporda "canlı sayfada `s-maxage=31536000` göreceğiz" demiştim; **bu yanlıştı** — o değer yerel `next start` çıktısıdır. Vercel tarayıcıya `public, max-age=0, must-revalidate` gönderir ve önbelleği kendi başlıklarıyla yönetir. Doğru kanıt üçlüsü:

```
/blog/motor-greyder-nedir
  X-Nextjs-Prerender: 1        ← ISR rotası (deploy ÖNCESİ bu başlık YOKTU)
  X-Vercel-Cache: HIT
  Age: 211
```

### Commit'e dahil EDİLMEYEN dosyalar

Katalog araştırma ve yayınlama çalışmasına ait 58 dosya (docs 01/19 değişiklikleri, docs 10–23, `scripts/faz3-*`, `scripts/aktarim-154-urun.sql`, `scripts/batch-*`, `scripts/dogrula-*`, `scripts/inspect-workbook.mjs`) **dokunulmadan** bırakıldı.

### Commit edilen ama PUSH EDİLMEYEN (onay bekliyor)

```
8f95600  feat(onbellek): kontrollü önbellek ısıtma sistemi + ölçülen sınırlar
         .gitignore                  |   3 +
         CLAUDE.md                   |  10 +-
         scripts/onbellek-isitma.mjs | 614 +
```

Uygulama yüzeyini değiştirmiyor (yalnız bir script + belge), ama push her seferinde ayrı onay gerektiriyor — §12.2.

---

## 3. Deploy sonrası canlı doğrulama

Minimum istekle, canlı ortamda:

| Kontrol | Beklenen | Ölçülen |
|---|---|---|
| `sitemap.xml` HTTP / tür | 200 / `application/xml` | ✅ 200 / `application/xml` |
| sitemap URL sayısı | 63 | ✅ **63** |
| sitemap katalog URL | 0 | ✅ **0** |
| sitemap tekrar eden URL | 0 | ✅ **0** |
| `/parca-katalog` | 404 | ✅ 404 |
| `/parca-katalog/volvo` | 404 | ✅ 404 |
| `/parca-katalog/ch-76281` | 404 | ✅ 404 |
| `/catalog` | 404 | ✅ 404 |
| `/blog/tr` | 308 → `/blog` | ✅ 308 → `/blog` |
| `/en/blog` | 308 → `/blog/en` | ✅ 308 → `/blog/en` |
| Ana sayfa canonical | tam 1 | ✅ 1 |
| Ana sayfa `Organization` | tam 1 | ✅ 1 |
| Ana sayfada katalog bağlantısı | 0 | ✅ 0 |
| Ana sayfa JSON-LD | geçerli | ✅ 3 blok: `Organization`, `LocalBusiness`, `WebSite` — üçü de ayrıştırıldı |
| Blog yazısı canonical | tam 1 | ✅ 1 |
| Blog yazısı hreflang | 5 (tr/en/ru/ar/x-default) | ✅ **5** |
| Blog yazısı `datePublished` / `dateModified` | geçerli ISO | ✅ `2026-05-05T22:00:00.000Z` / `2026-05-08T12:33:49.450Z` |
| Blog yazısı noindex | yok | ✅ 0 |
| `/api/health` | sığ, DB'ye dokunmaz | ✅ `depth:"shallow"`, `database:"skipped"` |
| `/api/products` CDN | ikinci istekte HIT | ✅ MISS → HIT |
| Ürün/blog yazı sayfası | ISR prerender | ✅ `X-Nextjs-Prerender: 1`, `X-Vercel-Cache: HIT` |

**Hiçbir SEO değişmezi bozulmadı.**

---

## 4. Gerçek Resend e-posta teslimatı

**Sonuç: BAŞARILI** — sizin teyidinizle.

25 Kasım 2026 10:46'da gönderilen **"Yeni Teklif: TEST - ALTYAPI DOGRULAMASI (islem gerekmez) — TEST-0000"** konulu e-posta `bilgi@nidahgroup.com.tr` gelen kutusuna ulaştı. İçerikte teklif bilgileri, firma bilgileri, parça numarası, mesaj ve talep kimliği eksiksiz görünüyor.

Bu, B2 düzeltmesinin canlıda uçtan uca çalıştığını kanıtlar: zod doğrulaması → DB kaydı → yönetici e-postası → Resend teslimatı → gelen kutusu. Yeni test e-postası gönderilmedi.

**Doğrulanmayan tek nokta:** müşteri makbuzunun (`sendCustomerReceipt`) teslim edilip edilmediği. Test talebinde müşteri e-postası alanı şirket adresi değildi, bu yüzden kontrol edilemedi. `after()` içinde çalıştığı ve başarısızlığı loglandığı için sessiz kalmaz, ama **ölçülmedi**.

### Resend idempotency korumasının kapsamı ve süresi

Resend'in kendi belgesinden (resmî, doğrudan okundu):

| Özellik | Değer |
|---|---|
| **Geçerlilik süresi** | **24 saat.** Belge: "Idempotency keys are kept in the system for 24 hours." Kontrol "son 24 saat içinde aynı anahtarla e-posta gönderilmiş mi" diye yapılır |
| **Aynı anahtar + aynı içerik** | E-posta **tekrar gönderilmez**; API ilk gönderimin yanıtını (aynı e-posta kimliğini) döndürür |
| **Aynı anahtar + FARKLI içerik** | `409 invalid_idempotent_request`. Belge: anahtarı veya içeriği değiştirmeden tekrar denemek işe yaramaz |
| **Eşzamanlı aynı anahtar** | `409 concurrent_idempotent_requests` — ilk istek hâlâ işlenirken |
| **Anahtar uzunluğu** | 1–256 karakter |
| **Kapsadığı uçlar** | `POST /emails` (tek) ve `POST /emails/batch` (toplu). Başlık: `Idempotency-Key` |
| **Kapsam (API anahtarı mı, hesap mı?)** | **Belgede YAZILMIYOR.** Anahtarların API anahtarı başına mı, hesap başına mı yoksa uç başına mı tutulduğu belirtilmemiş |

**Projedeki kullanım:** `src/lib/email/index.ts` iki ayrı önek kullanır — `rfq-yonetici-<talepParmakIzi>` ve `rfq-musteri-<talepParmakIzi>`. Yönetici ve müşteri e-postaları ayrı anahtarlar taşıdığı için biri bastırılırken diğeri etkilenmez.

**Pratik anlamı:** aynı teklif talebi 24 saat içinde kaç kez tekrar gönderilirse gönderilsin — ister aynı serverless örneğinden, ister farklı örneklerden, ister veritabanı kapalıyken — yöneticiye **tek** e-posta gider. 24 saati aşan bir tekrar yeni e-posta üretir; bu makul bir sınırdır çünkü gerçek bir müşteri bir gün sonra tekrar talep gönderiyorsa bu yeni bir taleptir.

**Üç katmanlı korumanın tam resmi:**

| Katman | Nerede | Kapsamı | Süresi | DB kapalıyken |
|---|---|---|---|---|
| 1. Tek seferlik işleme | süreç belleği (`tekSeferIsle`) | tek serverless örneği | 10 dk pencere | ✅ çalışır |
| 2. DB penceresi | `rfq_submissions` sorgusu | bütün örnekler | yapılandırılmış pencere | ❌ çalışmaz |
| 3. Resend idempotency | Resend sunucusu | bütün örnekler | **24 saat** | ✅ çalışır |

Üçüncü katman olmasa, veritabanı erişilemezken iki ayrı serverless örneğine düşen aynı talep yöneticiye iki e-posta gönderirdi. Bu senaryo artık kapalı.

---

## 5. Kontrollü önbellek ısıtma sistemi

**Dosya:** `scripts/onbellek-isitma.mjs` (614 satır, sıfır yeni bağımlılık)

### Neden var

Ürün sayfaları "istek üzerine ISR" ile üretilir: ilk istek render edilir ve Neon'a iner, sonraki bütün istekler CDN'den gelir. Normal trafikte doğru davranış. Ama 50.000 sayfa yayınlandığında Google bunları günlere yayarak tarar; her ilk render 5 dakikalık uyku sayacını sıfırlar ve compute **hiç uyumaz**.

### İstediğiniz özelliklerin karşılığı

| İstenen | Nasıl karşılandı |
|---|---|
| Çok dilli ürün URL'lerini destekleme | URL listesi `/sitemap.xml`'den okunur; dil yoldan türetilir (`/blog/en/…` → en). `--diller tr,en,ru,ar` süzgeci. **Ölçülmüş gerçek:** ürünlerin dil varyantı YOK (`product-url.ts` ürün başına tek yol üretir); çoklayan tek yüzey blogdur ve blog çeviri slug'ları TR slug'ından türetilemez, bu yüzden uydurulmaz, sitemap'ten okunur. Ürünler ileride dil önekli URL kazanırsa sitemap'e girer girmez kapsanır |
| Ayarlanabilir eşzamanlı istek sayısı | `--eszamanlilik N` (1–16). **Varsayılan 2** — gerekçesi ölçümle belirlendi, aşağıda |
| Dry-run modu | `--prova`. Hiç istek göndermez; planı, URL sayısını, tahmini süreyi ve CU-saat aralığını yazar |
| Rate limit ve hata yönetimi | `--istek-araligi-ms` (işçi başına bekleme). 429 ve 5xx'te üstel geri çekilme, `Retry-After` başlığına uyum, 3 deneme. 404 geçici sayılmaz, tekrar denenmez. Hata **mesajı** loglanmaz (bağlantı adresi sızabilir), yalnızca hata **adı** |
| Kaldığı yerden devam | `--devam` + durum dosyası. Durum dosyası farklı bir `--taban`a aitse **çıkar** (yanlış ortamı ısıtma koruması). Başarısız URL durum dosyasına başarılı yazılmaz, `--devam` onu tekrar dener |
| Başarılı ve başarısız URL raporlaması | Her koşu JSON rapor + ayrı `*-basarisiz.txt` listesi yazar. Özette HTTP kodu, süre, önbellek başlığı, deneme sayısı |
| Gereksiz yeniden önbelleklemenin engellenmesi | `--yeniden-isitma-saat 24`: son 24 saatte başarıyla ısıtılmış URL atlanır. Ayrıca yanıtın `x-vercel-cache` başlığı kaydedilir, böylece HIT dönen (yani zaten önbellekte olan, Neon'a inmeyen) istekler raporda ayrışır |
| Compute, istek ve süre güvenlik sınırları | **Dört bağımsız tavan:** `--max-istek`, `--max-sure-dk`, `--max-cu-saat` (kötümser modele göre), `--max-hata-orani` (%2). Hangisi önce dolarsa çalışma TEMİZ biter, durum yazılır, `--devam` ile sürer |

Dördüncü tavan (`--max-hata-orani`) istemediğiniz bir şeydi; ölçüm sırasında gerekliliği ortaya çıktı — §5.3.

### 5.1 Tasarım kararı: sitemap tek otoritedir

Script **veritabanına bağlanmaz.** URL listesini `/sitemap.xml`'den okur, çünkü sitemap zaten iki kapıdan geçmiş URL'leri içerir: (1) admin sayfa toggle'ı açık, (2) ürün için `seo_ready = true`. Yani ısıtılan küme ile Google'a bildirilen küme **birebir aynı**. Kendi sorgumuzu yazsaydık bu iki kapı sessizce ayrışabilirdi.

Yan fayda: script production bağlantı bilgisine ihtiyaç duymaz.

### 5.2 Ölçülen verim — tahmini DOĞRULADI, maliyeti DÜZELTTİ

Yerel `next start` (production build) + uzak dev Neon, 145 gerçek ürün sayfası, **her koşuda soğuk önbellek**:

| Eşzamanlılık | Verim | Ort. yanıt | 1. koşu DB sorgusu | 2. koşu DB sorgusu | Yanlış 404 |
|---|---|---|---|---|---|
| 1 | **19,4 istek/sn** | 51 ms | 813 | 12 | 0 / 145 |
| 3 | 18,3 istek/sn | 162 ms | 840 | 4 | 1 / 145 |
| 6 | 21,5 istek/sn | 274 ms | 826 | 20 | **11 / 145** |

**Birinci sonuç — verim ~20 istek/sn'de doyuyor.** Eşzamanlılığı 1'den 6'ya çıkarmak verimi artırmıyor (19,4 → 21,5), yalnızca gecikmeyi 5 katına ve hata oranını sıfırdan %7,6'ya çıkarıyor. Darboğaz eşzamanlılık değil, tek Node süreci.

**İkinci sonuç — ısıtma gerçekten işini yapıyor.** İlk koşuda sayfa başına **5,7 veritabanı sorgusu** (826/145). İkinci koşuda 145 sayfa için **4–20 sorgu**, yani sayfa başına ~0. Isıtılan sayfalar Neon'a inmiyor.

**50.000 sayfa için çıkarım:**

```
50.000 sayfa ÷ 20 istek/sn = 2.500 sn = 41,7 dakika
```

Yani "**42 dakika**" tahmini ölçümle **doğrulandı**. Ama CU-saat tahmini düzeltilmelidir:

| | Eski tahmin | Ölçüme dayalı |
|---|---|---|
| Süre | 42 dk | **41,7 dk** (ölçülen 20 istek/sn'den) |
| CU-saat (0,25 CU) | 0,18 | **0,195** |
| CU-saat (2 CU, autoscaling) | belirtilmemişti | **1,56** |

**0,18 rakamını kesin kabul etmemekte haklıydınız.** Isıtma sırasında Neon saniyede ~114 sorgu görür (20 istek/sn × 5,7 sorgu). 0,25 CU bu yükü taşımaz; Neon 2 CU'ya kadar ölçeklenir. Dolayısıyla gerçekçi aralık **0,19–1,56 CU-saat**, üst uca yakın olması muhtemel.

**Yine de kazanç ezici.** Yavaş tarama senaryosu: 14 gün kesintisiz uyanık = 336 saat × 0,25–2 CU = **84–672 CU-saat**. Isıtma 0,19–1,56. Oran **54× ile 430×** arası.

**Ölçümün sınırları (dürüstçe):**
- Tek yerel Node süreci üzerinde ölçüldü. Vercel'de serverless eşzamanlılığı daha yüksek olabilir; o durumda darboğaz Neon'a kayar.
- Dev Neon rolünün bağlantı limiti 20'dir. Production rolünün limiti ve pooler kullanıp kullanmadığı **okunamadı**.
- Ürün sayfası boyutu ölçüldü: **125 KB** (`Content-Length: 125277`). Vercel ISR yazmaları 8 KB birim üzerinden faturalanır → sayfa başına ~15,6 birim.

### 5.3 Ölçüm sırasında bulunan GERÇEK RİSK: yük altında yanlış 404

Eşzamanlılık 6'da 145 sayfanın **11'i 404 döndü.** Sunucu logu nedeni tam olarak gösteriyor:

```
41 × [site-settings] ayarlar okunamadı (Error) — güvenli varsayılanlar
                     (fallbackEnabled) uygulanıyor
```

Eşzamanlılık 1'de bu satır **sıfır** kez geçti.

**Mekanizma:** yük altında `site_settings` sorgusu düşüyor → `readSettings()` hatayı yakalıyor → `isPageEnabled("page_parca_katalog")` fail-closed davranıp `false` dönüyor → `notFound()` → **AÇIK olan bir sayfa 404 veriyor.** Fail-closed davranışın kendisi doğru ve bilinçli (proje CLAUDE.md); sorun, ISR rotalarında bu 404'ün kalıcı olup olmayacağıydı.

**Sınadığım kötü senaryo: 404 önbelleğe yazılır mı?** Aşama 3 ürün sayfalarını `revalidate: false` ile ISR'ye aldı. Geçici bir 404 önbelleğe yazılırsa bir yıl orada kalırdı — bu, yeni deploy'un getirdiği bir regresyon olurdu.

**Ölçüm sonucu: yazılmıyor.** 404 dönen üç URL'yi, önbellek korunarak yeniden başlatılan sunucuda tek tek istedim: **üçü de 200 döndü** (`STALE` → yeniden üretim → `HIT`). Yani geçici fail-closed kendini onarıyor.

> **Uyarı:** bu yerel `next start` üzerinde ölçüldü. Vercel'in ISR deposu ayrı bir uygulamadır ve orada aynı davranış **doğrulanamadı** (katalog kapalı olduğu için canlıda ürün sayfası yok). Bu yüzden ısıtma kuralı temkinli tutuldu.

**Yapılan değişiklikler (ölçümden doğdu):**
1. Varsayılan eşzamanlılık **3 → 2**. Gerekçesi kodun içine ölçüm tablosuyla yazıldı.
2. **`--max-hata-orani` tavanı (varsayılan %2).** Eşik aşılırsa ısıtma durur. Mantık: sitemap'ten gelen bir URL 404 veremez — sitemap yalnızca açık ve yayına hazır sayfaları listeler. 404 bir **çelişkidir** ve o an isteyen bir tarayıcı/bot da aynı 404'ü görür. Devam etmek yanlıştır.
3. **404'ler ayrı raporlanır**, olası nedenler ve yapılması gereken (nedeni gider → `--devam`) açıkça yazdırılır.

**Bu bulgunun ısıtma dışındaki anlamı:** aynı mekanizma bir bot patlamasında da tetiklenebilir. Yayın öncesinde `site_settings` okumasına kısa bir yeniden deneme eklenmesini öneriyorum — §12.5.

### 5.4 Prova (dry-run) çıktısı — canlı sitemap üzerinde

```
· Kaynaktan 63 URL okundu.
· Tür dağılımı: {"diger":59,"blog":4}
· Isıtılacak: 4 URL            ← katalog KAPALI, ürün URL'si yok
  tahmini CU-saat : 0,021 (iyimser) · 0,177 (kötümser)
```

Katalog kapalı olduğu için şu an ısıtılacak bir şey yok; bu doğru davranış. Production'da toplu ısıtma **çalıştırılmadı** — ayrı onay gerektiriyor.

### 5.5 Vercel tarafı maliyeti

| Kalem | Hesap | Tutar |
|---|---|---|
| ISR yazması | 50.000 sayfa × 125 KB ÷ 8 KB = ~781.000 birim | **$3,12 – $5,00** (birim $4,00–6,40/1M) |
| CDN istekleri | 50.000 istek | Hobby'de 1.000.000 dahil → **$0** |
| Fonksiyon çağrısı | 50.000 | Hobby'de 1.000.000 dahil → **$0** |
| Active CPU | 41,7 dk × ~1 vCPU eşdeğeri | Hobby'de 4 saat dahil → **$0** |

Vercel belgesi "Automatic compression of ISR writes helps keep costs down" diyor; gerçek tutar bu üst sınırın altında kalır. Hobby'de aşım **ücretlendirilmez**, hizmet durur.

**Not:** Vercel'in ISR yazma/okuma için Hobby ve Pro dahil kotası resmî sayfalarda **yazılmıyor** (okundu, teyit edildi: NOT STATED). Sadece birim fiyat aralıkları yayınlanmış. Bu yüzden yukarıdaki $3–5 bir **üst sınır tahminidir**, fatura öngörüsü değildir.

---

## 6. Arama altyapısı — trigram ölçümleri

**Ölçüm ortamı:** yerel Docker `postgres:17` (production Neon = PostgreSQL 17.11, birebir eşleşir). Şema `drizzle-kit export` ile `schema.ts`'ten üretildi. **Neon kotası harcanmadı** — bu bilinçli bir seçimdi; Neon'un ücretsiz kotası proje başına 100 CU-saat olduğu için dev projesi ayrı sayılsa da kalan production kapasitesini riske atmak istemedim.

**Veri:** çarpışmasız, gerçekçi uzunlukta sentetik ürünler (üç farklı parça numarası biçimi, Türkçe teknik metinler, ürün başına 2 muadil numara + 2 makine uyumluluğu). Ölçüm sonunda konteyner **tamamen silindi**.

Sorgu, `/api/products` rotasındaki gerçek sorgu şeklidir (normalize kolon + ham kolon fallback + ad araması, `ORDER BY created_at DESC LIMIT 24`). Her senaryo 6 kez koşuldu; ilki ısınma, kalan 5'in **ortancası** alındı.

### 6.1 Arama süreleri (ms, ortanca)

| Senaryo | 5.000 ürün | 10.000 ürün | 50.000 ürün |
|---|---|---|---|
| | **trigramsız → trigramlı** | **trigramsız → trigramlı** | **trigramsız → trigramlı** |
| Tam parça no (`CH 1000000`) | 5,54 → **0,43** | 11,16 → **0,55** | 57,12 → **0,84** |
| Tam tireli (`101-00-3000001`) | 6,04 → **0,31** | 11,97 → **0,47** | 65,11 → **0,66** |
| Kısmi/infix (`3000001`) | 5,46 → **0,42** | 11,11 → **0,49** | 58,59 → **0,57** |
| Kısa infix (`00300`, 311 eşleşme) | 5,72 → **0,85** | 11,31 → **0,97** | 55,78 → **1,21** |
| Ad benzerliği (`O-Ring`) | 5,76 → **1,22** | 11,49 → **2,60** | 57,25 → **12,08** |
| Ad ailesi (`Ayar Pulu`) | 5,85 → **1,25** | 11,81 → **2,50** | 60,18 → **12,99** |
| Bot rastgele (eşleşme yok) | 5,35 → **0,15** | 10,78 → **0,17** | 54,17 → **0,21** |

**Plan değişimi:** trigramsız **her** senaryo `Seq Scan` (tam tablo taraması). Trigramlı: `Bitmap Index Scan on idx_products_pn_norm_trgm` / `idx_products_name_trgm`.

### 6.2 Üç net sonuç

**1. Trigramsız maliyet satır sayısıyla DOĞRUSAL artıyor.** 5k → 10k → 50k: 5,5 → 11,2 → 57,1 ms. Bu bir tam tablo taramasının imzasıdır. 50.000 üründe her arama, ürün tablosunun tamamını okur.

**2. Parça numarası aramalarında indeks 50 kata kadar hızlandırıyor.** 50.000 üründe 57 ms → 0,84 ms. Bot sorgularında (eşleşme yok) 54 ms → 0,21 ms, yani **258 kat** — çünkü indeks "hiçbir şey eşleşmiyor" cevabını tabloya hiç dokunmadan verir. Bu, kötü niyetli arama trafiğine karşı doğrudan koruma.

**3. AD aramaları indeksle bile yavaşlıyor — bu dürüstçe söylenmeli.** 50.000 üründe `O-Ring` araması 2.549 satır eşleştiriyor; indeks bu satırları bulsa da heap'ten okumak gerekir, bu yüzden 12 ms'de kalıyor. Trigramsıza göre 4,7 kat iyi ama 0,8 ms değil. **Çözümü indeks değil önbellek:** bu sorgular `productCache` içinde ve ikinci istekte Neon'a hiç inmiyor (§7'de ölçüldü).

### 6.3 Migration maliyeti ve boyutu

| Ürün sayısı | `0014` uygulama süresi | Eklenen indeks boyutu | Toplam DB |
|---|---|---|---|
| 5.000 | **576 ms** | ~1,3 MB | 24 → 26 MB |
| 10.000 | **754 ms** | ~2,6 MB | 39 → ~42 MB |
| 50.000 | **1.602 ms** | **11,4 MB** | 159 → **170 MB** |

50.000 üründeki indeks boyutları:

| İndeks | Boyut |
|---|---|
| `idx_products_name_trgm` | 6.816 kB |
| `idx_oem_number_norm_trgm` | 2.768 kB |
| `idx_products_pn_norm_trgm` | 1.904 kB |
| `idx_products_pn_raw_trgm` (kısmi, boş) | 16 kB |
| **toplam** | **11,4 MB** (+%6,9) |

**Önceki tahminim (+%15–25) ölçümle düzeltildi: gerçek artış +%6,9.**

### 6.4 Trigram migration'ı değerlendirmesi

| Soru | Cevap |
|---|---|
| **Gerekli mi?** | 5.000 üründe **hayır** — 5,5 ms kabul edilebilir. 10.000'de **sınırda** (11 ms). 50.000'de **evet, zorunlu** (57 ms, her aramada tam tablo taraması). |
| **Performans faydası** | Parça numarası aramalarında 13–68 kat, bot sorgularında 36–258 kat. Ad aramalarında 4,7 kat |
| **Yetki** | `CREATE EXTENSION pg_trgm` **owner bağlantısı** gerektirir; sınırlı `nidah_web` rolüyle çalışmaz |
| **Maliyet** | 50.000 satırda 1,6 sn, +11,4 MB. Yerelde ölçüldü; Neon'da ağ gecikmesi eklenir |
| **Risk** | Yalnız indeks ekler — kolon, tablo, kısıt, veri değişmez. Kod bu indeks olmadan da **doğru** çalışır, sadece yavaştır. Bu yüzden "migration önce, kod sonra" zorunluluğu bu dosya için geçerli değil |
| **Geri alma** | Tek adım: `DROP INDEX IF EXISTS idx_products_pn_norm_trgm; … name_trgm; … oem_number_norm_trgm;` Dosyanın altında yazılı. Veri kaybı yok |
| **Önerim** | **5.000 ürün yayınından ÖNCE uygula.** 5.000'de şart değil ama: (a) maliyeti saniyenin altında, (b) owner bağlantısı gerektirdiği için planlı bir pencerede yapılması daha güvenli, (c) katalog büyüdükçe uygulama süresi ve kilit riski artar |
| **Durum** | Production'a **uygulanmadı** — §12.3 |

---

## 7. Arama önbelleği büyüme sınavı

> "Arama önbelleğinin farklı bot sorgularıyla kontrolsüz büyümediğini doğrula. Karakter ve sayfa sınırlarının tek başına yeterli olduğunu varsayma."

**Haklıydınız. Sınırlar tek başına yeterli DEĞİL.** Ölçümle gösteriyorum.

### 7.1 Sınırlar çalışıyor (doğrulandı)

Soğuk önbellekle, yerel sunucuda:

| İstek | Sonuç |
|---|---|
| `?page=999999` | → `page=500` (tavan), dönen 0 — derin `OFFSET` taraması **yok** |
| `?page=-5` | → `page=1` |
| `?page=abc` | → `page=1` |
| `?limit=9999` | → `limit=48` |
| `?condition=COPCOP` | **yoksayıldı** (total 153 = süzgeçsiz liste) |
| `?search=a` (1 karakter) | **yoksayıldı** (total 153) |
| `?search=...` (yalnız noktalama) | **yoksayıldı** (total 153) |
| `?search=AAAA…` (200 karakter) | 32 karaktere **kesildi**, total 0 |

Sekiz uç değerin tamamı beklendiği gibi kıstırıldı.

### 7.2 Ama kardinalite sınırsız (asıl bulgu)

600 **birbirinden farklı**, 8–11 karakterlik rastgele arama gönderdim (hepsi 32 karakter sınırının içinde, yani hiçbiri kıstırılmadı):

| Ölçüm | Sonuç |
|---|---|
| Gönderilen | 600 (eşzamanlılık 4), HTTP kodları: 600 × 200 |
| Süre | 27 sn (~22 istek/sn — §5.2 doyma noktasıyla tutarlı) |
| **Veritabanı sorgusu** | **1.200** (arama başına 2: liste + toplam) |
| **Oluşan önbellek kaydı** | **604 dosya** |
| **Önbellek boyutu** | **946 KB** (kayıt başına ~1,57 KB) |
| Dizin | `.next/cache/fetch-cache` |

**Sonuç:** karakter ve sayfa sınırları her anahtarın **boyutunu** sınırlıyor ve derin `OFFSET` taramasını engelliyor — ama **farklı anahtar sayısını** sınırlamıyor. Bir bot, 32 karakter sınırına uyan sınırsız sayıda farklı dize üretebilir ve her biri kalıcı bir önbellek kaydı (ve 2 Neon sorgusu) doğurur.

**Doğrusal çıkarım:**

| Farklı bot sorgusu | Önbellek kaydı | Önbellek boyutu | Neon sorgusu |
|---|---|---|---|
| 600 (ölçülen) | 604 | 946 KB | 1.200 |
| 10.000 | ~10.000 | ~15 MB | 20.000 |
| 200.000 | ~200.000 | ~307 MB | 400.000 |
| 1.000.000 | ~1.000.000 | ~1,5 GB | 2.000.000 |

**Vercel tarafındaki gerçek tavan:** bu kayıtlar Vercel'de Runtime Cache'e yazılır. Hobby planı aylık **200.000 yazma** içeriyor (resmî sayfadan okundu; on-demand $4,00–6,40/1M yazma birimi). Yani **ayda 200.000 farklı arama sorgusu Hobby yazma kotasını tüketir.**

### 7.3 Önbellek tekrar eden sorgularda çalışıyor (doğrulandı)

50 **sabit** sorgu × 12 tekrar = 600 istek:

| Ölçüm | Sonuç |
|---|---|
| Gönderilen | 600 |
| **Veritabanı sorgusu** | **100** (= 50 farklı sorgu × 2) |
| Yeni önbellek kaydı | +50 |

**600 isteğin 500'ü Neon'a hiç inmedi.** Önbellek asıl işini — tekrar eden trafiği emmeyi — yapıyor. Sorun yalnızca kardinalitede.

### 7.4 Öneri (uygulanmadı, onay bekliyor)

**Kısa vade — en düşük maliyetli (0 TL, küçük değişiklik):** `/api/products` rotasına IP başına hız sınırı. Projede zaten kullanılan bir sınırlayıcı var (`src/lib/rate-limit.ts`, teklif formunda kullanılıyor). Arama içeren isteklere dakikada 30 gibi bir sınır, tek bir IP'yi ayda ~1,3M isteğe kısar; birden çok IP için global bir tavan da eklenebilir.

**Orta vade — yapısal çözüm:** "arama sözlüğü" koruması. Tek bir önbellek kaydında normalize parça numaralarının 3-gram kümesini tut; gelen sorgunun 3-gram'ları bu kümede yoksa **hiç eşleşme olamayacağı kesindir** → boş sonuç anında dönülür, ne Neon sorgusu ne yeni önbellek kaydı oluşur. Tek bir önbellek artefaktı bütün çöp sorguları karşılar. Maliyeti: 50.000 parça numarası üzerinde bir kerelik sorgu, ürün etiketiyle önbelleğe alınır.

Bu bir mimari değişikliktir; ölçüm ve tasarım hazır, uygulama onayınızı bekliyor.

---

## 8. Neon kapasitesi

### 8.1 Resmî ücretsiz paket sınırları (neon.com/pricing, 4 Kasım 2026 güncellemesi, doğrudan okundu)

| Kalem | Değer | Önemi |
|---|---|---|
| Compute | **100 CU-saat / PROJE** | Kota **proje başına**. `nidah-dev` tüketimi production'ın kotasını yemez |
| Depolama | **1 GB / proje**, hesap toplamı 20 GB | Aşılırsa **yazma durur** |
| Ağ transferi | 5 GB / proje | |
| Autoscaling | 2 CU'ya kadar (8 GB RAM) | CU-saat tahmininin üst ucu buradan |
| Branch | proje başına 10 | |
| Scale to zero | 5 dakika, ücretsizde **daima açık** | |
| Proje sayısı | 100 | |
| Geçmiş penceresi | 6 saat | |
| **Kota bitince** | **Compute askıya alınır**, sonraki fatura döneminin başında veya yükseltmede döner. Veri **silinmez** | Aşağıdaki en kritik madde |

Önceki raporda "1 GB" dediğim depolama sınırı **doğrulandı**; "100 CU-saat"in proje başına olduğu da **doğrulandı** (organizasyon genelindeki 104,36 CU-saat toplamı bu yüzden tek başına bir aşım göstergesi değil).

### 8.2 Ölçülen depolama ihtiyacı

| Ürün sayısı | `products` | `oem_numbers` | `fitments` | **Toplam DB** | Trigramlı |
|---|---|---|---|---|---|
| 5.000 | 9,5 MB | 3,4 MB | 2,4 MB | **24 MB** | 26 MB |
| 10.000 | 18 MB | 6,6 MB | 4,7 MB | **39 MB** | ~42 MB |
| 50.000 | 92 MB | 32 MB | 25 MB | **159 MB** | **170 MB** |

Satır başına: `products` **1,88 KB**; ürün başına toplam (muadil + uyumluluk dahil) **3,05 KB**.

**50.000 ürün, trigram dahil 170 MB — Neon'un 1 GB sınırının %17'si.** Depolama bu projede darboğaz değil.

> **Varsayım uyarısı:** sentetik ürünlerde açıklama alanları gerçekçi uzunlukta tutuldu (kısa açıklama 150, açıklama 420, uzun açıklama 1.200, meta açıklama 160 karakter) ve satır boyutunun büyük kısmı bu metinlerden geliyor. Gerçek ürünlerin metinleri daha kısa veya uzun olabilir; ±%50 sapma bile 170 MB'ı 85–255 MB yapar, hâlâ sınırın içinde.

### 8.3 Ürün detay sayfasının sorgu maliyeti satır sayısından BAĞIMSIZ

50.000 satırda, detay sayfasının gerçek sorgu grubu:

| Sorgu | Süre | Plan |
|---|---|---|
| Ürün ana kaydı | **0,081 ms** | `Index Scan using uq_products_pn_norm` |
| Görseller | 0,046 ms | (tablo boş) |
| Makine uyumlulukları | **0,137 ms** | `Bitmap Index Scan on idx_fitments_product` |
| Muadil numaralar | 0,076 ms | `Bitmap Index Scan on uq_oem_product_number_type` |
| Çeviriler | 0,021 ms | (tablo boş) |
| **toplam** | **~0,36 ms** | hepsi indeksli |

Bu önemli: **ürün sayfasının veritabanı maliyeti 166 üründe de 50.000 üründe de aynıdır** (benzersiz indeks üzerinden `O(log n)`). Dolayısıyla §5.2'deki 51 ms'lik yanıt süresi veritabanından değil, React render + Next serileştirmesinden geliyor; 50.000 ürüne çıkıldığında sayfa başına ısıtma maliyeti **artmaz**.

### 8.4 Beklenen Neon iyileşmesi

| Kalem | Durum |
|---|---|
| B1 (etiket tabanlı önbellek) | ✅ canlıda — `/blog` 6→0, `/blog/kategori` 7→0, ürün sayfası 5→0, marka sayfası 4→0, `/api/products` 4→0 sorgu (önceki raporda ölçüldü) |
| Aşama 3 (istek üzerine ISR) | ✅ canlıda — ikinci istekte sayfa başına ~0 sorgu (bu raporda ölçüldü: 145 sayfa → 4–20 sorgu) |
| `/api/health` sığ | ✅ canlıda — Neon'a hiç dokunmuyor (`database: "skipped"`) |
| **Gerçek CU-saat iyileşmesi** | **ÖLÇÜLEMEDİ.** Yalnızca Neon konsolundaki Monitoring → Compute grafiği gösterir |

İyileşmenin canlı kanıtı ancak Neon panelinden okunabilir. Önceki raporun §6.1–6.7 ekran görüntüsü listesi geçerliliğini koruyor; en değerli ikisi **26 Kasım'da Monitoring → Compute (son 24 saat)** ve **1 Aralık sonrası Billing → Usage**.

### 8.5 En kritik tarih kısıtı

Kalan **3,14 CU-saat**, 1 Aralık'a kadar yetmeli. 5.000 ürünün yayınlanması şunları gerektirir:

| İşlem | Tahmini CU-saat |
|---|---|
| 5.000 ürünün içe aktarılması (admin yazma, toplu) | 0,1 – 0,5 (ölçülmedi) |
| Trigram migration | < 0,01 |
| Isıtma (5.000 sayfa ÷ 20 istek/sn = 4,2 dk) | **0,04 – 0,31** |
| Google'ın ilk taraması | ısıtılmışsa ~0 |

Toplam kabaca 0,15–0,85 CU-saat. 3,14 içinde **görünüyor**, ama içe aktarma maliyeti ölçülmedi ve kota biterse **compute askıya alınır**. Riski almaya değmez: **1 Aralık'ı bekleyin.**

**İyi haber:** compute askıya alınsa bile site ayakta kalır. B1 + Aşama 3 sonrası public yüzeyin tamamı önbellekten servis ediliyor; `site_settings` okunamadığında fail-closed varsayılanlar devreye girer (içerik sayfaları 200, katalog 404). Bu davranış daha önce ölçülmüştü (proje CLAUDE.md §2). Yani kota bitişi artık site çöküşü değil, admin ve taze içerik donması anlamına gelir.

---

## 9. Görsel depolama altyapısı

**Hiçbir şey değiştirilmedi.** Yalnızca araştırma, karşılaştırma ve geçiş planı — istediğiniz gibi. Mevcut Cloudinary kurulumu olduğu yerde.

**Mevcut durum:** projede doğrulanmış ürün fotoğrafı sayısı **0** (yerel API'den teyit edildi: ilk 48 ürünün hiçbirinde görsel yok). Yani henüz hiçbir maliyet oluşmuyor ve politika seçimi için **tam serbestlik** var.

### 9.1 Resmî birim fiyatlar (hepsi sağlayıcının kendi sayfasından okundu)

| Sağlayıcı | Depolama | Aktarım (egress) | Dönüşüm | Ücretsiz kota |
|---|---|---|---|---|
| **Cloudinary** | 1 kredi = 1 GB/ay | 1 kredi = 1 GB | 1 kredi = 1.000 dönüşüm | **25 kredi/ay.** Plus 225 kredi $99/ay; Advanced 600 kredi $249/ay. Aşım politikası sayfada **yazmıyor** |
| **Cloudflare R2** | **$0,015/GB-ay** | **$0 — ücretsiz** | yok (ayrı ürün) | 10 GB depolama, 1M Class A, 10M Class B |
| **Cloudflare Images** | $5 / 100.000 görsel/ay | $1 / 100.000 teslim | **$0,50 / 1.000** benzersiz dönüşüm | **5.000 benzersiz dönüşüm/ay.** **R2'de duran görselleri dönüştürebilir** |
| **Vercel Blob** | $0,023/GB-ay (iad1) | $0,05/GB | — | Hobby: 1 GB depolama, 10 GB aktarım |
| **Vercel next/image** | — | — | **$0,05–0,0812 / 1.000** | Hobby: 5.000 dönüşüm/ay, 300K önbellek okuma |
| **Amazon S3** | ~$0,023/GB-ay* | ~$0,09/GB* | yok | 100 GB/ay egress* |

\* S3 rakamları **üçüncü taraf** kaynaklardan; AWS'nin kendi fiyat tablosu sayfanın metninden çıkarılamadı. **Doğrulanmadı.**

### 9.2 Asıl bulgu: sağlayıcı seçiminden ÖNEMLİ olan yükleme politikası

Tek değişken, her şeyi belirliyor: fotoğraf yüklenirken küçültülüyor mu?

| | Ham telefon fotoğrafı | Yükleme öncesi küçültme (maks 1600 px) |
|---|---|---|
| Fotoğraf başına depolanan (orijinal + türevler) | 2,8 MB | **0,45 MB** |
| 50.000 ürün × 3 fotoğraf | **410 GB** | **66 GB** |
| Cloudinary karşılığı | 410 kredi → **Advanced $249/ay** | 66 kredi → Plus $99/ay |
| 50.000 ürün × 1 fotoğraf | 137 GB → Plus $99/ay | **22 GB → ÜCRETSİZ** |

**6,2 kat fark.** Küçültme politikası, 50.000 ürün × 1 fotoğrafı Cloudinary'nin ücretsiz paketinde tutuyor.

### 9.3 Depolama ihtiyacı ve aylık maliyet (küçültme politikasıyla)

| Senaryo | GB | Cloudinary | R2 | Vercel Blob | S3* |
|---|---|---|---|---|---|
| 5.000 × 1 | 2,2 | **Ücretsiz** | $0,00 | $0,03 | $0,05 |
| 5.000 × 3 | 6,6 | **Ücretsiz** | $0,00 | $0,13 | $0,15 |
| 5.000 × 5 | 11,0 | **Ücretsiz** | $0,01 | $0,23 | $0,25 |
| 10.000 × 1 | 4,4 | **Ücretsiz** | $0,00 | $0,08 | $0,10 |
| 10.000 × 3 | 13,2 | **Ücretsiz** | $0,05 | $0,28 | $0,30 |
| 10.000 × 5 | 22,0 | **Ücretsiz** | $0,18 | $0,48 | $0,51 |
| 50.000 × 1 | 22,0 | **Ücretsiz** | $0,18 | $0,48 | $0,51 |
| 50.000 × 3 | 65,9 | Plus **$99** | **$0,84** | $1,49 | $1,52 |
| 50.000 × 5 | 109,9 | Plus **$99** | **$1,50** | $2,50 | $2,53 |

Ham yükleme politikasıyla aynı tablo (karşılaştırma için): 5.000 × 3 = 41 GB → Cloudinary Plus $99; 50.000 × 3 = 410 GB → Advanced $249; 50.000 × 5 = 684 GB → **Advanced'ı da aşar**.

### 9.4 Dönüşüm maliyeti — katalog boyutuna değil, TRAFİĞE bağlı

Varsayım: ziyaretçi/gün × 30 gün × 3 ürün görüntülemesi; görüntülenenlerin %60'ı tekil; tekil ürün başına 4 benzersiz dönüşüm (liste küçük resmi + 3 detay boyu).

| Ziyaretçi/gün | Benzersiz dönüşüm/ay | Cloudflare Images | Vercel next/image | Cloudinary (kredi) |
|---|---|---|---|---|
| 100 | 21.600 | $8,30 | **$0,83 – $1,35** | 22 kredi |
| 1.000 | 216.000 | $105,50 | **$10,55 – $17,13** | 216 kredi → Plus sınırında |
| 5.000 | 1.080.000 | $537,50 | **$53,75 – $87,29** | 1.080 kredi → Advanced'ı aşar |
| 10.000 | 2.160.000 | $1.077,50 | **$107,75 – $174,99** | 2.160 kredi → çok aşar |

**Önemli fark:** Cloudflare "benzersiz dönüşüm"ü **takvim ayı başına** sayar (aynı ay içindeki tekrarlar bir sayılır). Vercel ise yalnızca önbellek **MISS ve STALE** durumunda faturalar ve önbellek kalıcıdır — yani statik bir katalogda ilk aydan sonra maliyet çok düşer. Statik ürün fotoğrafları için bu Vercel'i belirgin biçimde öne çıkarır.

> Cloudflare belgesinin "her ay 5.000 benzersiz dönüşüm" ifadesinden aylık yeniden sayımı **çıkarsadım**; belge bunu açıkça söylemiyor. Karar öncesi teyit edilmeli.

### 9.5 Teslimat bant genişliği

Varsayım: görüntüleme başına 450 KB görsel verisi (1 küçük resim + 2 detay görseli, WebP).

| Ziyaretçi/gün | Aylık teslim | R2 | Cloudinary | Vercel Blob | S3* |
|---|---|---|---|---|---|
| 100 | 4,0 GB | **$0** | 4 kredi | $0,00 | $0,00 |
| 1.000 | 39,6 GB | **$0** | 40 kredi | $1,48 | $0,00 |
| 5.000 | 197,8 GB | **$0** | 198 kredi | $9,39 | $8,80 |
| 10.000 | 395,5 GB | **$0** | 396 kredi | $19,28 | $26,60 |

**R2'nin ücretsiz egress'i burada belirleyici.** Cloudinary'de bant genişliği depolamayla aynı kredi havuzundan yiyor; 1.000 ziyaretçi/günde depolama + bant + dönüşüm toplamı Plus'ın 225 kredisini aşar.

### 9.6 Teknik çizim ve PDF katalog

Varsayım: ürün başına 1 teknik çizim (200 KB), 20 üründe 1 PDF katalog (3 MB).

| Ürün | Çizim | PDF | Toplam | R2 $/ay | Cloudinary kredi/ay |
|---|---|---|---|---|---|
| 5.000 | 0,98 GB | 0,73 GB | 1,71 GB | $0,026 | 1,7 |
| 10.000 | 1,95 GB | 1,46 GB | 3,42 GB | $0,051 | 3,4 |
| 50.000 | 9,77 GB | 7,32 GB | **17,09 GB** | **$0,256** | **17,1** |

**Bunlar Cloudinary'de durmamalı.** PDF ve teknik çizim **dönüşüm gerektirmez** — sadece indirilir. Cloudinary'de 17 kredi/ay yiyip görsellere kalan krediyi azaltırlar; R2'de ücretsiz 10 GB'ın üstü 26 sent/ay ve egress bedava. Taşınacak ilk şey bunlar.

### 9.7 Değerlendirme: SEO, WebP/AVIF, Next.js entegrasyonu, sağlayıcı bağımlılığı

| Kriter | Cloudinary | R2 + Cloudflare Images | R2 + next/image | Vercel Blob + next/image | S3 |
|---|---|---|---|---|---|
| WebP/AVIF otomatik | ✅ | ✅ | ✅ | ✅ | ❌ (kendin üret) |
| Next.js entegrasyonu | `remotePatterns` ile çalışır; ayrıca kendi loader'ı var | `remotePatterns` | **yerel** (`next/image`) | **yerel** | `remotePatterns` |
| CDN | ✅ dahil | ✅ Cloudflare | ✅ Vercel | ✅ Vercel | ❌ CloudFront ayrı |
| Egress maliyeti | kredi yiyor | **$0** | **$0** | $0,05/GB | $0,09/GB |
| SEO (görsel URL kararlılığı) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sağlayıcı bağımlılığı** | **Yüksek** — dönüşüm URL söz dizimi Cloudinary'ye özgü, taşınırken bütün URL'ler değişir | Orta — R2 S3 uyumlu, görseller taşınabilir; dönüşüm söz dizimi Cloudflare'e özgü | **Düşük** — depolama S3 uyumlu, dönüşüm Next.js'in standart `next/image`'ı | Orta — Blob Vercel'e özgü | Düşük |
| PDF / çizim | kredi yiyor | ✅ ucuz | ✅ ucuz | pahalı egress | ✅ |

### 9.8 Önerilen geçiş planı (uygulanmadı)

**Adım 0 — şimdi yapılması gereken, bedelsiz ve en etkili:** fotoğraf yükleme akışına **küçültme** ekle (maks 1600 px, WebP q80). Toplu yükleme başlamadan önce yapılmalı; sonradan yapılırsa 6,2 kat fazla depolama zaten ödenmiş olur. Tek başına 50.000 × 1 fotoğrafı ücretsiz paketin içinde tutar.

**Adım 1 — PDF ve teknik çizimleri R2'ye taşı.** Dönüşüm gerektirmiyorlar, egress bedava, 50.000 üründe 26 sent/ay. Cloudinary kredisini görsellere bırakır. Düşük riskli, geri alınabilir.

**Adım 2 — eşik izlemesi kur.** Cloudinary kullanımı 20 kredi/ayı (25'in %80'i) geçtiğinde uyarı. Eşik aşılmadan karar vermeye gerek yok.

**Adım 3 — eşik aşılırsa: R2 + `next/image`.** Gerekçe: en düşük toplam maliyet (depolama $0,015/GB + ücretsiz egress + dönüşüm $0,05–0,0812/1.000, kalıcı önbellekle), en düşük sağlayıcı bağımlılığı (S3 uyumlu depolama + standart `next/image`). Geçiş: görselleri R2'ye kopyala, `remotePatterns`a R2 alan adını ekle, `product_images.cloudinary_url` kolonunu yeni URL'lerle güncelle (kolon adı yanıltıcı kalır; migration ile yeniden adlandırılabilir), Cloudinary'yi 30 gün yedek olarak tut, sonra kapat.

**Adım 4 — Cloudflare Images yalnızca Vercel'den ayrılırsanız.** Dönüşüm birim fiyatı Vercel'in 6–10 katı ($0,50 vs $0,05–0,0812 / 1.000).

---

## 10. Teklif formu: yöneticinin e-posta hatasından haberdar olması

**Sorun:** veritabanı kaydı başarılı, yönetici e-postası başarısız olduğunda talep **kaybolmuyor** (kayıt duruyor) ve müşteriye doğru biçimde başarı gösteriliyor. Ama **yönetici bunu bilmiyor** — panele girip yeni kaydı fark etmesi gerekiyor. Hata Sentry'ye gidiyor, ancak Sentry sunucu tarafı dışarıdan doğrulanamadı ve yöneticinin günlük akışında değil.

### Öneri A — migration GEREKTİRMEYEN, en düşük maliyetli (önerilen)

E-posta gönderimi başarısız olduğunda ve kayıt düşmüşse:
- `priority = 'urgent'` olarak ayarla,
- `adminNote` alanına tek satır ekle: `[SİSTEM] Yönetici e-postası gönderilemedi (<hataAdı>) — <ISO zaman>`.

Her iki alan **zaten var** ve yönetim panelinde **zaten görünüyor**. Şema değişikliği yok, migration yok, yeni servis yok, ek maliyet yok. Teklif listesinde acil işaretli bir kayıt hemen dikkat çeker.

Kod yerleşimi: `src/app/api/rfq/route.ts` içinde, `sendAdminNotification()` dönüşünden sonra:

```
if (kaydedildi && !yoneticiSonucu.sent) {
  // tek ek UPDATE — yalnızca e-posta BAŞARISIZ olduğunda, yani çok seyrek
  await db.update(rfqSubmissions)
    .set({ priority: "urgent", adminNote: sql`coalesce(admin_note || E'\n', '') || ${isaret}` })
    .where(eq(rfqSubmissions.id, kayitId));
}
```

Maliyeti: yalnızca hata durumunda bir ek `UPDATE`. Neon tüketimi ihmal edilebilir.

### Öneri B — temiz ama migration gerektiren (sonraya)

`rfq_submissions` tablosuna üç kolon: `admin_email_status` (`sent`/`failed`/`skipped`), `admin_email_error` (hata **adı**, mesaj değil), `admin_email_attempted_at`. Panelin teklif listesinde ayrı bir rozet, `/api/admin/stats`'ta "e-postası gitmeyen talep" sayacı, panel ana sayfasında uyarı.

Daha doğru bir veri modeli ama migration + admin API + arayüz değişikliği gerektirir. A uygulandıktan sonra, acele olmadan yapılabilir.

**Her iki öneri de uygulanmadı** — §12.4.

---

## 11. Yapılan CLAUDE.md düzeltmesi

Onayladığınız kapsamda, **ortam değişkeni** bilgisi düzeltildi.

**Düzeltilen (§4):** "Ancak `RESEND_API_KEY` yerelde tanımlı olduğu için gerçek e-posta gönderilir." Bu **artık doğru değil**. Ölçüldü: `.env.local` içinde `RESEND_API_KEY` ve `ADMIN_EMAIL` **boş** (anahtar adları var, değerleri yok). Yerelden gerçek e-posta **gitmez**. Yerine yazılan: boş olduğu bilgisi, `RESEND_BASE_URL` ile saplama kullanımı, ve gerçek teslimatın yalnızca production'da (açıkça TEST işaretli taleple) doğrulanabileceği.

**Düzeltilmeyen (onayınızı bekliyor):** §10 tablosunda "Vercel Analytics / Speed Insights: ❌ Yok" satırı. Kod bunu yalanlıyor — `src/app/layout.tsx:185-186` içinde `<Analytics />` ve `<SpeedInsights />` **monte**, paketler kurulu (`@vercel/analytics` 2.0.1, `@vercel/speed-insights` 2.0.0). Panelde veri toplanıp toplanmadığı doğrulanamadı (Vercel panosuna erişim yok). Bu bir ortam değişkeni bilgisi olmadığı için onayınızın kapsamı dışında gördüm ve **dokunmadım** — §12.6.

---

## 12. Benden gereken onaylar ve kararlar

### 12.1 Production TEST-0000 kaydının silinmesi — SİZİN YAPMANIZ GEREKİYOR

Silme yetkisini verdiniz, ama bunu teknik olarak yapamıyorum. Kayıt yalnızca iki yolla silinebilir:
- `DELETE /api/admin/rfq/<id>` — admin JWT'si arkasında, yani production yönetim paneline **gerçek parolayla oturum açmam** gerekir;
- production veritabanına owner bağlantısıyla doğrudan SQL.

Birincisi güvenlik kurallarım gereği bana kapalı (production sistemine kimlik bilgisiyle oturum açmam). İkincisi, denetlenen bir arayüz varken production verisini doğrudan SQL ile silmek daha riskli bir yol.

**Yapmanız gereken (tek tık):** Yönetim paneli → Teklifler → ad alanı **"TEST - ALTYAPI DOGRULAMASI (islem gerekmez)"**, parça numarası **TEST-0000**, tarih **25 Kasım 2026** olan kaydı sil. Başka hiçbir kayda dokunmayın.

### 12.2 `8f95600` commit'inin push edilmesi

İçerik: önbellek ısıtma script'i + CLAUDE.md düzeltmesi + `.gitignore`. Uygulama yüzeyini değiştirmiyor; deploy app davranışı açısından etkisiz. tsc temiz, lint 34 (baseline 38, artış yok), build başarılı. **Onayınızı bekliyor.**

### 12.3 Trigram migration'ının production'a uygulanması

`drizzle/0014_part_search_trgm.sql`, **owner bağlantısıyla** (`CREATE EXTENSION pg_trgm` sınırlı rolle çalışmaz). Yerelde 50.000 satırda 1,6 sn, +11,4 MB ölçüldü. Yalnız indeks ekler; veri değişmez; geri alma tek `DROP INDEX`.

**Önerim:** 5.000 ürün yayınından önce, planlı bir pencerede. **Henüz uygulanmadı.**

### 12.4 Teklif formu e-posta uyarısı (Öneri A)

§10'daki migration gerektirmeyen çözüm. Küçük bir kod değişikliği, 0 TL. Uygulamamı ister misiniz?

### 12.5 `site_settings` okumasına yeniden deneme

§5.3'teki bulgu: yük altında ayar okuması düşüyor ve **açık** bir sayfa 404 veriyor. Fail-closed davranış doğru, ama tek bir geçici hatada 404'e düşmek fazla hassas. Öneri: ayar okumasına tek bir kısa yeniden deneme (örn. 150 ms sonra) eklemek. Fail-closed mantığı korunur, geçici dalgalanma emilir.

Bu, `src/lib/site-settings.ts` dosyasına dokunur — proje CLAUDE.md'de "mekanizma değiştirilmez" diye işaretli. Bu yüzden **ayrı onayınızı istiyorum.**

### 12.6 CLAUDE.md §10 Analytics satırının düzeltilmesi

§11'de anlattığım, kodla çelişen satır. Düzeltmemi ister misiniz?

### 12.7 Production'da toplu ısıtma

Script hazır ve dev'de ölçüldü, production'da **çalıştırılmadı**. 5.000 ürün yayınından hemen sonra çalıştırılması gerekir. Tahmini: 4,2 dakika, 0,04–0,31 CU-saat. **Ayrı onay gerektirdiğini belirtmiştiniz; çalıştırılmadı.**

### 12.8 Karar: 1 Aralık'ı beklemek

§8.5'teki gerekçeyle, 5.000 ürünün 1 Aralık'tan önce yayınlanmamasını öneriyorum. Bu bir onay değil, sizin takvim kararınız.

---

## 13. NİDAH GROUP 5.000 ürünü yayınlamaya hazır mı?

**Altyapı olarak EVET.** Ölçümler bunu destekliyor:

| Boyut | 5.000 üründe durum | Kanıt |
|---|---|---|
| Arama performansı | ✅ 5,5 ms (trigramsız bile kabul edilebilir) | §6.1 ölçüm |
| Depolama | ✅ 24–26 MB / 1 GB sınır (%2,5) | §8.2 ölçüm |
| Ürün sayfası veritabanı maliyeti | ✅ 0,36 ms, satır sayısından bağımsız | §8.3 ölçüm |
| Önbellek mimarisi | ✅ ikinci istekte 0 sorgu | §5.2 ölçüm |
| Isıtma penceresi | ✅ 4,2 dk, 0,04–0,31 CU-saat | §5.2 çıkarım |
| SEO yüzeyi | ✅ sitemap / canonical / hreflang / JSON-LD / gerçek 404 | §3 canlı doğrulama |
| Teklif akışı | ✅ uçtan uca, gerçek e-posta teslim edildi | §4 |
| Vercel maliyeti | ✅ Hobby kotalarının içinde | §5.5 |

### Kalan somut eksikler

**Yayını ENGELLEYEN (4):**

1. **Neon kotası — 1 Aralık'a kadar bekle.** Kalan 3,14 CU-saat; içe aktarma + ısıtma tahmini 0,15–0,85 CU-saat ve içe aktarma maliyeti **ölçülmedi**. Kota bitince compute askıya alınır. *Çözüm: tarih. Maliyet: 0 TL.*
2. **Fotoğraf yükleme politikası belirlenmedi.** Toplu yükleme küçültme olmadan başlarsa 6,2 kat fazla depolama kalıcı olarak ödenir ve Cloudinary ücretsiz paketi 5.000 × 3 fotoğrafta aşılır. *Çözüm: yükleme akışına küçültme (maks 1600 px, WebP q80). Maliyet: 0 TL, geliştirme işi.*
3. **Trigram migration uygulanmadı.** 5.000'de şart değil ama owner bağlantısı gerektirdiği için planlı bir pencerede, yayından önce yapılmalı. *Çözüm: §12.3. Maliyet: 0 TL.*
4. **Isıtma production'da hiç çalışmadı.** Script hazır ve ölçüldü, ama canlıda bir kez de olsa denenmedi. *Çözüm: yayından hemen sonra, onayla. Maliyet: 0,04–0,31 CU-saat.*

**Yayını engellemeyen ama düzeltilmesi gereken (4):**

5. **`/api/products` arama kardinalitesi korumasız.** §7.2: 200.000 farklı bot sorgusu Vercel Hobby yazma kotasını tüketir. Bugün gerçek bir saldırı yok, ama katalog açılınca yüzey büyür. *Çözüm: §7.4 kısa vade (hız sınırı). Maliyet: 0 TL.*
6. **Yük altında yanlış 404.** §5.3: eşzamanlılık 6'da %7,6. Googlebot o anda isterse açık bir ürün sayfası için 404 görür. Yerelde önbelleğe yazılmadığı doğrulandı, Vercel'de doğrulanamadı. *Çözüm: §12.5. Maliyet: 0 TL.*
7. **Yönetici e-posta hatasından haberdar değil.** §10. *Çözüm: Öneri A. Maliyet: 0 TL.*
8. **Sentry istemci DSN'i yok** → tarayıcı hataları görünmüyor. Yayının en riskli döneminde kör kalınır. *Çözüm: `NEXT_PUBLIC_SENTRY_DSN` tanımla. Maliyet: mevcut Sentry planı dahilinde.*

**50.000 ürüne giderken ayrıca gerekecek (şimdi değil):**

9. Trigram **zorunlu** hâle gelir (57 ms → 0,8 ms).
10. `sitemap.xml` 50.000 URL sınırına dayanır → sitemap index gerekir.
11. Marka sayfalarında segment tabanlı sayfalama (`/parca-katalog/volvo/sayfa/2`); `page>500` tavanı 12.000 ürüne kadar erişim verir.
12. Derin sayfalama için keyset sayfalama (`OFFSET` taraması verimsiz).
13. Fotoğraf politikasına göre R2 geçişi (§9.8).

---

## 14. Yapılmayan ve ölçülemeyenler

Dürüstlük kaydı:

| Konu | Durum |
|---|---|
| Gerçek Neon CU-saat iyileşmesi | **ÖLÇÜLEMEDİ** — yalnızca Neon konsolu gösterir |
| Production DB okuma/yazma | **ERİŞİLEMEDİ** — bu oturumda hiç bağlanılmadı |
| Vercel logları, Vercel panosu | **ERİŞİLEMEDİ** (CLI kurulu değil, MCP yetkilendirilmemiş) |
| Vercel'de ISR 404 önbellekleme davranışı | **DOĞRULANAMADI** — yerelde ölçüldü, Vercel'de katalog kapalı |
| Vercel ISR yazma/okuma dahil kotası | Resmî sayfalarda **YAZMIYOR** |
| Müşteri makbuzu e-postasının teslimi | **ÖLÇÜLMEDİ** |
| Cloudinary aşım ücretlendirme politikası | Resmî sayfada **YAZMIYOR** |
| Resend idempotency anahtarının kapsamı (API anahtarı mı, hesap mı) | Resmî belgede **YAZMIYOR** |
| AWS S3 resmî birim fiyatları | Sayfa metninden **çıkarılamadı** — üçüncü taraf rakamlar kullanıldı, doğrulanmadı |
| 5.000 ürünün içe aktarılmasının CU-saat maliyeti | **ÖLÇÜLMEDİ** |
| Lighthouse, LCP/CLS/INP, kontrast denetimi | **ÖLÇÜLMEDİ** (bu oturumun kapsamı dışında) |
| Fotoğraf boyutu varsayımları | **VARSAYIM** — doğrulanmış fotoğraf sayısı 0 |

### Temizlenen geçici veriler

| Ne | Durum |
|---|---|
| Yerel `postgres:17` ölçüm konteyneri (50.000 sentetik ürün) | ✅ tamamen silindi (`docker rm -f nidah-olcum-pg`) |
| Yerel test sunucuları (port 3100) | ✅ kapatıldı, dinleyici 0 |
| `.next/cache`, `.onbellek-isitma/` | ✅ silindi |
| Dev Neon veritabanı | ✅ **hiç yazılmadı** — bu oturumda yalnızca okundu |
| StockSuite Docker yığını | ✅ **dokunulmadı** (doğrulandı: 4 konteyner çalışıyor) |
| Katalog çalışması dosyaları | ✅ **dokunulmadı** (58 dosya) |

---

## Kaynaklar

Birim fiyatlar ve teknik davranışlar için okunan resmî sayfalar:

- [Resend — Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Neon — Pricing](https://neon.com/pricing)
- [Vercel — Pricing](https://vercel.com/docs/pricing)
- [Vercel — Regional Pricing](https://vercel.com/docs/pricing/regional-pricing)
- [Vercel — Incremental Static Regeneration](https://vercel.com/docs/incremental-static-regeneration)
- [Vercel — ISR limits and pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing)
- [Vercel — Image Optimization limits and pricing](https://vercel.com/docs/image-optimization/limits-and-pricing)
- [Vercel Blob — Usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Cloudflare R2 — Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Images — Pricing](https://developers.cloudflare.com/images/pricing/)
- [Cloudinary — Pricing](https://cloudinary.com/pricing)
- [Amazon S3 — Pricing](https://aws.amazon.com/s3/pricing/) — rate tablosu sayfa metninden **çıkarılamadı**; S3 rakamları üçüncü taraf kaynaklardan ve **doğrulanmamıştır**
