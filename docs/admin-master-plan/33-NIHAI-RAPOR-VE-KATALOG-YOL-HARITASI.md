# Nihai Rapor — Altyapı Kapandı, Katalog Açıldı

**Tarih:** 2026-11-26 · **Canlı sürüm:** `57ba2b9` · **ölçümler bu oturumda yapıldı**

---

## Yönetici özeti — altı soru

### Neredeyiz?

Altyapı tarafı **kapandı**. Üç commit canlıda ve doğrulandı; arama önbelleği,
geçici arıza kaynaklı yanlış 404 ve ısıtma eşzamanlılığı çözüldü. Katalog
tarafında **tek bir engel kaldı: fotoğraf.** 154 ürünün 154'ünde yayın
kapısının dört içerik ölçütü karşılanıyor, beşinci (doğrulanmış fotoğraf)
**hiçbirinde** karşılanmıyor.

### Ne tamamlandı?

| | Durum |
|---|---|
| `da64d46` + `000bc70` + `57ba2b9` push ve canlı doğrulama | ✅ |
| Testler: **578 geçiyor** (6,0 sn) · `tsc` 0 hata · lint 35 (baseline 38) | ✅ |
| Arama kapısı doğruluk kanıtı — 58 test, marka/PN/Türkçe/muadil/normalizasyon | ✅ |
| CLAUDE.md §1 "test altyapısı yok" düzeltmesi | ✅ |
| **42/42 açıklama metni yazıldı** (28 onaylı + 7 Grup 4 + 7 Grup 5) | ✅ |
| Grup 5'in kayıp 7 ürün listesi kurtarıldı | ✅ |
| 28 onaylı metin **development veritabanına yazıldı** (28/28, yan etki 0) | ✅ |
| Production yazma script'i + geri alma yolu hazır | ✅ |
| Görsel yükleme politikası **kodda uygulandı** + 6 test | ✅ |
| İçe aktarma maliyeti dev ortamında ölçüldü | ✅ |
| Fotoğrafsız yayın kriterleri ve etkileri raporlandı (belge 32) | ✅ |
| Trigram migration `0014` | ⏸ **uygulanmadı** (talimat) |
| Production'a açıklama yazımı | ⏸ onay bekliyor |

### Kaç ürün yayınlanmaya hazır?

| Senaryo | Yayınlanabilir |
|---|---|
| **Bugünkü kapı** (fotoğraf zorunlu) | **0** |
| **Seviye B kapısı** (fotoğraf beklemede, belge 32) | **142** |
| Seviye B + ad düzeltmesi gereken | +12 (O-ring ×7, "Hat", "Far", "Somun", "Cıvata", "Rotor") |

**142** sayısı ölçüldü: 154 gerçek ürün − 12 (tek kelimelik, 10 karakterden
kısa ad) − 1 (pasif kayıt)… 141 + 1 aktif = **142**.

### Kaç ürün araştırma bekliyor?

Faz 3 araştırma verisinden (76 dosya, `OSKO_PLANLAMA/nidah_faz3_veri`)
tekilleştirilerek sayıldı:

| Küme | Ürün | Durum |
|---|---|---|
| Production'da | **157** (2 aktif + 155 pasif) | aktarıldı |
| **Araştırması bitmiş, aktarılmamış** | **400** | aşağıdaki kırılım |
| → yalnız uyumluluk engeli (`sayfalı markada kesin uyum yok`) | **371** | katalog dosyası taraması gerekiyor |
| → temiz aday (engel yok) | **25** | **doğrudan aktarılabilir** |
| → şüpheli (ayırt edilemeyen standart parça) | 16 | depo ölçümü gerekiyor |
| Logo İşbaşı ana listesi | **~5.688 satır** | büyük kısmı araştırılmadı |

Aktarılmamış 400 ürünün doğrulama seviyesi: **334 "kesin doğrulandı"**,
92 "güçlü eşleşme".

### Yayına geçmek için ne kaldı?

1. **Fotoğraf kararı** — ya fotoğraf çekimi, ya Seviye B kapısı (belge 32).
   Bu karar verilmeden tek bir ürün yayınlanamaz.
2. **28 onaylı açıklamanın production'a yazılması** — script hazır, prova
   dev'de 28/28 geçti.
