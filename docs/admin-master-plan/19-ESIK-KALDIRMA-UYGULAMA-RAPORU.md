# 300 Karakter Şartının Kaldırılması — Uygulama ve Dağıtım Öncesi Rapor

**Tarih:** 2026-11-20 · **Durum:** kod + test tamam, **dağıtılmadı**

> **Yapılmayanlar:** commit yok, push yok, deploy yok. Production
> veritabanında **hiçbir yazma** yapılmadı. Hiçbir ürün aktifleştirilmedi,
> SEO onayı verilmedi, katalog açılmadı. Yedekler korundu.
> Bu rapordaki production sayıları **salt okunur** sorgularla ölçüldü.

---

## 1. Özet

Onayladığınız kural uygulandı:

| | Önce | Şimdi |
|---|---|---|
| Uzun açıklama **< 300 karakter** | **yayın engeli** | engel değil |
| Uzun açıklama **boş / yalnızca boşluk** | yayın engeli | **yayın engeli** (korundu) |
| 300 karakter | zorunlu alt sınır | **önerilen kalite hedefi** |
| Ölçüt kodu | `long_description_too_short` | `long_description_missing` |
| İngilizce çeviri gövde şartı (120) | bağımsız | **bağımsız, değişmedi** |

Doğrulama: `tsc` temiz · **514 test geçti, 0 başarısız** · lint baseline'ın
altında · `next build` başarılı · ISR koruması 31/31.

---

## 2. Kod değişiklikleri

### 2.1 Yayın kapısı — `src/lib/seo-gate.ts`

Tek bir `if` satırı engeli üretiyordu; onu değiştirmek engeli her yerden
kaldırdı (sunucu kapısı, tek ürün PATCH, toplu yayın, panel düğmesi):

```diff
-  if ((input.longDescription?.trim().length ?? 0) < MIN_LONG_DESCRIPTION_CHARS) {
-    unmet.push("long_description_too_short");
+  // İÇERİK ŞARTI: yalnızca BOŞLUK kontrolü. Uzunluk eşiği 2026-11-20'de
+  // kaldırıldı; kısa ama doğru bir açıklama yayına engel değildir.
+  if ((input.longDescription?.trim().length ?? 0) === 0) {
+    unmet.push("long_description_missing");
```

Sabit `ONERILEN_ACIKLAMA_KARAKTERI = 300` olarak yeniden adlandırıldı ve
belgesine *"bu bir yayın şartı değildir"* yazıldı.

**Plandan sapma (gerekçeli):** planda eski adın `@deprecated` takma ad olarak
bırakılması öneriliyordu. Bırakılmadı — kodda **tek bir çağıranı kalmadı** ve
`MIN_` öneki artık bir alt sınır olmadığı için doğrudan yanıltıcıydı. P8
bulgusunun kök nedeni tam olarak bu tür bir isim/anlam kaymasıydı.

Operatöre gösterilen yeni gerekçe metni:

> Uzun açıklama boş. Sayfanın gövdesi için en az birkaç cümlelik benzersiz,
> Türkçe bir metin gerekir. Uzunluk sınırı yoktur; 300 karakter yalnızca
> önerilen hedeftir.

### 2.2 Ürün düzenleme ekranı

Sayaç **iki durumlu** hâle geldi; "engel" ile "hedefe uzaklık" artık
karışmıyor:

| Açıklama | Gösterim |
|---|---|
| 0 karakter | kehribar: *"0 karakter — yayın için açıklama **boş olamaz**. Uzunluk sınırı yoktur."* |
| 1–299 | nötr: *"N karakter — önerilen hedef 300 karakter (zorunlu değil)"* |
| ≥ 300 | nötr: *"N karakter"* |

### 2.3 Liste ucu — `api/admin/products/route.ts`

- Açıklama filtresi **duruyor** ama artık bir **kalite görünümü**; kodda
  "yayın uygunluğu değildir" uyarısıyla belgelendi.
