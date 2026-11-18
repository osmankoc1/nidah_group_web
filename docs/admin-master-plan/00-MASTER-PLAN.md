# NİDAH GROUP — Admin Paneli Kapsamlı İyileştirme MASTER PLANI

**Tarih:** 2026-11-17 · **Durum:** ONAY BEKLİYOR · **Kod/DB değişikliği:** YOK
**Git HEAD:** `5497e9b` · Ortam: development (`localhost:3001`)

---

## 0. Başlangıç doğrulaması (salt okunur, bugün ölçüldü)

```
rol=neondb_owner · site_settings=0  → development imzası doğrulandı
urun=166 · sentetik=12 · aktif_sentetik=0
gercek_urun=154
gorsel=0 · dogrulanmis_gorsel=0
seo_ready=0 · yayinda=0
stok_iddiali=0 · in_stock=0
kisa_aciklama(<300, gerçek ürün)=42
uyum=305 · dogrulanmis_uyum=305
ceviri=156 · yayinli_ceviri=0
oem=1 · makine=108 · uretici=11
kategori=0 · kategorili_urun=0        ← YENİ BULGU, aşağıda Y1
```

Belirttiğiniz bütün rakamlar **birebir doğrulandı**. Bu değerler uygulama
boyunca değişmeyecek; her faz sonunda aynı sorgu tekrarlanacak.

---

## 1. Bulgu listesi ve doğrulama sonucu

> **Önce bir düzeltme.** Denetim raporumdaki 13 bulgudan **biri yanlıştı.**
> Planı yanlış temel üzerine kurmamak için önce onu düzeltiyorum.

### ❌ P2 GERİ ÇEKİLDİ — "Mobilde üst menünün yarısı erişilemiyor"

**Yanlış ölçüm bendendi.** Tarayıcıda `document.querySelector('header')` ile
kaydırma sarmalayıcısı aradım; oysa öğe `<nav>`. Sarmalayıcı bulunamayınca
"kaydırılamıyor" sonucuna vardım.

Doğru ölçüm:

```
navSeritOlcu: 762/375   → kaydırılabilir
Sayfalar bağlantısı kaydırma sonrası sağ kenar: 359px → ERİŞİLEBİLİR
```

`layout.tsx` zaten `lg:hidden` ikinci satırda `-mx-4 overflow-x-auto px-4` +
`flex w-max` kullanıyor ve kod yorumunda bu çözümün daha önce bilinçli olarak
yapıldığı yazıyor. **Menüde sorun yok, P2 kapsam dışı.**

Geriye **12 geçerli bulgu** kalıyor. Numaraları izlenebilirlik için
değiştirmiyorum.

### Geçerli bulgular

| # | Önem | Bulgu | Doğrulama |
|---|---|---|---|
| **P1** | 🔴 Kritik | Mobilde sekme şeridi taşıyor; Çeviriler ve Yayın ekran dışında | `tablist 468/468`, `overflow-x: visible`, kaydırılamıyor; **belge 484/375 taşıyor** |
| **P3** | 🟠 Yüksek | "Yayına hazır olarak işaretle" ölçütler karşılanmadan tıklanabilir | Düğme etkin; sunucu 422 döndürüyor |
| **P4** | 🟠 Yüksek | Listede filtre yok; 12 sentetik kayıt 154 gerçekten ayrılmıyor | Tek araç serbest metin araması |
| **P5** | 🟠 Yüksek | Toplu işlem yok | Satırlarda seçim kutusu yok |
| **P6** | 🟠 Yüksek | Kategori alanı düzenleme ekranında yok | `categoryId` API'de yazılabilir, formda yok |
| **P7** | 🟡 Orta | Aktif/Pasif anahtarı düzenleme ekranında yok | Yalnızca listede |
| **P8** | 🟡 Orta | "en az 300 **önerilir**" metni yanıltıcı | Sunucu **zorunlu** tutuyor (K3) |
| **P9** | 🟡 Orta | Meta alanlarında sayaç ve SERP önizlemesi yok | Kısa/uzun açıklamada sayaç var |
| **P10** | 🟠 Yüksek | Fotoğraf doğrulama şartları yüklemeden önce görünmüyor | ALT ≥15 + kaynak zorunlu, sonradan öğreniliyor |
| **P11** | 🟡 Orta | Çeviri yayınında ölçüt kontrolü yok | "Kaydet ve yayınla" denetimsiz |
| **P12** | 🟢 Düşük | Uyumluluk kaydı düzenlenemiyor | Yalnızca sil + yeniden ekle |
| **P13** | 🟡 Orta | Liste API'si `longDescription` döndürmüyor | P4 filtrelerinin ön koşulu |

