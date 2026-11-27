# Aktarım Güvenliği, Yayın Ön Kontrolü ve 284 Ürün Aktarımı

**Tarih:** 2026-11-26 · **Canlı sürüm:** `8febd5d` (kod değişiklikleri **commit edilmedi**)

---

## Yönetici özeti

İçe aktarma güvenli hâle getirildi: yeni ürünler artık **pasif ve yayın
onaysız** oluşuyor, mevcut ürünlerin aktiflik/yayın durumuna aktarım
dokunamıyor. Buna ek olarak ölçülen bir açık kapatıldı: public sorgular
yalnızca `is_active` kontrol ediyordu, yani yayın onayı olmayan bir ürün
aktifleştirildiği anda katalogda **erişilebilir** oluyordu. Artık yayın
tek bir şey: `is_active` **ve** `seo_ready`.

Güvenlik sağlandıktan sonra **284 yeni ürün** production'a pasif ve yayın
onaysız olarak aktarıldı (toplam ürün 157 → 441). Aktarımdan sonra aktif ürün
sayısı **10**, yayın onaylı **10** — yani değişmedi.

**76281 ve 90898 mükerrer ya da eski kayıt DEĞİL.** Bu numaraların
veritabanındaki tek kaydı bunlar; adları ham stok kodu artığı ("KIT",
"GAUDE"), açıklamaları boş. 90898'in eski `description` alanında
*"VOLVO 700 SERİSİ VİTES GÖSTERGESİ"* yazıyor ve ikisinin de yüklenmiş
fotoğrafı ve VOLVO G720 uyumluluk kaydı var. **Hiçbir veri kaybı yok**
(yalnızca `is_active` değişti, yedeği duruyor) ve **hiçbir SEO adresi
kaybolmadı** (katalog kapalı olduğu için bu ürünlerin sayfası hiç yayında
olmadı, sitemap'te hiç ürün URL'si yoktu). Ama bu iki ürün bugünkü hâliyle
yayına **uygun değil**: adı ve açıklaması yok. İçerik önerim aşağıda,
onayınızı bekliyor.

**Pilot yayın ön kontrolü temiz:** yayın onayı olmadan aktif ürün **0**,
aktif olmadan yayın onaylı ürün **0**, yayına girecek 10 ürünün **10'u**
gerçek yayın kapısından geçiyor. Toggle'ı açtığınızda sitemap'e **10 ürün
URL'si** eklenir, görsel girişi **0** olur.

**Kalan iş hacmi ölçüldü:** içeriği tam olup yayın bekleyen **144 ürün**,
uyumluluk kanıtı bekleyen **104** (A), katalog sırası bekleyen **1.407** (B).

---

## 1. 76281 ve 90898 — ölçüm

Üretim veritabanından salt okunur (`scripts/kontrol-76281-90898.mjs`,
`scripts/kontrol-76281-detay.mjs`):

| | `76281` | `90898` |
|---|---|---|
| Kayıt sayısı (normalize arama) | **1** | **1** |
| Ad | `KIT` | `GAUDE` |
| Uzun açıklama | boş | boş |
| Eski `description` alanı | boş | **"VOLVO 700 SERİSİ VİTES GÖSTERGESİ"** |
| Yüklenmiş fotoğraf | **1** (doğrulanmamış) | **1** (doğrulanmamış) |
| Uyumluluk kaydı | 1 — VOLVO **G720** (doğrulanmamış) | 1 — VOLVO **G720** (doğrulanmamış) |
| OEM / muadil kaydı | yok | yok |
| Oluşturma | 2026-03-04 | 2026-03-10 |
| Bugünkü durum | pasif, yayın onaysız | pasif, yayın onaysız |

**Mükerrer mi, eski mi?** Hayır. `CH76281` / `CH90898` için ayrı ve doğru bir
kayıt **yok**; veritabanındaki tek kayıt bunlar. Katalogda "vites", "kart"
veya "gösterge" adını taşıyan başka ürün de yok.

**Ne kayboldu?** Hiçbir şey. Değişen tek alan `is_active` ve yedeği
`scripts/veri/geri-donus/artik3/geri-donus.json` içinde duruyor. Fotoğraflar,
uyumluluk satırları ve `description` metni **olduğu gibi**.

**SEO adresi kaybı?** Yok. Katalog toggle'ı kapalı olduğu için
`/parca-katalog/...` adresleri hiç yayında olmadı ve sitemap'te hiç ürün
URL'si bulunmadı (63 URL, katalog 0).

