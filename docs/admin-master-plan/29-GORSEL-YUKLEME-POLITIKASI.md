# Görsel Yükleme Politikası

**Tarih:** 2026-11-26 · **Durum:** politika belgesi · **kod değiştirilmedi**

> Karar: **Cloudinary ile devam.** Sağlayıcı değiştirilmiyor, yeni servis
> satın alınmıyor, veri taşınmıyor. Bu belge, mevcut Cloudinary altyapısı
> üzerinde uygulanacak **yükleme standartlarını** tanımlar.
>
> Cloudflare R2 alternatifi §6'da ileride değerlendirilmek üzere saklanmıştır.

---

## 1. Neden bu politika — ölçülen tek rakam

| | Ham telefon fotoğrafı | Yükleme öncesi küçültme |
|---|---|---|
| Fotoğraf başına depolanan (orijinal + türevler) | **2,8 MB** | **0,45 MB** |
| 50.000 ürün × 1 fotoğraf | 136,7 GB → Cloudinary **Plus $99/ay** | 22,0 GB → **Ücretsiz paket** |
| 5.000 ürün × 3 fotoğraf | 41,0 GB → **Plus $99/ay** | 6,6 GB → **Ücretsiz paket** |
| 50.000 ürün × 5 fotoğraf | 683,6 GB → **Advanced'ı da aşar** | 109,9 GB → Plus $99/ay |

**6,2 kat fark.** Sağlayıcı seçiminden daha belirleyicidir: hangi sağlayıcıya
geçilirse geçilsin, ham dosya yüklenirse maliyet 6,2 katı olur.

**Zamanlama kritik:** bu politika **toplu yüklemeden ÖNCE** uygulanmalıdır.
Sonradan uygulanırsa 6,2 kat fazla depolama zaten ödenmiş olur ve mevcut
dosyaların yeniden işlenmesi gerekir.

---

## 2. Mevcut durum (ölçüldü, 2026-11-26)

`src/lib/cloudinary.ts` içindeki yükleme çağrısı:

```ts
cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, …)
```

| | Bugün |
|---|---|
| Boyut sınırlaması | **yok** — orijinal ne ise o yüklenir |
| Format dönüşümü | **yok** |
| Kalite ayarı | **yok** |
| Dosya başına üst sınır | 50 MB (`MAX_BYTES`, `images/route.ts`) |
| Ürün başına fotoğraf | 10 (`MAX_IMAGES`) |
| Public yüzeye çıkma şartı | `isPrimary && verified` (karar K2) |

Yani **şu an hiçbir küçültme uygulanmıyor**: 8 MP bir telefon fotoğrafı
olduğu gibi saklanıyor.

---

## 3. Politika

### 3.1 Ürün fotoğrafı — zorunlu standartlar

