# Grup 3 — Açıklama Taslakları (İNCELEME İÇİN)

**Tarih:** 2026-11-24 · **Durum:** taslak · **veritabanına yazılmadı**

> Grup 1 ve Grup 2'nin onaylı metinlerine **dokunulmadı**.
> Grup 4 ve Grup 5'e geçilmedi — onayınız bekleniyor.
> Veritabanı yazma, commit, deploy, ürün aktifleştirme ve SEO yayını **yok**.

## Grup 3 neden bu 8 ürün

Kalan 22 ürün, inceleme kolaylığı için **parça ailesine göre** bölündü.
Grup 3'ün tamamı **sızdırmazlık elemanı** (kaynak kayıtta `sistem` alanı =
“Sızdırmazlık”) ve 42 ürünün **en zor iki ayırt etme problemi** bu grupta:

| Problem | Kapsam |
|---|---|
| “O-ring” adlı **7** ayrı parça | 4'ü bu grupta; biri (`60463-00400`) Grup 1'de onaylı |
| “Dış piston keçesi” adlı **2** ayrı parça | `69331-03400` (diferansiyel) ve `92525-03800` (şanzıman) — ikisi de bu grupta |

Grup 4 (7 ürün: daire döndürme bağlantı elemanları + şanzıman plakası) ve
Grup 5 (7 ürün: Komatsu WA320-3MC + Volvo greyderler) onayınızdan sonra.

## Başlangıç noktası: 8 ürünün mevcut açıklaması aynı kalıp

Veritabanındaki mevcut metinlerin hepsi tek şablondan üretilmiş; yalnızca
parça numarası ve ad değişiyor:

> *"&lt;parça no&gt; referanslı &lt;ad&gt;, HİDROMEK parça kaydında bu tanımla yer alır.
> Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın."*

Dört O-ring için bu metin **birbirinin kopyası** — müşteri hangisinin hangi
montaja ait olduğunu anlayamıyor. Grup 3'ün asıl işi bu.

## Uygulanan kurallar

1. 300 karakter zorunluluğu **yok** — metinler 209–333 karakter. Uzunluk
   ihtiyaca göre: iki yönlü çakışma taşıyan kayıt uzun, tek çizim bilgisi
   olan kayıt kısa.
2. Dolgu ve genel SEO cümlesi yok; Grup 2'de kaldırılan beş kalıp burada
   hiç kullanılmadı.
3. Yalnızca kayıtlı gerçekler: ad, üretici, makine, çizim, kalem, komşu
   kalemler. **Ölçü, malzeme, sertlik, sıcaklık, tork yazılmadı** — kaynak
   kayıtta `olcu` ve `malzeme` alanları 8 ürünün hepsinde boş.
4. Aynı adlı parçalar **açıkça** ayırt edildi, karşılıklı atıfla.
5. Makine uyumluluğu: 8 ürünün tamamı **HİDROMEK HMK 600MG**, hepsi
   veritabanında **doğrulanmış** uyumluluk kaydı.

## Doğrulanamayan bir iddia yazılmadı

`C5563-70280` için `E130.00.01` ve `N3153-06500` için `E110.00.01`
çizimlerinin hangi montaj grubunu kapsadığı **belirlenemedi** (kayıtta
yeterli komşu kalem yok). Bu iki metne grup adı **yazılmadı**; çizim ve
kalem numarası olduğu gibi verildi.

---

## `69331-03400` — Dış piston keçesi

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E120.00.01, kalem 23` |
| **Mevcut (DB)** | 156 karakter |
| **Önerilen** | **333 karakter** |

**Mevcut açıklama:**
> 69331-03400 referanslı dış piston keçesi, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG greyderin diferansiyel grubundaki dış piston keçesidir; HİDROMEK kataloğunda E120.00.01 numaralı çizimin 23. kalemidir. Aynı çizimde 24. kalem 69331-03500 iç piston keçesi, 11. kalem ise 60332-01400 diferansiyel kilit pistonudur. Katalogda aynı adı taşıyan ikinci bir keçe daha var: 92525-03800, şanzıman çiziminde kayıtlı.

**Dayanak:** Çizim/kalem kaynak kayıttan. Komşu kalemler 24 ve 11 veritabanından teyitli. **Ad çakışması:** `92525-03800` de “Dış piston keçesi” adını taşıyor ama E160.00.01 (şanzıman) çizimine ait — ayrım montaj grubundan.

## `69331-03500` — İç piston keçesi

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E120.00.01, kalem 24` |
| **Mevcut (DB)** | 156 karakter |
| **Önerilen** | **265 karakter** |

