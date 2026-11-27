# Production Admin Paneli — Kontrol Sonucu (9/10 + 10. adım sürüyor) ve 154 Ürün Aktarım Kontrol Listesi

**Tarih:** 2026-11-19 · **Canlı sürüm:** `3a13485` (+ ISR düzeltmeleri `27d0733`, `5cb1279`)
**Durum:** panel kontrolü **9 adım tamam, 10. adım sürüyor** · **aktarım onay bekliyor**

---

## BÖLÜM 1 — Panel kontrolü (9 tamam · 10. adım SÜRÜYOR)

Kontroller canlı production panelinde, kullanıcının oturumuyla, adım adım
yapıldı. Aşağıdaki tablo gerçekte gözlenen sonuçtur.

| # | Ekran | Sonuç |
|---|---|---|
| 1 | Ürün listesi | ✅ 3 ürün (76281, 90898, DENEMEE32424); arama, filtre çubuğu, sıralama ve seçim kutuları yerinde |
| 2 | Filtreler (6 adet) | ✅ Tüm beklenen sayılar tuttu: doğrulanmış fotoğraf yok **3**, açıklama eksik **3**, yayın onayı yok **3**, aktif **2** / pasif **1**, stok bilinmiyor **3**, yalnızca test **0** |
| 3 | Sıralama (5 alan + yön) | ✅ Parça no, ad ve tarih sıraları beklenen sırayla; yayın hazırlığında üç kayıt da 0 puanla eşit olduğu için sıra değişmedi (beklenen davranış) |
| 4 | Kategoriler ekranı | ✅ Boş durum metni, "Ekle" pasif, Türkçe slug önizlemesi (`Şanzıman Testi` → `/sanziman-testi`) |
| 5 | Ürün düzenleme / görünürlük | ✅ İki ayrı rozet (**Aktif** + **Yayında değil**), görünürlük anahtarı, kategori notu, stok notu, SERP önizlemesi. **Bir sapma çıktı — aşağıda** |
| 6 | Fotoğraflar | ✅ Şart kutusu (ALT ≥15 + kaynak), 1 fotoğraf "Doğrulama bekliyor", doğrulama formu. **Bir tutarsızlık bulundu — Y4** |
| 7 | Uyumluluk | ✅ 1 kayıt (`VOLVO — G720 — GREYDER`), not satır içi düzenlenebiliyor, kaynak boşken doğrulama düğmesi pasif |
| 8 | Çeviriler | ✅ EN/RU/AR sekmeleri; ad girilince "Taslak kaydet" etkin, gövde <120 karakterken "Kaydet ve yayınla" pasif ve gerekçe doğru |
| 9 | Yayın | ✅ Üç eksik doğru listelendi (doğrulanmış fotoğraf, uzun açıklama, doğrulanmış uyumluluk), yayın düğmesi **pasif** |
| 10 | Toplu işlem | ⏳ **SÜRÜYOR** — kullanıcı tarafından tamamen doğrulanmadı. Seçim çubuğu ve işlem kaydı çalıştığı görüldü (aşağıdaki kaza nedeniyle); beş işlem listesi, onay penceresi ve CSV kontrolleri **henüz teyit edilmedi** |

### 1.1 Sapma (5. adım): sayaç 0, beklenen 2

Uzun açıklama sayacının **0** göstermesi doğruydu; **benim beklentim**
yanlıştı. Önceki ölçüm sorgumda, tırnak kaçışından kaçınmak için kullandığım
`Chr(39)||Chr(39)` ifadesi boş string değil **iki apostrofluk bir metin**
üretiyordu; bu yüzden `NULL` alanlar "2 karakter" gibi görünmüştü.

Doğru ölçüm: her üç üründe de `long_description` **NULL**.
`description` (Temel Açıklama) ile `long_description` (SEO uzun açıklama)
**ayrı kolonlar**; yayın kapısı yalnızca `long_description`'a bakıyor.
Panelde düzeltilecek bir şey yok.

### 1.2 Bulgu Y4 (6. adım): istemci tarafı ayna kontrol eksik

"Bu fotoğrafı doğrula" düğmesi, ALT metni 15 karakterin altındayken veya
kaynak boşken **pasifleşmiyor**. Kural iki katmanda zaten uygulanıyor
(`parseImageAltText` → 400 ve `ck_product_images_verified_evidence` kısıtı),
yani **güvenlik açığı değil** — ama P3'te yayın düğmesi için yapılan
"aynı kararı önden göster" yaklaşımıyla tutarsız. Düşük öncelikli ayrı iş
olarak `01-BULGU-DURUM.md`'ye yazıldı.

### 1.3 Kaza (10. adım): bir toplu işlem onaylandı