| Alan | Değer | Gerekçe |
|---|---|---|
| **En uzun kenar** | **maks 1600 px** | Detay sayfasının en büyük sunum boyu ~1200 px; 1600 px yakınlaştırma payı bırakır |
| **Format (depolanan)** | **WebP** | Cloudinary ve `next/image` ikisi de üretir; JPEG'e göre ~%30 küçük |
| **Kalite** | **q80** | 80 altında parça yüzeyindeki doku kaybı gözle görünür hâle geliyor |
| **Dosya boyutu hedefi** | **≤ 400 KB** | 0,45 MB/foto bütçesinin orijinal payı |
| **Dosya başına sert üst sınır** | **8 MB** (50 MB'den düşürülür) | 1600 px WebP hiçbir koşulda 8 MB olmaz; daha büyüğü yanlış dosyadır |
| **En küçük kabul** | **800 px** en uzun kenar | Daha küçüğü detay sayfasında bulanık |
| **Ürün başına** | **1 zorunlu + 4 isteğe bağlı** (üst sınır 10 korunur) | 1 fotoğraf ücretsiz pakette kalır; 5'e kadar büyüme payı |
| **ALT metni** | zorunlu, parça no + ad içerir | Mevcut şart korunur |
| **Doğrulama** | `verified` olmadan public yüzeye **çıkmaz** | Karar K2, değişmez |

### 3.2 Nerede uygulanır — iki katman

**Katman 1 — sunucu tarafı (tek güvenilir nokta).** `uploadToCloudinary()`
çağrısına dönüşüm eklenir. Cloudinary bunu yükleme anında uygular, yani
**depolanan orijinal** küçültülmüş olur:

```ts
// ÖNERİ — henüz uygulanmadı, onay bekliyor
cloudinary.uploader.upload_stream({
  folder,
  resource_type: "image",
  transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  format: "webp",
  quality: 80,
}, …)
```

`crop: "limit"` küçük görseli **büyütmez**, yalnızca büyük olanı küçültür.

**Katman 2 — tarayıcı tarafı (isteğe bağlı, bant genişliği için).** Yükleme
ekranında `canvas` ile ön küçültme: 8 MB yerine ~400 KB yüklenir. Yavaş
bağlantıda toplu yüklemeyi hızlandırır; **güvenlik veya maliyet için
gerekli değildir** çünkü Katman 1 zaten sınırlıyor.

### 3.3 Sunum tarafı (değişmez)

Public sayfalarda görsel `next/image` üzerinden sunulur; WebP/AVIF seçimi ve
responsive boyutlar orada üretilir. Bu politika **depolanan** dosyayı
tanımlar, sunulan türevi değiştirmez.

---

## 4. Teknik çizim ve PDF

| | Politika |
|---|---|
| **Teknik çizim** (parça patlatma şeması) | PNG/WebP, maks 2000 px, q85 — çizgi netliği fotoğraftan daha kritik |
| **PDF katalog sayfası** | Olduğu gibi saklanır; dönüştürülmez |
| **Nerede durur** | **Şimdilik Cloudinary** (karar: sağlayıcı değiştirilmiyor) |

**Ölçülen not:** PDF ve teknik çizimler Cloudinary'nin dönüşüm yeteneğini
**hiç kullanmaz** — oradaki değeri sıfırdır, yalnızca depolama tüketirler.
50.000 ürün ölçeğinde toplam **17,1 GB** (çizim 9,8 + PDF 7,3), Cloudinary'de
**17,1 kredi/ay**, R2'de **$0,26/ay**. Eşik aşılırsa taşınacak **ilk** kalem
budur (§6).

---

## 5. Toplu yükleme öncesi kontrol listesi

| # | Kontrol | Durum |
|---|---|---|
| 1 | Katman 1 dönüşümü `cloudinary.ts`'e eklendi | ⏸ **onay bekliyor** |
| 2 | `MAX_BYTES` 50 MB → 8 MB | ⏸ onay bekliyor |
| 3 | 800 px alt sınır doğrulaması eklendi | ⏸ onay bekliyor |
| 4 | 5 örnek fotoğrafla ölçüm: yüklenen bayt vs depolanan bayt | ⏸ |
| 5 | Mevcut 2 fotoğrafın boyutu ölçüldü (karşılaştırma çizgisi) | ⏸ |
| 6 | Cloudinary panelinde kredi kullanımı not edildi | ⏸ **kullanıcı** |

> 4. ve 5. adımlar olmadan politikanın işe yaradığı **iddia edilmez**:
> 0,45 MB/foto rakamı bu projede ölçülmedi, sektör tipik değeridir.

---

## 6. İleride değerlendirilmek üzere: Cloudflare R2

**Şimdi yapılmıyor.** Aşağıdaki bilgi, eşik aşıldığında kararın yeniden
alınabilmesi için saklanmıştır.

### 6.1 Tetikleyici eşik

Cloudinary ücretsiz paketi **25 kredi/ay**'dır (1 kredi ≈ 1 GB depolama veya
1 GB aktarım veya 1.000 dönüşüm). Küçültme politikasıyla:

| Senaryo | Kredi/ay | Paket |
|---|---|---|
| 5.000 × 1 foto | 2 | Ücretsiz |
| 5.000 × 3 foto | 7 | Ücretsiz |
| 50.000 × 1 foto | 22 | Ücretsiz (sınırın %88'i) |
| 50.000 × 3 foto | 66 | **Plus $99/ay** |

**Karar noktası:** 50.000 ürün × 1 fotoğrafta kredi 22'ye çıkar. Oraya
yaklaşıldığında (≥ 18 kredi/ay) bu bölüm yeniden açılır.

### 6.2 Taşınacak sıra

1. **PDF + teknik çizim** (dönüşüm gerektirmez, R2'de $0,26/ay, egress bedava)
2. Ürün fotoğraflarının **orijinalleri** (türevler `next/image`'da üretilir)
3. Hiçbir koşulda: sunum katmanı — `next/image` kalır

### 6.3 Neden Cloudflare Images değil, R2 + `next/image`

| | Cloudflare Images | Vercel `next/image` |
|---|---|---|
| Dönüşüm birim fiyatı | $0,50 / 1.000 benzersiz | $0,05 – $0,081 / 1.000 (plana göre) |
| 1.000 ziyaretçi/gün senaryosu | **$105,50/ay** | **$10,55 – $17,13/ay** |

Dönüşüm maliyeti **trafiğe** bağlıdır, katalog boyutuna değil — bu yüzden
sağlayıcı seçiminde depolama fiyatı değil, dönüşüm birim fiyatı belirleyici.

### 6.4 Sağlayıcı bağımlılığı

| | Cloudinary | R2 |
|---|---|---|
| Veri çıkarma | API ile mümkün, URL'ler değişir | S3 uyumlu, standart araçlar |
| URL'ler DB'de | `product_images.cloudinary_url` | Taşınırsa bu kolon güncellenmeli |
| Geri dönüş | Mümkün | Mümkün |

Taşıma, `product_images.cloudinary_url` kolonundaki her satırın yeniden
yazılmasını gerektirir — yani bir **migration + veri dönüşümü** işidir, tek
seferlik ve geri alınabilir, ama bedelsiz değil.
