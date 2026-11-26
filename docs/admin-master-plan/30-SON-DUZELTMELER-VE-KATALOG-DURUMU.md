# Son Teknik Düzeltmeler ve Katalog Durumu — NİHAİ RAPOR

**Tarih:** 2026-11-26
**Canlıdaki commit:** `44b6cf9` (= `origin/main`)
**Yerelde bekleyen commit:** `da64d46` — **push edilmedi, deploy edilmedi**

---

## YÖNETİCİ ÖZETİ

**Push edildi ve canlıda:** ısıtma sistemi, rapor 27 ve iki belge düzeltmesi
(üç commit). Canlı site doğrulandı: sitemap 63 URL / katalog 0 / tekrar 0,
katalog yolları gerçek 404, `/blog/tr` ve `/en/blog` 308, canonical 1,
Organization 1, blog yazısında 5 hreflang, ISR etkin.

**Arama önbelleği sorunu çözüldü ve ölçüldü.** 600 farklı bot sorgusu artık
**0 kalıcı önbellek kaydı ve 0 Neon sorgusu** üretiyor (önce: 604 kayıt /
946 KB / 1.200 sorgu). Gerçek parça numarası aramaları aynen önbellekli ve
doğru çalışıyor.

**Geçici yanlış 404 riski çözüldü ve ölçüldü.** Ayarlar okunamazken açık bir
ürün sayfası artık **500** dönüyor (önce **404**), bu 500 **önbelleğe
alınmıyor**, arıza geçtiğinde sayfa **kendiliğinden 200'e** dönüyor. Gerçekten
kapalı katalog **gerçek 404** dönmeye devam ediyor.

**Isıtma varsayılan eşzamanlılığı 1'e çekildi** (canlıda).

**1 Aralık operasyon planı** ve **görsel yükleme politikası** yazıldı —
belge 28 ve 29.

**Soru: site 5.000 ürünün yayınlanmasına hazır mı?**
**Altyapı açısından EVET. İçerik açısından HAYIR.** Altyapıda kalan dört
işlem onay bekliyor (hiçbiri geliştirme değil, operasyon). Asıl engel
içerik: **production'da doğrulanmış fotoğraf sayısı 0/157** ve yayın kapısı
doğrulanmış fotoğraf olmadan hiçbir ürünü geçirmiyor. Yani bugün yayınlanabilir
ürün sayısı **sıfırdır** ve bu bir altyapı eksiği değil, veri eksiğidir.

**Bu raporda yapılan bir düzeltme:** CLAUDE.md §1 "Test altyapısı yok" diyor;
ölçüldü, **yanlış** — `playwright.config.ts` + 33 spec dosyası var ve
**514 test 6,6 saniyede geçiyor**. Satır onayınızı bekliyor (§8).

---

## 1. Push edilen commit'ler ve denetimi

### 1.1 Push öncesi güvenlik denetimi (istediğiniz üç kontrol)

| Kontrol | Yöntem | Sonuç |
|---|---|---|
| **Deployment sırasında otomatik çalışmıyor** | `vercel.json` içinde `crons`/`schedules` **yok**; `.github/workflows` dizini **yok**; `npm run build` = `next build && node scripts/isr-yazma-korumasi.mjs` — ısıtma script'ini çağırmıyor | ✅ |
| **Production veritabanına bağlanmıyor** | Script'in tüm `import`'ları: `node:fs`, `node:path`, `node:util`. DB sürücüsü, `DATABASE_URL` okuması, `drizzle` referansı **yok** | ✅ |
| **Kendiliğinden toplu istek oluşturmuyor** | `--taban` **zorunlu** (varsayılan yok, production adresi gömülü değil); dört tavan (istek, süre, CU-saat, hata oranı); varsayılan eşzamanlılık **1**, istek aralığı 200 ms | ✅ |

Ek olarak: repo genelinde `onbellek-isitma` referansı yalnızca script'in
**kendi yardım metninde** geçiyor — başka hiçbir dosya onu çağırmıyor.

### 1.2 Push

```
2ab4a3b..44b6cf9  main -> main
```

| Commit | İçerik | `src/` dokundu mu |
|---|---|---|
| `8f95600` | Isıtma sistemi + `.gitignore` + CLAUDE.md §4 | **hayır** |
| `1f3611e` | Rapor 27 | **hayır** |
| `44b6cf9` | Eşzamanlılık 1 + CLAUDE.md §10 | **hayır** |