- `publishReadiness` puanının açıklama terimi **kapıyla aynı ölçüte** çekildi:
  `length(btrim(coalesce(long_description,''))) > 0`. Yani puan artık
  gerçekten yayına hazırlığı ölçüyor; eskiden 299 karakterlik dolu bir
  açıklama puan vermiyordu.

### 2.4 Filtre etiketi — `ProductFilterBar.tsx`

`Eksik (<300)` / `Yeterli` → **`300'ün altında`** / **`300 ve üzeri`**.
Yargı bildiren dil kalktı.

---

## 3. Testler

**514 test geçti, 0 başarısız** (önce 511; net +3).

### 3.1 Güncellenen

| Dosya | Test | Değişiklik |
|---|---|---|
| `seo-gate.spec.ts` | "kısa açıklama eşiğin ALTINDA kalırsa uygun değil" | **ters çevrildi** → kısa açıklama artık yayınlanabilir |
| `seo-gate.spec.ts` | "migration sonrası TİPİK satır uygun DEĞİL" | beklenen ölçüt adı güncellendi |
| `category-tree.spec.ts` | "ölçüt listesinde kategori YOK" | ölçüt adı güncellendi |
| `admin-tabs.spec.ts` | P8 bloğu (4 test) | "zorunlu" dili → "tavsiye" dili |
| `translation-gate.spec.ts` | eşik bağımsızlığı | 120 kuralı **sabitlendi** |

### 3.2 Eklenen davranış testleri

| Test | Ne koruyor |
|---|---|
| "KISA açıklama yayını ENGELLEMEZ" | 28 ve 1 karakterlik açıklama yayına uygun; `unmet` boş |
| "BOŞ açıklama yayını ENGELLER" | `null`, `undefined`, `""` → `long_description_missing` |
| "yalnızca BOŞLUKtan oluşan açıklama boş sayılır" | üç ayrı boşluk biçimi engelli |
| "ölçüt listesinde uzunluk eşiği ARTIK YOK" | kapı gövdesinde sabit **kullanılmıyor** (kod yorumları çıkarılarak) |
| "BOŞ açıklama ayrı ve net uyarı alır" | ekran iki durumu ayırıyor |
| "metin ZORUNLU demiyor, ÖNERİLEN hedef diyor" | eski dil geri gelemez |

### 3.3 Mutasyon testi — testler gerçekten koruyor mu?

Testlerin kendi kendini onaylamadığını kanıtlamak için kod geçici olarak
bozuldu ve geri alındı:

| Mutasyon | Sonuç |
|---|---|
| Kapı `=== 0` → `< ONERILEN_ACIKLAMA_KARAKTERI` (eski davranış) | **2 test düştü** |
| Panel metni "boş olamaz" → "zorunlu" | **2 test düştü** |

Her iki dosya da yedekten birebir geri yüklendi; son durumda 514/514 geçiyor.

### 3.4 Çeviri kapısı — değişmedi

İsteğiniz üzerine **120 karakter kuralına dokunulmadı**. Test artık bunu
açıkça sabitliyor: `MIN_TRANSLATION_BODY_CHARS` **tam olarak 120** olmalı ve
ürün kapısının geçirdiği kısa gövdeyi çeviri kapısı **reddetmeye devam
ediyor**.

---

## 4. Değişikliğin gerçek etkisi (production, salt okunur)

`neondb` · 157 ürün:

| | Sayı |
|---|---|
| Uzun açıklaması **boş** | **3** |
| 1–299 karakter | **42** |
| ≥ 300 karakter | 112 |
| En kısa dolu açıklama | 142 karakter |
| Aktif ürün | **2** (değişmedi) |
| `seo_ready` ürün | **0** (değişmedi) |

### 4.1 İçerik şartını geçen ürün: 112 → **154**

42 ürün için açıklama uzatma baskısı kalktı.

### 4.2 Gerçek yayın kapısını geçen ürün: **0 → 0**

Bu kritik: kapının tamamı (aktiflik + parça no + ad + açıklama +
**doğrulanmış fotoğraf** + **doğrulanmış uyumluluk**) simüle edildiğinde
**önce de sonra da 0 ürün** geçiyor. Yani bu değişiklik **kendi başına
hiçbir ürünü yayına sokmuyor**.