---

## 2. Bulgu bazında teknik çözüm planı

### P1 — Mobilde sekme şeridi 🔴

**Teknik neden.** `src/components/ui/tabs.tsx` içindeki `tabsListVariants`
sınıfı `inline-flex w-fit` — taşma yönetimi **yok**. 6 sekme 468px yer
kaplıyor, 375px ekranda şerit belgeyi 484px'e zorluyor. Sekmeler ancak
**sayfanın tamamını yana kaydırarak** görülebiliyor; bu sırada altındaki
form da kayıyor.

**Etki.** Telefondan yayın kararı verilemiyor, çeviri düzenlenemiyor. Depo
turunda sahada telefonla çalışacak kişi paneli kullanamaz.

**Çözüm.** `TabsList`'e `line` varyantı gibi yeni bir **`scroll` varyantı**
eklemek yerine, taşma yönetimini **temel sınıfa** eklemek:
`max-w-full overflow-x-auto` + `scrollbar` gizleme + `justify-start`.
`w-fit` dar ekranda `w-full`'a döner. Böylece **tüm** sekmeli ekranlar
(ürün düzenleme, varsa blog) tek seferde düzelir.

| Dosya | Değişiklik |
|---|---|
| `src/components/ui/tabs.tsx` | `tabsListVariants` temel sınıfına taşma yönetimi |
| `src/app/globals.css` | `.scrollbar-none` yardımcı sınıfı (yoksa) |

**API / DB:** yok. **Uyumluluk:** masaüstünde `overflow-x-auto` hiçbir şeyi
değiştirmez (içerik sığıyor). **Güvenlik/SEO:** etkisi yok (admin).

**Kabul kriterleri.** 375px'te: belge yatay taşması **yok**; altı sekmenin
hepsi kaydırarak **erişilebilir**; aktif sekme görünür alana kaydırılıyor;
masaüstü görünümü piksel olarak **değişmemiş**.

**Testler.** `tests/admin-tabs.spec.ts` — `tabsListVariants` çıktısının
taşma sınıflarını içerdiğini kilitler. Tarayıcı: 375 / 768 / masaüstü
ölçümü (`scrollWidth > clientWidth` kontrolü).

**Geri alma.** Tek dosyada sınıf dizesi; eski değere dönülür.
**İş yükü:** ~0,3 oturum. **Bağımlılık:** yok.

---

### P3 — Yayın düğmesi ölçütler karşılanmadan tıklanabilir 🟠

**Teknik neden.** `products/[id]/edit/page.tsx` düğmeyi yalnızca
`seoBusy` ile pasifleştiriyor; `readiness.eligible` kullanılmıyor.

**Etki.** Operatör başarısız olacağı belli bir eylemi deniyor, 422 hatası
alıyor. Güven kaybı; gerçek bir arıza sanılabilir.

**Çözüm.** `disabled={seoBusy || !readiness.eligible}` + düğme altında
"Önce yukarıdaki eksikleri tamamlayın" ipucu. **Sunucu kapısı
DEĞİŞTİRİLMEZ** — istemci yalnızca aynı kararı önden gösterir.

| Dosya | Değişiklik |
|---|---|
| `src/app/(admin)/admin/(dashboard)/products/[id]/edit/page.tsx` | Düğme durumu + ipucu |

**Kabul kriterleri.** Ölçüt eksikken düğme pasif; tamamlanınca etkin;
**sunucu 422 davranışı aynen duruyor** (regresyon testi).

**Testler.** Mevcut `tests/seo-gate.spec.ts` korunur; yeni test
`evaluateSeoReadiness` sonucunun düğme durumunu belirlediğini kaynak
düzeyinde kilitler. **Geri alma:** tek satır. **İş yükü:** ~0,2 oturum.

---

### P4 — Liste filtreleri + sentetik kayıt ayrımı 🟠

**Teknik neden.** `admin/products/page.tsx` yalnızca `search` gönderiyor.
API `search` ve `active` destekliyor; başka filtre yok. Sentetik kayıtları
ayırt eden **hiçbir alan yok** — ayrım bugün yalnızca ad/parça numarası
desenine (`TEST|ATOM`) dayanıyor ve bu desen **kalıcı bir işaret değil**.

**Etki.** 9 sayfa arasında "fotoğrafı eksik olanlar" veya "açıklaması kısa
olanlar" bulunamıyor. Fotoğraf turu planlanamıyor.

**Çözüm — iki parça:**

**(a) Kalıcı sentetik işareti.** `products` tablosuna
`is_synthetic boolean NOT NULL DEFAULT false` kolonu
(`drizzle/0012_product_synthetic_flag.sql`). 12 kayıt **tek seferlik,
kimlik listesiyle** işaretlenir. Desen tahmini yerine kalıcı veri.