Üç commit'in birleşik diff'inde `src/` altında **hiç değişiklik yok** —
yani uygulama kodu dokunulmadı ve deploy davranışsal risk taşımadı.

**Gereksiz Neon tüketimi:** push **bir** Vercel production build'i tetikledi
(kaçınılamaz; `ignoreCommand` tanımlı değil). Build sitemap ve blog
sorgularını çalıştırır. Üç commit tek push'ta gönderildiği için **bir** build
oldu, üç değil.

### 1.3 Canlı doğrulama (push sonrası, 2026-11-26)

| Kontrol | Ölçülen |
|---|---|
| `/sitemap.xml` | **200**, `application/xml`, `X-Vercel-Cache: PRERENDER`, **63 URL**, katalog **0**, tekrar **0** |
| `/` · `/hakkimizda` · `/blog` | **200** |
| `/parca-katalog` · `/parca-katalog/volvo` · `/catalog` · `/parca-katalog/ch-76281` | **404** (dördü de gerçek 404) |
| `/blog/tr` → `/blog` · `/en/blog` → `/blog/en` | **308** · **308** |
| Ana sayfa canonical | **1** |
| Ana sayfa `Organization` | **1** |
| Ana sayfada katalog bağlantısı | **0** |
| Ana sayfa JSON-LD bloğu | **6** |
| Blog yazısı (`/blog/motor-greyder-nedir`) | **200**, `X-Nextjs-Prerender: 1` → ISR etkin |
| Blog yazısı hreflang | **5** (tr, en, ru, ar, x-default) |
| Blog yazısı JSON-LD bloğu | **8**, canonical **1** |

> **Ölçüm hatası ve düzeltmesi:** ilk denemede yanlış ana makine adıyla
> (`nidahgroup.com`) sorgu yaptım; o alan adı **mevcut değil** (NXDOMAIN) ve
> curl `000` döndü. Önceki oturumdan kalan bir geçici dosya yüzünden sitemap
> sayısı doğru görünmüştü. Doğru ana makine **`www.nidahgroup.com.tr`**'dir;
> yukarıdaki tüm değerler onunla yeniden ölçüldü.

---

## 2. Arama önbelleği — kardinalite çözümü

### 2.1 Sorunun tam tanımı

Karakter (32) ve sayfa (1..500) sınırları önbellek anahtarının **boyutunu**
kıstırıyordu, **sayısını** kıstırmıyordu. `revalidate: false` olduğu için
oluşan kayıtlar kendiliğinden düşmüyordu. Ölçüm (2026-11-25): **600 farklı
bot sorgusu → 604 kalıcı kayıt / 946 KB / 1.200 Neon sorgusu.**

### 2.2 Çözüm: üç kademeli arama kapısı

Yeni dosya `src/lib/search-gate.ts`. **Tek bir sabit boyutlu sözlük kaydı**
tutulur (argümansız `unstable_cache`, `PRODUCTS_CACHE_TAG`, `revalidate: false`)
ve her arama üç kademeye ayrılır:

| Kademe | Koşul | Neon sorgusu | Kalıcı önbellek kaydı |
|---|---|---|---|
| **bos** | Eşleşme **kanıtlı** imkânsız (3-gram bit eşlemi) | **0** | **0** |
| **onbellekli** | Arama, katalogdaki bir parça numarasının **gerçek alt dizesi** | soğukken 1 grup | var — anahtar uzayı **katalogla sınırlı** |
| **onbelleksiz** | Kapıdan geçti ama parça gövdesinde yok (çok kelimeli ad aramaları) | her istekte 1 grup | **0** |

**Sözlüğün iki parçası:**

1. **3-gram bit eşlemi** — 37 karakter sınıfı (0-9, A-Z, diğer), 37³ = 50.653
   bit = **6.332 bayt**, sabit. Türkçe harfler ASCII karşılığına katlanır.
   Katlama yalnızca **daha gevşek** olabilir, bu yüzden yanlış "bos" kararı
   **üretemez**.
2. **Parça numarası gövdesi** — aktif ürünlerin `part_number` ve
   `part_number_normalized` değerleri, büyük harfli, tekilleştirilmiş,
   `\n` ile ayrılmış. 5.000 ürün için ~105 KB, 50.000 için ~1 MB; üst sınır
   1,2 M karakter (Data Cache kaydı 2 MB sınırının altında).

