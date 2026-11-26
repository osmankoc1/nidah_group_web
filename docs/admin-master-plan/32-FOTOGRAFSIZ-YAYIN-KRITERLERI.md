# Fotoğrafsız Yayın — Önerilen Kriterler ve Etki Analizi

**Tarih:** 2026-11-26 · **Durum:** ÖNERİ · **kod değiştirilmedi, kapı olduğu gibi**

> Talimat gereği mevcut yayın kapısına **dokunulmadı**. Bu belge yalnızca
> önerilen kriterleri ve ölçülen etkileri raporlar.

---

## 1. Önce ölçüm: engel tek bir ölçüt

Development veritabanındaki 154 gerçek ürünün tamamı için yayın kapısının beş
ölçütü tek tek sayıldı (sentetik TEST/ATOM kayıtları hariç):

| Yayın ölçütü | Karşılamayan ürün |
|---|---|
| Parça numarası var | **0** |
| Ürün adı var | **0** |
| Uzun açıklama boş değil | **0** |
| Doğrulanmış uyumluluk ≥ 1 | **0** |
| **Doğrulanmış fotoğraf ≥ 1** | **154 — tamamı** |
| `is_active` | 1 (153/154 aktif) |
| `seo_ready = true` olan | **0** |

**Sonuç: tek engel fotoğraf.** Diğer dört içerik ölçütü bugün %100 karşılanıyor.
Fotoğraf şartı kaldırılsa **153 ürün** aynı gün yayına alınabilir duruma gelir.

> Production'da bu sayılar bugün yeniden ölçülmedi (kalan 3,14 CU-saat
> korunuyor). Development, 2026-11-20 aktarımının birebir kopyasıdır;
> `product_images` tablosu iki ortamda da **0 doğrulanmış kayıt** taşıyor.

---

## 2. Kodda zaten doğru olan üç şey (ölçüldü)

Fotoğrafsız yayın için **kod tarafında yeni bir koruma yazmak gerekmiyor** —
üç mekanizma bugünden doğru davranıyor:

| Mekanizma | Fotoğraf yokken davranışı | Nerede |
|---|---|---|
| `Product` yapısal verisi | `image` alanı **hiç yazılmaz** (boş dizi veya temsilî URL değil) | `src/lib/product-jsonld.ts:98` |
| Görsel sitemap'i | Üç koşul birlikte: `is_active` + `seo_ready` + `verified` → fotoğrafsız ürün sitemap'e girer, **`<image:image>` etiketi girmez** | `src/app/sitemap.ts:198-208` |
| Fotoğraf eklenince güncelleme | Yükleme ucu `revalidateProducts()` çağırıyor → public sayfa **kendiliğinden** tazelenir | `.../products/[id]/images/route.ts:92` |

Ayrıca temsilî kart satır içi bir görseldir: `/placeholder/…` adresinden
`X-Robots-Tag: noindex` ile sunulur, erişilebilir metni **"Bu bir ürün
fotoğrafı değildir."**dir ve `product_images` tablosunda satırı yoktur —
yani `og:image`, `Product.image` veya görsel sitemap'ine **sızamaz**.

**Yani talimatın 1., 4. ve 5. şartı (yanlış fotoğraf kullanmama, teklif
akışının çalışması, fotoğraf sonradan eklenince otomatik güncelleme) bugün
zaten karşılanıyor.** Eksik olan tek şart 2. maddedir: görselin henüz
eklenmediğinin **gözle görünür biçimde** yazılması.

---

## 3. Önerilen yeni kriter kümesi

Mevcut tek kapı yerine **iki seviyeli** bir kapı önerilir. Kapının mantığı
değişmez; yalnızca `no_verified_image` ölçütü "yayını engelleyen" kümeden
"yayın seviyesini belirleyen" kümeye geçer.

| | **Seviye A — tam kayıt** | **Seviye B — görsel beklemede** |
|---|---|---|
| Parça numarası | zorunlu | zorunlu |
| Ürün adı | zorunlu | zorunlu **+ ad kalitesi şartı (§4)** |
| Uzun açıklama | boş olmamalı | boş olmamalı |
| Doğrulanmış uyumluluk | ≥ 1 | ≥ 1 |
| **Doğrulanmış fotoğraf** | **≥ 1** | **0 olabilir** |
| Sayfada görsel alanı | gerçek fotoğraf | temsilî kart **+ açık uyarı metni** |
| Teklif / WhatsApp CTA | çalışır | çalışır (değişmez) |
| `Product.image` | yazılır | **yazılmaz** |
| Görsel sitemap'i | girer | **girmez** |
| Sayfa sitemap'i | girer | girer |
| `noindex` | yok | **yok** (sayfa indekslenir) |

Kod karşılığı — `src/lib/seo-gate.ts` içinde **üç satırlık** bir değişiklik:
`no_verified_image` ölçütü `eligible` hesabından çıkarılıp ayrı bir
`gorselBekliyor: boolean` alanına taşınır. Ölçüt kodu **silinmez**, çünkü
admin panelinde "fotoğrafı eksik ürünler" listesi onunla üretiliyor.

### 3.1 Eklenmesi gereken tek görünür şey

Ürün detay sayfasında, temsilî kartın hemen altına bir satır:

> **Bu ürünün fotoğrafı henüz eklenmedi.** Parça numarası, adı ve makine
> uyumluluğu doğrulanmıştır. Fotoğraf talebiniz varsa teklif formunda
> belirtebilirsiniz.

Liste/kart görünümünde ise kısa biçim: **"Fotoğraf eklenmedi"** etiketi.

Yeri: `src/components/catalog/ProductGallery.tsx` içindeki
`images.length === 0` dalı. **Bu metin bir SEO cümlesi değildir** — şeffaflık
beyanıdır ve ürün bazlı özgün içerik sayılmaz, bu yüzden "thin content"
riskini artırmaz.

---

## 4. Ad kalitesi şartı — fotoğrafsız yayının gerçek riski

Fotoğraf yoksa sayfanın tüm ayırt ediciliği **ad + açıklama + uyumluluk**
üçlüsüne kalır. Bugün canlıda aktif olan iki ürünün adları şunlar (ölçüldü,
`/api/products?limit=3`):

| Parça No | Ad | Fotoğraf |
|---|---|---|
| `90898` | **GAUDE** | yok |
| `76281` | **KIT** | yok |

Bu iki ad fotoğrafsız bir sayfayı taşıyamaz. Bu yüzden Seviye B için
**makine-okunur bir ad şartı** önerilir:

| Şart | Gerekçe |
|---|---|
| En az 2 kelime **veya** en az 10 karakter | "KIT", "GAUDE", "O-ring" tek başına ayırt edici değil |
| Yalnızca büyük harf olmamalı | `GAUDE` gibi ham stok kodu artıkları |
| Parça numarasının kendisi olmamalı | ad alanına numara kopyalanmış kayıtlar |

Bu şart 42 ürünün açıklama çalışmasında zaten elle uygulandı; otomatik hâli
sadece 5.000'lik ölçekte gerekir.

---

## 5. SEO etkisi — madde madde

| Konu | Etki | Dayanak |
|---|---|---|
| **Zengin sonuç (rich result)** | Değişmiyor. Bu sayfalar fiyat RFQ ile verildiği için **zaten** zengin sonuca uygun değil (karar K5). Fotoğrafın yokluğu yeni bir kayıp getirmez | `parca-katalog/[slug]/page.tsx:289-301` |
| **Search Console uyarısı** | `image` eksikliği "Product" için uyarı üretir — ama `offers.price` eksikliği aynı uyarıyı **şimdiden** üretiyor. Yeni uyarı tipi eklenir, ceza eklenmez | Google product snippet belgesi |
| **Organik sıralama** | Yapısal veri eksikliği sıralama cezası değildir. Belirleyici olan parça numarasının sayfada ve `<title>`da bulunmasıdır — bu korunuyor | — |
| **Görsel arama (Google Images)** | Kayıp **gerçek**: fotoğrafsız ürün görsel aramada çıkmaz. Fotoğraf eklendiğinde geri kazanılır | — |
| **`og:image`** | Site düzeyindeki `/opengraph-image`'a düşer. Ürünü temsil ettiği **iddia edilmez** (alt metin kurumsaldır) | `page.tsx:106-108` |
| **Thin / duplicate content** | Risk **düşük**: ad + 150–430 karakter özgün açıklama + doğrulanmış uyumluluk + çizim/kalem referansı. 153 sayfalık bir küme Google için küçüktür. **5.000'e çıkarken** bu risk yeniden değerlendirilmelidir | denetim C11 |
| **Sitemap** | Ürün URL'si girer, `<image:image>` girmez. Kod değişikliği **gerekmez** | `sitemap.ts:198-208` |
| **Fotoğraf sonradan eklenince** | Yükleme → `revalidateProducts()` → sayfa, liste ve sitemap tazelenir. Ek iş **gerekmez** | `images/route.ts:92` |

### 5.1 Ölçülmemiş olan

- Google'ın fotoğrafsız parça sayfalarını fiilen nasıl sıraladığı **ölçülemez**;
  Search Console verisi olmadan bu bir tahmin olur.
- 153 sayfanın indeksleme hızı **bilinmiyor** (sitemap gönderimi sonrası
  ölçülebilir).

---

## 6. Kademeli yayın önerisi (fotoğraf beklemeden)

| Adım | Kapsam | Ne ölçülür | Durur mu |
|---|---|---|---|
| 1 | **10 ürün** — en güçlü adlar, Seviye B | indeksleme, Search Console hatası, Neon tüketimi | 48 saat beklenir |
| 2 | **40 ürün** | aynı | 48 saat |
| 3 | kalan **~103 ürün** | aynı | — |
| 4 | fotoğraflar geldikçe Seviye A'ya terfi | `verified` işaretleme | sürekli |

Her adımda `seo_ready` **tek tek insan onayıyla** yazılır; toplu `UPDATE`
ile yazılmaz (kapının varlık nedeni bu).

---

## 7. Onayınızı bekleyen — bu belgeden çıkan 4 karar

1. **Seviye B kapısı** uygulanacak mı? (`seo-gate.ts`, üç satır)
2. **Görünür uyarı metni** §3.1'deki hâliyle onaylanıyor mu?
3. **Ad kalitesi şartı** §4'teki üç kuralla uygulanacak mı?
4. Canlıdaki `90898` (**GAUDE**) ve `76281` (**KIT**) adları düzeltilecek mi?
   Bu ikisi şu an sitede **aktif** ve fotoğrafsız.