> **Onay gerektiren mimari karar — K8.** Alternatif: kolon eklemeden desen
> filtresi. Kolon **daha doğru** (desen bir gün gerçek bir parça numarasıyla
> çakışabilir) ama migration gerektirir. Önerim: kolon.

**(b) Filtreler.** API'ye eklenecek parametreler:
`seoReady` · `stockStatus` · `condition` · `hasPhoto` · `hasVerifiedPhoto` ·
`descriptionShort` · `synthetic` · `manufacturer` · `categoryId` · `sort`.
Arayüzde açılır filtre çubuğu + aktif filtre rozetleri + "Filtreleri temizle".
Varsayılan: **sentetik kayıtlar gizli**, üstte "12 sentetik kayıt gizlendi"
bilgisi ve göster bağlantısı.

| Dosya | Değişiklik |
|---|---|
| `drizzle/0012_product_synthetic_flag.sql` | **YENİ** — kolon + kısmi index |
| `src/lib/db/schema.ts` | `isSynthetic` kolonu |
| `src/lib/db/columns.ts` | `PRODUCT_COLUMNS_V4` |
| `src/lib/product-filters.ts` | **YENİ** — saf filtre ayrıştırma |
| `src/app/api/admin/products/route.ts` | Filtre + sıralama parametreleri |
| `src/app/(admin)/admin/(dashboard)/products/page.tsx` | Filtre çubuğu |
| `src/components/admin/ProductFilterBar.tsx` | **YENİ** |

**Güvenlik/SEO.** `is_synthetic` **public yüzeye çıkmaz**;
`PRODUCT_COLUMNS_V1` ve `queries/product.ts`'e eklenmez — mevcut
`tests/schema-phase3.spec.ts` kalıbıyla kilitlenir. Sentetik kayıtlar
`is_active=false` olmaya **devam eder**; bu kolon ek bir katmandır,
mevcut korumanın yerine geçmez.

**Kabul kriterleri.** 12 sentetik kayıt varsayılan listede görünmez; sayı
"154 ürün" olarak okunur; her filtre tek başına ve birlikte doğru sonuç
verir; filtreler URL'ye yazılır (paylaşılabilir/yenilenebilir).

**Testler.** `tests/product-filters.spec.ts` (saf ayrıştırma, 15+ senaryo);
`tests/schema-phase4.spec.ts` (kolon public kümelere sızmıyor);
tarayıcı: her filtrenin sonuç sayısını DB sorgusuyla karşılaştırma.

**Geri alma.** Migration geri alma betiği dosya başlığında; kolon düşürülür.
**İş yükü:** ~1,5 oturum. **Bağımlılık:** P13 (liste API alanları).

---

### P5 — Güvenli ve denetlenebilir toplu işlemler 🟠

**Teknik neden.** Hiç yok.

**Etki.** Fotoğraf turu sonrası 154 ürün tek tek açılacak.

**Çözüm.** Satır seçim kutuları + "Seçili N kayıt" eylem çubuğu. **Yalnızca
üç işlem, hepsi geri alınabilir ve denetlenebilir:**

1. **Aktif / pasif yapma**
2. **Stok durumu atama** (üç enum değeri)
3. **Yayın onayı** — ⚠ **her kayıt için sunucu kapısından TEK TEK geçer**

**Kesinlikle YAPILMAYACAKLAR:** toplu silme, toplu fotoğraf doğrulama
(doğrulama ALT metni + kaynak ister, toplu yapılamaz), kapıyı atlayan
toplu yayın.

Yeni uç: `POST /api/admin/products/bulk` — gövdede `ids[]` + `action`.
**En fazla 100 kayıt/istek.** Her kayıt için ayrı sonuç döner
(`{id, ok, error}`), kısmi başarı raporlanır. Yayın işleminde
`evaluatePublishEligibility()` her kayıt için çalışır; geçmeyenler
`unmet` listesiyle reddedilir.

**Denetlenebilirlik.** `drizzle/0013_admin_bulk_audit.sql` — `admin_audit_log`
tablosu: `id`, `actor` (admin kullanıcı adı), `action`, `product_id`,
`before` / `after` (jsonb), `created_at`. Toplu işlemlerin tamamı loglanır.

> **Onay gerektiren mimari karar — K9.** Denetim tablosu yeni bir tablodur.
> İstemezseniz toplu işlemler loglanmadan da çalışır, ama "kim ne zaman ne
> yaptı" sorusu yanıtsız kalır. Önerim: tablo eklensin.

