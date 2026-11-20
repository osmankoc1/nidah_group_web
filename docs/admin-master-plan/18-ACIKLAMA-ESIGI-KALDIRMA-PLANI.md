# 300 Karakter Şartının Kaldırılması — Tespit ve Değişiklik Planı

**Tarih:** 2026-11-20 · **Durum:** plan · **kod değiştirilmedi**

> Kod, veritabanı, ürün aktifleştirme ve katalog açılışı **yapılmadı**.
> Uygulama için onayınız beklenir.

---

## 1. Kuralın uygulandığı noktalar (tespit)

`MIN_LONG_DESCRIPTION_CHARS = 300` sabiti **4 kaynak dosyada** ve **5 test
dosyasında** geçiyor. Kritik ayrım: sabitin **nerede yayın engeli**, nerede
yalnızca **gösterim** olduğudur.

### 1.1 YAYIN ENGELİ oluşturan tek yer

| Dosya | Satır | Ne yapıyor |
|---|---|---|
| `src/lib/seo-gate.ts` | **114** | `if (uzunluk < 300) unmet.push("long_description_too_short")` |

Tüm engel buradan doğuyor. Bu fonksiyon üç yerden çağrılıyor:

| Çağıran | Etkisi |
|---|---|
| `seo-gate-server.ts` → `evaluatePublishEligibility()` | **Sunucu kapısı** |
| `api/admin/products/[id]/route.ts` | `seo_ready = true` yazımını **422** ile reddeder |
| `api/admin/products/bulk/route.ts` | Toplu yayında kayıt başına reddeder |
| `edit/page.tsx` | Yayın düğmesini pasifleştirir, eksikleri listeler |

Yani **tek bir `if` satırı** kaldırıldığında engel her yerden kalkar —
kopyalanmış eşik yok. (Bu, P13/P8 çalışmasında bilinçli olarak böyle
kurulmuştu.)

### 1.2 Ölçüt tanımları (engelin parçası)

| Dosya | Satır | İçerik |
|---|---|---|
| `src/lib/seo-gate.ts` | 53 | `SeoCriterion` tipinde `"long_description_too_short"` |
| `src/lib/seo-gate.ts` | 88–90 | Operatöre gösterilen gerekçe metni |

### 1.3 Yalnızca GÖSTERİM (engel değil) — korunacak

| Dosya | Satır | Ne yapıyor |
|---|---|---|
| `edit/page.tsx` | 606 | Sayaç **kehribar** renge döner (eşik altında) |
| `edit/page.tsx` | 611–612 | *"… yayın için en az 300 karakter **zorunlu**"* ← **metin değişmeli** |

### 1.4 Liste filtresi ve hazırlık puanı — karar gerekiyor

| Dosya | Satır | Ne yapıyor |
|---|---|---|
| `api/admin/products/route.ts` | 157, 162 | "Açıklama → Eksik (<300) / Yeterli" filtresi |
| `api/admin/products/route.ts` | 213 | `publishReadiness` puanına `>= 300` terimi ekler |
| `ProductFilterBar.tsx` | 41 | Filtre etiketi: `Eksik (<300)` / `Yeterli` |

Bunlar yayını engellemiyor ama **"yeterli / eksik" dili** eşiği zorunlu
gibi gösteriyor.

---

## 2. Önerilen değişiklikler

### A. Yayın kapısından çıkarma (zorunlu)

1. `seo-gate.ts`: 114. satırdaki kontrol **kaldırılır**.
2. `SeoCriterion` tipinden `"long_description_too_short"` **çıkarılır**,
   `REASON` kaydı silinir.
3. `MIN_LONG_DESCRIPTION_CHARS` sabiti **kalır** ama adı ve belgesi
   değişir: **tavsiye edilen hedef**.
   Önerim: `ONERILEN_ACIKLAMA_KARAKTERI = 300` (eski ad geriye dönük
   uyumluluk için `@deprecated` alias olarak bırakılabilir).

### B. Panel metinleri (zorunlu)

4. `edit/page.tsx` sayaç metni:
   `"… yayın için en az 300 karakter zorunlu"` →
   **`"… önerilen hedef 300 karakter (zorunlu değil)"`**
   Kehribar renk **kalır** — uyarı değil, hedefe uzaklık göstergesi.

### C. Filtre ve puan (kararınız)

5. Filtre etiketi `Eksik (<300)` / `Yeterli` →
   **`300'ün altında`** / **`300 ve üzeri`** (yargı bildiren dil kalkar).
6. `publishReadiness` puanı: açıklama terimi **kalsın mı?**
   - **Seçenek 1 (önerim):** kalsın, ama artık "yayına hazırlık" değil
     **"içerik olgunluğu"** anlamına gelir.
   - **Seçenek 2:** çıkarılsın; puan yalnızca fotoğraf + uyumluluk olur.

### D. ⚠ Karar gereken asıl nokta: tamamen BOŞ açıklama

Bugünkü kural boş açıklamayı da yakalıyor. 300 şartı kalkınca
**açıklaması hiç olmayan bir ürün de yayınlanabilir** hâle gelir.

Production'daki durum: mevcut 3 üründe `long_description` **NULL**;
aktarılan 154 üründe **hepsi dolu** (en kısası 142 karakter).

