# Yayın Hazırlık Analizi ve Çalışma Planı

**Tarih:** 2026-11-20 · **Kaynak:** production, **salt okunur**
**Durum:** analiz · hiçbir değişiklik yapılmadı

> Ürün aktifleştirilmedi, SEO yayın onayı verilmedi, kategori oluşturulmadı,
> katalog açılmadı. Yedekler duruyor.

---

## 1. Liste doğruluğu (157 ürün)

Panelin filtre mantığıyla aynı sorgular veritabanında çalıştırıldı:

| Panel görünümü | Beklenen sonuç |
|---|---|
| Toplam kayıt | **157** → 20'şerli **8 sayfa** |
| Varsayılan (test kayıtları gizli) | **157** (production'da sentetik kayıt yok) |
| Durum → Aktif / Pasif | **2 / 155** |
| Doğrulanmış fotoğraf → Var / Yok | **0 / 157** |
| Açıklama → Yeterli / Eksik | **112 / 45** |
| Yayın onayı → Var / Yok | **0 / 157** |
| Stok durumu → Bilinmiyor | **157** (stok iddiası yok) |

> "Eksik açıklama" 45 çıkıyor: yeni gelen **42** + production'da zaten bulunan
> **3** ürün (76281, 90898, DENEMEE32424 — üçünün de uzun açıklaması boş).

**Panelde gözle doğrulanması gereken (oturum ister):** liste 157 gösteriyor
mu, 8 sayfa mı, "Durum → Pasif" filtresi **155** döndürüyor mu.

---

## 2. Üretici ve makine bazında sınıflandırma (yeni 154 ürün)

### 2.1 Üreticiye göre

| Üretici | Ürün |
|---|---|
| **HİDROMEK** | **89** |
| MITSUBISHI | 24 |
| VOLVO | 18 |
| KOMATSU | 9 |
| ÇUKUROVA | 6 |
| CATERPILLAR | 4 |
| AMMANN | 3 |
| HITACHI | 1 |
| CHAMPION | 1 |

*(Toplam 155 > 154: bir ürün birden fazla markanın makinesine uyabiliyor.)*

### 2.2 En yoğun makineler

| Makine | Ürün |
|---|---|
| **HİDROMEK HMK 600MG** | **74** |
| MITSUBISHI MG430 | 15 |
| VOLVO G930 GREYDER | 15 |
| MITSUBISHI MG530 | 10 |
| HİDROMEK HMK600MG | 8 |
| VOLVO G970 | 8 |
| VOLVO G940 / G960 / G976 | 7 / 7 / 7 |

**105 farklı makine**, ürün başına ortalama **1,95 uyumluluk**.

> ⚠ `HMK 600MG` ve `HMK600MG` **iki ayrı makine kaydı** olarak duruyor
> (74 + 8 ürün). Aynı makinenin iki yazımı olabilir — §6'da şüpheli olarak
> işaretlendi.

---

## 3. Yayın şartları: eksik analizi (154 yeni ürün)

| Ölçüt | Eksik olan ürün |
|---|---|
| Doğrulanmış fotoğraf | **154** (tamamı) |
| Uzun açıklama (<300) | **42** |
| Doğrulanmış uyumluluk | **0** ✅ |
| Aktiflik (pasif) | **154** (tamamı — planlandığı gibi) |

**Eksik sayısına göre dağılım:**

| Grup | Ürün | Eksikleri |
|---|---|---|
| **A** | **112** | fotoğraf + aktiflik |
| **B** | **42** | fotoğraf + açıklama + aktiflik |

Yani **hiçbir üründe uyumluluk eksiği yok** — aktarım 300 doğrulanmış
uyumluluğu kaynaklarıyla getirdi. Yayına giden yolda kalan tek saha işi
**fotoğraf**.

---

## 4. 112 / 42 ayrımı

### 4.1 Açıklama uzunluğu dağılımı (154 ürün)

| Aralık | Ürün |
|---|---|
| 100–199 karakter | **42** ← eksik grup |
| 300–499 karakter | 95 |
| 500+ karakter | 17 |

**Boş açıklamalı yeni ürün yok.** 42 ürünün ortalaması **158 karakter**
(min 142, max 177) — yani hepsi eşiğe yakın.

**Toplam eksik: 5.984 karakter** (~142 karakter/ürün). Bu, 42 ürünün her
birine ortalama 2–3 cümle eklemek demek; sıfırdan yazmak değil.

### 4.2 Grup A — 112 ürün (yalnızca fotoğraf bekliyor)

Üreticiye göre: HİDROMEK **55** · MITSUBISHI **24** · VOLVO **14** ·
KOMATSU 6 · ÇUKUROVA 6 · AMMANN 3 · CATERPILLAR 3 · HITACHI 1 · CHAMPION 1

Makineye göre (depo turu rotası): **HİDROMEK HMK 600MG 43** ·
MITSUBISHI MG430 15 · VOLVO G930 11 · MG530 10 · MG460 6 · MG560 6 ·
ÇUKUROVA 940 6 · HMK600MG 5

### 4.3 Grup B — 42 ürün (fotoğraf + açıklama)

Üreticiye göre: **HİDROMEK 34** · VOLVO 4 · KOMATSU 3 · CATERPILLAR 1

Grup B'nin **%81'i HİDROMEK** — içerik tamamlama tek bir marka etrafında
toplanabilir.

---

## 5. Uyumluluk kaynakları (korunuyor)

| | |
|---|---|
| Toplam uyumluluk | **302** |
| Doğrulanmış | **300** |
| Doğrulanmamış | **2** → `76281` ve `90898`'in VOLVO G720 kayıtları (production'da zaten vardı) |
| Kaynak metni olan | **300 / 300** |
| Kaynak uzunluğu | min **15**, ortalama **33**, max **102** karakter |
| Farklı kaynak metni | **165** |