**Mevcut açıklama:**
> 69331-03500 referanslı i̇ç piston keçesi, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> İç piston keçesi, HMK 600MG diferansiyel grubunda kullanılır. HİDROMEK kataloğunda E120.00.01 numaralı çizimde 24. kalem olarak kayıtlıdır; hemen öncesindeki 23. kalem 69331-03400 dış piston keçesidir. Aynı çizimde 11. kalem diferansiyel kilit pistonu olarak geçer.

**Dayanak:** Adı katalogda tektir, çakışma yok. Dış eşiyle (23. kalem) karşılıklı atıf kuruldu; iki kayıt birbirini anıyor.

## `92525-03800` — Dış piston keçesi

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E160.00.01, kalem 30` |
| **Mevcut (DB)** | 156 karakter |
| **Önerilen** | **282 karakter** |

**Mevcut açıklama:**
> 92525-03800 referanslı dış piston keçesi, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG şanzımanının dış piston keçesidir. HİDROMEK kataloğunda E160.00.01 numaralı çizimin 30. kalemidir. Dikkat: katalogda bu adla iki parça var — diğeri 69331-03400 ve diferansiyel çizimine (E120.00.01) aittir. Aynı çizimin 24. kalemi 62625-35901 dış debriyaj piston keçesidir.

**Dayanak:** **İki yönlü çakışma:** aynı adlı `69331-03400` (farklı çizim) ve benzer adlı `62625-35901` “Dış debriyaj piston keçesi” (aynı çizim, 24. kalem). Grup 2'de onaylanan `62625-35901` metni de bu kaydı anıyor — karşılıklı tutarlı.

## `N3012-08523` — Yağ keçesi

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E160.00.04, kalem 26` |
| **Mevcut (DB)** | 149 karakter |
| **Önerilen** | **230 karakter** |

**Mevcut açıklama:**
> N3012-08523 referanslı yağ keçesi, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG şanzıman grubunda kullanılan yağ keçesidir. HİDROMEK kataloğunda E160.00.04 numaralı çizimin 26. kalemidir; aynı çizimde 12. kalem 60525-05300 şanzıman giriş kapağı contası, 30. kalem ise N3153-05500 O-ring olarak geçer.

**Dayanak:** `E160.00.04` çiziminin şanzımana ait olduğu, içindeki “Şanzıman giriş kapağı contası” kaleminden doğrulandı — tahmin değil. Adı katalogda tektir.

## `C5563-70280` — O-ring

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E130.00.01, kalem 20` |
| **Mevcut (DB)** | 145 karakter |
| **Önerilen** | **222 karakter** |

**Mevcut açıklama:**
> C5563-70280 referanslı o-ring, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG için kayıtlı O-ring'lerden biridir; HİDROMEK kataloğunda E130.00.01 numaralı çizimin 20. kalemidir. İncelenen katalog kayıtlarında aynı adla birden fazla parça bulunmaktadır; ad tek başına ayırt etmeye yetmez.

**Dayanak:** **Çizim grubu iddiası YOK:** `E130.00.01` çiziminden kayıtta başka kalem bulunmadığı için hangi grubu kapsadığı belirlenemedi, yazılmadı. Yedi O-ring sayısı veritabanından sayıldı.

## `N3153-05500` — O-ring

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E160.00.04, kalem 30` |
| **Mevcut (DB)** | 145 karakter |
| **Önerilen** | **261 karakter** |

**Mevcut açıklama:**
> N3153-05500 referanslı o-ring, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG şanzıman grubunda kullanılan O-ring'dir; HİDROMEK kataloğunda E160.00.04 numaralı çizimin 30. kalemidir. Aynı çizimde 26. kalem N3012-08523 yağ keçesi, 12. kalem ise 60525-05300 şanzıman giriş kapağı contasıdır. Sipariş N3153-05500 parça numarasıyla ya da çizim ve kalem numarasıyla verilir.

**Dayanak:** `N3012-08523` ile aynı çizimde; iki kayıt karşılıklı atıf yapıyor. Çakışma uyarısı diğer O-ring metinlerinden farklı kurulmuş.

