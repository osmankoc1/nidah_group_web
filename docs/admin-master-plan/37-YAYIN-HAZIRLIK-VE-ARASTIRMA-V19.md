# 37 — Deploy, öncelikli ürünler, 284'ün içeriklendirilmesi ve araştırma kuyruğu v19

**Tarih:** 2026-11-27 · **Dal:** `main` · Tüm sayılar production'dan ölçüldü.

---

## Yönetici özeti

Kod değişiklikleri commit edildi, push edildi ve **production deploy doğrulandı**
(`/` üzerinde `Age: 71425 → 84`, ETag değişti). Deploy öncesi yapılan son denetimde
**ölçülen bir açık daha bulundu ve kapatıldı**: marka sayfası (`BrandCatalogPage`)
yalnızca `is_active` süzüyordu, yani yayın onayı olmayan bir ürün aktifleştirildiği an
marka sayfasında listelenecekti. Sitemap de iki koşulu elle yazıyordu. İkisi de tek
kaynağa (`lib/public-visibility.ts`) bağlandı.

| Ölçüm | Değer |
|---|---|
| Veritabanındaki ürün | **460** |
| İçeriği tamamlanmış ürün (açıklama + doğrulanmış uyum + yeterli ad) | **154** |
| Gerçekten yayında olan ürün (`is_active` **ve** `seo_ready`) | **10** |
| Sitemap'e dahil edilen ürün | **10** |
| Aktif ama yayın onaysız | **0** |
| Yayın onaylı ama pasif | **0** |

Katalog toggle'ı hâlâ **kapalı**; açılmaya hazır.

---

## 1. Commit, push, deploy

İki commit, `main` dalına push edildi:

- `63ab4f2` — içe aktarım pasif varsayılanı + public görünürlükte `seo_ready` şartı
- `1b4f83c` — v18 aday süzgeci, 284 ürün pasif aktarımı, prova ve denetim betikleri

**Deploy kanıtı** (`https://www.nidahgroup.com.tr/`):

| | Push öncesi | Push sonrası |
|---|---|---|
| `Age` | 71425 | **84** |
| `ETag` | `0bd79c1c…` | **`5e2f31c1…`** |

**Canlı yüzey doğrulaması:**

| Kontrol | Sonuç |
|---|---|
| `sitemap.xml` | 200 · `application/xml` · **63 URL** · katalog URL 0 |
| `/parca-katalog` | **404** (toggle kapalı) |
| `/parca-katalog/76281` (onaysız ürün) | **404** |
| `/api/products` toplam | **10** |
| `?search=76281` (yayında olmayan ürün) | **0 sonuç** |
| `?search=0180` (yayındaki numaranın alt dizesi) | **1 sonuç → 60425-01800** |

Son kontrol, eski numarayla aramanın alt dize üzerinden çalıştığını **canlıda**
kanıtlar; CH ön eki eklenen ürünler bu mekanizmayla bulunmaya devam eder.

### Kapatılan ek açık

`eq(products.isActive, true)` elle yazan son iki yüzey tek kaynağa bağlandı:

| Dosya | Eski hâl | Şimdi |
|---|---|---|
| `src/components/catalog/BrandCatalogPage.tsx` | yalnızca `is_active` | `...publicProductConditions()` |
| `src/app/sitemap.ts` (ürün + görsel sorgusu) | iki koşul ELLE | `...publicProductConditions()` |

`tests/public-visibility.spec.ts` bu iki dosyayı da kilit listesine aldı.

---

## 2. CH 76281 ve CH 90898

| | Önce | Sonra |
|---|---|---|
| Parça numarası | `76281` / `90898` | **`CH 76281` / `CH 90898`** |
| Normalize | `76281` / `90898` | `CH76281` / `CH90898` |
| Ad | `KIT` / `GAUDE` | **`Vites kartı` / `Vites göstergesi`** |
| Uzun açıklama | boş | 320 / 272 karakter |
| Fotoğraf | 1 (doğrulanmamış) | **değişmedi** — 1, doğrulanmamış |
| Uyumluluk | VOLVO G720 (doğrulanmamış) | **değişmedi** |
| `description` (eski alan) | korunuyor | korunuyor |
| `is_active` / `seo_ready` | false / false | **false / false** |

