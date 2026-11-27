# Grup 4 — Açıklama Taslakları ve Nihai Metinler (İNCELEME İÇİN)

**Tarih:** 2026-11-24 · **Durum:** taslak · **veritabanına yazılmadı**

> Grup 1, 2 ve 3'ün onaylı metinlerine **dokunulmadı** (28/42 onaylı).
> Grup 5'e geçilmedi. Veritabanı yazma, commit, deploy, ürün aktifleştirme
> ve SEO yayını **yok**; tüm sorgular salt okunur.

## Grup 4 neden bu 7 ürün

| Ürün | Aile |
|---|---|
| `C0210-42010` · `N1455-22050` · `N2515-22000` | Daire döndürme çiziminin (`G030.00.01`) bağlantı elemanları |
| `N010232438` · `N030810015` · `N1035-20150` | Standart ölçü tanımlı cıvata ve pullar |
| `69404-02600` | Şanzıman baskı plakası — 42 ürünün **en geniş ad çakışması** |

Altısının kaynak kaydında `sistem` alanı **“Bağlantı elemanları”**,
`69404-02600`'de **“Güç aktarımı”**. Yedisinin tamamı **HİDROMEK HMK 600MG**
ve her birinin **1 uyumluluk kaydı doğrulanmış** durumda (ölçüldü).

## Bu grubun asıl problemi: ayırt edilemez standart parçalar

Cıvata, somun ve pul gibi standart parçalarda ürün adı neredeyse hiç ayırt
edici değil. Üç ayrı çakışma tipi çıktı:

| Tip | Kapsam |
|---|---|
| **Aynı ad, üç parça** | “Şanzıman baskı plakası”: `69404-02600`, `60325-01300` (Grup 1'de onaylı), `69241-00901` (Mitsubishi MG430) |
| **Aynı ad, iki parça** | “Yaylı pul”: `N2515-22000` ve `F2515-14000` |
| **Aynı çizimde iki benzer kalem** | `G030.00.01` k.19 “Daire döndürme somunu” ↔ k.33 “Somun” (`N2305-22000`) |

## Montaj grubu doğrulanamayan ÜÇ ürün

Grup 3'te uygulanan kural burada da korundu: çizimin hangi montaj grubunu
kapsadığı kayıttan doğrulanamıyorsa **grup adı yazılmaz**.

| Ürün | Çizim | Kayıtta bulunan kalem sayısı | Sonuç |
|---|---|---|---|
| `N010232438` | `E090.01.01` | 1 (yalnızca kendisi) | grup adı yazılmadı |
| `N030810015` | `G040.00.01` | 1 (yalnızca kendisi) | grup adı yazılmadı |
| `N1035-20150` | `D030.00.01` | 3 (aşınma bandı + ayar pulu) | grup adını doğrulamaya yetmiyor, yazılmadı |

Grup adı yazılan dört ürün: `G030.00.01` = daire döndürme (Grup 1–2'de
doğrulanmıştı), `E160.00.02` = şanzıman (komşu kalem adlarından doğrulandı).

## Uygulanan kurallar

1. 300 karakter zorunluluğu yok; uzunluk ihtiyaca göre.
2. Dolgu ve genel SEO cümlesi yok.
3. **Ölçü ve standart tanımları ürün adının kendisinden** alındı
   (`M10×20`, `ISO 4017`, `M20×150`, `300HV`). Hiçbir ölçüm yapılmadı;
   malzeme, sertlik yorumu, tork ve adet yazılmadı — kaynak kayıtta `olcu`
   ve `malzeme` alanları yedi ürünün hepsinde boş.
4. **Sayısal katalog iddiası yok** (Grup 3 düzeltmesiyle aynı çizgi):
   “birden fazla”, “başka kayıtlar da var” denildi, sayı verilmedi.
5. Depo kaydındaki serbest metinler (ör. `N010232438` için
   “KAPLİN CİVATALARI”) **kullanılmadı** — katalog kalemiyle eşleştiği
   doğrulanamıyor.

---

## Nihai açıklamalar — 7 ürünün tamamı

| Parça No | Ürün Adı | Çizim · Kalem | Kar. | Nihai açıklama |
|---|---|---|---|---|
| `C0210-42010` | Daire döndürme somunu | `G030.00.01` · 19 | 280 | HMK 600MG greyderin daire döndürme grubundaki somundur; HİDROMEK kataloğunda G030.00.01 numaralı çizimin 19. kalemidir. Aynı çizimin 33. kalemi yalnızca “Somun” adıyla kayıtlıdır ve N2305-22000 numarasını taşır; iki kalem ayrı parçalardır. Sipariş C0210-42010 numarasıyla verilir. |
| `N1455-22050` | Daire döndürme saplaması | `G030.00.01` · 31 | 310 | Daire döndürme saplaması, HMK 600MG greyderin daire döndürme grubunda kullanılır. HİDROMEK kataloğunda G030.00.01 numaralı çizimde 31. kalem olarak kayıtlıdır; hemen ardından 32. kalem N2515-22000 yaylı pul, 33. kalem N2305-22000 somun gelir. Katalogdaki benzer adlı CH 24323 daire saplaması ayrı bir parçadır. |
| `N2515-22000` | Yaylı pul | `G030.00.01` · 32 | 306 | HİDROMEK kataloğunda G030.00.01 numaralı daire döndürme çiziminin 32. kalemi olan yaylı puldur; makine HMK 600MG'dir. Önündeki 31. kalem N1455-22050 daire döndürme saplamasıdır. Katalogda aynı adı taşıyan ikinci bir yaylı pul daha vardır (F2515-14000); ayrım parça numarasından ve çizim kaleminden yapılır. |
| `N010232438` | M10×20 ISO 4017 cıvata | `E090.01.01` · 20 | 301 | ISO 4017 standardında M10×20 cıvata. HMK 600MG kataloğunda E090.01.01 numaralı çizimin 20. kalemi olarak kayıtlıdır. İncelenen katalog kayıtlarında birden fazla cıvata bulunmaktadır; bu kayıt standart tanımı ve ölçüsüyle ayrılır. Çizimin kapsadığı montaj grubu kayıtta geçmediği için belirtilmemiştir. |
| `N030810015` | M10 300HV pul | `G040.00.01` · 2 | 279 | HMK 600MG için kayıtlı M10 puldur; katalog adında 300HV tanımı geçer. HİDROMEK kataloğunda G040.00.01 numaralı çizimin 2. kalemidir. Katalogdaki diğer pul kayıtlarından ölçüsü ve bu tanımla ayrılır. Çizimin hangi montaj grubunu kapsadığı kayıttan doğrulanamadı, tahmin yazılmadı. |
| `N1035-20150` | M20×150 cıvata | `D030.00.01` · 19 | 288 | M20×150 cıvata, HMK 600MG kataloğunda D030.00.01 numaralı çizimin 19. kalemidir. Aynı çizimde 11. kalem 60482-00500 aşınma bandı, 14. kalem 61382-01000 3,2 mm ayar pulu olarak kayıtlıdır. Katalogdaki diğer cıvatalardan M20×150 ölçüsüyle ayrılır; çizimin montaj grubu adı kayıtta geçmiyor. |
| `69404-02600` | Şanzıman baskı plakası | `E160.00.02` · 19 | 364 | HMK 600MG şanzımanının baskı plakasıdır; HİDROMEK kataloğunda E160.00.02 numaralı çizimin 19. kalemidir. Aynı çizimde 10. kalem 60525-01700 birinci kademe şanzıman taşıyıcısı, 11. kalem 60525-12300 şanzıman merkez milidir. Katalogda aynı adı taşıyan başka kayıtlar da var: 60325-01300, E160.00.01 çiziminin 2. kalemi; 69241-00901 ise Mitsubishi MG430 için kayıtlı. |

Yedisinin tamamı **HİDROMEK · HMK 600MG**, hepsinde doğrulanmış uyumluluk
kaydı var.

---

## Ürün ürün dayanak

### `C0210-42010` — Daire döndürme somunu

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · G030.00.01, kalem 19` |
| **Montaj grubu iddiası** | daire döndürme (doğrulandı) |
| **Mevcut (DB)** | 160 karakter |
| **Önerilen** | **280 karakter** |

**Mevcut açıklama:**
> C0210-42010 referanslı daire döndürme somunu, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG greyderin daire döndürme grubundaki somundur; HİDROMEK kataloğunda G030.00.01 numaralı çizimin 19. kalemidir. Aynı çizimin 33. kalemi yalnızca “Somun” adıyla kayıtlıdır ve N2305-22000 numarasını taşır; iki kalem ayrı parçalardır. Sipariş C0210-42010 numarasıyla verilir.

**Dayanak:** Çizim/kalem kaynak kayıttan. `G030.00.01 = daire döndürme` Grup 1–2'de doğrulanmıştı. Aynı çizimin 33. kalemi `N2305-22000` “Somun” — kaynak kayıtta teyitli, veritabanında da mevcut. Ad çakışması yok, ancak **aynı çizimde iki somun kalemi** var; ayrım bu yüzden yazıldı.

### `N1455-22050` — Daire döndürme saplaması

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · G030.00.01, kalem 31` |
| **Montaj grubu iddiası** | daire döndürme (doğrulandı) |
| **Mevcut (DB)** | 163 karakter |
| **Önerilen** | **310 karakter** |

**Mevcut açıklama:**
> N1455-22050 referanslı daire döndürme saplaması, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> Daire döndürme saplaması, HMK 600MG greyderin daire döndürme grubunda kullanılır. HİDROMEK kataloğunda G030.00.01 numaralı çizimde 31. kalem olarak kayıtlıdır; hemen ardından 32. kalem N2515-22000 yaylı pul, 33. kalem N2305-22000 somun gelir. Katalogdaki benzer adlı CH 24323 daire saplaması ayrı bir parçadır.

**Dayanak:** Komşu kalemler 32 ve 33 kaynak kayıttan. **Benzer ad:** `CH 24323` “Daire saplaması” — veritabanında ayrı kayıt; makinesi iddia edilmedi, yalnızca ayrı parça olduğu yazıldı.

### `N2515-22000` — Yaylı pul

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · G030.00.01, kalem 32` |
| **Montaj grubu iddiası** | daire döndürme (doğrulandı) |
| **Mevcut (DB)** | 148 karakter |
| **Önerilen** | **306 karakter** |

**Mevcut açıklama:**
> N2515-22000 referanslı yaylı pul, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HİDROMEK kataloğunda G030.00.01 numaralı daire döndürme çiziminin 32. kalemi olan yaylı puldur; makine HMK 600MG'dir. Önündeki 31. kalem N1455-22050 daire döndürme saplamasıdır. Katalogda aynı adı taşıyan ikinci bir yaylı pul daha vardır (F2515-14000); ayrım parça numarasından ve çizim kaleminden yapılır.

**Dayanak:** **Ad çakışması:** `F2515-14000` de “Yaylı pul” adını taşıyor (veritabanında teyitli, aynı makine HMK 600MG). O kaydın açıklamasında çizim kalemi geçmiyor, bu yüzden *onun* kalemi hakkında iddia yazılmadı; ayrım parça numarası üzerinden kuruldu.

### `N010232438` — M10×20 ISO 4017 cıvata

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · E090.01.01, kalem 20` |
| **Montaj grubu iddiası** | YOK — belirlenemedi |
| **Mevcut (DB)** | 160 karakter |
| **Önerilen** | **301 karakter** |

**Mevcut açıklama:**
> N010232438 referanslı m10×20 iso 4017 cıvata, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> ISO 4017 standardında M10×20 cıvata. HMK 600MG kataloğunda E090.01.01 numaralı çizimin 20. kalemi olarak kayıtlıdır. İncelenen katalog kayıtlarında birden fazla cıvata bulunmaktadır; bu kayıt standart tanımı ve ölçüsüyle ayrılır. Çizimin kapsadığı montaj grubu kayıtta geçmediği için belirtilmemiştir.

**Dayanak:** **Çizim grubu iddiası YOK:** `E090.01.01` çiziminden kayıtta başka kalem bulunmadı. Standart adı ve ölçü **ürün adının kendisinden** gelir, ölçüm değildir. Depo kaydındaki “KAPLİN CİVATALARI” ifadesi **kullanılmadı** — hangi kaplin olduğu doğrulanamıyor.

### `N030810015` — M10 300HV pul

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · G040.00.01, kalem 2` |
| **Montaj grubu iddiası** | YOK — belirlenemedi |
| **Mevcut (DB)** | 151 karakter |
| **Önerilen** | **279 karakter** |

**Mevcut açıklama:**
> N030810015 referanslı m10 300hv pul, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG için kayıtlı M10 puldur; katalog adında 300HV tanımı geçer. HİDROMEK kataloğunda G040.00.01 numaralı çizimin 2. kalemidir. Katalogdaki diğer pul kayıtlarından ölçüsü ve bu tanımla ayrılır. Çizimin hangi montaj grubunu kapsadığı kayıttan doğrulanamadı, tahmin yazılmadı.

**Dayanak:** **Çizim grubu iddiası YOK:** `G040.00.01`'den kayıtta tek kalem var. `300HV` bir yorum olmadan, **adında geçen tanım** olarak verildi (sertlik sınıfı yorumu yazılmadı).

### `N1035-20150` — M20×150 cıvata

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · D030.00.01, kalem 19` |
| **Montaj grubu iddiası** | YOK — belirlenemedi |
| **Mevcut (DB)** | 153 karakter |
| **Önerilen** | **288 karakter** |

**Mevcut açıklama:**
> N1035-20150 referanslı m20×150 cıvata, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> M20×150 cıvata, HMK 600MG kataloğunda D030.00.01 numaralı çizimin 19. kalemidir. Aynı çizimde 11. kalem 60482-00500 aşınma bandı, 14. kalem 61382-01000 3,2 mm ayar pulu olarak kayıtlıdır. Katalogdaki diğer cıvatalardan M20×150 ölçüsüyle ayrılır; çizimin montaj grubu adı kayıtta geçmiyor.

**Dayanak:** Komşu kalemler 11 ve 14 kaynak kayıttan, ikisi de veritabanında mevcut. **Grup adı iddia edilmedi:** iki komşu kalem (aşınma bandı + ayar pulu) bir grup adını doğrulamaya yetmiyor.

### `69404-02600` — Şanzıman baskı plakası

| | |
|---|---|
| **Çizim / kalem** | `HMK6 · E160.00.02, kalem 19` |
| **Montaj grubu iddiası** | şanzıman (doğrulandı) |
| **Mevcut (DB)** | 161 karakter |
| **Önerilen** | **364 karakter** |

**Mevcut açıklama:**
> 69404-02600 referanslı şanzıman baskı plakası, HİDROMEK parça kaydında bu tanımla yer alır. Sipariş için mevcut parça numarasını ve ilgili montajı karşılaştırın.

**Önerilen açıklama:**
> HMK 600MG şanzımanının baskı plakasıdır; HİDROMEK kataloğunda E160.00.02 numaralı çizimin 19. kalemidir. Aynı çizimde 10. kalem 60525-01700 birinci kademe şanzıman taşıyıcısı, 11. kalem 60525-12300 şanzıman merkez milidir. Katalogda aynı adı taşıyan başka kayıtlar da var: 60325-01300, E160.00.01 çiziminin 2. kalemi; 69241-00901 ise Mitsubishi MG430 için kayıtlı.

**Dayanak:** **Üç yönlü ad çakışması** (42 ürünün en geniş çakışması): `60325-01300` (Grup 1'de onaylı, HMK 600MG · E160.00.01 k.2) ve `69241-00901` (**Mitsubishi MG430** — farklı üretici ve makine, ayrım en keskin burada). `E160.00.02 = şanzıman`, komşu kalemlerin adlarından doğrulandı (“birinci kademe şanzıman taşıyıcısı”, “şanzıman merkez mili”).

---

## Karakter özeti

| Parça No | Mevcut | Önerilen |
|---|---|---|
| `C0210-42010` | 160 | **280** |
| `N1455-22050` | 163 | **310** |
| `N2515-22000` | 148 | **306** |
| `N010232438` | 160 | **301** |
| `N030810015` | 151 | **279** |
| `N1035-20150` | 153 | **288** |
| `69404-02600` | 161 | **364** |

En kısa **279**, en uzun **364**, ortalama **304** karakter.

## Şablon denetimi

7 metnin **21 ikili kombinasyonu** ölçüldü. En yakın dört çift:

| Çift | Benzerlik |
|---|---|
| `C0210-42010` ↔ `N1455-22050` | 41% |
| `C0210-42010` ↔ `N2515-22000` | 29% |
| `N1455-22050` ↔ `N2515-22000` | 27% |
| `C0210-42010` ↔ `N030810015` | 25% |

Tavan **41%** (Grup 2 eşiği %65). %65 üstü çift: **0**.