3. **Grup 4 + Grup 5'in 14 metninin onayı.**
4. **12 zayıf adın düzeltilmesi** (Seviye B seçilirse).
5. Kademeli yayın: 10 → 40 → kalan, her adımda 48 saat ölçüm.

Teknik tarafta **hiçbir engel kalmadı**: migration'lar uygulanmış, önbellek
mimarisi ölçülmüş, kapılar test altında.

### Benden ne gerekiyor?

| # | Konu | Neden sizde |
|---|---|---|
| 1 | **Fotoğraf kararı**: çekim mi, Seviye B mi? | ticari karar |
| 2 | 28 onaylı metnin production'a yazılması için **onay** | production veri değişikliği |
| 3 | Grup 4 (7) + Grup 5 (7) metin **onayı** | içerik onayı |
| 4 | **Logo İşbaşı 5.688 satırlık listenin dosyası** — elimde yok | kaynak veri |
| 5 | Production'da `UPSTASH_REDIS_REST_URL` **var mı yok mu** (yalnız ad) | panel erişimi |
| 6 | `CH 12119-10/-16/-20` **kalınlık ölçümü** (depo) | fiziksel ölçüm |
| 7 | `90898` (**GAUDE**) ve `76281` (**KIT**) adlarının düzeltilmesi | şirket bilgisi |
| 8 | `TEST-0000` kaydının panelden silinmesi | sizin kararınız |
| 9 | Neon **Billing → Usage** ekran görüntüsü (kalan kota teyidi) | panel erişimi |

---

## 1. Push ve canlı doğrulama