Aktarım doğrulama bilgisini ve kaynakları **olduğu gibi korudu**; hiçbir
kayıt yeniden doğrulanmadı veya kaynağı değiştirilmedi.

---

## 6. Şüpheli kayıtlar (işaretlendi, DEĞİŞTİRİLMEDİ)

| # | Bulgu | Adet | Değerlendirme |
|---|---|---|---|
| Ş1 | **Aynı makine iki kayıt**: `HMK 600MG` (74 ürün) ve `HMK600MG` (8 ürün) | 2 kayıt | Boşluk farkı. Birleştirme **ayrı karar**; şimdilik dokunulmadı |
| Ş2 | **Tek üründe 42 uyumluluk** | 1 ürün | Kaynağı `CAT2443106 · Compatible Models` — üretici katalogunun uyumluluk listesi. Meşru görünüyor ama gözden geçirilmeli |
| Ş3 | **Tekrarlı kaynak metinleri** | 42 / 18 / 12 / 11 / 9 kayıt | Aynı katalog sayfasından toplu doğrulama. Beklenen bir örüntü; yine de örnekleme ile kontrol önerilir |
| Ş4 | **Aynı ada sahip ürün grupları** | **13 grup** | `O-RING` 7, `DAİRE AYAR PULU` 4, `KAVRAMA AYAR PULU` 3, `ŞANZIMAN BASKI PLAKASI` 3… Parça numaraları farklı; SEO açısından **benzersiz başlık** gerekir |
| Ş5 | **Çok kısa ürün adı** (<8 karakter) | **12 ürün** | `O-ring`, `Cıvata`, `Somun`, `Far`… Tek başına arama sonucunda ayırt edici değil |
| Ş6 | Meta başlığı var, açıklaması eksik | 42 | Grup B ile aynı küme |
| — | Kısa kaynak metni (<15 karakter) | **0** | ✅ temiz |
| — | Uyumluluğu olmayan ürün | **0** | ✅ temiz |
| — | Mükerrer Logo stok kodu | **0** | ✅ temiz |

**Ş4 + Ş5 birlikte önemli:** 13 grup ve 12 kısa ad, yayına çıkarken
"ŞANZIMAN BASKI PLAKASI" başlıklı üç ayrı sayfa demek. Google bunu
**yinelenen içerik** olarak değerlendirebilir. Yayın öncesi başlıkların
parça numarası veya makine ile ayrıştırılması önerilir.