**Neden pasifleştirildiler?** Yayın kapısının hiçbir ölçütünü
karşılamıyorlardı (ad ham kod artığı, açıklama boş, uyumluluk doğrulanmamış)
ve katalog açıldığında public yüzeyde görünecek **aktif** iki kayıttı. Karar
teknik olarak doğruydu ama **eksikti**: bu iki kaydın NİDAH GROUP'un öncelikli
ürünleri olduğu bilgisi yoktu, dolayısıyla "artık kayıt" etiketi yanlış.

### Önerilen düzeltme — onayınızı bekliyor

Aşağıdaki üç adımın hiçbiri **yapılmadı**; metinler sizin teyidinize bağlı.

| Alan | `76281` | `90898` |
|---|---|---|
| Ad | **Vites kartı** (öneri: `Vites kartı — Volvo G720`) | **Vites göstergesi** (öneri: `Vites göstergesi — Volvo 700 serisi`) |
| Uzun açıklama | şirket teyidi gerekiyor | kaydın kendi metni temel alınabilir |
| Uyumluluk | VOLVO G720 kaydı var, **doğrulanması** gerekiyor (kaynak: şirket teyidi) | aynı |
| Fotoğraf | yüklü, **doğrulanması** gerekiyor (ALT metni + kaynak notu şart) | aynı |
| Parça numarası | `CH 76281` yapılsın mı? (bugün `76281`) | `CH 90898` yapılsın mı? (bugün `90898`) |

Parça numarası değişikliği URL'i de değiştirir; katalog kapalı olduğu için
şu an **kayıpsız** yapılabilir, toggle açıldıktan sonra kalıcı yönlendirme
gerektirir. Bu yüzden karar toggle'dan ÖNCE verilmeli.

> Bu iki ürün aynı zamanda katalogdaki **tek fotoğraflı** kayıtlar. Fotoğraf
> doğrulaması yapılırsa görselli ilk iki ürün bunlar olur.

---

## 2. Parça üreticisi ≠ makine markası

Çelişki yok; iki ayrı alan var ve yayın kapısı bunlardan **hiçbirini**
şart koşmuyor.

| | Alan | Durum | Sayfada gösterilir mi? |
|---|---|---|---|
| **Parçanın üreticisi** | `part_manufacturer` + `sourcing_type` | 441 ürünün **tamamında boş / `unknown`** | **HAYIR** — `brandClaimAllowed()` doğrulanmamış markayı göstermez |
| **Makine markası** | `fitments` → `machines` → `manufacturers`, `verified = true` | 154 üründe **doğrulanmış** | Evet, "Uyumlu makineler" olarak |

Yayın kapısının ölçütleri (`src/lib/seo-gate.ts`): aktiflik · parça numarası ·
**yeterli ad** · boş olmayan açıklama · en az 1 **doğrulanmış** makine uyumu.
Üretici alanı listede **yok**. Yani 10 pilot ürün, üretici bilinmediği hâlde
kapıyı geçer — ve sayfada marka iddia **etmez**.

Bunun gerekçesi v18'in kendi değerlendirmesi: "Fiili Üretici: **Teyitsiz**".
OEM / orijinal / yan sanayi ayrımı veriden çıkarılamaz, **ticari teyit**
gerektirir. Dolayısıyla şartlarınız bugünkü hâliyle karşılanıyor:

- makine uyumluluğu doğrulanmış ✅ (10/10 pilot üründe)
- uydurma marka yazılmıyor ✅ (alan boş, sayfada iddia yok)
- OEM/orijinal/aftermarket iddiası yok ✅ (`sourcing_type = unknown`)
- üreticisi bilinmeyen ama diğer bilgileri doğrulanmış ürün yayınlanabiliyor ✅

---

## 3. Aktarım güvenliği — uygulandı

### Kök neden (ölçülmüş)

`products.is_active` şema varsayılanı **`true`** ve içe aktarma ucu bu alanı
yazmıyordu. Yani toplu aktarımla gelen her ürün **AKTİF** giriyordu.

### Değişiklikler

