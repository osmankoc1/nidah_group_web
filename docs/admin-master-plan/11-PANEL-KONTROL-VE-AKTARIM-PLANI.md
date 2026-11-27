# Production Admin Paneli Kontrolü + 154 Ürün Aktarım Planı

**Tarih:** 2026-11-18 · **Canlı sürüm:** `3a13485` · **Durum:** inceleme ve plan

> Production verisi **değiştirilmedi**. Ürün aktarılmadı, fotoğraf doğrulama
> bilgisi oluşturulmadı, katalog açılmadı.

---

## BÖLÜM 1 — Panel kontrolü

### 1.1 Önce bir düzeltme

Deploy raporunun ilk hâlinde `/api/admin/categories` → **401** yanıtını
"yeni rota yayında" kanıtı saymıştım. **Bu çıkarım yanlıştı.** Ölçtüm:

```
/api/admin/boyle-bir-uc-yok   → 401     (var olmayan uç de 401 dönüyor)
/admin/boyle-bir-sayfa-yok    → 307     (var olmayan sayfa da girişe yönlendiriyor)
```

`src/proxy.ts` `/admin/**` ve `/api/admin/**` altındaki her isteği
rotalamadan ÖNCE kesiyor. Dolayısıyla bu kodlar **korumanın çalıştığını**
kanıtlar, rotanın var olduğunu değil. Deploy'un kanıtı yalnızca public
taraftaki davranış değişikliğidir (`imageUrl` → `null`, yeni `stockStatus`
alanı).

### 1.2 Girişsiz doğrulanabilenler ✅

| Kontrol | Sonuç |
|---|---|
| Giriş sayfası `/admin/login` | **200** |
| `/admin/**` altındaki tüm sayfalar | **307** → giriş (koruma çalışıyor) |
| `/api/admin/**` altındaki tüm uçlar | **401** (koruma çalışıyor) |
| Canlı kodun yeni sürüm olduğu | ✅ public davranış değişikliğiyle kanıtlandı |

### 1.3 Ekran bazında şema hazırlığı ✅ (production'da ölçüldü)

| Ekran | Gereken şema | Durum |
|---|---|---|
| Ürün listesi + 6 filtre + sıralama | `is_synthetic`, `internal_stock_code`, `long_description`, `seo_ready`, `stock_status`, `is_active` | **6/6 var** |
| Kategoriler | `categories` tablosu + `products.category_id` | **var** (0 satır — ağaç kurulmadı) |
| Fotoğraf yönetimi | 5 kolon + CHECK kısıtı + kısmi index | **5/5 + kısıt + index** |
| Makine uyumlulukları | `fitments.verified/verified_at/source/notes` | **4/4 var** |
| Çeviriler | `product_translations.published` | **var** (0 satır) |
| Toplu işlem + işlem kaydı | `admin_audit_log` 10 kolon, 2 kısıt | **var**, `nidah_web` → `INSERT, SELECT` |

Yani ekranların ihtiyaç duyduğu her şey production'da hazır; hiçbir ekran
"kolon yok" hatası alamaz.

### 1.4 SİZİN GİRİŞ YAPMANIZ GEREKENLER ⚠

Panelin **içi** oturum ister; şifrenizi istemiyorum ve kullanmıyorum.
Aşağıdakileri ancak siz giriş yaptıktan sonra birlikte doğrulayabiliriz:

| # | Ekran | Ne bakılacak | Beklenen |
|---|---|---|---|
| 1 | `/admin/products` | Liste açılıyor mu | **3 ürün** (76281, 90898, DENEMEE32424) |
| 2 | Filtreler | "Test kayıtları" filtresi | **0 sentetik** (production'da yok) |
| 3 | Filtreler | "Doğrulanmış fotoğraf → yok" | **3 ürün** |
| 4 | Sıralama | "Yayın hazırlığı" | sıralama çalışıyor |
| 5 | `/admin/categories` | Boş durum metni | "Henüz kategori yok" |
| 6 | Ürün düzenleme | Aktif/Pasif anahtarı + iki rozet | 76281 → Aktif / Yayında değil |
| 7 | Fotoğraflar sekmesi | Şart kutusu + 1 fotoğraf | "doğrulama bekliyor" |
| 8 | Uyumluluk sekmesi | Satır içi not düzenleme | varsa kayıt görünür |
| 9 | Çeviriler sekmesi | Yayın kapısı | düğme **pasif** (çeviri yok) |
| 10 | Toplu işlem | Satır seçimi → çubuk → onay diyaloğu | **uygulamadan kapatın** |

> **Önemli:** 10. maddede onay diyaloğunu **açıp kapatmanız** yeterli.
> "Uygula" demeyin — gerçek ürünler üzerinde işlem yapılmış olur.

**Güvenli kanıt yolu (isterseniz):** toplu işlemi denemek için
`DENEMEE32424` (pasif, yayın dışı) kaydını seçip **"Pasife al"** uygulayın —
kayıt zaten pasif olduğu için durum değişmez, ama işlem kaydının çalıştığını
`admin_audit_log`'da görürüz.

### 1.5 Development'ta zaten doğrulananlar

Bu commit'in (`3a13485`) içindeki tüm ekranlar **bugün development'ta
tarayıcıyla tek tek denendi** (`06-PROVA-RAPORU.md` ve Faz 5 kayıtları):
filtreler, kategori ekranı ve korumaları, aktif/pasif anahtarı, uyumluluk
notu düzenleme, toplu işlem akışı ve yayın kapısı (12/12 reddedildi).
Production'da aynı kod çalışıyor; fark yalnızca veridir.

---

## BÖLÜM 2 — 154 ürünün aktarım planı (HENÜZ UYGULANMADI)

### 2.1 Aktarılacak veri (development'ta ölçüldü)

| | Değer |
|---|---|
| Gerçek ürün | **154** (153 aktif, 1 pasif) |
| Sentetik test kaydı | **12** → **AKTARILMAYACAK** |
| Uzun açıklaması olan | 154 · **≥300 karakter olan: 112** |
| Meta başlık / Logo stok kodu | 154 / 154 |
| Fotoğraf | **0** |
| Makine uyumluluğu | **300** (hepsi doğrulanmış), **105 makine**, **9 üretici** |
| Çeviri | **154** (hiçbiri yayınlanmamış) |
| OEM numarası / kategori | 0 / 0 |
| `seo_ready` / stok iddiası | **0 / 0** |
| Production ile parça no çakışması | **YOK** |

### 2.2 Bağımlılık sırası (zorunlu)

```
1. Üreticiler   (9 kayıt — production'da 2 var)
2. Makineler    (105 kayıt — production'da 3 var)
3. Ürünler      (154 kayıt)
4. Uyumluluklar (300 kayıt — ürün + makine var olmadan eklenemez)
5. Çeviriler    (154 kayıt, taslak olarak)
```

### 2.3 ⚠ En önemli risk: aktarılan ürünler AKTİF gelir

`/api/products` **public** bir uçtur ve katalog toggle'ından
**etkilenmez** — aktif ürünleri herkese listeler. İçe aktarma şablonunda
`isActive` sütunu **yoktur**; kayıtlar şema varsayılanıyla
`is_active = true` olarak oluşur.

Yani düz bir içe aktarma, 154 ürünü **anında public API'de görünür** hâle
getirir (parça no, ad, açıklama). Katalog kapalı olsa bile.

**Önerim:** ürünler **pasif** olarak aktarılsın, siz tek tek veya toplu
işlemle bilinçli olarak aktifleştirin.

### 2.4 İki yöntem — karar gerekiyor (K19)

| | **A) Doğrudan SQL aktarımı** (önerilen) | **B) Panel içe aktarma ekranı** |
|---|---|---|
| Nasıl | Dev'den açık kolon listesiyle seçilip production'a `INSERT` | Dev'den CSV/XLSX üretip panelden yüklemek |
| `is_active` | **false** olarak yazılabilir ✅ | şablonda yok → **true** gelir ❌ |
| Doğrulama | Veri zaten aynı uygulamanın doğrulamasından geçerek dev'e girdi | Yeniden doğrulamadan geçer |
| Uyumluluk `verified` | Korunur (karar K20) | Şablon destekliyor |
| Çeviriler | Aynı yöntemle taşınır | **Şablon yok** → ayrı iş |
| Kod değişikliği | **gerekmez** | `isActive` desteği için kod + yeni deploy gerekir |
| İz | Elle SQL (işlem kaydına girmez) | Panelden yapılır |