**Kabul kriterleri.** Yayın ölçütlerini karşılamayan hiçbir kayıt toplu
işlemle yayına **giremez**; kısmi başarı net raporlanır; her işlem loglanır;
100'den fazla seçimde uyarı.

**Testler.** `tests/bulk-actions.spec.ts` (saf doğrulama + kapı çağrısı);
izole sentetik kayıtlar üzerinde uçtan uca betik.
**Geri alma.** Uç kaldırılır; tablo düşürülür. **İş yükü:** ~2 oturum.
**Bağımlılık:** P4 (seçim listenin üstünde kurulur).

---

### P6 — Kategori yönetimi 🟠

**Teknik neden.** Düzenleme formunda kategori alanı yok. **Ayrıca
`categories` tablosu 0 satır ve hiçbir ürüne kategori atanmamış** (Y1).

**Etki.** Kategori adı public ürün sayfasında ve `Product.category`
JSON-LD alanında kullanılıyor; bugün **hiçbir üründe yok**.
`CategoryManager.tsx` bileşeni projede **mevcut** ama bir ekrana bağlı değil.

**Çözüm.** (a) Düzenleme formuna kategori seçici (mevcut `Select` bileşeni).
(b) Mevcut `CategoryManager`'ı bir yönetim ekranına bağlamak.
(c) **Kategori verisi uydurulmaz** — hangi kategorilerin olacağı sizin
kararınız; plan yalnızca aracı hazırlar.

| Dosya | Değişiklik |
|---|---|
| `products/[id]/edit/page.tsx` | Kategori seçici |
| `src/app/(admin)/admin/(dashboard)/categories/page.tsx` | **YENİ** ekran |
| `layout.tsx` | Menüye "Kategoriler" |

**API/DB:** `categoryId` zaten yazılabilir; `/api/admin/categories` var mı
kontrol edilecek, yoksa eklenecek. **Yeni migration gerekmez.**

**Kabul kriterleri.** Kategori atanabiliyor/kaldırılabiliyor; boş bırakmak
geçerli; atanmamış ürünün JSON-LD'sinde `category` alanı **üretilmiyor**
(mevcut davranış korunur). **İş yükü:** ~1 oturum.

---

### P7 — Aktif/Pasif anahtarı 🟡

**Çözüm.** Düzenleme ekranının üst şeridine `is_active` anahtarı + mevcut
`seo_ready` rozetinin yanına **ayrı** "Aktif / Pasif" rozeti. İki kavramın
farkı tek cümleyle yazılır: *"Pasif ürün hiçbir public yüzeyde görünmez.
Yayın onayı ise yalnızca arama motoru indekslemesini belirler."*

**Güvenlik.** Pasifleştirme **yayın onayını geri almaz**; iki alan bağımsız
kalır. (Mevcut `seo_ready` otomatik geri alma yalnızca **fotoğraf** kaybında
çalışır — ona dokunulmaz.)

**Kabul kriterleri.** Anahtar doğru kaydediyor; sentetik 12 kayıt pasif
kalıyor. **İş yükü:** ~0,4 oturum. **Bağımlılık:** yok.

---

### P8 — "önerilir" → "zorunlu" 🟡

**Çözüm.** Sayaç metni: *"572 karakter — yayın için en az 300 karakter
**zorunlu**"*. Eşik `MIN_LONG_DESCRIPTION_CHARS`'tan okunur (elle yazılmaz).
Eşiğin altındayken sayaç **kehribar** renge döner.

**Kabul kriterleri.** İki ekran (Bilgiler / Yayın) aynı dili kullanıyor.
**İş yükü:** ~0,1 oturum.

---

### P9 — Meta sayaçları ve SERP önizlemesi 🟡

**Çözüm.** Meta başlık ve meta açıklamaya karakter sayacı; **Google kesme
sınırı** (≈60 / ≈155 karakter) ayrı renkle işaretlenir; altında basit bir
SERP önizleme kutusu (başlık + URL + açıklama). Yeni bileşen:
`src/components/admin/SerpPreview.tsx`.

**SEO etkisi.** Yalnızca gösterim; üretilen meta veriler değişmez.
**İş yükü:** ~0,8 oturum.

---

### P10 — Fotoğraf şartlarının önden gösterilmesi 🟠

**Teknik neden.** ALT (≥15 karakter) ve kaynak zorunluluğu yalnızca
"Doğrula" formunda görünüyor; fotoğraf yoksa form da yok.

**Etki.** Depo turuna çıkan kişi iki bilgiyi toplamadan döner → **ikinci tur**.
154 ürün için bu, haftalarca gecikme demek.