**Kapının matematiği:** sorgu üç SQL dalı da alt dize eşlemesidir
(`part_number_normalized LIKE %nq%`, `part_number ILIKE %q%`,
`name ILIKE %q%`). Bir alt dizenin **her** 3-gramı, onu içeren dizede de
bulunmak zorundadır. Dolayısıyla ham ve normalize formların hiçbirinin
3-gramları sözlükte tutmuyorsa, eşleşme **matematiksel olarak imkânsızdır**
— sorgu çalıştırılmadan boş yanıt dönebilir.

### 2.3 İstediğiniz sekiz şartın karşılanması

| Şart | Nasıl |
|---|---|
| Serbest metinli yüksek çeşitlilik sınırsız kalıcı önbellek oluşturmasın | `bos` ve `onbelleksiz` kademeleri **hiç kayıt yazmaz**. Kayıt yazabilen tek kademe, anahtar uzayı **katalogla** sınırlı olan `onbellekli` |
| Yalnızca karakter ve sayfa sınırına güvenilmesin | Kapı bağımsız bir katman; sınırlar yerinde kaldı ama artık tek savunma değil |
| Normal parça no aramaları etkilenmesin | Ölçüldü: `328-9669`, `3289669`, `328 9669`, `9669`, `23B-27-11281`, `23b2711281` → hepsi **1/1 doğru** ve **önbellekli** |
| Sık aramalarda performans korunsun | Ölçüldü: 96 istek / 8 gerçek parça no → **32 sorgu** (8 soğuk × 4 sorgu grubu), kalan 88 istek **HIT** |
| Gereksiz Neon sorguları engellensin | Ölçüldü: 600 bot sorgusu → **0 sorgu** (önce 1.200) |
| Serverless'ta süreç içi belleğe güvenilmesin | Koruma **paylaşılan veri önbelleğindeki** tek kayda dayanır. Süreç içinde tutulan tek şey çözülmüş bit eşleminin hız kopyası; kaybı korumayı değil yalnızca mikrosaniyeleri etkiler |
| Yeni ücretli servis / bağımlılık eklenmesin | **Sıfır** yeni bağımlılık; yalnızca Node yerleşikleri ve mevcut Next/Drizzle API'leri |
| Önceki 600 sorgu testi tekrarlansın ve karşılaştırılsın | Aşağıdaki tablo |

### 2.4 Ölçüm karşılaştırması

**Koşullar:** yerel `next start`, production build, soğuk `.next/cache`,
dev Neon (153 aktif ürün), 4 eşzamanlı istemci, 2026-11-26.

| | 2026-11-25 (kapı yok) | 2026-11-26 (kapı var) |
|---|---|---|
| 600 farklı bot sorgusu → kalıcı kayıt | **604** | **0** |
| 600 farklı bot sorgusu → önbellek boyutu | **+946 KB** | **+0 KB** |
| 600 farklı bot sorgusu → Neon sorgusu | **1.200** | **0** |
| 600 farklı bot sorgusu → HTTP | 200 × 600 | 200 × 600 |
| Kapı dağılımı | — | `{"bos:ngram": 600}` |
| Süre | — | **1 saniye** |

**Doğruluk kontrolü (aynı koşu):**

| Arama | Kapı kararı | Sonuç |
|---|---|---|
| `328-9669` | `onbellekli:parca-govdesi` | 1/1 |
| `3289669` (normalize) | `onbellekli:parca-govdesi` | 1/1 |
| `328 9669` (boşluklu) | `onbellekli:parca-govdesi` | 1/1 |
| `9669` (kısmi) | `onbellekli:parca-govdesi` | 1/1 |
| `23b2711281` (küçük harf) | `onbellekli:parca-govdesi` | 1/1 |
| `Sıcaklık` | `onbelleksiz:serbest-metin` | 3/3 |
| `hidrolik` | `onbelleksiz:serbest-metin` | 4/4 |
| `rulman` | `onbelleksiz:serbest-metin` | 5/5 |
| `keçe takımı` | `onbelleksiz:serbest-metin` | 2/2 |
| `ZZZQQQ-YOK` | `bos:ngram` | 0/0 |

**Sınırlar hâlâ yerinde:** `page=999999` → 500, `limit=9999` → 48,
`condition=COPCOP` → yoksayıldı, 200 karakterlik arama → 32'ye kesildi.

Yanıta teşhis başlığı eklendi: **`X-Arama-Kapi`** (`bos:ngram`,
`onbellekli:parca-govdesi`, `onbelleksiz:serbest-metin`, …). Canlıda kapının
çalıştığı bu başlıkla doğrulanabilir.