## `N3153-06500` — O-ring

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · E110.00.01, kalem 31` |
| **Mevcut (DB)** | 145 karakter |
| **Önerilen** | **209 karakter** |

**Mevcut açıklama:**
> N3153-06500 referanslı o-ring, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG kataloğunda E110.00.01 numaralı çizimin 31. kalemi olan O-ring'dir. Aynı çizimde 34. kalem 60431-02901 dişli pompa olarak kayıtlıdır. Katalogdaki diğer O-ring kayıtlarından çizim numarasıyla ayrılır.

**Dayanak:** `E110.00.01` için kayıtta yalnızca bir komşu var (dişli pompa); grup adı iddia edilmedi, kalem olduğu gibi yazıldı.

## `N3153-13000` — O-ring

| | |
|---|---|
| **Üretici / makine** | HİDROMEK · HMK 600MG (doğrulanmış) |
| **Çizim / kalem** | `HMK6 · G030.00.01, kalem 37` |
| **Mevcut (DB)** | 145 karakter |
| **Önerilen** | **306 karakter** |

**Mevcut açıklama:**
> N3153-13000 referanslı o-ring, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> Daire döndürme grubunun O-ring'idir; HİDROMEK kataloğunda G030.00.01 numaralı çizimin 37. kalemidir. Aynı çizimin hemen öncesindeki 36. kalemi de “O-ring” adıyla kayıtlıdır ve 60463-00400 numarasını taşır — iki komşu kalem, aynı ad, farklı parça. 18. kalem ise 44716-28500 daire döndürme O-ring contasıdır.

**Dayanak:** **En keskin çakışma:** `60463-00400` (Grup 1'de onaylı) ile **aynı çizimde ardışık kalemler** ve birebir aynı ad. `G030.00.01` = daire döndürme, Grup 1/2'de doğrulanmıştı.

---

## Özet

| Parça No | Ad | Çizim · Kalem | Mevcut | Önerilen |
|---|---|---|---|---|
| `69331-03400` | Dış piston keçesi | `E120.00.01` · 23 | 156 | **333** |
| `69331-03500` | İç piston keçesi | `E120.00.01` · 24 | 156 | **265** |
| `92525-03800` | Dış piston keçesi | `E160.00.01` · 30 | 156 | **282** |
| `N3012-08523` | Yağ keçesi | `E160.00.04` · 26 | 149 | **230** |
| `C5563-70280` | O-ring | `E130.00.01` · 20 | 145 | **222** |
| `N3153-05500` | O-ring | `E160.00.04` · 30 | 145 | **261** |
| `N3153-06500` | O-ring | `E110.00.01` · 31 | 145 | **209** |
| `N3153-13000` | O-ring | `G030.00.01` · 37 | 145 | **306** |

En kısa **209**, en uzun **333**, ortalama **263** karakter.

## Şablon denetimi

8 metnin **28 ikili kombinasyonu** ölçüldü. En yakın dört çift:

| Çift | Benzerlik |
|---|---|
| `69331-03400` ↔ `69331-03500` | 43% |
| `69331-03400` ↔ `92525-03800` | 34% |
| `92525-03800` ↔ `C5563-70280` | 32% |
| `69331-03500` ↔ `92525-03800` | 30% |

Tavan **43%**. Grup 2'de uygulanan eşik (%65) korundu: dört O-ring
metninin her biri **farklı bir çizimden, farklı bir komşu kalemden ve
farklı kurulmuş bir çakışma uyarısından** oluşuyor.

---

## Düzeltme — 2026-11-24 (kullanıcı onayıyla)

Onay iki küçük düzeltme şartıyla verildi; yalnızca bu iki metin değişti,
diğer altısına dokunulmadı.

| Ürün | Değişiklik |
|---|---|
| `N3153-05500` | Doğrulanmış makine adı (HMK 600MG, şanzıman grubu) eklendi. *"yalnızca çizim ve kalem numarasıyla ayırt edilir"* ifadesi düzeltildi: parça numarası da ayırt edicidir. 261 → 301 karakter |
| `C5563-70280` | *"yedi ayrı parça numarası kayıtlıdır"* sayısal iddiası, *"İncelenen katalog kayıtlarında aynı adla birden fazla parça bulunmaktadır"* ifadesiyle değiştirildi. 222 → 219 karakter |

Düzeltilmiş metinler onaylı içerik olarak `17-ACIKLAMA-TASLAKLARI-42.md`
dosyasına yazıldı. **Veritabanına hâlâ yazılmadı.**