**Çözüm.** `ImagesManager`'ın **boş durumuna** kalıcı bilgi kutusu:
> Her fotoğraf için iki bilgi gerekir:
> • **ALT metni** — görseli tarif eden en az 15 karakter
> • **Kaynak** — çekim tarihi / katalog sayfası / tedarikçi teyidi
> Bunlar olmadan fotoğraf doğrulanamaz, ürün yayına giremez.

Ayrıca **depo için yazdırılabilir kontrol listesi** üretimi (P5 toplu
işlemlerinin yanına "Seçili ürünler için fotoğraf föyü indir" — CSV).

**Kabul kriterleri.** Fotoğrafsız üründe şartlar görünüyor; metinler
`IMAGE_ALT_TEXT_MIN` sabitinden besleniyor. **İş yükü:** ~0,5 oturum.

---

### P11 — Çeviri yayın ölçütü 🟡

**Çözüm.** `TranslationsManager`'da "Kaydet ve yayınla" için hafif bir kapı:
ürün adı **ve** (kısa açıklama **veya** uzun açıklama) dolu olmalı. Eksikse
düğme pasif + "Taslak kaydet" önerilir. Saf fonksiyon:
`src/lib/translation-gate.ts`.

**Not.** Bu, ürün yayın kapısından **ayrı ve daha hafif** bir kapıdır;
`seo_ready` mantığına dokunmaz. **İş yükü:** ~0,6 oturum.

---

### P12 — Uyumluluk kaydı düzenleme 🟢

**Çözüm.** `FitmentsManager`'a satır içi düzenleme (not + doğrulama kaynağı).
`PATCH /api/admin/products/[id]/fitments/[fitmentId]` **zaten var**;
arayüz bağlanacak. Doğrulanmış kaydın kaynağı değiştirilirse
`verified_at` tazelenir, `verified` korunur.

**İş yükü:** ~0,7 oturum.

---

### P13 — Liste API'si yayın hazırlığı özeti 🟡

**Teknik neden.** Liste `longDescription` seçmiyor (bilinçli — veri boyutu).

**Çözüm.** Tam metni taşımak yerine **türetilmiş alanlar** döndürmek:
`longDescriptionLength` (int), `imageCount`, `verifiedImageCount`,
`verifiedFitmentCount`, `publishEligible` (bool), `unmetCount` (int).
Hepsi tek sorguda `COUNT`/`LENGTH` ile — N+1 yok.

**Fayda.** Listede "Yayına hazır" rozeti gösterilebilir; P4 filtreleri
bunlara dayanır; fotoğraf turu önceliklendirmesi listeden yapılabilir.

**İş yükü:** ~0,8 oturum. **Bağımlılık:** P4 bunu bekler.

---

## 3. Kapsam dışı — onayınıza sunulan yeni bulgular

> Kapsamı onayınız olmadan genişletmiyorum. Bunlar **plana dahil değil**;
> istemeniz hâlinde ayrı bir faz olarak eklenir.

| # | Bulgu | Neden önemli |
|---|---|---|
| **Y1** | `categories` tablosu **0 satır**, hiçbir ürün kategorili | P6 yalnızca aracı hazırlar; **kategori ağacına karar vermek sizin işiniz**. Kategori adı public sayfada ve JSON-LD'de kullanılıyor |
| **Y2** | Admin panelinde **splash ekranı** var (`SplashOverlay variant="admin"`) | Her yeni oturumda iç yönetim aracını bekletiyor; ölçümlerimde sayfanın hazır olmasını ~20 sn geciktirdi |
| **Y3** | Liste **sıralanamıyor** (`orderBy` sabit: `createdAt desc`) | 154 ürünü parça numarasına veya yayın hazırlığına göre sıralamak mümkün değil |

---

## 4. Aşamalı uygulama planı

Fazları **teknik bağımlılığa göre** yeniden sıraladım: P13 (liste alanları)
P4'ten (filtreler) önce gelmeli, P4 de P5'ten (toplu işlem) önce.

### Faz 0 — Başlangıç denetimi ve güvenlik (bitiş: tüm kontroller yeşil)
- Hedef DB kimliği doğrulama (`neondb_owner` + `site_settings=0`)
- Rakam doğrulama sorgusu (§0) → referans değer olarak kaydedilir
- `pg_dump` yedeği → `~/.osko/backups/` (kalıcı dizin)
- `tsc` + `npm test` + `lint` + `build` → **başlangıç referansı**
- Görev takip dosyalarının oluşturulması (§6)
- **Bitiş kriteri:** 339 test geçiyor, lint ≤34, build başarılı, yedek doğrulandı