`DENEMEE32424` kaydına **"Stok durumu ata → Bilinmiyor"** uygulandı.
Salt okunur inceleme sonucu:

| Kontrol | Sonuç |
|---|---|
| Stok durumu | `unknown` → `unknown` — **değişmedi**, stok iddiası oluşmadı |
| `stock_status_updated_at` | **boş kaldı** ("Bilinmiyor" insan kararı sayılmadığı için damgalanmıyor) |
| `updated_at` | **tazelendi** (2026-11-19 11:29) — tek gerçek etki |
| Aktiflik / yayın | pasif ve yayında değil — **değişmedi** |
| Diğer iki ürün | `updated_at` değerleri yedektekiyle **birebir aynı** |
| İşlem kaydı | **1 satır**: `bulk_stock_status` / `ok`, aktör dolu, before/after `{"stockStatus":"unknown"}`, gizli değer yok |

**Geri alma yapılmadı** (kullanıcı kararı): geri alınacak bir durum
değişikliği yok ve `updated_at`'i "düzeltmek" veriye bir kez daha dokunmak
olurdu.

> Bu kaza, denetim kaydının production'da gerçekten çalıştığının ilk canlı
> kanıtı oldu.

### 1.3b 10. adımda doğrulanmayı bekleyenler

- [ ] İşlem listesinde **beş** seçenek (`Aktife al`, `Pasife al`,
      `Stok durumu ata`, `Yayın onayı ver`, `Yayından al`) ve **"Sil" ile
      "Fotoğraf doğrula"nın OLMADIĞI**
- [ ] "Yayın onayı ver" → **Uygula** → onay penceresinin içeriği → **İptal**
- [ ] "Fotoğraf föyü (CSV)": 8 sütun, ALT metni ve Kaynak notu sütunları boş
- [ ] "Tümünü seç" → "Seçili 3 kayıt" → "Seçimi temizle"

Bu dört madde tamamlanmadan panel turu **10/10 sayılmaz**.

### 1.4 Panelin son durumu

Production: **3 ürün** (2 aktif, 1 pasif) · **2 fotoğraf** (0 doğrulanmış) ·
**2 uyumluluk** (0 doğrulanmış) · **0 çeviri** · **0 kategori** ·
**1 işlem kaydı** · `seo_ready` **0** · stok iddiası **0** ·
katalog **kapalı**.

---

## BÖLÜM 2 — 154 ürün aktarımı: güvenlik kontrol listesi

> Aktarım **başlatılmadı**. Aşağıdakiler, açık onayınız geldiğinde
> uygulanacak sıradır.

### 2.1 Aktarımın değişmezleri (uygulama sırasında zorlanır)