**Düzeltme (2026-11-20, deploy sonrası doğrulama):** bu raporun ilk
sürümünde "hiçbir üründe doğrulanmış fotoğraf ve uyumluluk yok" yazıyordu.
Yanlıştı. Ölçülen gerçek durum:

| Kanıt | Sayı |
|---|---|
| Doğrulanmış fotoğraf (`product_images.verified`) | **0** |
| Doğrulanmış uyumluluk (`fitments.verified`) | **300** |

Uyumluluk kanıtı zaten var; kapıyı tek başına tutan şey **doğrulanmış
fotoğraf eksikliği**. Sonuç (0 → 0) değişmiyor ama gerekçe tek: fotoğraf
turu yayının **tek kalan** kapısıdır.

### 4.3 Boş açıklama koruması (D1) kimi tutuyor?

| Parça No | Ad | Aktif | Durum |
|---|---|---|---|
| `76281` | KIT | evet | açıklaması boş → **engelli** |
| `90898` | GAUDE | evet | açıklaması boş → **engelli** |
| `DENEMEE32424` | DESWFSEDF | hayır | açıklaması boş → engelli (dokunulmadı) |

D1 kararı somut işe yarıyor: kataloğun **canlıdaki iki aktif ürünü**
açıklamasız olduğu için hâlâ yayınlanamaz durumda. 300 şartı tamamen
kaldırılsaydı (D2) bu iki ürün içerik şartını geçerdi.

---

## 5. Değişmeyen güvenlik şartları

| Şart | Durum |
|---|---|
| Parça numarası ve ad zorunlu | değişmedi |
| En az 1 **doğrulanmış** fotoğraf | değişmedi |
| En az 1 **doğrulanmış** uyumluluk | değişmedi |
| Ürün aktif olmalı | değişmedi |
| Sunucu tarafı 422 kapısı | değişmedi |
| Toplu yayında kayıt başına kapı | değişmedi |
| Doğrulanmamış fotoğraf public yüzeye çıkmaz | değişmedi |
| Stok iddiası yasağı | değişmedi |
| Katalog toggle KAPALI | değişmedi |
| İngilizce çeviri 120 karakter | değişmedi |

---

## 6. Dağıtım öncesi kontrol sonuçları

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | **temiz** (0 hata) |
| `npm test` | **514 geçti / 0 başarısız** |
| `npm run lint` | **34 sorun** (19 hata, 15 uyarı) — baseline 38 (19/19), **artış yok** |
| `npm run build` | **başarılı**, 14.7 s |
| ISR yazma koruması | **31/31 rota süreyle eskimiyor** |
| Mutasyon testi | yeni testler regresyonu **yakalıyor** |
| Production yazma | **yapılmadı** |

### Dağıtım sonrası beklenen davranış

- Public yüzeyde **hiçbir değişiklik yok**: 2 aktif ürün, 0 `seo_ready`,
  katalog kapalı, sitemap 63 URL.
- Admin panelinde ürün düzenleme ekranındaki açıklama sayacının metni
  değişir; "Açıklama" filtresinin etiketleri değişir.
- Migration **gerekmiyor** — şema değişikliği yok, yalnızca uygulama kodu.
  Dolayısıyla "migration önce, kod sonra" sırası bu dağıtımda geçerli değil.

---

## 7. Sırada ne var

| # | İş | Durum |
|---|---|---|
| 1 | Bu değişikliğin commit + deploy'u | **onayınız bekliyor** |
| 2 | Grup 2'deki 10 açıklama taslağı | incelemeniz bekliyor |
| 3 | Kalan 22 ürünün açıklamaları | eşik baskısı olmadan hazırlanacak |
| 4 | SEO başlıkları incelemesi | açıklamalardan sonra |
| 5 | Fotoğraf turu (yayının **gerçek** kapısı) | ayrı onay |
| 6 | `HMK600MG` / `HMK 600MG` birleştirme | katalog teyidi bekliyor |
| 7 | `R6020-11521-0` "Hat" ad düzeltmesi | katalog teyidi bekliyor |