| Dosya | Değişiklik |
|---|---|
| `src/lib/import-validation.ts` | `IMPORT_NEW_PRODUCT_STATE` (isActive: false, seoReady: false), `IMPORT_UPDATE_PROTECTED_COLUMNS`, `IMPORT_NEW_PRODUCT_NOTICE` |
| `src/lib/import-conflict.ts` | **yeni** — `buildProductConflictSet` rotadan buraya taşındı, böylece testle doğrudan ölçülebiliyor (Next.js route dosyaları keyfi export edemez) |
| `src/app/api/admin/import/products/route.ts` | INSERT artık `isActive`'i **açıkça** yazıyor; özet `newProductState` ve `rollback.createdPartNumbers` döndürüyor |
| `tests/import-safety.spec.ts` | **yeni** — 19 test |

### Altı şartın karşılığı

| Şart | Nasıl sağlandı | Test |
|---|---|---|
| Yeni ürünler pasif ve yayın onaysız | INSERT `is_active = false` yazıyor; `seo_ready` import yüzeyinde yok | ✅ |
| Mevcut ürünlerin aktifliği değişmesin | ON CONFLICT gövdesi `isActive`/`seoReady`/`seoReadyAt` içermiyor | ✅ |
| Aktarım ≠ yayınlama | `IMPORT_FORBIDDEN_COLUMNS` + kapı aktiflik şartı | ✅ |
| Denetimden geçmeden yayın olmasın | yeni ürün kapıda `inactive` + `long_description_missing` + `no_verified_fitment` ile düşüyor | ✅ |
| Mevcut veri ve SEO alanları korunsun | dosyada olmayan kolon `preserve` | ✅ |
| Geri dönüş mekanizması | yazma hatası → tek transaction, hiçbir kayıt yazılmaz; başarı → `rollback.createdPartNumbers` kesin liste | ✅ |

### Mutasyon testi — koruma gerçekten çalışıyor mu?

| Mutasyon | Sonuç |
|---|---|
| INSERT'ten `isActive` satırı silindi | **ilk denemede YAKALANMADI** — dosya genelinde arama, özetteki `newProductState` metnine takılıyordu. Test `.insert(products)` ile `.onConflictDoUpdate` arasına daraltıldı, mutasyon **yakalandı** |
| ON CONFLICT gövdesine `isActive: excluded.is_active` eklendi | **yakalandı** |

Her iki mutasyon geri alındı; kod değişiklik öncesi hâline döndürüldü.

---

## 4. Yayın görünürlüğü açığı — kapatıldı

### Ölçülen eski davranış

Public sorguların **tamamı** yalnızca `is_active = true` koşulu taşıyordu.
`seo_ready` sadece iki yerde uygulanıyordu: `sitemap.xml` ve ürün sayfasının
`robots` etiketi. Sonuç: yayın onayı **olmayan** bir ürün aktifleştirildiği
anda

- `/api/products` listesinde görünüyordu (katalog listesi ve marka sayfaları
  bu uçtan besleniyor),
- ürün detay sayfası **200** dönüyordu (yalnızca `noindex`),
- parça numarası aramasında eşleşiyordu.

Sitemap'te olmamak indekslenmeyi zorlaştırır, **erişimi engellemez**.

### Yeni davranış

`src/lib/public-visibility.ts` (yeni) tek kaynak: **`is_active` VE
`seo_ready`**. Kullanan dosyalar:

| Dosya | Yüzey |
|---|---|
| `src/app/api/products/route.ts` | katalog listesi, marka sayfaları, arama |
| `src/app/api/products/[partNumber]/route.ts` | public ürün API'si |
| `src/lib/queries/product.ts` | ürün detay sayfası → onaysız ürün artık **gerçek 404** |
| `src/lib/search-gate.ts` | arama sözlüğü |
| `src/lib/catalog.ts` | (şu an çağrısız modül; politika tek olsun diye güncellendi) |

`tests/public-visibility.spec.ts` (15 test) hem koşulu hem de her dosyanın
bu tek kaynağı kullandığını kilitler; üretilen SQL `PgDialect` ile
serileştirilip iki kolonun da bulunduğu ölçülür.

Ürün sayfasındaki `!seoReady → noindex` dalı **bilinçli olarak korundu**:
artık erişilemez, ama sorgu tarafında bir gerileme olursa ikinci katman
devrede kalır.

---

## 5. Pilot yayın ön kontrolü

`scripts/pilot-yayin-onkontrol.mjs`, production, salt okunur:

| Kontrol | Sonuç |
|---|---|
| Toplam ürün | **441** |
| Aktif | **10** |
| Yayın onaylı | **10** |
| Yayına girecek (aktif **ve** onaylı) | **10** |
| **Aktif ama yayın onaysız** | **0** ✅ |
| **Onaylı ama pasif** | **0** ✅ |
| Yayına girecek 10 üründen kapıyı geçen | **10 / 10** ✅ |
| Sitemap'e eklenecek ürün URL'si | **10** |
| Sitemap'e eklenecek görsel girişi | **0** (doğrulanmış fotoğraf yok) |