Eski numaralı kayıt kalmadı (ölçüldü: 0). Eski numarayla **arama** çalışmaya devam
eder (bkz. §1). Ürün kimlikleri (`id`), fotoğraflar, uyumluluk satırları ve eski
`description` alanı **dokunulmadan** duruyor. Geri dönüş: `scripts/veri/geri-donus/oncelikli-iki/`.

**Açıklamalarda iddia EDİLMEYENLER:** uyumlu makine modeli, parça üreticisi markası,
OEM/muadil/yan sanayi durumu. 90898 kaydının eski `description` alanı "VOLVO 700 SERİSİ
VİTES GÖSTERGESİ" der; bu seri bilgisi doğrulanmadığı için açıklamaya alınmadı ve
`notes` alanına not düşüldü.

### Fotoğraflar — teyit bekliyor

| Parça | Dosya | Bulgu |
|---|---|---|
| CH 76281 | `…/tsdlbzvv65kqr6ngynt5.png` | **Gerçek ürün fotoğrafı.** NİDAH GROUP filigranlı; konnektörlü kablo demetiyle elektronik kart. "Vites kartı" tanımıyla tutarlı. |
| CH 90898 | `…/fhhk2xp5jxrbsnnw6rgw.jpg` | **ÜRÜN FOTOĞRAFI DEĞİL** — şirket logosu. Doğrulanmamalı; gerçek fotoğrafla değiştirilmeli. |

İkisi de `verified = false` bırakıldı. Hiçbir görsel silinmedi.

**Yayına girmeleri için eksik:** doğrulanmış en az 1 makine uyumu. Yayın kapısının
diğer dört ölçütünü (ad, parça numarası, açıklama, aktiflik kararı) karşılıyorlar.

---

## 3. Onay bekleyen 14 açıklama — profesyonelleştirildi ve yazıldı

**Düzeltme:** bu 14 ürün açıklamasız değildi; her birinde **142–163 karakterlik
şablon** bir metin vardı — "`<pn>` referanslı `<ad>`, `<marka>` parça kaydında bu
tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı
karşılaştırın." Yani proje kuralının açıkça yasakladığı *yalnızca parça numarası
değişen şablon*. Bazılarında ürün adı küçük harfe düşüyordu ("m10×20 iso 4017 cıvata").

Uygulanan kurallar:

- araştırma notu niteliğindeki ifadeler **çıkarıldı** (*"İncelenen katalog
  kayıtlarında…", "tahmin yazılmadı", "kayıtta geçmediği için belirtilmemiştir"*)
- teknik katalog referansları **korundu** (çizim, sayfa, kalem)
- parça numarası ve doğrulanmış makine uyumluluğu **korundu**
- bilinmeyen ölçü/özellik **uydurulmadı**
- aynı adlı ürünler parça numarasıyla **ayrıldı**
- SEO amaçlı anahtar kelime doldurma **yapılmadı**

Sonuç: 255–460 karakter, ortalama 325. Yazma `scripts/aciklama-yaz-db.mjs` ile:
**14/14 metin birebir doğrulandı, yan etki 0.** Geri dönüş:
`scripts/veri/geri-donus/onayli14/`.

> Üç `CH 12119-*` ayar pulu metni birbirine en çok benzeyen çift (%73 bigram).
> Üçü aynı çizim kaleminde kayıtlı ve kalınlık değerleri katalogda yok; ayrım
> ancak depoda ölçülerek yazılabilir.

---

## 4. Pilot yayın — hazır

Toggle açılmadan önceki son ölçüm:

| Kontrol | Sonuç |
|---|---|
| Toplam ürün | 460 |
| Yayında (aktif **ve** onaylı) | **10** |
| Aktif ama yayın onaysız | **0** |
| Onaylı ama pasif | **0** |
| Sitemap'e girecek ürün | **10** |
| Sitemap'e girecek görsel | **0** (doğrulanmış görsel yok) |

Toggle'ı yönetim panelinden açtığınızda doğrulanacaklar: 10 pilot ürünün gerçek
HTTP 200'ü, onaysız ürünlerin gerçek 404'ü, sitemap'teki 10 ürün, canonical,
JSON-LD, parça numarası araması, teklif formu ve fotoğrafsız ürün görünümü.
Neon tüketimini düşük tutmak için canlı doğrulama HTTP üzerinden yapılacak,
veritabanına ek sorgu atılmayacak.

---

## 5. Yeni aktarılan ürünler — uyumluluk, ad ayrımı, açıklama

### 5.1 Makine uyumlulukları

**Ölçülen kanıt düzeyleri** (v18 `Makine Uyumluluğu`, 1.340 satır):
`Olası eşleşme` 585 · `Güçlü eşleşme` 405 · `Kesin doğrulandı` 313 · `Çelişkili` 37.

> **Önceki raporun düzeltmesi:** doc 36'da süzgeç "580 aday → **kanıtlı uyumu olan
> 476**" diye yazılmıştı. Ölçüm bunu doğrulamıyor: 476, *uyumluluk araştırma satırı
> bulunan* adaydır. `Kanıtlı Makine Modelleri` alanı dolu olan aday **193**'tür,
> aktarılan 284'ün yalnızca **33**'ünde doludur.

Aktarılan: **47 (ürün, makine) çifti / 33 ürün.** Kural: `verified = true` yalnızca
"Kesin doğrulandı" kaydı olan ve "Çelişkili" kaydı olmayan ürünlere yazıldı →
**5 ürün doğrulanmış, 28 ürün doğrulanmamış** olarak kayda geçti. Doğrulanmamış
uyumluluk sayfada kesin bilgi olarak sunulmaz ve yayın kapısını geçirmez.

Yan ürün: 2 üretici (DOOSAN, JCB) ve 24 makine kaydı eklendi.
Marka dağılımı: Komatsu 22 · Champion 10 · HIDROMEK 6 · Volvo 4 · JCB 3 · Doosan 1 · Mitsubishi 1.

> **Provada yakalanan hata:** marka adlarını Türkçe büyütmek "Hidromek" → "HİDROMEK"
> (noktalı İ) üretiyordu; veritabanındaki kayıt "HIDROMEK" (noktasız I). Türkçe
> büyütmeyle eşleşme tutmuyor ve **mükerrer üretici kaydı** oluşuyordu. Eşleştirme
> ASCII katlamasına çevrildi; 5 "yeni" marka 2'ye düştü.

### 5.2 Ad çakışmaları

45 küme / 117 ürün. v18'deki aday ayırt ediciler ölçüldü:

| Ayırt edici | Kaç kümeyi çözüyor |
|---|---|
| Teknik kategori / makine modeli | **4 küme / 8 ürün** → uygulandı |
| Marka ipucu | **kullanılmadı** — kümelerin çoğunda fark "Volvo" ile "Marka belirlenemedi" arasında; bu teknik bir ayrım değil, araştırma boşluğu |
| Hiçbiri | **41 küme / 109 ürün** → dokunulmadı, araştırma kuyruğuna |

Uygulanan örnekler: `Mafsal pulu — güç aktarımı` ↔ `Mafsal pulu — yürüyüş ve şasi`;
`Debriyaj sürtünme diski — Komatsu GD505A-3` ↔ `— Komatsu WA470-3`.

Çözülemeyen 41 küme ardışık parça numaralarıdır (ör. `VOE 12743102/12743270/12743289/…`
"Son tahrik makaralı rulmanı" ×6) — ayrım ölçü değeri gerektiriyor, v18'de yok.
**Uydurma ayrım üretilmedi.** Geri dönüş: `scripts/veri/geri-donus/ad-ayristirma-284/`.

### 5.3 Teknik açıklamalar

Besteleme yalnızca v18'de kayıtlı alanları kullanır: teknik ad, sistem, montaj yeri,
makine markası/serisi, seri numarası kapsamı, katalog grup/sayfa/kalem koordinatı ve
**aynı katalog sayfasındaki komşu kalemler** (Grup 1–5'te kullanılan bireyselleştirme
yöntemi). Ölçü, malzeme, üretici markası ve temin niteliği **üretilmez**.

Uyumluluk dili kanıt düzeyini aşmaz: "Kesin doğrulandı" ise makine modeli yazılır;
"Güçlü eşleşme" ise makineye uygunluk **iddia edilmez**, yalnızca parçanın hangi
katalogda hangi koordinatta kayıtlı olduğu yazılır — bu, kaynak belge hakkında
doğrulanabilir bir olgudur, uyumluluk garantisi değil.

**Şablon tavanı ölçümle belirlendi.** Kullanıcının onayladığı 42 elle yazılmış
açıklamanın ikişerli bigram benzerliği: medyan **%53**, en yüksek **%85**
(`CH 12119-10` ↔ `CH 12119-16`). Tavan bunun altına, **%80**'e çekildi.

| | Adet |
|---|---|
| Aday | 284 |
| Üretilen | 210 (74 atlandı: 64 eksik katalog koordinatı, 9 yalnızca olası eşleşme, 1 çelişkili) |
| Tavanı geçtiği için **reddedilen** | **173** |
| **Yazılan** | **37** — hepsi Volvo/Champion |

Kalite sağlamaları (hepsi geçti): dilbilgisi (ek uyumu, "grubu grubuna" hatası),
parça numarasının metinde bulunması, OEM/muadil iddiası yok, stok/teslimat iddiası yok.
**37/37 metin birebir doğrulandı.** Geri dönüş: `scripts/veri/geri-donus/v18-aciklama37/`.

Reddedilen 173 metin `scripts/veri/v18-aciklama-reddedilen.json` içinde benzerlik
oranı ve eşleştiği parça ile duruyor — bunlar elle çalışılacak.

---

## 6. 19 çakışma kümesi / 38 kayıt — çözüldü

Tabloyu üreten: `scripts/v18-cakisma-coz.mjs` · tam tablo
`scripts/veri/v18-cakisma-38-tablo.json`.

| Sınıf | Küme | Karar |
|---|---|---|
| **TEK ÜRÜN** | **19** | Logo'daki iki satır aynı parça numarasına çözülüyor; fark yalnızca stok kodunun yazımında. Tek ürün olarak aktarıldı, **her iki Logo kodu `notes` alanında saklandı**. |
| AYRI ÜRÜN OLABİLİR | 0 | — |
| BELİRSİZ | 0 | — |

Yazım farkı örnekleri: `16001024` ↔ `VOE 16001024` · `13A0312` ↔ `13A-0312` ·
`0501 316 591` ↔ `0501.316.591` · `CH 89160` ↔ `89160`.
"Marka belirlenemedi" ↔ "Volvo" farkı **ürün farkı sayılmadı** (araştırma boşluğu).

Sonuç: **19 yeni ürün, pasif ve yayın onaysız.** 441 → **460**. Aktif 10, yayın
onaylı 10 — **değişmedi**. Hiçbir kayıt birleştirilmedi veya silinmedi.
Geri dönüş: `scripts/veri/geri-donus/cakisma-19/`.

---

## 7. Araştırma kuyruğu v19

`scripts/veri/arastirma-kuyrugu-v19.json` — v18 kuyruğunu **olduğu gibi korur**
(A 104 + B 1.407) ve production'dan ölçülen yeni boşlukları ekler.

| Tür | Kalem | Ne eksik |
|---|---|---|
| `U1` | 271 | kanıtlı makine uyumluluğu yok |
| `U2` | 30 | uyumluluk kaydı var ama "Güçlü eşleşme" — teyit bekliyor |
| `D1` | 267 | teknik açıklama yok |
| `A1` | 109 | aynı adlı ürünleri ayıran ölçü/teknik özellik |
| `F1` | 2 | görsel doğrulaması (CH 76281, CH 90898) |
| **Toplam** | **679** | bunun **603**'ü Volvo/Champion öncelikli |

Her kalem; bakılacak kaynak belgeyi (URL), kaynak kimliğini ve **katalog
koordinatını** taşır — ör. `CH 37873 → Grup 517, bölüm 100, s. 585, kalem 7`.
Bir ürün birden çok türde geçebilir.

**Bu oturumda dış kaynak (üretici kataloğu) araştırması YAPILMADI.** Kuyruk
hazırlandı, sıralandı ve izlenebilir hâle getirildi; katalog taraması ayrı bir iştir.

---

## 8. Doğrulama durumu

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | temiz |
| `npm test` | **637 geçti / 0 başarısız** |
| `npm run lint` | **35 sorun** (19 error, 16 warning) — baseline 38, artış yok |
| `npm run build` | başarılı · `[isr-koruma] TAMAM — 36/36 rota süreyle eskimiyor` |
| Production yazma | 5 işlem: 14 açıklama · 2 öncelikli ürün · 47 fitment · 8 ad · 37 açıklama · 19 ürün |
| Geri dönüş kaydı | her yazma için `scripts/veri/geri-donus/<işlem>/` |

### Yapılmayanlar ve ölçülemeyenler

- **Neon tüketimi ölçülemedi** (panel erişimi yok). Bu oturumda production'a ~14
  sorgu turu gitti; kesin rakam raporlanmıyor.
- Trigram migration `0014` **uygulanmadı** (kullanıcı kararı).
- Yeni ücretli hizmet başlatılmadı, Neon paketi değiştirilmedi.
- Hiçbir fotoğraf veya uyumluluk **doğrulanmış** işaretlenmedi.
- 173 reddedilen açıklama ve 41 çözülemeyen ad kümesi elle çalışma bekliyor.
- `HMK600MG`/`HMK 600MG` birleştirmesi, `R6020-11521-0` "Hat" adı ve HeroSection
  `48h` ifadesi hâlâ **şirket teyidi** bekliyor.

---

## 9. Ek bulgu — iç yönetim notları public uçtaydı (düzeltildi)

Uyumlulukları yazdıktan sonra yapılan kontrolde ölçüldü:

| Alan | Durum | Düzeltme |
|---|---|---|
| `fitments.notes` | **Public ürün sayfasında RENDER EDİLİYOR** (`(public)/parca-katalog/[slug]/page.tsx:222`). İlk yazımda bu alana "Kanıt düzeyi: Güçlü eşleşme" ve kaynak URL'si (scribd bağlantısı) konmuştu. | 47 kaydın notu yeniden yazıldı: yalnızca müşteriye dönük "Katalog kapsamı: …" kaldı (22 kayıt), gerisi NULL (25 kayıt). Kanıt düzeyi `source` alanına taşındı — bu alan public yüzeyde render edilmiyor (ölçüldü). Kaynak URL'leri veritabanından çıkarıldı; `scripts/veri/v18-uyumluluk-284.json` içinde duruyor. Doğrulandı: notunda URL geçen 0, "Kanıt düzeyi" geçen 0. |
| `products.notes` | Public `/api/products/[partNumber]` ucu bu alanı **dönüyordu**. İçeriği yönetim notudur ("Logo'da iki stok satırı aynı parçaya çözülüyor", "yüklü görsel ürün fotoğrafı değil, şirket logosudur"). Uygulamada tüketen public yüzey YOK. | Seçimden çıkarıldı. `tests/public-visibility.spec.ts` iki yeni testle kilitliyor. |

Bu, oturumun ikinci ölçülen yayın açığıdır (birincisi marka sayfasındaki eksik
`seo_ready` şartıydı). İkisi de katalog toggle'ı açılmadan önce kapatıldı.