### Faz 1 — Kritik kullanılabilirlik (P1, P3, P8)
Hepsi küçük, bağımsız ve düşük riskli. Birlikte yapılır.
- **Bitiş:** 375/768/masaüstünde sekmeler erişilebilir, belge taşması yok;
  yayın düğmesi ölçüte bağlı; metin çelişkisi bitti.

### Faz 2 — Liste zenginleştirme ve filtreleme (P13 → P4)
- Önce P13 (API alanları), sonra `drizzle/0012` + filtreler
- **Bitiş:** varsayılan liste 154 ürün gösteriyor; 10 filtre çalışıyor;
  sentetik kayıtlar kalıcı kolonla işaretli ve public yüzeye sızmıyor

### Faz 3 — Fotoğraf ve SEO deneyimi (P10, P9, P11)
- **Bitiş:** fotoğraf şartları önden görünüyor; meta sayaç + SERP önizleme;
  çeviri kapısı çalışıyor. **Yayın kapısına dokunulmadı** (regresyon testi)

### Faz 4 — Ürün yönetimi ve toplu işlemler (P6, P7, P12, P5)
- Sıra önemli: P7 (aktiflik) ve P6 (kategori) P5'in toplu işlemlerini besler
- **Bitiş:** toplu işlemler kapıdan geçiyor, denetim loglanıyor,
  kategori ve aktiflik panelden yönetiliyor

### Faz 5 — Regresyon, görsel ve güvenlik doğrulaması
- `tsc` · `lint` · tüm testler · `build`
- 375 / 768 / masaüstü görsel kontrol (her değişen ekran)
- API yetkilendirme (oturumsuz 401)
- Yayın kapısı + `seo_ready` geri alma regresyonu (mevcut 19 + 48 kontrol)
- Fotoğraf doğrulama güvenliği · placeholder indeksleme (mevcut 39 test)
- Stok iddiası güvenliği · DB bütünlüğü (§0 sorgusu tekrar)
- **Bitiş:** değişiklik öncesi/sonrası karşılaştırma tablosu, sıfır regresyon

### Faz 6 — Nihai rapor ve production onay paketi
- Türkçe nihai rapor + ekran görüntüleri
- Production geçiş paketi: `0010`, `0011`, `0012`, `0013` migration sırası,
  deploy öncesi kontrol listesi, geri alma adımları
- **Commit/push/deploy YAPILMAZ** — ayrı onayınıza sunulur

---

## 5. Dosya ve veritabanı değişiklik matrisi

| Dosya | Faz | Bulgu | Tür |
|---|---|---|---|
| `src/components/ui/tabs.tsx` | 1 | P1 | Değişiklik |
| `src/app/globals.css` | 1 | P1 | Değişiklik |
| `products/[id]/edit/page.tsx` | 1,3,4 | P3,P7,P8,P9,P6 | Değişiklik |
| `src/app/api/admin/products/route.ts` | 2 | P13,P4 | Değişiklik |
| `src/lib/db/columns.ts` | 2 | P4 | Değişiklik |
| `src/lib/db/schema.ts` | 2,4 | P4,P5 | Değişiklik |
| `admin/(dashboard)/products/page.tsx` | 2,4 | P4,P5 | Değişiklik |
| `src/components/admin/ImagesManager.tsx` | 3 | P10 | Değişiklik |
| `src/components/admin/TranslationsManager.tsx` | 3 | P11 | Değişiklik |
| `src/components/admin/FitmentsManager.tsx` | 4 | P12 | Değişiklik |
| `src/app/(admin)/admin/(dashboard)/layout.tsx` | 4 | P6 | Değişiklik |
| `src/lib/product-filters.ts` | 2 | P4 | **YENİ** |
| `src/components/admin/ProductFilterBar.tsx` | 2 | P4 | **YENİ** |
| `src/components/admin/SerpPreview.tsx` | 3 | P9 | **YENİ** |
| `src/lib/translation-gate.ts` | 3 | P11 | **YENİ** |
| `src/components/admin/BulkActionBar.tsx` | 4 | P5 | **YENİ** |
| `src/app/api/admin/products/bulk/route.ts` | 4 | P5 | **YENİ** |
| `admin/(dashboard)/categories/page.tsx` | 4 | P6 | **YENİ** |
| `src/lib/admin-audit.ts` | 4 | P5 | **YENİ** |

### Veritabanı

| Migration | Faz | İçerik | Risk |
|---|---|---|---|
| `drizzle/0012_product_synthetic_flag.sql` | 2 | `products.is_synthetic` + kısmi index | **Düşük** — additive, varsayılan `false`, public kümelere girmez |
| `drizzle/0013_admin_bulk_audit.sql` | 4 | `admin_audit_log` tablosu | **Düşük** — yeni tablo, mevcut hiçbir şeye dokunmaz |