### 2.5 Dürüstlük notu — kalan risk

Kapı, **rastgele** bot trafiğini tamamen keser (ölçüldü: 600/600). Ama
**katalogdan türetilmiş** bir dize üreten hedefli bir saldırgan hâlâ
`onbellekli` kademeye düşebilir. O kademenin anahtar uzayı katalogdaki parça
numaralarının alt dizeleriyle **sınırlıdır** (5.000 ürün için ~10⁵
mertebesinde ve hepsi meşru sorgular), yani sınırsız değildir — ama "sıfır
risk" değildir.

Projede hazır bir `rateLimit()` yardımcısı var (`src/lib/rate-limit.ts`) ve
`/api/catalog/*` uçlarında 30/dk olarak kullanılıyor. `/api/products` onu
**kullanmıyor**. Ekleme yapılmadı, çünkü (a) §6'da "zorunlu olmayan teknik
geliştirme başlatma" dediniz, (b) Upstash ortam değişkenleri yoksa o yardımcı
**süreç içi bellek**le çalışır — Fluid Compute'ta örnek başına ayrı sayar,
yani sizin kuralınızın tam olarak uyardığı duruma düşer. `.env.local`'de
`UPSTASH_*` anahtarı **yok**; production'da olup olmadığı **ölçülemedi**.

**Öneri (onay bekliyor):** `/api/products`'a 60/dk hız sınırı eklenmesi,
yalnızca production'da Upstash yapılandırılmışsa anlamlıdır. Aksi hâlde
işe yaramaz ve yanlış güven verir.

---

## 3. Geçici yanlış 404 riski

### 3.1 Sorunun kökü

`isPageEnabled()` iki farklı gerçeği tek bir `false` değerine indiriyordu:

| | Anlamı | 404 doğru mu |
|---|---|---|
| Ayarlar okundu, sayfa kapalı | **kalıcı** durum | ✅ evet |
| Ayarlar **okunamadı** | **geçici** durum | ❌ hayır |

`fallbackEnabled: false` olan sayfalarda (katalog) ikinci durum da 404
üretiyordu. `revalidate: false` ile üretilen bir 404 ISR deposuna yazılırsa
**bir yıl** kalır — yani anlık bir arıza kalıcı SEO hasarına dönüşebilir.

**Kökü doğrulandı:** dev Neon rolünün (`nidah_dev`) bağlantı limiti **20**.
Bu oturumda, arka planda çalışan bir sunucu varken yapılan iki ardışık
sorgudan **ikincisi** `too many connections for role "nidah_dev"` ile düştü.
Yani arıza kurgusal değil, bu ortamda **tekrar üretilebilir**.

### 3.2 Çözüm

`src/lib/site-settings.ts`'e **üçüncü bir hâl** eklendi:

```
pageState(key) → "acik" | "kapali" | "belirsiz"
requirePageEnabled(key):
  acik     → sayfa render edilir
  kapali   → notFound()                    → GERÇEK 404 (değişmedi)
  belirsiz → SettingsUnavailableError       → 500, önbelleğe ALINMAZ
```

`belirsiz` yalnızca **`fallbackEnabled: false`** olan sayfalar için üretilir
(katalog ve Prosis kataloğu). `fallbackEnabled: true` olan sayfalar
(hakkımızda, blog, SSS, iletişim, teklif-al, hizmetler) **eskisi gibi açık
kalır** — geçici bir DB arızası tüm siteyi 500'e çevirmez.

Ayrıca ayarlar okumasına **1 kısa yeniden deneme** (120 ms) eklendi: ölçümde
yük altındaki 41 hatanın çoğu anlıktı.

`requirePageEnabled` **14 çağrı yerinde** kullanılıyor (blog, katalog, Prosis
kataloğu, hakkımızda, hizmetler, iletişim, SSS, teklif-al).

### 3.3 İstediğiniz beş şartın karşılanması — ölçümle