**Önerim: A.** Veri zaten bu uygulamanın kendi doğrulamasından geçmiş;
kritik olan `is_active = false` ile gelmesi ve çevirilerin de taşınabilmesi.

### 2.5 Aktarımda zorlanacak kurallar

| Kural | Nasıl garanti edilir |
|---|---|
| 12 sentetik kayıt **gitmez** | Kaynak sorgu `WHERE NOT is_synthetic` + 12 kimliğin dışlandığı ikinci kontrol + aktarım sonrası `is_synthetic = 0` doğrulaması |
| Hiçbir ürün yayına girmez | `seo_ready = false` açıkça yazılır (dev'de de 0) |
| Stok iddiası oluşmaz | `stock_status = 'unknown'` (dev'de zaten 0 iddia) |
| Fotoğraf doğrulaması üretilmez | Fotoğraf **yok**; `product_images` tablosuna hiçbir satır yazılmaz |
| Mevcut 3 ürün korunur | Parça no çakışması yok; aktarım yalnızca `INSERT`, `UPDATE` yok. Parmak izi öncesi/sonrası karşılaştırılır |
| Katalog kapalı kalır | `site_settings`'e dokunulmaz |
| Public görünürlük artmaz | Ürünler **pasif** gelir |

### 2.6 Uygulama adımları (onaylanırsa)

1. **Yedek** — güncel tam `pg_dump` + geri yükleme testi (önceki turdaki yöntem)
2. **Prova** — production kopyası Docker'a yüklenir, aktarım orada çalıştırılır,
   sayımlar ve parmak izleri doğrulanır, geri alma denenir
3. **Aktarım** — sırayla: üretici → makine → ürün → uyumluluk → çeviri
4. **Doğrulama** — ürün 157 (3 + 154) · aktif **2** (yeni gelenler pasif) ·
   `seo_ready` 0 · stok iddiası 0 · `is_synthetic` 0 · mevcut 3 ürünün parmak
   izi değişmemiş · `/api/products` yanıtı **değişmemiş**
5. **Panel kontrolü** — listede 157 kayıt, filtreler çalışıyor
6. **Aktifleştirme** — ayrı ve açık onayla, toplu işlemle (işlem kaydına girer)

### 2.7 Geri alma

Aktarılan kayıtların kimlikleri bilindiği için geri alma nettir:

```sql
DELETE FROM product_translations WHERE product_id IN (<154 kimlik>);
DELETE FROM fitments            WHERE product_id IN (<154 kimlik>);
DELETE FROM products            WHERE id         IN (<154 kimlik>);
-- makine/üretici kayıtları ayrıca değerlendirilir
```

Çalışmazsa yedekten dönülür. Mevcut 3 ürün bu ifadelerin kapsamında değildir.

### 2.8 Kararınızı bekleyen noktalar

| # | Karar | Önerim |
|---|---|---|
| **K19** | Aktarım yöntemi: SQL mi, panel içe aktarma mı | **SQL** (pasif aktarım ve çeviri desteği için) |
| **K20** | 300 uyumluluk kaydının `verified` bilgisi korunsun mu | **Korunsun** — doğrulamalar dev'de gerçekten yapıldı, uydurma değil |
| **K21** | 154 çeviri taşınsın mı | **Taşınsın**, taslak olarak (hiçbiri yayınlanmamış) |
| **K22** | Ürünler pasif mi gelsin | **Evet**, aktifleştirme ayrı onayla |
| **K23** | 42 ürünün açıklaması 300 karakterin altında | Aktarılsın; yayın kapısı zaten engeller. İçerik tamamlama ayrı iş |

---

## Şu an değişmeyenler

Production: **3 ürün · 2 fotoğraf · 0 yayın · 0 stok iddiası · 0 doğrulanmış
fotoğraf · katalog kapalı**. 154 ürün aktarılmadı, fotoğraf doğrulama
bilgisi oluşturulmadı.