Pilot 10: `324-0386` · `58822-32300` · `60325-01300` · `60332-00700` ·
`60332-00801` · `60425-01800` · `60441-10300` · `60525-02900` ·
`60525-03800` · `69331-03400` — açıklamalar 262–346 karakter, hepsinde en az
1 doğrulanmış uyumluluk, hiçbirinde doğrulanmış fotoğraf yok (Seviye B
kararı: fotoğraf yayın şartı değil).

**Toggle açılmaya hazır.** Mevcut canlı sürümde güvence "yayın onayı olmayan
aktif ürün bulunmaması"ndan geliyor (ölçüldü: 0). Yukarıdaki görünürlük
değişikliği deploy edilince bu **yapısal** hâle gelir.

---

## 6. 284 ürün aktarımı — yapıldı

### 322 → 284: süzgeç

`scripts/v18-aktarim-aday.mjs` (v18 + production, salt okunur):

| Adım | Kayıt |
|---|---|
| "Web Katalog Adayları" | 580 |
| katalog referansı dolu | 580 |
| **kanıtlı makine uyumu olan** | **476** |
| servis/işçilik listesinde olmayan | 476 |
| **production'da henüz bulunmayan** | **322** ✅ (doc 35 ile birebir aynı) |
| normalize numara çakışması olmayan | **284** |

**19 çakışma kümesi (38 satır) aktarıma ALINMADI.** Aynı normalize parça
numarasına düşen birden çok Logo satırı var; veritabanında normalize numara
benzersiz olduğu için bunlar tek ürüne mi denk geliyor, ayrı ürünler mi
olduğu **insan kararıdır ve tahmin edilmedi**. Liste:
`scripts/veri/v18-cakisma-raporu.json`.

> **Düzeltme:** doc 35 "281 Volvo/Champion" diyordu. v18 `Marka İpucu`
> kolonundan ölçtüğümde 322 adayın **175'i** Volvo veya Volvo/Champion
> (aktarılan 284'ün **158'i**). 281 sayısını yeniden üretemedim; ölçülen
> değer 175'tir.

Aktarılan 284'ün marka dağılımı: Volvo **139** · marka belirlenemedi **96** ·
Volvo/Champion **19** · Komatsu **12** · HİDROMEK **9** · ZF **6** ·
JCB/Doosan/Bosch Rexroth **1+1+1**.

### Prova (dry-run)

İki katmanlı:

1. **Gerçek doğrulama koduyla** — `tests/v18-aktarim-provasi.spec.ts`
   (10 test): kimlik hücresi kontrolü 0 hata, normalize mükerrer 0,
   metin sınırları temiz, 284/284 ürün yayın kapısından **geçemiyor**,
   dosya `isActive`/`seoReady`/`verified` alanı taşımıyor.
   (Panelin `mode=dry-run` ucu bu makineden çağrılamıyor: admin API kimliği
   yok. Reddetme/geçirme mantığı saf fonksiyonlarda olduğu için prova tam o
   fonksiyonlarla yapıldı.)
2. **Production'a karşı** — `node scripts/v18-aktarim-uygula.mjs`:
   "284 yeni kayıt oluşacak, 0 satır atlanacak", mevcut kayıtla çakışma 0,
   aynı Logo kodu çakışması 0.

### Yazma

| | Önce | Sonra |
|---|---|---|
| Toplam ürün | 157 | **441** |
| Aktif | 10 | **10** |
| Yayın onaylı | 10 | **10** |

Tek `INSERT ... ON CONFLICT (part_number) DO NOTHING`; `is_active = false`,
`seo_ready = false`, `in_stock = false`, `stock_status = 'unknown'`,
`condition = 'new'` **açıkça** yazıldı. Açıklama, marka ve temin niteliği
yazılmadı.

Geri dönüş: `scripts/veri/geri-donus/v18-284/` → `once.json` (yazma öncesi
durum), `olusan.json` (oluşan 284 parça numarası), `geri-al.sql`
(yalnızca pasif ve onaysız olan bu 284 kaydı silen, `ROLLBACK` ile
başlayan script).

### Aktarım sonrası denetim

`scripts/aktarim-sonrasi-denetim.mjs`:

