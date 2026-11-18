# İlerleme Kaydı

> **Yeni oturumda ÖNCE bunu oku.** Sonra `01-BULGU-DURUM.md` ve
> `03-GUVENLIK-SINIRLARI.md`. "SONRAKİ KESİN ADIM" satırından devam et.
> Tamamlanmış işleri **tekrarlama**.

**Son güncelleme:** 2026-11-18 · **Aktif faz:** Faz 0–6 TAMAM · **production migration UYGULANDI** · kod deploy onay bekliyor
**Git HEAD:** `5497e9b` (commit yapılmadı ve yapılmayacak)

---

## SONRAKİ KESİN ADIM

> **Master planın 7 fazı da TAMAMLANDI (Faz 0–6), tarayıcı doğrulaması
> dahil.** Teknik iş bitti; bundan sonrası KULLANICI KARARIDIR:
>
> 1. **Production onay paketi** — `05-PRODUCTION-ONAY-PAKETI.md` (2026-11-18,
>    salt okunur denetim). **İKİ BLOKER bulundu:** `0011` production'da
>    preflight ile durur (2 mevcut görsel), `0012` POST-CHECK ile durur
>    (dev'e özgü 166/12 varsayımları). Karar noktaları K12–K18 orada.
>    **Hiçbir değişiklik uygulanmadı**; commit/push/deploy/migration yok.
>    · `06-PROVA-RAPORU.md` — production kopyası üzerinde yapılan tam prova
>      (4 migration + geri alma + idempotentlik) **tamamı geçti**.
>    · `07-GECIS-KOSU-KITABI.md` — aşama aşama uygulama talimatı, riskler ve
>      geri alma. **Onay sırası:** yedek → migration → commit → push.
>    · `08-YEDEKLEME-RAPORU.md` — tam yedek alındı ve geri yüklenebilirliği
>      kanıtlandı (2026-11-18).
>    · `09-PRODUCTION-MIGRATION-RAPORU.md` — **`0010`, `0011p`, `0012p`,
>      `0013p` PRODUCTION'A UYGULANDI** (2026-11-18). Veri birebir korundu:
>      3 ürün · 2 fotoğraf · seo_ready 0 · stok 0 · katalog kapalı.
>      **Kod commit ve deploy HÂLÂ onay bekliyor.**
> 2. **Y1 — kategori ağacı** (ertelendi): araç hazır, `categories` tablosu
>    BOŞ. Hangi kategorilerin olacağı kullanıcı kararı.
> 3. **Y2 — admin splash ekranı** (ertelendi).
> 4. **İşlem kaydı okuma ekranı** — `admin_audit_log` yazılıyor ama panelde
>    görüntülenemiyor (yeni iş olarak değerlendirilebilir).
>
> Yeni bir oturum bu dosyadan devam ederse: **tamamlanmış işleri
> TEKRARLAMA.** 13 bulgunun 13'ü kapandı.

## Devam etmeden önce kontrol edilecekler

1. `03-GUVENLIK-SINIRLARI.md` §1 hedef doğrulama sorgusu → DEV imzası
2. `git rev-parse --short HEAD` → `5497e9b` (değiştiyse DUR ve sor)
3. `npm test` → en az **339** geçmeli (aşağıdaki son sonuca bak)
4. Dev sunucusu gerekiyorsa `preview_start` ile `nidah-dev`

---

## Faz durumları

| Faz | Kapsam | Durum | Bitiş |
|---|---|---|---|
| **Faz 0** | Denetim, yedek, referans ölçüm, takip dosyaları | ✅ **tamam** | 2026-11-17 |
| **Faz 1** | P1, P3, P8 | ✅ **tamam** | 2026-11-17 |
| **Faz 2** | P13, P4, Y3 (+ `drizzle/0012`) | ✅ **tamam** | 2026-11-17 |
| **Faz 3** | P10, P9, P11 | ✅ **tamam** | 2026-11-17 |
| **Faz 4** | P7, P6, P12, P5 (+ `drizzle/0013`) | ✅ **tamam** | 2026-11-18 |
| **Faz 5** | Regresyon, görsel, güvenlik doğrulaması | ✅ **tamam** (tarayıcı dahil) | 2026-11-18 |
| **Faz 6** | Nihai rapor + production onay paketi | ✅ **tamam** | 2026-11-18 |

---

## Tamamlanan görevler

### Faz 0 — 2026-11-17
- [x] Hedef veritabanı kimliği doğrulandı (`neondb_owner`, `site_settings=0`)
- [x] Referans rakamlar ölçüldü ve `03-GUVENLIK-SINIRLARI.md` §3'e yazıldı
- [x] Yedek alındı ve doğrulandı: `~/.osko/backups/dev_faz0_2026-11-17.sql`
      (292 KB · 18 COPY bloğu · 166 ürün satırı · stderr boş)
- [x] Başlangıç test referansı alındı (aşağıda)
- [x] Takip dosyaları oluşturuldu (`docs/admin-master-plan/`)

### Faz 1 — 2026-11-17 (P1, P3, P8)
- [x] **P1** `tabs.tsx` temel sınıfına taşma yönetimi
      (`max-w-full overflow-x-auto overscroll-x-contain`; `justify-center` →
      `justify-start`). `TabsList` kullanan ÜÇ ekranı birden kapsar
- [x] **P1 ek** düzenleme ekranındaki iki sabit `grid-cols-2` ızgarası
      duyarlı yapıldı — "Stok Durumu" seçicisi belgeyi taşırıyordu
- [x] **P3** yayın düğmesi `readiness.eligible` ile pasifleşiyor + eksik
      sayısı ipucu. Sunucu kapısı DEĞİŞMEDİ
- [x] **P8** sayaç metni "zorunlu"; eşik `MIN_LONG_DESCRIPTION_CHARS`'tan
      okunuyor; eşiğin altında kehribar renk
- [x] `tests/admin-tabs.spec.ts` — 13 test
- [x] Tarayıcı doğrulaması: 375 / 768 / masaüstü

### Faz 2 — 2026-11-17 (sürüyor)
- [x] **P13** liste ucuna yayın hazırlığı özeti:
      `longDescriptionLength` · `imageCount` · `verifiedImageCount` ·
      `verifiedFitmentCount` · `publishEligible` · `unmetCount` · `unmet`
- [x] Sayımlar TOPLU sorgularla (tek `Promise.all`, `groupBy`) — **N+1 yok**;
      100 kayıt **544 ms**
- [x] Hazırlık `evaluateSeoReadiness()` ile hesaplanıyor — eşik kopyası yok
- [x] `tests/admin-product-list.spec.ts` — 10 test
- [x] Canlı doğrulama: 166 toplam / **154 gerçek** / 12 sentetik (hepsi pasif);
      **42** gerçek üründe açıklama <300 → DB sorgusuyla **birebir aynı**
- [x] **`drizzle/0012`** development'a uygulandı (K8)
      · yedek: `~/.osko/backups/dev_0012_oncesi.sql` (292 KB, 166 ürün satırı)
      · dry-run `COMMIT`→`ROLLBACK` geçti, geri alındığı sorguyla doğrulandı
      · `UPDATE 12` — **KİMLİK listesiyle**, desenle değil
      · POST-CHECK kanıtları: desen dışı işaretlenen **0**, işaretlenmeyen
        desenli **0**, sentetik aktif/yayında/stoklu **0**
      · örnek kontrol: 232-06-52410 / 714-12-12610 / 60335-00200 →
        `is_synthetic = false`; TEST-FAZ2B-0001 → `true`
- [x] `schema.ts` + `columns.ts` (`PRODUCT_COLUMNS_V4`) + kısmi index
- [x] **P4** `src/lib/product-filters.ts` (saf ayrıştırma) + liste ucu
      filtreleri + `ProductFilterBar.tsx`
- [x] **Y3** 5 sıralama alanı (beyaz liste) + yön; `publishReadiness`
      0–3 hazırlık puanı (fotoğraf + açıklama + uyumluluk)
- [x] `tests/product-filters.spec.ts` (36) + `tests/schema-phase4.spec.ts` (14)
- [x] Canlı filtre doğrulaması — her filtre DB sayısıyla birebir:
      varsayılan **154** · sentetik only **12** · all **166** ·
      kısa açıklama **42** · yeterli **112** · doğrulanmış fotoğraf yok **154** ·
      var **0** · yayın onayı yok **154** · aktif **153** · pasif **1**
- [x] Geçersiz filtre/sıralama değerleri yok sayılıyor (154 dönüyor)
- [x] Arayüz uçtan uca: "Eksik (<300)" seçimi → **42 ürün / 42 sonuç**,
      aktif filtre rozeti, "Filtreleri temizle"
- [x] 375px: belge taşması **0**, filtreler tek sütuna iniyor

### Faz 3 — 2026-11-17 (P10, P11, P9)
- [x] **P10** `ImagesManager` boş durumuna kalıcı şart kutusu: ALT metni
      (`IMAGE_ALT_TEXT_MIN`) + kaynak, ve "doğrulanmazsa yayına giremez"
      sonucu. Depo turuna çıkmadan okunur
- [x] **P11** `src/lib/translation-gate.ts` (saf) + `TranslationsManager`
      düğme kapısı. Ad + gövde (≥`MIN_TRANSLATION_BODY_CHARS` = 120).
      **Taslak kaydetmek HER ZAMAN serbest**; `seo_ready`'ye dokunulmaz
- [x] **P9** `SerpPreview.tsx` + iki meta sayacı. DB sınırı (255) ile
      Google kesme eşiği (~60 / ~155) AYRI gösteriliyor; boş meta alanı
      için sayfanın kendi yedeği önizleniyor
- [x] Ek düzeltme: sekme şeridindeki dikey kaydırma oku (`overflow-y-hidden`)
- [x] Ek düzeltme: `partManufacturer` `maxLength` sabiti `FIELD_LIMITS`'e bağlandı
- [x] `tests/translation-gate.spec.ts` (16) + `tests/serp-preview.spec.ts` (7)
- [x] Tarayıcı doğrulaması: sayaçlar (43/~60 gri, 161→155 kehribar),
      SERP önizlemesi, P10 şart kutusu, P11 düğmesi **pasif** +
      "Taslak kaydet" **etkin** + gerekçe listesi

### Faz 4 — 2026-11-18 (P7, P6, P12, P5)
- [x] **P7** `ActiveStatusControl.tsx` — `role="switch"` anahtarı + AYRI
      "Aktif / Pasif" rozeti + tek cümlelik fark açıklaması.
      **Pasifleştirme yayın onayını GERİ ALMAZ** (test ile kilitli);
      `toggleActive` gövdesinde yalnızca `isActive` gider
- [x] **P6** `src/lib/category-tree.ts` (saf: slug, doğrulama, ağaç, DÖNGÜ
      koruması) + `/admin/categories` ekranı + `GET/POST /api/admin/categories`
      + `PATCH/DELETE /api/admin/categories/[id]` + düzenleme ekranında
      kategori seçici + gezinme bağlantısı
- [x] **P6 güvenlik** üst kategori varlığı, döngü reddi (400), dolu/alt
      kategorili kayıt silinemez (409), ürün `categoryId` doğrulaması
      (400 — eskiden 500 üretirdi)
- [x] **P12** `FitmentsManager` satır içi NOT düzenleme; makine eşleşmesi
      değişmez; `verified`/`source` gövdeye KONMAZ; sınır
      `FIELD_LIMITS.fitmentNotes` (arayüz + sunucu aynı sabit)
- [x] **P5** `src/lib/bulk-actions.ts` (saf) + `BulkActionBar.tsx` +
      `POST /api/admin/products/bulk` + satır seçim kutuları + onay diyaloğu
      + kısmi başarı raporu + fotoğraf föyü (CSV, sunucuya istek YOK)
- [x] **P5 / K10** `confirm: true` olmadan uç REDDEDER; yayın işleminde
      `evaluatePublishEligibility()` KAYIT BAŞINA çalışır; toplu yayın tek
      UPDATE ile yazılmaz; toplu SİLME ve toplu FOTOĞRAF DOĞRULAMA YOK;
      istek başına en fazla 100 kayıt; seçim SAYFA bazlı
- [x] **K9** `src/lib/audit-log.ts` — BEYAZ LİSTE (`isActive`, `seoReady`,
      `stockStatus`); iç içe nesne/dizi düşürülür; kayıt yazılamazsa işlem
      DÜŞMEZ
- [x] **`drizzle/0013`** development'a uygulandı
      · yedek: `~/.osko/backups/dev_0013_oncesi.sql` (293 KB, 18 COPY,
        166 ürün satırı, stderr boş)
      · dry-run `BEGIN` → `ROLLBACK` geçti
      · POST-CHECK: 10 kolon · 2 kısıt · 2 index · **0 yabancı anahtar
        (bilinçli)** · 0 kayıt · ürün sayısı 166 DEĞİŞMEDİ
      · **KISIT KANITI:** `{"password": "x"}` içeren INSERT migration
        içinde denendi ve **REDDEDİLDİ**
      · ikinci çalıştırma hatasız (idempotent); `GRANT` rol varlığına bağlı
- [x] `tests/admin-active-status.spec.ts` (11) +
      `tests/category-tree.spec.ts` (26) + `tests/fitment-notes.spec.ts` (7) +
      `tests/bulk-actions.spec.ts` (31)
- [x] **Tarayıcı doğrulaması — YAPILDI** (2026-11-18, kullanıcı giriş yaptı).
      Ayrıntı aşağıdaki "Faz 5" bölümünde

### Faz 5 — 2026-11-18 (tarayıcı doğrulaması, masaüstü + tablet + 375px)
- [x] **P4/Y3** filtre: "Yalnızca test" → **12 ürün / 12 sonuç**, aktif filtre
      rozeti ve "Filtreleri temizle" belirdi; varsayılan **154 ürün**
- [x] **P5** satır seçimi → çubuk ("Seçili 12 kayıt") → onay diyaloğu →
      sonuç paneli. **Toplu yayın denemesi: 0 işlendi · 12 reddedildi**,
      her kayıt için gerekçe listelendi. `seo_ready` **0'da kaldı**
- [x] **P5 / K9** `admin_audit_log`: 24 satır (iki deneme), hepsi
      `bulk_publish` + `outcome = 'rejected'`, `actor` dolu,
      `before_state = {"seoReady": false}`, `after_state` boş.
      **Parola/token anahtarı içeren satır: 0**
- [x] **P7** düzenleme ekranında İKİ AYRI rozet + GÖRÜNÜRLÜK anahtarı.
      Sentetik kayıt Aktif yapıldı → rozet yeşile döndü, **yayın rozeti
      "Yayında değil" olarak KALDI** → tekrar Pasif yapılarak eski durumuna
      döndürüldü (`is_active` sayısı 153'te sabit)
- [x] **P6** `/admin/categories` boş durum metni; 2 geçici kategori
      oluşturuldu (`Şanzıman Testi A` → slug **sanziman-testi-a**, Türkçe
      harf düşmedi), alt kategori ağaçta girintili göründü
- [x] **P6 sunucu korumaları canlı doğrulandı:** alt kategorisi olanı silme
      → **409** (`childCount: 1`), döngü denemesi → **400** ("kendisine veya
      kendi alt kategorisine bağlanamaz"), geçersiz kategori kimliğiyle ürün
      güncelleme → **400** ("Kategori bulunamadı") — eskiden 500 olurdu
- [x] **P6** ürün düzenleme ekranından kategori atandı (`productCount: 1`),
      dolu kategoriyi silme → **409**. Sonra atama kaldırıldı ve iki kategori
      de silindi: **kategori sayısı yeniden 0**
- [x] **P12** uyumluluk notu satır içi düzenlendi ve kaydedildi;
      **"Doğrulandı" + kaynak DEĞİŞMEDİ**; not eski değerine döndürüldü
- [x] Ölçümler: masaüstü 1440px · tablet **768 → belge 753, taşan 0** ·
      mobil **375 → belge 375, taşan 0**; sekme şeridi 468px içerik /
      343px kaydırılabilir kap (P1 korundu)
- [x] **Bulunan ve düzeltilen kusur:** toplu işlem sonucunda reddetme
      gerekçeleri ekranda HAM KOD olarak yazıyordu
      (`no_verified_image, long_description_too_short`). Sunucu artık
      `reasons` (Türkçe) döndürüyor, arayüz onu gösteriyor; kod listesi
      yanıtta log/geliştirici tarafı için duruyor. Test eklendi

---

## Son başarılı test sonuçları

**Faz 5 TAMAM — 2026-11-18 (EN GÜNCEL)**

| Kontrol | Sonuç | Referansa göre |
|---|---|---|
| `npx tsc --noEmit` | ✅ 0 hata | aynı |
| `npm test` | ✅ **511 geçti**, 0 başarısız | **+172** (339 → 511) |
| `npm run lint` | ⚠ **34 sorun** (19 hata, 15 uyarı) | **aynı — artış yok** |
| `npm run build` | ✅ **exit 0**, 65/65 statik sayfa, derleme temiz | |

> Build çıktısındaki 3 `Failed query` satırı **kod hatası değildir**:
> hepsinin nedeni `too many connections for role "nidah_dev"` (dev sunucusu
> yeni kapatıldığı için bağlantı bütçesi doluydu). `error TS`, `EPERM`,
> `EBUSY` **yok**; "Compiled successfully" ve exit 0 alındı.

**Veri bütünlüğü (tarayıcı doğrulamasından SONRA):** 166 ürün ·
154 gerçek / 12 sentetik · **153 aktif** · **0 `seo_ready`** ·
**0 stok iddiası** · 0 fotoğraf · 305 uyumluluk (305 doğrulanmış) ·
**0 kategori** · **0 kategorili ürün** → referansla **birebir aynı**.
Tek yeni satırlar: `admin_audit_log` (24 kayıt, hepsi `rejected`).

**Faz 4 ölçümü**

| Kontrol | Sonuç |
|---|---|
| `npm test` | **510 geçti** |

**Public yüzey kontrolü (2026-11-18, dev):**
`sitemap.xml` → 200 · `application/xml` · **27 URL** · mükerrer **0** ·
**ürün detay URL'si 0** (hiçbir ürün `seo_ready` değil) · placeholder URL **0**.
Dev'de 12 marka sayfası görünür: `site_settings` BOŞ olduğu için katalog
toggle'ı varsayılan değerine (açık) düşer — proje CLAUDE.md §4'te yazılı
davranış, regresyon DEĞİL. Canlıda bu sayfalar 404'tür.

`/placeholder/urun-gorseli-hazirlaniyor-4x3.webp` → `X-Robots-Tag: noindex,
noimageindex` + `Cache-Control: immutable` **korundu**.

**Yetkilendirme:** `/api/admin/products`, `/api/admin/categories` ve
`/api/admin/products/bulk` oturumsuz çağrıda **401** döndü (yeni uçlar da
`src/proxy.ts` arkasında).

**Faz 3 ölçümü**

| Kontrol | Sonuç |
|---|---|
| `npm test` | **435 geçti** |
| `npm run lint` | ⚠ **34 sorun** (19 hata, 15 uyarı) | **aynı — artış yok** |
| `npm run build` | ✅ başarılı, **62/62**, exit 0 | aynı |

**Veri bütünlüğü:** değişmedi — Faz 3'te veritabanına YAZILMADI.

**Faz 2 ölçümü**

| Kontrol | Sonuç |
|---|---|
| `npm test` | **412 geçti** |
| `npm run lint` | ⚠ **34 sorun** (19 hata, 15 uyarı) | **aynı — artış yok** |
| `npm run build` | ✅ başarılı, **62/62**, exit 0 | aynı |

**Veri bütünlüğü (Faz 2 sonrası):** 166 ürün · **12 sentetik / 154 gerçek** ·
0 fotoğraf · 0 `seo_ready` · 0 stok iddiası · 305 uyumluluk ·
0 yayınlı çeviri → `is_synthetic` dışında **referansla birebir aynı**

**Faz 2 / P13 ara ölçümü:** test 362
**Faz 1:** test 352

**Faz 1 — 2026-11-17**

| Kontrol | Sonuç |
|---|---|
| `npm test` | 352 geçti |
| diğerleri | tsc 0 · lint 34 · build 62/62 |

**Tarayıcı ölçümü (Faz 1):**

| Görünüm | Belge | Gerçek taşan öğe | Sekme şeridi | Son sekme |
|---|---|---|---|---|
| 375 px | 375/375 | **0** | 468/343 kaydırılabilir | ✅ "Yayın" erişilebilir |
| 768 px | 768/768 | **0** | 468/468 sığıyor | ✅ |
| Masaüstü 1009 px | 1009/1009 | **0** | 483px içerik kadar | ✅ değişmedi |

**Veri bütünlüğü (Faz 1 sonrası):** 166 ürün · 0 fotoğraf · 0 doğrulanmış
fotoğraf · 0 `seo_ready` · 0 stok iddiası · 0 `in_stock` · 305 uyumluluk ·
0 yayınlı çeviri → **referansla birebir aynı**

**Faz 0 referansı (karşılaştırma için):** tsc 0 · test **339** · lint 34 ·
build 62/62

---

## Başarısız testler ve nedenleri

Yok.

### Önceden mevcut sorunlar (bu çalışmanın ürünü DEĞİL)

| Sorun | Yer | Not |
|---|---|---|
| 19 lint hatası | `splash/`, `admin/blog`, `TagManager`, `CategoryManager` vb. | Baseline 38'den düşmüş hâli; bu çalışma öncesinde vardı |
| `react-hooks/set-state-in-effect` | `ProductGallery.tsx:26`, `ImagesManager.tsx:92` | Mevcut `useEffect` satırları |
| Kullanılmayan eslint-disable | `BlogEditor.tsx:280` | |

---

## Değiştirilen dosyalar

### Faz 0
| Dosya | Tür |
|---|---|
| `docs/admin-master-plan/00-MASTER-PLAN.md` | yeni (belge) |
| `docs/admin-master-plan/01-BULGU-DURUM.md` | yeni (belge) |
| `docs/admin-master-plan/02-ILERLEME.md` | yeni (belge) |
| `docs/admin-master-plan/03-GUVENLIK-SINIRLARI.md` | yeni (belge) |
| `docs/admin-master-plan/DEVAM-KOMUTU.txt` | yeni (belge) |

**Kaynak kod ve veritabanı değişikliği: YOK.**

### Faz 1
| Dosya | Tür | Bulgu |
|---|---|---|
| `src/components/ui/tabs.tsx` | değişiklik | P1 |
| `products/[id]/edit/page.tsx` | değişiklik | P1, P3, P8 |
| `tests/admin-tabs.spec.ts` | **yeni** | P1, P3, P8 |

**Veritabanı değişikliği: YOK.**

### Faz 2
| Dosya | Tür | Bulgu |
|---|---|---|
| `drizzle/0012_product_synthetic_flag.sql` | **yeni** | P4 |
| `src/lib/db/schema.ts` | değişiklik | P4 |
| `src/lib/db/columns.ts` | değişiklik (`PRODUCT_COLUMNS_V4`) | P4 |
| `src/lib/product-filters.ts` | **yeni** | P4, Y3 |
| `src/components/admin/ProductFilterBar.tsx` | **yeni** | P4, Y3 |
| `src/app/api/admin/products/route.ts` | değişiklik | P13, P4, Y3 |
| `src/app/(admin)/admin/(dashboard)/products/page.tsx` | değişiklik | P4, Y3 |
| `tests/admin-product-list.spec.ts` | **yeni** | P13 |
| `tests/product-filters.spec.ts` | **yeni** | P4, Y3 |
| `tests/schema-phase4.spec.ts` | **yeni** | P4 |

**Veritabanı: `drizzle/0012` DEVELOPMENT'A UYGULANDI** (production'da YOK).

### Faz 3
| Dosya | Tür | Bulgu |
|---|---|---|
| `src/lib/translation-gate.ts` | **yeni** | P11 |
| `src/components/admin/SerpPreview.tsx` | **yeni** | P9 |
| `src/components/admin/ImagesManager.tsx` | değişiklik | P10 |
| `src/components/admin/TranslationsManager.tsx` | değişiklik | P11 |
| `src/components/ui/tabs.tsx` | değişiklik (`overflow-y-hidden`) | P1 ek |
| `products/[id]/edit/page.tsx` | değişiklik | P9 |
| `tests/translation-gate.spec.ts` | **yeni** | P10, P11 |
| `tests/serp-preview.spec.ts` | **yeni** | P9 |

**Veritabanı değişikliği: YOK.**

### Faz 4
| Dosya | Tür | Bulgu |
|---|---|---|
| `drizzle/0013_admin_bulk_audit.sql` | **yeni** | P5, K9 |
| `src/lib/db/schema.ts` | değişiklik (`adminAuditLog`) | P5 |
| `src/lib/audit-log.ts` | **yeni** | K9 |
| `src/lib/bulk-actions.ts` | **yeni** | P5, K10 |
| `src/lib/category-tree.ts` | **yeni** | P6 |
| `src/lib/product-fields.ts` | değişiklik (`fitmentNotes`) | P12 |
| `src/components/admin/ActiveStatusControl.tsx` | **yeni** | P7 |
| `src/components/admin/BulkActionBar.tsx` | **yeni** | P5 |
| `src/components/admin/FitmentsManager.tsx` | değişiklik | P12 |
| `src/app/(admin)/admin/(dashboard)/categories/page.tsx` | **yeni** | P6 |
| `src/app/(admin)/admin/(dashboard)/layout.tsx` | değişiklik (gezinme) | P6 |
| `src/app/(admin)/admin/(dashboard)/products/page.tsx` | değişiklik | P5 |
| `src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx` | değişiklik | P7, P6 |
| `src/app/api/admin/categories/route.ts` | **yeni** | P6 |
| `src/app/api/admin/categories/[id]/route.ts` | **yeni** | P6 |
| `src/app/api/admin/products/bulk/route.ts` | **yeni** | P5 |
| `src/app/api/admin/products/route.ts` | değişiklik (kategori doğrulaması) | P6 |
| `src/app/api/admin/products/[id]/route.ts` | değişiklik (kategori doğrulaması) | P6 |
| `src/app/api/admin/products/[id]/fitments/[fitmentId]/route.ts` | değişiklik (not sınırı) | P12 |
| `tests/admin-active-status.spec.ts` | **yeni** | P7 |
| `tests/category-tree.spec.ts` | **yeni** | P6 |
| `tests/fitment-notes.spec.ts` | **yeni** | P12 |
| `tests/bulk-actions.spec.ts` | **yeni** | P5, K9, K10 |

**Veritabanı: `drizzle/0013` DEVELOPMENT'A UYGULANDI** (production'da YOK).

---

## Uygulanan migration'lar

| Migration | Ortam | Tarih | Durum |
|---|---|---|---|
| `0012_product_synthetic_flag.sql` | **development** | 2026-11-17 | ✅ uygulandı, POST-CHECK geçti |
| `0013_admin_bulk_audit.sql` | **development** | 2026-11-18 | ✅ uygulandı, POST-CHECK + kısıt kanıtı geçti |

> `0010` ve `0011` **development'ta uygulanmış**, production'da **YOK**.
> Deploy öncesi her ikisi + `0012` + `0013` production'a uygulanmalı
> (ayrı onay).

---

## Çözülemeyen / yetki sınırını aşan konular

Yok.