| Şart | Ölçüm | Sonuç |
|---|---|---|
| Kapalı katalog **gerçek 404** dönmeye devam etmeli | `page_parca_katalog=false`, soğuk önbellek: soğuk ürün sayfası **404**, `/parca-katalog/volvo` **404**; `/catalog` **404**. Canlıda dört katalog yolu **404** | ✅ |
| Geçici altyapı hatası kalıcı 404 olarak önbelleğe **alınmamalı** | Ayarlar okunamazken soğuk, **açık** ürün sayfası → **500** (önce 404). Önbellek dosya sayısı **0 → 0**: 500 yazılmadı | ✅ |
| Toggle güvenliği **zayıflatılmamalı** | `belirsiz` durumunda sayfa **servis edilmiyor** (500). Kapalı sayfanın içeriği hiçbir koşulda sızmıyor. `isPageEnabled`, `resolveEnabled`, `defaultEnabled`/`fallbackEnabled` ayrımı **değişmedi** | ✅ |
| SEO ve sitemap davranışı **korunmalı** | `metadataForPage()`, `DISABLED_PAGE_METADATA`, `sitemap.ts` ve `catalog-access.ts` hâlâ `isPageEnabled()` okuyor — hiçbiri değişmedi. Canlı sitemap **63 URL / katalog 0 / tekrar 0** | ✅ |
| Geçici hata sonrası sayfa **kendiliğinden** normale dönmeli | Arıza giderildikten sonra **aynı önbellekle**, aynı URL → **200**, ikinci istek `X-Nextjs-Prerender: 1` | ✅ |

### 3.4 Ölçüm tablosu

| Senaryo | Önce | Şimdi |
|---|---|---|
| Ayarlar okunamıyor, **açık** ürün sayfası (soğuk) | **404** | **500** |
| 500 önbelleğe yazıldı mı | — | **hayır** (dosya 0 → 0) |
| Arıza geçtikten sonra aynı URL | 404 kalıcı olabilirdi | **200** |
| `page_parca_katalog = false`, soğuk ürün sayfası | 404 | **404** (değişmedi) |
| Ayarlar okunamıyor, `/hakkimizda` | 200 | **200** (değişmedi) |
| Ayarlar okunamıyor, `/blog`, `/iletisim` | 200 | **200** (değişmedi) |
| Yeniden deneme | yok | **13 kez tetiklendi** (aynı koşuda) |

**Beklenmedik ama doğru iki sonuç:**

1. `/catalog` geçici arızada **404** döndü, 500 değil — çünkü `/catalog`
   build zamanında statik üretiliyor ve toggle o anda kapalı olduğu için
   **404 sayfası build'e gömülü**. Çalışma zamanındaki DB durumu bunu
   değiştirmez. Bu doğru davranıştır: build zamanında alınmış kalıcı bir karar.
2. `page_parca_katalog` DB'de `false` yazıldığı hâlde **statik**
   `/parca-katalog` sayfası **200** dönmeye devam etti. Bu, proje
   CLAUDE.md'deki uyarının ölçümle doğrulanmasıdır: *"`site_settings` admin
   API'si dışında değiştirilirse önbellek kendiliğinden tazelenmez."*
   **Sonuç: toggle yalnızca admin panelinden değiştirilmelidir.**

### 3.5 Build zamanı davranışı — değişmedi

`requirePageEnabled` build sırasında hata fırlatabilir, yani teoride DB'siz
bir build'i düşürebilir. Ölçüldü: DB ulaşılamazken build **zaten**
`/sitemap.xml` üretirken düşüyor (`Export encountered an error on
/sitemap.xml/route`) — yani benim değişikliğim build davranışını
**değiştirmiyor**. Bu güvenli yöndür: bozuk bir deploy yayına çıkmaz.

---

## 4. Isıtma varsayılan eşzamanlılığı

| | Önce | Şimdi |
|---|---|---|
| `--eszamanlilik` varsayılanı | 2 | **1** |
| Geçersiz değer için yedek | 3 | **1** |

Ölçüm gerekçesi (2026-11-25, 145 ürün sayfası, soğuk önbellek):

| Eşzamanlılık | Verim | Ort. yanıt | Yanlış 404 |
|---|---|---|---|
| **1** | 19,4 istek/sn | 51 ms | **0/145** |
| 3 | 18,3 istek/sn | 162 ms | 1/145 |
| 6 | 21,5 istek/sn | 274 ms | 11/145 |

Verim ~20 istek/sn'de doymuş durumda; eşzamanlılık artırmak süreyi kısaltmıyor,
yalnızca gecikme ve hata üretiyor. 50.000 sayfa için süre tahmini
**~41,7 dakika** olarak kalıyor. Commit `44b6cf9` ile **canlıda**.

---

## 5. 1 Aralık operasyon planı