| Ölçüm | Sonuç |
|---|---|
| Aktarılan kayıt | 284 |
| Aktif / yayın onaylı | **0 / 0** ✅ |
| Logo stok kodu olan | 284 |
| Normalize numara boş olan | **0** |
| Benzersiz normalize numara | **284** (mükerrer yok) ✅ |
| Stok iddiası taşıyan | **0** |
| Açıklaması olan | **0** (bilinçli) |
| Markalı | **0** (bilinçli) |
| Adı boş olan | **0** |
| Ad uzunluğu | 4–39 karakter |
| **Aynı adı taşıyan kümeler** | **45 küme / 117 satır** → yayın öncesi ayırt etme işi |
| Zayıf ad (yayını engeller) | **5** |

En kalabalık ad çakışmaları: "Şanzıman sızdırmazlık halkası" ×8,
"Son tahrik makaralı rulmanı" ×6, "Mafsal ara parçası" ×5.

### 284'ün yayın için eksiği

| Eksik | Kayıt |
|---|---|
| Uzun açıklama | **284 / 284** |
| Doğrulanmış makine uyumu | **284 / 284** |

Yani bu 284 ürün **hiçbir koşulda** kendiliğinden yayına giremez. Sırası:
(1) v18 "Makine Uyumluluğu" sayfasından kaynaklı uyumluluk aktarımı,
(2) ad çakışmalarının çözülmesi, (3) açıklama yazımı ve onayı.

---

## 7. Sıradaki yayın grupları ve kalan araştırma

### Hemen yayınlanabilir hâle gelecek 144 ürün

Pasif, ama **içeriği tam**: boş olmayan açıklama + en az 1 doğrulanmış
uyumluluk + en az iki kelimelik ad. Yani yayın kararı dışında eksikleri yok.

| | Kayıt |
|---|---|
| Yayında (pilot) | 10 |
| **İçeriği tam, yayın bekleyen** | **144** |
| İçeriği eksik (284 yeni + 2 artık + 1 deneme) | 287 |

Metin onayı akışı bu 144'ün üzerinden yürüyor: 28 metin onaylandı ve
yazıldı, **14 metin onay bekliyor** (`docs/34`).

### Araştırma kuyruğu

`scripts/v18-arastirma-kuyrugu.mjs` → `scripts/veri/arastirma-kuyrugu.json`

| Grup | Kayıt | Volvo/Champion öncelikli | Eksik |
|---|---|---|---|
| **A** | **104** | **56** | kanıtlı makine uyumluluğu (katalog referansı var) |
| **B** | **1.407** | **119** | katalog taraması (teknik kimlik yok) |

> Doc 35'teki "104 (A grubu)" sayısı doğrulandı: 580 adayın 476'sında
> uyum kanıtı var, **104'ünde yok**. (Not: "A Grubu Teknik Eksikler"
> sayfasının `Makine Modeli` kolonuna göre ölçüm 0 veriyor — yanıltıcı
> kolon, kullanılmadı.)

**Bu oturumda dış kaynak araştırması YAPILMADI.** Kuyruk öncelik sırasına
dizildi; araştırma ayrı bir iş.

---

## Yapılmayanlar ve ölçülemeyenler

| | Durum |
|---|---|
| Commit / push / deploy | **yapılmadı** — ayrı onay gerekir. Kod değişiklikleri çalışma ağacında |
| Katalog toggle'ı | **açılmadı** — panelden siz açacaksınız |
| 76281 / 90898 içerik düzeltmesi | **yapılmadı** — metin ve parça numarası kararı sizde |
| 14 metnin veritabanına yazımı | **yapılmadı** — onay bekliyor |
| 284 ürünün uyumluluk aktarımı | **yapılmadı** — sıradaki iş |
| 19 çakışma kümesi | **karar bekliyor** (otomatik birleştirme yapılmadı) |
| Pilotun canlı görünümü | toggle kapalı olduğu için **doğrulanamadı** |
| Neon kotası | **ÖLÇÜLEMEDİ** — panel erişimi yok. Bu oturumda production'a ~12 sorgu turu atıldı (11 okuma + 1 yazma) |
| Yeni ücretli hizmet | **başlatılmadı** |

## Doğrulama durumu

`npx tsc --noEmit` temiz · `npm test` **632 geçti / 0 başarısız**
(588 → 632: +44 yeni test) · `npm run lint` **35 sorun** (baseline 38,
artış yok) · `npm run build` başarılı · `[isr-koruma]` **36/36 rota süreyle
eskimiyor**.