| Seçenek | Sonuç |
|---|---|
| **D1 (önerim)** | Eşik kalkar, ama **"açıklama tamamen boş olamaz"** ölçütü eklenir (`long_description_missing`). İnce içerik riskine karşı asgari koruma |
| **D2** | Açıklama ölçütü tamamen kalkar; boş açıklamalı ürün de yayınlanabilir |

D1'de yeni ölçüt metni: *"Uzun açıklama boş. Sayfanın gövdesi için en az
birkaç cümle gerekir."*

---

## 3. Etkilenecek testler

**Toplam 511 testin 9'u** doğrudan etkilenir.

### 3.1 Davranışı değişecek — güncellenmeli

| Dosya | Test | Neden |
|---|---|---|
| `seo-gate.spec.ts` | "kısa açıklama eşiğin ALTINDA kalırsa uygun değil" | Artık **uygun olacak** → testin tersine çevrilmesi |
| `seo-gate.spec.ts` | "whitespace açıklama sayılmaz" | D1 seçilirse geçerli kalır (boş sayılır), D2'de silinir |
| `seo-gate.spec.ts` | "migration sonrası TİPİK satır uygun DEĞİL" | Beklenen `unmet` listesi 3 → **2** (D2) veya içerik değişir (D1) |
| `category-tree.spec.ts` | "yayın kapısının ölçüt listesinde kategori YOK" | Ölçüt dizisi 6 → **5** eleman |

### 3.2 Metin kontrolleri — ters çevrilmeli

| Dosya | Test | Neden |
|---|---|---|
| `admin-tabs.spec.ts` | **"operatöre gösterilen metin 'önerilir' DEMİYOR"** | Yeni politikayla **doğrudan çelişiyor**; artık "önerilir" demesi gerekiyor |
| `admin-tabs.spec.ts` | "Yayın sekmesi ile aynı dili kullanır" (`zorunlu`) | İki ekran da "tavsiye" diline geçmeli |

### 3.3 Geçerli kalacak — dokunulmaz

| Dosya | Test | Neden |
|---|---|---|
| `admin-tabs.spec.ts` | "eşik sabitten okunur, elle yazılmaz" | Sabit kalıyor, yalnızca anlamı değişiyor |
| `admin-product-list.spec.ts` | "eşik kopyası yok" | Hâlâ geçerli ve değerli |
| `translation-gate.spec.ts` | `MIN_TRANSLATION_BODY_CHARS < MIN_LONG_DESCRIPTION_CHARS` | Çeviri eşiği (120) bağımsız; **değişmiyor** |

### 3.4 Eklenecek yeni testler

- Eşik altındaki açıklamayla ürün **yayına uygun** olur
- `SeoCriterion` listesinde `long_description_too_short` **yok**
- Panel metni "zorunlu" **demiyor**, "önerilen" diyor
- (D1 seçilirse) boş açıklama **hâlâ** engelliyor

---

## 4. Korunacak güvenlik şartları (değişmiyor)

| Şart | Durum |
|---|---|
| Parça numarası ve ad zorunlu | ✅ değişmiyor |
| **En az 1 doğrulanmış fotoğraf** | ✅ değişmiyor |
| **En az 1 doğrulanmış uyumluluk** | ✅ değişmiyor |
| Ürün aktif olmalı | ✅ değişmiyor |
| Sunucu tarafı 422 kapısı | ✅ değişmiyor |
| Toplu yayında kayıt başına kapı | ✅ değişmiyor |
| Doğrulanmamış fotoğraf public yüzeye çıkmaz | ✅ değişmiyor |
| Stok iddiası yasağı | ✅ değişmiyor |

---

## 5. Etkisi — sayılarla

| | Bugün | Değişiklikten sonra |
|---|---|---|
| Yayın kapısından geçebilecek ürün (fotoğraf turu sonrası) | 112 | **154** |
| "Açıklaması eksik" sayılan ürün | 45 | **0** (tavsiye dışı) |
| Fotoğraf hâlâ zorunlu | ✅ | ✅ |

Yani 42 ürün için hazırladığımız açıklamalar **yayın şartı olmaktan çıkar**;
kalite çalışması olarak sürer.

---

## 6. 20 taslak ve kalan 22 ürün

- Hazırlanan **20 taslak**, eşiği geçsin diye eklenmiş cümlelerden
  **arındırılacak**. Özellikle `60441-10300` ve `60563-00201` için
  uzatma baskısı kalkıyor.
- Kalan **22 ürün** aynı anlayışla hazırlanacak: doğru, özgün, müşteriye
  faydalı; **uzunluk hedefi değil, doğruluk hedefi**.

---

## 7. Onayınızı bekleyenler

| # | Karar | Önerim |
|---|---|---|
| 1 | Eşiğin yayın kapısından çıkarılması | **Evet** (talebiniz) |
| 2 | **Boş açıklama yine de engellensin mi?** | **D1 — evet, boş olamaz** |
| 3 | Filtre etiketi dili | `300'ün altında` / `300 ve üzeri` |
| 4 | `publishReadiness` puanında açıklama terimi | Kalsın, "içerik olgunluğu" olarak |
| 5 | Sabitin yeni adı | `ONERILEN_ACIKLAMA_KARAKTERI` |