Belge: [`28-1-ARALIK-OPERASYON-PLANI.md`](28-1-ARALIK-OPERASYON-PLANI.md)

İstediğiniz sekiz başlık karşılandı:

| Başlık | Belge bölümü |
|---|---|
| Trigram `0014`'ün güvenli uygulanması | §1 — owner bağlantısı, hedef doğrulaması, idempotent `psql`, 4 doğrulama kontrolü |
| Migration öncesi yedek ve geri dönüş | §1.2 — `pg_dump` + izole geri yükleme testi; geri dönüş **4** `DROP INDEX` |
| Doğrulanmış ürünlerin kontrollü içe aktarılması | §2 — 10 değişmez şart, parti büyüklükleri (155 → 250 → 1.000 → kalan) |
| Ürünlerin kademeli yayınlanması | §3 — 10 ürünlük pilot, toggle, 48 saat ölçüm |
| Kontrollü önbellek ısıtma | §4 — prova → gerçek, ölçülen süre/CU-saat, durma kuralları |
| Neon tüketiminin ölçülmesi | §5 — her adımın öncesi/sonrası Billing → Usage |
| Sitemap ve SEO doğrulaması | §6 — 11 kontrollü tablo + 48 saat sonra GSC |
| İlk gruptan sonra toplu yayın kararı | §7 — yedi ölçüte bağlı eşik tablosu |

**Kritik önkoşul:** planın 0. adımı kota yenilenmesinin **doğrulanmasıdır**.
Kalan CU-saat **≥ 80** olmadan 1. adıma geçilmiyor. Son ölçüm (2026-11-25):
kalan **3,14 CU-saat**.

---

## 6. Görsel altyapısı

Belge: [`29-GORSEL-YUKLEME-POLITIKASI.md`](29-GORSEL-YUKLEME-POLITIKASI.md)

**Cloudinary ile devam ediliyor.** Sağlayıcı değişikliği, yeni servis ve veri
taşıma **yok**.

Politikanın özü, tek ölçülen rakama dayanır: **fotoğraf başına 2,8 MB → 0,45 MB
(6,2 kat)**. Standartlar: en uzun kenar **1600 px**, format **WebP**, kalite
**q80**, hedef **≤ 400 KB**, dosya üst sınırı 50 MB → **8 MB**, en küçük kabul
800 px.

**Mevcut kod ölçüldü:** `src/lib/cloudinary.ts` yükleme çağrısında
`{ folder, resource_type: "image" }` dışında hiçbir parametre yok — yani
**bugün hiçbir küçültme uygulanmıyor**, orijinal ne ise o saklanıyor.

**PDF ve teknik çizimler:** şimdilik Cloudinary'de kalıyor. R2 alternatifi
belge §6'da saklandı; tetikleyici eşik **≥ 18 kredi/ay** olarak yazıldı
(ücretsiz paket 25 kredi). Ölçülen: 50.000 üründe çizim + PDF **17,1 GB**,
R2'de **$0,26/ay**, Cloudinary'de **17,1 kredi/ay**.

---

## 7. Katalog çalışmalarının durumu

> Kaynak: `14-AKTARIM-RAPORU.md` (2026-11-19), `15-YAYIN-HAZIRLIK-ANALIZI.md`
> (2026-11-20), `17`, `21`, `22`, `23`. **Production sayıları bugün yeniden
> ölçülmedi** — Neon kotasını korumak için (kalan 3,14 CU-saat). Son ölçüm
> tarihi 2026-11-20'dir.

### 7.1 Production'daki veri