**Her ikisi de yalnızca development'a uygulanır.** Yöntem `0011`'de
kanıtlandı: hedef kimliği doğrulama → `pg_dump` yedeği → `COMMIT`→`ROLLBACK`
dry-run → uygulama → POST-CHECK. Production'a uygulama **ayrı onay**.

### Yeni test dosyaları

`tests/admin-tabs.spec.ts` · `tests/product-filters.spec.ts` ·
`tests/schema-phase4.spec.ts` · `tests/bulk-actions.spec.ts` ·
`tests/translation-gate.spec.ts` · `tests/serp-preview.spec.ts`

Mevcut **339 test** korunur; hiçbiri gevşetilmez.

---

## 6. Kota sonrası devam stratejisi

### Otomatik devam gerçekten mümkün mü? — araştırma sonucu

**Dürüst yanıt: kota yenilenmesi hiçbir şeyi otomatik başlatmaz.** Araçları
tek tek inceledim:

| Mekanizma | Kalıcı mı | Sonuç |
|---|---|---|
| `CronCreate` | ❌ Hayır — **yalnızca bellekte**, oturum kapanınca silinir; 7 günde kendini siler | Kullanılamaz |
| `ScheduleWakeup` | ❌ Hayır — yalnızca aynı oturum içinde | Kullanılamaz |
| **Zamanlanmış görev** (`scheduled-tasks`) | ✅ **Evet** — `C:\Users\HP\.claude\scheduled-tasks/` altına **diske** yazılır, uygulama kapalıyken gelen çalışma **sonraki açılışta** yürür | Kullanılabilir, **ama kayıtsız** |

Zamanlanmış görevin iki gerçek sınırı var:
1. **Hafızası yok.** Her çalışma sıfırdan başlar; bu oturumu hatırlamaz.
   Bu yüzden ilerlemenin **diskte** olması zorunlu.
2. **Kota hâlâ doluysa o çalışma da başarısız olur.** "Kota yenilendi,
   kendiliğinden devam etti" diye bir garanti **veremem**.

### Önerdiğim yapı — dosya temelli, araçtan bağımsız

Proje içinde `docs/admin-master-plan/` dizini (dört dosya):

| Dosya | İçerik |
|---|---|
| `00-MASTER-PLAN.md` | Bu planın kopyası — tek doğruluk kaynağı |
| `01-BULGU-DURUM.md` | 13 bulgunun durum tablosu: `bekliyor / sürüyor / tamam / bloke`, faz, tarih |
| `02-ILERLEME.md` | Tamamlanan ve bekleyen görevler · değiştirilen dosyalar · **son başarılı test sonuçları** (tsc/test/lint/build sayıları) · başarısız testler ve nedenleri · **SONRAKİ KESİN ADIM** · devam etmeden önce kontrol edilecekler |
| `03-GUVENLIK-SINIRLARI.md` | Ortam sınırları · kesin yasaklar · migration geri alma talimatları · referans DB rakamları |

**Her faz sonunda** `01` ve `02` güncellenir. Dosyalar git'e eklenmez
(commit yasağı) ama diskte kalır — bilgisayar yeniden başlasa da durur.

### Yeni oturumda kullanılacak TEK MESAJLIK devam komutu

```
nidah_group_web projesinde admin paneli master planına devam et.
Önce docs/admin-master-plan/02-ILERLEME.md ve 01-BULGU-DURUM.md dosyalarını
oku, 03-GUVENLIK-SINIRLARI.md'deki sınırlara uy, "SONRAKİ KESİN ADIM"
satırından devam et. Tamamlanmış işleri tekrarlama. Production'a dokunma;
commit, push, deploy yapma.
```

**Zamanlanmış görev isterseniz** bunu diske yazan bir görev de kurabilirim —
ama "otomatik devam eder" diye sunmam; yalnızca **hatırlatıcı/deneme**
olarak çalışır. Kurulmasını istiyorsanız söyleyin.

---