---

## 7. Önceliklendirilmiş çalışma planı

### Faz 1 — Fotoğraf turu (en kritik, saha işi)

**Hedef:** 154 ürünün gerçek fotoğrafı + ALT metni + kaynak notu.

Rota önerisi — makine yoğunluğuna göre, çünkü parçalar depoda makineye göre
duruyor:

| Sıra | Makine | Ürün (Grup A) | Not |
|---|---|---|---|
| 1 | HİDROMEK HMK 600MG | **43** | Tek turda en çok kazanım |
| 2 | MITSUBISHI MG430 | 15 | |
| 3 | VOLVO G930 | 11 | |
| 4 | MITSUBISHI MG530 | 10 | |
| 5 | MG460 · MG560 · ÇUKUROVA 940 | 6 + 6 + 6 | |
| 6 | Kalanlar | ~15 | |

**Araç:** panelden **"Fotoğraf föyü (CSV)"**. Seçili ürünler için parça no,
Logo kodu, ad ve **boş ALT/Kaynak sütunları** ile iner; sahada doldurulur.

**Her fotoğraf için zorunlu:** ALT metni (**≥15 karakter**, parça numarasının
tekrarı değil) + kaynak (çekim tarihi / katalog sayfası / tedarikçi teyidi).
Bu ikisi olmadan doğrulama hem uçta hem veritabanı kısıtında reddedilir.

### Faz 2 — 42 ürünün açıklaması

Ortalama **142 karakter** eklemek yeterli. **%81'i HİDROMEK** olduğu için tek
bir teknik kaynaktan toplu çalışılabilir. Metinler benzersiz ve Türkçe
olmalı; parça numarasını tekrarlamamalı.

### Faz 3 — Başlık ayrıştırma (Ş4 + Ş5)

13 tekrarlı ad grubu ve 12 kısa ad, yayından **önce** ayrıştırılmalı.
Örnek: `O-ring` → `O-ring contası — HMK 600MG şanzıman`. Bu, hem yinelenen
içerik riskini hem de arama sonucunda ayırt edilebilirliği çözer.

### Faz 4 — Aktifleştirme (ayrı onay)

155 pasif kaydın public yüzeye açılması. Toplu işlemle yapılır ve **işlem
kaydına girer**. Katalog kapalı olsa bile `/api/products` aktif ürünleri
listelediği için bu bilinçli bir karardır.

### Faz 5 — Yayın onayı (ayrı onay)

Yalnızca dört ölçütü de karşılayan ürünler. Toplu işlemde her ürün kapıdan
**ayrı ayrı** geçer; geçmeyen reddedilir.

### Faz 6 — Kategori ağacı (Y1) ve katalog açılışı (ayrı onaylar)

---

## 8. Sayılarla yol haritası

| Aşama | Bugün | Faz 1 sonrası | Faz 2 sonrası | Faz 4 sonrası |
|---|---|---|---|---|
| Doğrulanmış fotoğrafı olan | 0 | 154 | 154 | 154 |
| Açıklaması yeterli | 112 | 112 | **154** | 154 |
| Doğrulanmış uyumluluğu olan | 154 | 154 | 154 | 154 |
| Aktif | 2 | 2 | 2 | **157** |
| **Yayın kapısından geçebilecek** | **0** | **112** | **154** | **154** |

Yani **fotoğraf turu tek başına 112 ürünü yayına hazır hâle getiriyor**;
açıklama çalışması kalan 42'yi ekliyor. Aktifleştirme olmadan hiçbiri
yayınlanamaz (kapı aktiflik şartı taşır).

---

## 9. Onay bekleyenler

1. Fotoğraf turunun başlatılması (CSV föyü üretimi)
2. 42 ürünün açıklama çalışması
3. Başlık ayrıştırma kararı (Ş4 + Ş5)
4. `HMK 600MG` / `HMK600MG` makine kayıtlarının birleştirilmesi (Ş1)
5. Ürünlerin aktifleştirilmesi
6. SEO yayın onayı · kategori ağacı · katalog açılışı