| | Sayı |
|---|---|
| Toplam ürün | **157** (3 eski + 154 aktarılan) |
| Aktif / Pasif | **2 / 155** |
| `seo_ready` (yayın onayı) | **0 / 157** |
| **Doğrulanmış fotoğraf** | **0 / 157** |
| Uzun açıklaması yeterli / eksik | **112 / 45** |
| Stok durumu | 157'sinde **"bilinmiyor"** (stok iddiası yok) |
| Uyumluluk kaydı | 302 (300'ü doğrulanmış) |
| Çeviri taslağı | 154 (yayınlı **0**) |

Migration durumu: `0010`, `0011p`, `0012p`, `0013p` **production'a uygulandı**
(2026-11-18). `0014` (trigram) **uygulanmadı**.
*(`02-ILERLEME.md` bu konuda eskimiş — "production'da YOK" diyor; `09`
raporu uygulandığını gösteriyor.)*

### 7.2 Doğrulanan ürünler

"Doğrulama" bu projede **üç ayrı** şey demek:

| Doğrulama türü | Durum |
|---|---|
| **Kaynak kaydı doğrulandı** (parmak izi karşılaştırmasıyla aktarıldı) | **154 / 154** ✅ |
| **Uyumluluk doğrulandı** (`fitments.verified`) | **300 / 302** ✅ |
| **Fotoğraf doğrulandı** (`product_images.verified`) | **0 / 157** ❌ |

### 7.3 Yayına hazır ürün sayısı: **0**

Yayın kapısı (`src/lib/seo-gate.ts`) beş ölçüt arar:

| Ölçüt | 157 ürün için durum |
|---|---|
| `part_number` dolu | ✅ 157 |
| `name` dolu | ✅ 157 |
| **≥ 1 doğrulanmış fotoğraf** | ❌ **0** |
| Uzun açıklama boş değil | ⚠️ 112 |
| ≥ 1 doğrulanmış uyumluluk | ✅ ~157 |

**Üçüncü ölçüt hiçbir üründe karşılanmıyor.** Dolayısıyla bugün yayın onayı
verilebilecek ürün sayısı **sıfırdır** — altyapı değil, veri eksikliği.

### 7.4 Açıklama çalışmasının durumu — 42 ürün

| Grup | Ürün | Durum |
|---|---|---|
| Grup 1 | 10 | metin **onaylandı** (incelemede) |
| Grup 2 | 10 | metin **onaylandı** (sadeleştirilmiş sürüm) |
| Grup 3 | 8 | metin **onaylandı** |
| Grup 4 | 7 | **taslak — onayınız bekliyor** |
| Grup 5 | 7 | **başlanmadı** |
| **Toplam** | **42** | **28 onaylı / 7 taslak / 7 başlanmadı** |

**Kritik:** onaylanan 28 metnin **hiçbiri veritabanına yazılmadı.** Her grup
belgesi "veritabanına yazılmadı" notunu taşıyor. Yani açıklama işi
*incelemede* %67 tamamlandı, *uygulamada* %0.

Kalan 3 eski ürün (76281, 90898, DENEMEE32424) da uzun açıklamasız — 42 + 3
= 45 "eksik açıklama" sayısının kaynağı bu.

### 7.5 Kalan ürünler nasıl tamamlanacak

**A — Mevcut 157 ürünü yayına taşımak (en kısa yol):**

| # | İş | Kim | Onay |
|---|---|---|---|
| 1 | Grup 4 (7) metin onayı | kullanıcı | — |
| 2 | Grup 5 (7) taslakların yazılması | Claude | — |
| 3 | Grup 5 metin onayı | kullanıcı | — |
| 4 | 42 onaylı metnin DB'ye yazılması | Claude | **ayrı onay** (canlı DB yazma) |
| 5 | 3 eski ürün için açıklama | Claude + onay | — |
| 6 | **Fotoğraf yükleme + doğrulama** | **kullanıcı** | — |
| 7 | 10 ürünlük pilot `seo_ready` | Claude | **ayrı onay** |
| 8 | Katalog toggle | kullanıcı (panel) | **ayrı onay** |

**6. adım darboğaz.** 157 ürün için ≥157 fotoğrafın yüklenip panelden
*doğrulanması* gerekiyor; 5.000 ürün için ≥5.000. Bu, kodun hızlandıramadığı
tek adım. **Bu yüzden görsel yükleme politikası (§6) 6. adımdan ÖNCE
uygulanmalı** — sonra uygulanırsa yüklenen her fotoğraf 6,2 kat fazla yer
tutar.

**B — 5.000 ürüne çıkmak:** kaynak verinin aynı on şartlı denetim zincirinden
geçirilmesi (`28` §2). Teknik taraf hazır ve ölçüldü; iş hacmi fotoğraf ve
açıklamada.

### 7.6 Korunan şeyler

58 dosyalık katalog çalışması ve daha önce tamamlanan ürün doğrulama
çalışmaları **dokunulmadı**: bu oturumda commit edilen dosyalar yalnızca
`src/lib/search-gate.ts` (yeni), `src/lib/site-settings.ts`,
`src/app/api/products/route.ts`, 14 sayfa/layout dosyası, `scripts/onbellek-isitma.mjs`,
`CLAUDE.md`, `.gitignore` ve `docs/admin-master-plan/27`–`30`.
`scripts/faz3-*`, `scripts/aktarim-154-urun.sql` ve `docs/admin-master-plan/10`–`23`
**izlenmeyen durumda bırakıldı** (git'e eklenmedi, değiştirilmedi).

---

## 8. Onay bekleyenler

| # | Konu | Neden onay gerekiyor | Öneri |
|---|---|---|---|
| 1 | **`da64d46` push + deploy** (arama kapısı + 404 ayrımı) | `src/` altında 17 dosya değişti; "production'a aktarmadan önce raporla" dediniz | **Push edilsin.** tsc 0 hata, lint 34 (baseline 38), build başarılı, 514 test geçti, prerender 31/31 |
| 2 | **Trigram `0014` production'a** | Canlı DB şema değişikliği | 1 Aralık sonrası, `28` §1 ile |
| 3 | **42 onaylı açıklamanın DB'ye yazılması** | Canlı DB veri yazma | Grup 4 + 5 onaylandıktan sonra, tek transaction |
| 4 | **Görsel yükleme politikasının koda eklenmesi** | `cloudinary.ts` + `images/route.ts` değişikliği | **Toplu fotoğraf yüklemesinden ÖNCE** |
| 5 | **Katalog toggle'ının açılması** | Proje CLAUDE.md: katalog bilinçli KAPALI | 10 ürünlük pilot hazır olunca |
| 6 | **Toplu önbellek ısıtma (production)** | Toplu işlem | Yayından hemen sonra |
| 7 | **CLAUDE.md §1 "Test altyapısı yok" satırı** | CLAUDE.md değişikliği ayrı onay | **Düzeltilsin** — ölçüldü: `playwright.config.ts` + 33 spec, **514 test 6,6 s'de geçiyor** |
| 8 | **`/api/products` hız sınırı** | Yeni davranış | Yalnızca production'da Upstash varsa anlamlı; **önce bu doğrulanmalı** |
| 9 | **`site-settings.ts` yeniden deneme** (zaten `da64d46` içinde) | Dosya "mekanizma değiştirilmez" listesinde | 1 numaralı onayın parçası |

**Kullanıcıda bekleyen işler (Claude yapamaz):**

- TEST-0000 kaydının panelden silinmesi
- Neon **Billing → Usage** (1 Aralık sonrası) ve **Monitoring → Compute
  (son 24 saat)** ekran görüntüleri
- Grup 4 metin onayı
- Fotoğraf yükleme ve panelden doğrulama
- Production'da `UPSTASH_REDIS_REST_URL` tanımlı mı (yalnızca **var/yok**,
  değer değil)

---

## 9. Bu oturumda ölçülemeyenler

1. **Production veritabanı sayıları bugün yeniden ölçülmedi** — kota koruması.
   Kullanılan değerler 2026-11-20 ölçümüdür.
2. **Vercel ISR deposunun 404/500 davranışı** — 500'ün önbelleğe alınmadığı
   **yerelde** ölçüldü; Vercel'de doğrulanamadı (katalog kapalı).
3. **Vercel Analytics / Speed Insights panelinde veri toplanıp toplanmadığı** —
   kod tarafı doğrulandı (monte), panele erişim yok.
4. **Production'da Upstash yapılandırması** — ortam değişkenleri okunamıyor.
5. **İçe aktarım CU-saat maliyeti** — `28` §2'de P1 partisinde ölçülecek.
6. **LCP / CLS / INP, Lighthouse, site geneli kontrast denetimi** — bu projede
   hiç ölçülmedi.
7. **Arama sözlüğünün 50.000 üründeki gerçek boyutu** — 153 üründe ölçüldü
   (bit eşlemi 6.332 bayt sabit, gövde ~2 KB); 50.000 için ~1 MB **hesaplandı**,
   ölçülmedi.

## 10. Temizlik

| | Durum |
|---|---|
| Dev Neon `page_parca_katalog` | Test için `false` yapıldı, **`true`'ya geri alındı** (doğrulandı) |
| Dev Neon'a başka yazma | **yok** (diğer tüm sorgular salt okunur) |
| Yerel test sunucuları | durduruldu; port 3100 **boş** |
| Ölçüm script'leri | scratchpad'de (repo dışı), git'e eklenmedi |
| `.next/cache` | ölçüm artıkları silindi |
| Kullanıcının :3000 portundaki sunucusu | **dokunulmadı** |
| StockSuite ve diğer projeler | **dokunulmadı** |