| # | Kural | Nasıl zorlanır |
|---|---|---|
| 1 | **12 sentetik kayıt aktarılmaz** | Kaynak sorgu `WHERE NOT is_synthetic` · PREFLIGHT 12 kimliği arar · PREFLIGHT test desenini arar · POST-CHECK `is_synthetic = 0` |
| 2 | **Tüm ürünler PASİF gelir** | `is_active` açıkça `FALSE` yazılır · POST-CHECK "aktarılanların hiçbiri aktif değil" · POST-CHECK "aktif ürün sayısı değişmedi" |
| 3 | **Hiçbir ürün yayına girmez** | `seo_ready = FALSE`, `seo_ready_at = NULL` · POST-CHECK `seo_ready` toplamı 0 |
| 4 | **Stok iddiası oluşmaz** | Kaynakta zaten 0; POST-CHECK `stock_status <> 'unknown'` sayısı 0 |
| 5 | **Fotoğraf doğrulaması üretilmez** | `product_images` tablosuna **hiç** yazılmaz (dev'de fotoğraf yok) |
| 6 | **Mevcut 3 ürün korunur** | Yalnızca `INSERT`; parça no çakışması PREFLIGHT'ta reddedilir; POST-CHECK mevcut ürünlerin parmak izini karşılaştırır |
| 7 | **Müşteri kayıtları korunur** | `rfq_submissions` tablosuna dokunulmaz |
| 8 | **Katalog kapalı kalır** | `site_settings` tablosuna dokunulmaz |
| 9 | **Mükerrer makine oluşmaz** | Eşleştirme (üretici, model); belirsizlikte **durur**; POST-CHECK mükerrer sayar |
| 10 | **Her şey tek işlemde** | `BEGIN … COMMIT`; herhangi bir kontrol tutmazsa **tamamı geri alınır** |

### 2.2 Aktarılacak veri

| | Adet |
|---|---|
| Ürün | **154** (hepsi pasif gelecek) |
| Üretici | 9 → **8 eklenecek** (VOLVO zaten var) |
| Makine | 105 → **104 eklenecek** (VOLVO G720 eşleşiyor) |
| Uyumluluk | **300** (hepsi doğrulanmış, kaynaklarıyla) |
| Çeviri | **154** (taslak) |
| Fotoğraf | **0** |

### 2.3 Uygulama planı

**A. Hazırlık (yazma yok)**

- [ ] Hedef doğrulaması: `current_database()` + ürün sayısı **3** görülmeli
- [ ] Güncel tam `pg_dump` yedeği + içerik doğrulaması
- [ ] Yedeğin izole Docker'da geri yüklenmesi
  *(not: migration sonrası dökümlerde `sed '/pg_attver/d'` gerekir)*
- [ ] TSV dosyalarının **taze** üretilmesi (dev o ana kadar değişmiş olabilir)
- [ ] TSV'lerde sentetik kimlik ve test deseni kontrolü → **0** olmalı

**B. Aktarım (tek işlem)**

- [ ] `scripts/aktarim-154-urun.sql` çalıştırılır
- [ ] NOTICE satırları okunur; `ERROR` varsa işlem zaten geri alınmıştır

Beklenen çıktı:

```
INSERT 0 8     (üretici)      INSERT 0 104   (makine)
INSERT 0 154   (ürün)         INSERT 0 300   (uyumluluk)
INSERT 0 154   (çeviri)
AKTARIM TAMAM: 154 urun eklendi, hepsi PASIF.
KANIT: aktif urun sayisi DEGISMEDI (2)
```

**C. Doğrulama (salt okunur)**

- [ ] Ürün **157** · aktif **2** · pasif **155**
- [ ] `seo_ready` **0** · `is_synthetic` **0** · stok iddiası **0**
- [ ] Fotoğraf **2**, doğrulanmış **0**
- [ ] Uyumluluk **302**, doğrulanmış **300**
- [ ] Çeviri **154**, yayınlı **0**
- [ ] Mükerrer (üretici, model) **0**
- [ ] Mevcut 3 ürünün parmak izi **değişmemiş**
- [ ] Canlı `/api/products` yanıtı **değişmemiş** (yalnızca 76281, 90898)
- [ ] `/sitemap.xml` → **63 URL**, `/parca-katalog` → **404**

**D. Panel kontrolü**

- [ ] Listede **157** kayıt, varsayılan filtrede **157** (production'da sentetik yok)
- [ ] "Durum → Pasif" filtresi **155** döner
- [ ] Rastgele bir yeni ürün açılır: pasif, yayında değil, uyumlulukları **doğrulanmış**, çevirisi **taslak**

**E. Sonraki aşamalar (ayrı ayrı onay)**

- [ ] Ürünlerin aktifleştirilmesi (toplu işlemle, işlem kaydına girer)
- [ ] Fotoğraf turu ve doğrulama
- [ ] Kategori ağacının kurulması (Y1)
- [ ] Katalog toggle'ının açılması

### 2.4 Geri alma

Aktarım tek işlemdir; çalışma sırasında hata olursa **kendiliğinden** geri
alınır. Tamamlandıktan sonra geri almak gerekirse kimlikler TSV
dosyalarında durur:

```sql
DELETE FROM product_translations WHERE product_id IN (<154 kimlik>);
DELETE FROM fitments            WHERE product_id IN (<154 kimlik>);
DELETE FROM products            WHERE id         IN (<154 kimlik>);
-- eklenen makine/üretici yalnızca başka kayıt kullanmıyorsa silinir
```

Provada bu geri alma denendi: **3 ürün / 2 uyumluluk / 3 makine / 2 üretici**
durumuna tam dönüş sağlandı ve mevcut kayıtların parmak izi korundu.

### 2.5 Riskler

| # | Risk | Durum |
|---|---|---|
| R1 | Aktarılan ürünlerin public API'de görünmesi | **Yok** — pasif geliyorlar; provada `/api/products` yalnızca 2 ürün döndürdü |
| R2 | Mükerrer makine | Provada yakalandı ve **düzeltildi**; artık durdurucu kontrol var |
| R3 | Mevcut verinin bozulması | Provada parmak izi **birebir** korundu; POST-CHECK aynı kontrolü canlıda da yapar |
| R4 | Dev'in aktarım anına kadar değişmesi | TSV'ler aktarımdan hemen önce **taze** üretilir |
| R5 | 42 ürünün açıklaması <300 karakter | Aktarılır ama **yayın kapısı engeller**; içerik tamamlama ayrı iş |
| R6 | Yedeklerin `pg_attver` sorunu | Bilinen; `sed` ile ayıklanıyor |

---

## Onay bekleyenler

1. **154 ürünün production'a aktarılması** (bu belgedeki A–D adımları)
2. Aktarım sonrası **aktifleştirme** (ayrı)
3. Katalog toggle'ının açılması (ayrı)