## 7. Riskler ve geri alma

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Filtre eklenirken `is_synthetic` public yüzeye sızar | Düşük | **Yüksek** | `schema-phase4.spec.ts` kolonu public kümelerde yasaklar |
| Toplu yayın kapıyı atlar | Düşük | **Çok yüksek** | Toplu uç `evaluatePublishEligibility()`'i **kayıt başına** çağırır; test kilitler |
| `tabs.tsx` değişikliği başka ekranları bozar | Orta | Orta | Masaüstünde görünür değişiklik yok; her sekmeli ekran görsel kontrol |
| Migration dev verisini bozar | Çok düşük | Yüksek | Yedek + dry-run + POST-CHECK (`0011`'de kanıtlanmış yöntem) |
| Gerçek ürün verisi yanlışlıkla değişir | Düşük | **Yüksek** | Test verisi **yalnızca sentetik 12 kayıtta**; her faz sonunda §0 sorgusu |
| Mevcut 339 testten biri kırılır | Orta | Orta | Her faz sonunda tam test; kırılan test **gizlenmez**, raporlanır |

**Geri alma stratejisi (katman katman):**
1. **Kod:** değişiklikler commit edilmediği için `git checkout -- <dosya>` yeterli
2. **Migration:** her dosyanın başlığında geri alma SQL'i yazılı
3. **Veri:** Faz 0 `pg_dump` yedeği `~/.osko/backups/` altında
4. **Tam dönüş:** `git stash` + yedekten geri yükleme

---

## 8. Test ve kabul kriterleri

**Her fazda:** ilgili birim testleri + değişen ekranların 375/768/masaüstü
kontrolü + §0 veri doğrulama sorgusu.

**Final (Faz 5):**

| Kontrol | Başlangıç referansı | Kabul |
|---|---|---|
| `tsc --noEmit` | 0 hata | 0 hata |
| `npm test` | 339 geçti | ≥339 geçti, 0 başarısız |
| `npm run lint` | 34 sorun (19 hata) | ≤34, **yeni bulgu yok** |
| `npm run build` | 62/62 sayfa | 62/62 (+ yeni admin sayfası) |
| API yetkilendirme | oturumsuz 401 | aynı |
| Yayın kapısı | `seoReady=true` → 422 | **aynı** |
| `seo_ready` geri alma | 19 + 48 kontrol | **aynı** |
| Placeholder indeksleme | 39 mimari testi | **aynı** |
| Fotoğraf doğrulama | ALT+kaynak zorunlu | **aynı** |
| Stok iddiası | `stok_iddiali=0` | **aynı** |
| DB bütünlüğü | §0 rakamları | **aynı** (+ `is_synthetic=12`) |

**Başarısız kontroller gizlenmez.** Önceden var olan sorunlar
(19 lint hatası, `BlogEditor` uyarısı vb.) ile yeni sorunlar **ayrı**
raporlanır.

---

## 9. Onay gerektiren mimari kararlar

| # | Karar | Önerim |
|---|---|---|
| **K8** | `products.is_synthetic` kolonu eklensin mi (desen filtresi yerine)? | **Evet** — desen bir gün gerçek parça numarasıyla çakışabilir |
| **K9** | `admin_audit_log` tablosu eklensin mi? | **Evet** — toplu işlemler denetlenebilir olmalı |
| **K10** | Toplu yayın onayı hiç olmasın mı, yoksa kapıdan tek tek geçerek mi? | **Kapıdan tek tek** — atlama yok |
| **K11** | Y1 (kategori ağacı), Y2 (admin splash), Y3 (sıralama) kapsama alınsın mı? | **Y3 alınsın** (küçük, P4 ile birlikte); Y1 ve Y2 ayrı karar |

---

## 10. Tahmini iş yükü

| Faz | İş yükü |
|---|---|
| Faz 0 | ~0,5 oturum |
| Faz 1 (P1, P3, P8) | ~0,6 oturum |
| Faz 2 (P13, P4) | ~2,3 oturum |
| Faz 3 (P10, P9, P11) | ~1,9 oturum |
| Faz 4 (P6, P7, P12, P5) | ~4,1 oturum |
| Faz 5 | ~1 oturum |
| Faz 6 | ~0,5 oturum |
| **Toplam** | **~11 oturum** |

"Oturum" = kota sınırına takılmadan yapılabilen kesintisiz çalışma. Tahmin
**kesinlik iddiası taşımaz**; bu yüzden §6'daki ilerleme kaydı zorunlu.

---

## 11. Onay noktası

Bu planda **hiçbir kod veya veritabanı değişikliği yapılmadı.** `HEAD`
`5497e9b`, veriler §0'daki gibi duruyor.

**Başlamak için gereken:**

> **"MASTER PLANI ONAYLIYORUM, UYGULAMAYA BAŞLA"**

Bu onayla birlikte §9'daki **K8–K11 kararlarını** da bildirmenizi rica
ediyorum. Belirtmezseniz **önerdiğim değerlerle** ilerlerim
(K8 evet · K9 evet · K10 kapıdan tek tek · K11 yalnızca Y3).

Onay sonrası fazlar arasında ara onay istemem; teknik engelleri çözerek
ilerler, çözemediklerimi `02-ILERLEME.md`'ye kaydeder ve raporlarım.