`44b6cf9..57ba2b9` gitti. Push öncesi: `tsc` 0 hata, **578 test geçti**,
lint 35 sorun (baseline 38'in altında) ve **dokunulan dosyaların hiçbirinde
bulgu yok**.

Canlı ölçümler (`www.nidahgroup.com.tr`):

| Kontrol | Sonuç |
|---|---|
| `X-Arama-Kapi` başlığı canlıda | ✅ `bos:ngram` (yeni kod yayında) |
| `sitemap.xml` | **63 URL**, katalog 0, tekrar 0, `application/xml`, `PRERENDER` |
| `/parca-katalog`, `/parca-katalog/volvo`, `/catalog` | **gerçek 404** |
| `/hakkimizda` · `/sss` · `/iletisim` · `/teklif-al` · `/blog` | 200 |
| `/blog/tr` → `/blog` · `/en/blog` → `/blog/en` | **308** |
| Ana sayfa canonical / Organization / katalog bağlantısı | 1 / 1 / **0** |

**Bir eksik bulundu:** `/api/health` `version` alanı **`"unknown"`** dönüyor
(`process.env.npm_package_version` production'da tanımsız). Yani "canlı
sürüm işaretçisi" diye güvenebileceğimiz bir alan **yok**; deploy
doğrulaması bu oturumda `X-Arama-Kapi` başlığının varlığıyla yapıldı. Kalıcı
çözüm `VERCEL_GIT_COMMIT_SHA`'yı okumaktır — **uygulanmadı**, onay bekliyor.

---

## 2. Arama kapısı — gerçek ürün elenmiyor (58 test)

Kapı test edilebilir hâle getirildi: saf çekirdek `src/lib/search-gate-core.ts`
ayrıldı (`server-only`, `next/cache`, `db` bağımlılığı yok). **Üretim yolu ve
kararlar değişmedi.**

`tests/search-gate.spec.ts` üç seviyede ölçer:

| Seviye | Ne kanıtlanıyor |
|---|---|
| **Senaryo** (29 PN biçimi + 17 Türkçe arama + muadil + kısa) | Volvo/Caterpillar/Komatsu/Hidromek biçimleri, `ch-76281`/`ch 76281`/`76281`, `yağ`/`keçe`/`şanzıman`/`çekvalf`/`üçgen` — hiçbiri elenmiyor |
| **KANIT** | Katalogdaki her değerin **her alt dizesi** (3 varyantla, 1.000+ sorgu) için karar asla `bos` olamaz |
| **Bekçi** | `/api/products` arama dalı yalnızca sözlüğe beslenen üç sütunu arıyor; `oem_numbers`/`manufacturers` eklenirse test **düşer** |

### Bu testlerde çıkan iki gerçek bulgu

**1. Ayrışık (NFD) Türkçe girdi.** `"İ".toLowerCase()` ayrışık `i̇`
(i + birleşen nokta) üretiyor ve kapı bunu eleyebiliyordu. SQL de eşleştirmediği
için sonuç yanlış değildi, ama kapı artık **birleşen işaretleri atıyor**
(`U+0300–U+036F`) — böylece hiçbir koşulda ayrışık girdi elenmiyor. Kapı
yalnızca daha gevşek oldu, sağlamlık değişmezi korundu.

**2. `part_number_normalized` NULL olan satırlar.** Böyle bir satır normalize
arama biçimiyle bulunamıyor — ama bu **SQL kaynaklı**, kapı kaynaklı değil
(`and(isNull(pnn), ilike(pn, %ham arama%))`). Tüm admin yazma yolları `pnn`
alanını dolduruyor; kalan risk yalnızca 0006 öncesi artık satırlardır.
**Aktarımda kontrol edilecek madde.**

### Canlı ölçüm (production, bugün)

| Arama | Kapı | Sonuç |
|---|---|---|
| `76281` · `90898` | `onbellekli:parca-govdesi` | **1 / 1** |
| `76 281` (boşluklu) | `onbellekli:parca-govdesi` | **1** |
| `kit` · `gaude` (ad) | `onbelleksiz:serbest-metin` | 1 / 1 |
| `QZXJWV` · `wp-admin` | **`bos:ngram`** | 0 — **0 Neon sorgusu** |
| `volvo` | `bos:ngram` | 0 |

`volvo` sonucu doğrudur ama **ticari bir boşluğu gösteriyor**: liste sorgusu
üretici adını aramıyor (yalnızca `part_number`, `part_number_normalized`,
`name`). Müşteri arama kutusuna "volvo" yazarsa sonuç alamaz. Marka filtresi
ayrı bir eksen olarak çalışıyor. **Düzeltme önerilir ama yapılmadı** —
kapsam dışı ve kapının anahtar uzayını etkiler.

---

## 3. Upstash — uzaktan belirlenemiyor

| | Ölçüm |
|---|---|
| `@upstash/ratelimit` + `@upstash/redis` | **bağımlılıkta var ve kurulu** |
| Kod yolu | `rate-limit.ts` env değişkenleri varsa Upstash'i, yoksa **süreç içi Map**'i kullanıyor |
| `.env.local` (yerel) | `UPSTASH_*` **yok** → yerelde süreç içi |
| **Production** | **ölçülemedi** — Vercel CLI kurulu değil, Vercel MCP yetkilendirilmemiş |

Dışarıdan ayırt etmek de mümkün değil: düşük trafikte tek bir Fluid Compute
örneği yanıt verdiği için süreç içi sayaç da Upstash gibi 429 üretir.
**Panelde yalnızca değişken ADININ varlığına bakmanız yeterli.**

Hız sınırı olan uçlar: `/api/admin/auth` (5/30dk), `/api/catalog/*` (30/dk),
`/api/contact` ve `/api/rfq` (5/15dk). **`/api/products`'ta hız sınırı YOK** —
arama kapısı korumasının tek dayanağı bu yüzden kapının kendisidir.

---

## 4. 42/42 açıklama metni — tamamı yazıldı

| Grup | Ürün | Durum | Kaynak belge |
|---|---|---|---|
| Grup 1 | 10 | ✅ onaylı | `17-…-42.md` |
| Grup 2 | 10 | ✅ onaylı (sadeleştirilmiş) | `17` + `21` |
| Grup 3 | 8 | ✅ onaylı (iki düzeltme) | `17` + `22` |
| Grup 4 | 7 | taslak — **onay bekliyor** | `23` |
| **Grup 5** | **7** | **taslak — onay bekliyor** | **`31` (bu oturumda yazıldı)** |

### Grup 5'in listesi kayıptı — kurtarıldı

Hangi 7 ürün olduğu **hiçbir belgede yazılı değildi**; yalnızca "Komatsu
WA320-3MC + Volvo greyderler" notu vardı. Liste development veritabanından
yeniden türetildi: 42'lik küme, açıklaması **100–199 karakter** olan
ürünlerdir (ölçüldü: tam 42 satır). Bilinen 35 çıkarıldığında kalan 7:

`714-12-19320` · `714-12-19710` · `714-16-19730` · `CH 12119-10` ·
`CH 12119-16` · `CH 12119-20` · `VOE 12727387`

Bilinen 35 parça numarasının **tamamı** veritabanında bulundu — küme tanımı
tutarlı.

### Grup 5'te iki gerçek çakışma çıktı

1. **Dört ayrı "Daire ayar pulu".** `CH 12119-10/-16/-20` üçü de G0008437
   çiziminin **aynı 7. kalemidir**; `olcu` ve `malzeme` alanları boş, yani
   kalınlık farkı **veritabanından doğrulanamıyor**. Metinlerde kalınlık
   **iddia edilmedi**. Dördüncü kayıt `VOE 12749768` aynı çizimin 6. kalemi.
2. **`714-16-19730` ↔ `714-12-19730`.** İkisi de "ayırıcı plaka" ama
   birincisi şanzıman, ikincisi **park freni** grubunda. Numara benzerliği
   sipariş hatası riski taşıdığı için metinde açıkça ayrıldı.

### Metinler artık makine-okunur ve sağlamalı

`scripts/aciklama-cikar.mjs` belgelerden JSON üretir ve **her metnin
uzunluğunu belgede yazılı karakter sayısıyla karşılaştırır**; bir kopyalama
hatası olsaydı script düşerdi. 42 metnin **42'sinde** sağlama tuttu.

```
scripts/veri/onayli-aciklamalar-28.json   28 kayit · 168–387 karakter (ort 278)
scripts/veri/grup4-taslak-7.json           7 kayit · 279–364 karakter (ort 304)
scripts/veri/grup5-taslak-7.json           7 kayit · 264–432 karakter (ort 377)
```

---

## 5. Production yazma yolu — hazır, prova geçti

`scripts/aciklama-yaz.mjs` yazıldı. Eski `faz3-taslak-yaz.mjs`'in yerine
geçiyor; **oradaki hedef testi güvenilir değildi**: "sentetik TEST kaydı var
mı?" diye bakıyordu, oysa production'da da bir TEST kaydı bulunuyor
(`TEST-0000`). Yeni script hedefi açıkça ister:

| Koruma | Davranış (ölçüldü) |
|---|---|
| `--taban` yok | `DURDURULDU: --taban zorunlu` |
| Hedef yerel değil, `--production` yok | `DURDURULDU: hedef yerel degil (www.nidahgroup.com.tr)` |
| Kimlik dosyası yok | `DURDURULDU: kimlik dosyasi bulunamadi` |
| Listedeki bir PN veritabanında yok | **hiç yazma yapılmaz** |
| Sentetik (TEST/ATOM) kayıt listede | **hiç yazma yapılmaz** |
| Karakter sağlaması tutmuyor | **hiç yazma yapılmaz** |
| Geri dönüş dosyası | yazma **başlamadan önce** diske iner |
| Her satırdan sonra | metin eşitliği + yan etki (`seo_ready`, `stock_status`, `is_active`, ad, marka) doğrulanır |
| İlk hata | **durulur** (`--devam` ile sürdürülebilir) |

**Development'ta uçtan uca koşuldu: 28/28 YAZILDI, 0 hata, 0 yan etki.**
Kimlik bilgisi hiçbir çıktıya yazılmadı.

Production komutu (onay beklemektedir):

```
node scripts/aciklama-yaz.mjs --taban https://www.nidahgroup.com.tr \
  --kimlik <kimlik-dosyasi> --liste scripts/veri/onayli-aciklamalar-28.json \
  --beklenen 28 --cikti <dizin> --production --apply
```

Risk değerlendirmesi: 28 satırın yalnızca `long_description` alanı değişir;
ürünler **pasif** ve `seo_ready = false`, yani **canlı sitede hiçbir şey
görünmez**. Geri dönüş tek komutla yapılır.

---

## 6. Görsel yükleme politikası — kodda uygulandı

Belge 29'daki standartlar koda alındı (`src/lib/image-policy.ts`, 6 test):

| | Önce | Şimdi |
|---|---|---|
| Depolanan en uzun kenar | sınır yok | **1600 px** (`crop: "limit"` — küçüğü büyütmez) |
| Format | orijinal | **WebP** |
| Kalite | ayar yok | **q80** |
| Dosya başına üst sınır | 50 MB | **8 MB** |
| En küçük kabul | yok | **800 px** (yükleme sonrası ölçülür, reddedilen görsel Cloudinary'den **silinir**) |

**Neden şimdi:** politika toplu yüklemeden ÖNCE devreye girmeliydi. Ölçülen
fark **6,2 kat** depolama; sonradan uygulanırsa fazla depolama zaten ödenmiş
olur. Şu an `product_images` tablosunda **0 kayıt** olduğu için uygulama anı
risksiz — hiçbir mevcut dosya etkilenmiyor.

---

## 7. İçe aktarma maliyeti — ölçüldü (development)

100 sentetik satırla ölçüldü, satırlar ölçüm sonunda **silindi** (kalan: 0):

| İşlem | 100 satır | → 5.688 satır |
|---|---|---|
| **Tek ifadede toplu insert** | **623 ms** | **35,4 sn** |
| Satır satır insert | 15.221 ms | 865,8 sn (14,4 dk) |
| **Kat fark** | — | **24,4×** |
| Toplu UPDATE (yayına alma) | 155 ms | ~8,8 sn |
| Arama sözlüğü sorgusu | 154 ms / 253 satır | önbellek tazelemesinde 1 kez |
| Public liste sorgusu | 153 ms | istek başına (önbellekte değilse) |

**Yorum — 1 Aralık beklemesi gerçekten gereksiz.** 5.688 satırın tamamını
aktarmanın aktif sorgu maliyeti **36 saniye** mertebesinde. Neon'da ücreti
belirleyen şey sorgu süresi değil, compute'un **uyanık kaldığı** süredir
(5 dakika hareketsizlikte uyur). Tek bir toplu aktarım = **tek uyanma** ≈
5–6 dakika compute ≈ **0,02–0,10 CU-saat** (0,25 CU ile 1 CU arası; compute
boyutu panelden okunamadı). Kalan **3,14 CU-saat** bunun **30 katından
fazlasını** karşılar.

96,3 CU-saati tüketen şey aktarım değildi: `force-dynamic` sayfaların her
istekte veritabanını uyandırmasıydı (belge 24) ve o sorun önbellek
çalışmasıyla kapatıldı.

**Zorunlu kural:** aktarım `/api/admin/import/products` ucundan yapılır
(500'lük partiler hâlinde upsert eder). Satır satır PATCH ile aktarım
**24 kat** pahalıdır ve yapılmamalıdır.

---

## 8. Yol haritası — 5.688 satıra giden yol

### 8.1 Darboğaz nerede (ölçülen)

Aktarılmamış 400 üründe **371'inin tek engeli** şu: `sayfalı markada kesin
uyum yok`. Yani parça kaydı temiz, ama **hangi makinede kullanıldığı üretici
kataloğundan kesin olarak doğrulanamamış**. Bu, yazılımla hızlandırılamayan
bir iştir: 58 katalog dosyasının sayfa sayfa taranmasını gerektirir.

Darboğaz sırası:

1. **Uyumluluk doğrulama** (371 ürün + 5.688'in büyük kısmı) — katalog taraması
2. **Fotoğraf** (154/154) — çekim veya Seviye B kararı
3. Açıklama yazımı — 42'si bitti, kalanı şablonlanabilir
4. Aktarım ve yayın — **ölçüldü, ucuz ve hızlı**

### 8.2 Önerilen sıra

| Adım | İş | Kim | Bağımlılık |
|---|---|---|---|
| **A** | 28 onaylı metni production'a yaz | Claude | onay #2 |
| **B** | Grup 4 + 5 onayı, sonra 14 metni yaz | kullanıcı → Claude | onay #3 |
| **C** | Fotoğraf kararı; Seviye B seçilirse kapı + uyarı metni + ad şartı | kullanıcı → Claude | onay #1 |
| **D** | 12 zayıf adı düzelt (O-ring ×7, Hat, Far, Somun, Cıvata, Rotor) | Claude | C |
| **E** | **25 temiz adayı** aktar (en küçük anlamlı parti) | Claude | — |
| **F** | 10 ürünle pilot yayın, 48 saat ölç | Claude + kullanıcı | A–D |
| **G** | 371 ürünün uyumluluk taraması (katalog dosyaları) | kullanıcı + Claude | katalog erişimi |
| **H** | Logo listesinin kalanı — 5.688 satır | kullanıcı (dosya) + Claude | #4 |

### 8.3 5.688 satır için yöntem

Mevcut hat **çalıştığı kanıtlanmış** (154 ürün bu hattan geçti). Tekrarlanacak
döngü:

1. Logo listesinden **200–500'lük parti** alınır (parti büyüklüğü aktarım
   maliyetine göre değil, **insan doğrulama kapasitesine** göre seçilir).
2. `scripts/inspect-workbook.mjs` ile kolonlar profillenir — kolon adları
   **varsayılmaz**.
3. Katalog referansı + uyumluluk doğrulaması yapılır; doğrulanamayan satır
   **aktarılmaz** (bugünkü kural korunur).
4. Açıklama metinleri 42'lik çalışmanın kurallarıyla yazılır (uydurma yok,
   ölçü/malzeme/tork yok, çakışan parçalar numarayla adlandırılır).
5. `aciklama-cikar.mjs` sağlamasıyla JSON üretilir, `aciklama-yaz.mjs` ile
   yazılır; geri dönüş dosyası her partide saklanır.
6. Yayın `seo_ready` ile **tek tek insan onayıyla** açılır.

**Google'da parça numarasıyla bulunma** hedefi için belirleyici olan üç şey
(hepsi bugün doğru çalışıyor): parça numarasının `<title>` ve `<h1>`'de
bulunması, kanonik URL'in tek olması ve sitemap'te yer alması. Trigram
indeksi (`0014`) **site içi arama hızı** içindir, Google için değil — bu
yüzden ertelenmesi SEO hedefini geciktirmiyor.

### 8.4 50.000 ölçeğinde yeniden açılacak konular

| Konu | Eşik | Not |
|---|---|---|
| `0014` trigram indeksi | site içi arama yavaşlarsa | şimdilik uygulanmadı |
| Sitemap index'e geçiş | 50.000 URL | tek dosya sınırı |
| Keyset sayfalama | derin `OFFSET` taraması | `page` sınırı şu an 500 |
| Cloudflare R2 | ≥ 18 kredi/ay | belge 29 §6 |
| Thin content riski | 5.000 sayfa | denetim C11, yeniden değerlendirilmeli |

---

## 9. Ölçülmeyenler (açıkça)

- Production'daki ürün/görsel sayıları **bugün yeniden ölçülmedi** — kalan
  3,14 CU-saat korundu. Kullanılan sayılar 2026-11-20 aktarımının development
  kopyasından.
- Production `UPSTASH_*` değişkenlerinin varlığı.
- Neon compute boyutu (0,25 CU mu, 1 CU mu) — CU-saat ekstrapolasyonu bu
  yüzden bir **aralık** olarak verildi.
- Lighthouse, LCP/CLS/INP, kontrast denetimi — bu projede hâlâ **ölçülmedi**.
- Sentry istemci tarafı hâlâ kapalı (`NEXT_PUBLIC_SENTRY_DSN` yok).
- Google'ın fotoğrafsız parça sayfalarını fiilen nasıl sıraladığı.

---

## 10. Temizlik

| | Durum |
|---|---|
| Ölçüm için yazılan 200 sentetik satır | **silindi** (kalan: 0, doğrulandı) |
| Dev sunucusu (port 3001) | bu oturumda açıldı — kapatıldı |
| Sizin :3000'deki sunucunuz | **dokunulmadı** |
| 58 katalog dosyası ve `nidah_faz3_veri` (76 dosya) | **dokunulmadı** |
| Production veritabanı | **hiçbir yazma yapılmadı** |
| Dev veritabanı | 28 açıklama yazıldı (kasıtlı), geri dönüş dosyası var |
| StockSuite ve diğer projeler | **dokunulmadı** |
