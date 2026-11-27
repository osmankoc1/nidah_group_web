# Grup 2 — Sadeleştirilmiş Açıklamalar (İNCELEME İÇİN)

**Tarih:** 2026-11-23 · **Durum:** taslak · **veritabanına yazılmadı**

> Grup 1'in onaylı metinlerine **dokunulmadı**. Kalan 22 ürüne geçilmedi.
> Veritabanında değişiklik, commit veya deploy yapılmadı.

Taslaklar 300 karakter şartı yürürlükteyken yazılmıştı; o eşiği tutturmak
için eklenen cümleler bu sürümde kaldırıldı.

## Kaldırılan dolgu kalıpları

| Kalıp | Neden kaldırıldı | Kaç üründe |
|---|---|---|
| *"Sipariş &lt;parça no&gt; numarasıyla açılır."* | Parça numarası sayfanın H1'i ve `<title>`'ı; cümle hiçbir şey eklemiyor | 2 |
| *"Seçimi kalem numarasına göre yapın"* / *"katalog sayfanızla karşılaştırın"* | Ürüne özgü değil, her sayfada aynı genel tavsiye | 5 |
| *"üçü de aynı paketin kayıtlarıdır"* / *"ardışık kalemlerdir"* | Hemen önündeki liste bunu zaten söylüyor | 3 |
| 3–4 komşu parça numarasının sıralanması | Alım kararına katkısı yok; müşteri kendi katalog sayfasında görüyor | 6 |

## Korunan içerik

- **Çizim ve kalem numarası** — müşterinin kendi kataloğundan doğrulamasının
  tek yolu. 10 ürünün tamamında kaynak kayıttan yeniden teyit edildi.
- **Gerçek ad çakışması uyarıları** — yalnızca katalogda aynı veya çok
  benzer adı taşıyan iki parça varsa: `60525-06300` ↔ `60525-06400`
  (birebir aynı ad) ve `62625-35901` ↔ `92525-03800`
  (“Dış debriyaj piston keçesi” / “Dış piston keçesi”).
- **Birlikte çalışan tek komşu** — istavroz↔pinyon, çark↔göbek, üç plaka.
  Karşılıklı: iki sayfa birbirini anıyor.

## Bir iddia çıkarıldı

`62625-16300` taslağında *"26. kalem 62625-06400 şanzıman halkası"* yazıyordu.
Ürün veritabanında **var**, ancak **kalem numarası kaynak kayıtta yok** —
doğrulanamadığı için çıkarıldı.

## Teknik özellik yok — neden

Kaynak kayıtta `olcu` ve `malzeme` alanları **10 ürünün hepsinde boş**.
Ölçü, malzeme, tork veya basınç yazılamaz; yazılsaydı uydurma olurdu.

---

## `60525-06300` — Şanzıman D-ring contası

`HMK6 · E160.00.01, kalem 17` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 332 |
| **Sadeleştirilmiş** | **219** (-113) |

**Önceki taslak:**
> HMK 600MG şanzımanında kullanılan D-ring contadır. HİDROMEK kataloğunda E160.00.01 numaralı çizimin 17. kalemi olarak kayıtlıdır. Hemen ardından gelen 18. kalem de D-ring conta olarak geçer ve 60525-06400 parça numarasını taşır; iki conta aynı çizimde ayrı kalemlerdir, bu yüzden siparişte kalem numarasının doğru seçilmesi gerekir.

**Sadeleştirilmiş:**
> HMK 600MG şanzımanının D-ring contasıdır; HİDROMEK kataloğunda E160.00.01 numaralı çizimde 17. kalem olarak geçer. Aynı çizimin 18. kalemi de aynı adla kayıtlıdır ve 60525-06400 numarasını taşır — ad aynı, parça farklı.

**Değişiklik:** Kapanıştaki sipariş tavsiyesi çıkarıldı; aynı uyarı eşleşen üründe bir kez veriliyor. Ad çakışması **korundu**, çünkü iki parça katalogda birebir aynı adı taşıyor.

## `60525-06400` — Şanzıman D-ring contası

`HMK6 · E160.00.01, kalem 18` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 337 |
| **Sadeleştirilmiş** | **260** (-77) |

**Önceki taslak:**
> HMK 600MG şanzımanının D-ring contalarından biridir; HİDROMEK kataloğunda E160.00.01 numaralı çizimde 18. kalem olarak yer alır. Bir önceki kalem olan 17. kalem de aynı tanımla kayıtlıdır ve 60525-06300 parça numarasını taşır. İki conta katalogda ayrı kalemler olduğundan, elinizdeki parçanın numarasını son hanesine kadar karşılaştırın.

**Sadeleştirilmiş:**
> HMK 600MG şanzımanının D-ring contasıdır; HİDROMEK kataloğunda E160.00.01 numaralı çizimde 18. kalem olarak geçer. Katalogda aynı adı taşıyan ikinci bir conta daha var: 17. kalem, 60525-06300. Eşleştirmeyi ada göre değil kalem veya parça numarasına göre yapın.

**Değişiklik:** "Son hanesine kadar karşılaştırın" gibi abartılı yönlendirme sadeleşti. Eşleştirme uyarısı **bu üründe** tutuldu; çiftin iki tarafında tekrarlanmıyor.

## `60532-00100` — Diferansiyel uç plakası

`HMK6 · E120.00.01, kalem 7` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 310 |
| **Sadeleştirilmiş** | **238** (-72) |

**Önceki taslak:**
> HMK 600MG greyderin diferansiyel grubundaki uç plakadır. HİDROMEK kataloğunda E120.00.01 numaralı çizimin 7. kalemi olarak kayıtlıdır. Aynı çizimde 8. kalem 60332-00700 karşı plaka, 9. kalem ise 60332-00801 sürtünme plakasıdır; üç plaka da aynı paketin ardışık kalemleridir. Seçimi kalem numarasına göre yapın.

**Sadeleştirilmiş:**
> HMK 600MG greyderin diferansiyel grubundaki uç plakadır. HİDROMEK kataloğunda E120.00.01 numaralı çizimin 7. kalemidir. Aynı paketin 8. kalemi 60332-00700 karşı plaka, 9. kalemi 60332-00801 sürtünme plakasıdır — üç plaka ayrı parçalardır.

**Değişiklik:** "Ardışık kalemlerdir" ve "seçimi kalem numarasına göre yapın" aynı şeyi iki kez söylüyordu; biri kaldı. Üç plakanın çapraz referansı **korundu** — Grup 1'deki iki plaka da bu ürünü anıyor.

## `60563-00201` — Daire döndürme göbeği

`HMK6 · G030.00.01, kalem 44` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 295 |
| **Sadeleştirilmiş** | **209** (-86) |

**Önceki taslak:**
> HMK 600MG greyderin daire döndürme grubunda kullanılan göbektir. HİDROMEK kataloğunda G030.00.01 numaralı çizimin 44. kalemi olarak kayıtlıdır. Aynı çizimde 8. kalem 62663-00500 daire döndürme çarkı, 23. kalem C5660-07080 daire döndürme burcu, 16. kalem ise 62246-00501 daire döndürme keçesidir.

**Sadeleştirilmiş:**
> Daire döndürme göbeği, HMK 600MG greyderin daire döndürme grubuna aittir. HİDROMEK kataloğunda G030.00.01 numaralı çizimde 44. kalem olarak kayıtlıdır. Bu çizim grubun çark, keçe ve burç kalemlerini de içerir.

**Değişiklik:** Üç parça numarası sıralamak alım kararına katkı vermiyordu. Çizimin neyi kapsadığı tek cümleye indi; müşteri kendi katalog sayfasında numaraları zaten görüyor. Cümle kuruluşu, eşleşen çark kaydından ayrışacak şekilde değiştirildi.

## `60632-05500` — Diferansiyel istavrozu

`HMK6 · E120.00.01, kalem 19` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 311 |
| **Sadeleştirilmiş** | **191** (-120) |

**Önceki taslak:**
> HMK 600MG diferansiyelinin istavrozudur; HİDROMEK kataloğunda E120.00.01 numaralı çizimin 19. kalemi olarak kayıtlıdır. Aynı çizimde 20. kalem 60994-00600 diferansiyel pinyonu, 21. kalem 60632-05900 pinyon pulu, 22. kalem ise 69331-06900 diferansiyel baskı puludur. Sipariş 60632-05500 parça numarasıyla açılır.

**Sadeleştirilmiş:**
> HİDROMEK kataloğunda HMK 600MG diferansiyeli E120.00.01 numaralı çizimde toplanmıştır; istavroz bu çizimin 19. kalemidir. Hemen ardından gelen 20. kalem diferansiyel pinyonudur (60994-00600).

**Değişiklik:** "Sipariş ... numarasıyla açılır" cümlesi kaldırıldı — parça numarası sayfanın başlığında zaten var. Üç komşudan yalnızca istavrozla birlikte çalışan pinyon kaldı; pul kalemleri düşürüldü. Cümle kuruluşu pinyon kaydından ayrışacak şekilde değiştirildi.

## `60994-00600` — Diferansiyel pinyonu

`HMK6 · E120.00.01, kalem 20` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 326 |
| **Sadeleştirilmiş** | **169** (-157) |

**Önceki taslak:**
> HMK 600MG diferansiyel grubunun pinyonudur. HİDROMEK kataloğunda E120.00.01 numaralı çizimde 20. kalem olarak yer alır. Bir önceki kalem 60632-05500 diferansiyel istavrozu, bir sonraki kalem ise 60632-05900 pinyon puludur. Aynı çizimdeki konik diferansiyel dişlileri 60432-10200 ve 91831-01500 numaralarıyla ayrıca kayıtlıdır.

**Sadeleştirilmiş:**
> HMK 600MG diferansiyel grubunun pinyonudur. Kaynak kayıt: HİDROMEK E120.00.01 çizimi, 20. kalem. Bu kalem, 19. kalemdeki 60632-05500 istavrozla aynı alt grupta yer alır.

**Değişiklik:** Konik dişli numaralarını saymak yalnızca uzunluk katıyordu. Eşleşen tek komşu (istavroz) kaldı; böylece istavroz kaydıyla karşılıklı tutarlı oldu. Kaynak gösterimi farklı kurulduğu için iki metin birbirinin kopyası değil.

## `62625-16300` — Yağlama sızdırmazlık halkası

`HMK6 · E160.00.03, kalem 25` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 300 |
| **Sadeleştirilmiş** | **201** (-99) |

**Önceki taslak:**
> HMK 600MG şanzımanının planet grubunda kullanılan yağlama sızdırmazlık halkasıdır. HİDROMEK kataloğunda E160.00.03 numaralı çizimin 25. kalemi olarak kayıtlıdır. Aynı çizimde 26. kalem 62625-06400 şanzıman halkası, 13. kalem 60525-03800 planet dişli pimi, 10. kalem ise 60525-02900 planet dişlisidir.

**Sadeleştirilmiş:**
> HMK 600MG şanzımanının planet grubunda kullanılan yağlama sızdırmazlık halkasıdır. HİDROMEK kataloğunda E160.00.03 numaralı çizimin 25. kalemidir; aynı çizim planet dişlisini ve dişli pimini de kapsar.

**Değişiklik:** **Doğrulanamayan iddia çıkarıldı:** "26. kalem 62625-06400" — bu parça veritabanında var ama kalem numarası kaynak kayıtta yok. Kalan iki komşu numara yerine çizim kapsamı yazıldı.

## `62625-35901` — Dış debriyaj piston keçesi

`HMK6 · E160.00.01, kalem 24` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 323 |
| **Sadeleştirilmiş** | **259** (-64) |

**Önceki taslak:**
> HMK 600MG şanzımanının debriyaj pistonunda kullanılan dış keçedir. HİDROMEK kataloğunda E160.00.01 numaralı çizimin 24. kalemi olarak kayıtlıdır. Aynı çizimde 27. kalem 62625-27100 şanzıman çıkış gömleği, 30. kalem ise 92525-03800 dış piston keçesi olarak geçer; iki keçe ayrı kalemlerdir ve numaraları karıştırılmamalıdır.

**Sadeleştirilmiş:**
> HMK 600MG şanzımanının debriyaj pistonunda kullanılan dış keçedir. HİDROMEK kataloğunda E160.00.01 numaralı çizimin 24. kalemidir. Aynı çizimin 30. kalemi “Dış piston keçesi” adıyla kayıtlıdır ve 92525-03800 numarasını taşır; adlar benzer, parçalar farklıdır.

**Değişiklik:** Çıkış gömleği (27. kalem) keçeyle ilgisi olmayan bir komşuydu, çıkarıldı. Benzer adlı keçe uyarısı **korundu** — gerçek karıştırma riski burada.

## `62663-00500` — Daire döndürme çarkı

`HMK6 · G030.00.01, kalem 8` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 300 |
| **Sadeleştirilmiş** | **168** (-132) |

**Önceki taslak:**
> HMK 600MG greyderin daire döndürme çarkıdır; HİDROMEK kataloğunda G030.00.01 numaralı çizimin 8. kalemi olarak kayıtlıdır. Aynı çizimde 16. kalem 62246-00501 daire döndürme keçesi, 23. kalem C5660-07080 burç, 44. kalem ise 60563-00201 daire döndürme göbeğidir. Sipariş 62663-00500 numarasıyla açılır.

**Sadeleştirilmiş:**
> HMK 600MG greyderin daire döndürme çarkıdır. HİDROMEK kataloğunda G030.00.01 numaralı çizimin 8. kalemidir; aynı çizimde 44. kalem 60563-00201 daire döndürme göbeğidir.

**Değişiklik:** Sipariş cümlesi ve iki komşu numara düştü. Çarkla birlikte çalışan göbek kaldı; göbek kaydı da bu çarkı anıyor, iki sayfa karşılıklı tutarlı.

## `69241-03403` — Şanzıman karşı plakası

`HMK6 · E160.00.01, kalem 28` · HİDROMEK · HMK 600MG

| | Karakter |
|---|---|
| Önceki taslak | 321 |
| **Sadeleştirilmiş** | **243** (-78) |

**Önceki taslak:**
> HMK 600MG şanzımanının karşı plakasıdır. HİDROMEK kataloğunda E160.00.01 numaralı çizimde 28. kalem olarak yer alır. Aynı çizimde 2. kalem 60325-01300 baskı plakası, 19. kalem ise 58822-32300 sürtünme plakasıdır; üçü de şanzıman paketinin kayıtlarıdır. Sipariş öncesinde kalem numarasını katalog sayfanızla karşılaştırın.

**Sadeleştirilmiş:**
> HMK 600MG şanzımanının karşı plakasıdır. HİDROMEK kataloğunda E160.00.01 numaralı çizimin 28. kalemidir. Aynı çizimde 2. kalem 60325-01300 baskı plakası, 19. kalem 58822-32300 sürtünme plakasıdır; şanzıman paketinde üç ayrı plaka tipi bulunur.

**Değişiklik:** "Üçü de paketin kayıtlarıdır" ve sipariş öncesi karşılaştırma tavsiyesi iki ayrı dolgu cümlesiydi; yerine tek bilgi cümlesi kaldı. Çapraz referans **korundu** (Grup 1'deki iki plaka bu ürünü anıyor).

---

## Özet

| Parça No | Önceki | Yeni | Fark |
|---|---|---|---|
| `60525-06300` | 332 | **219** | -113 |
| `60525-06400` | 337 | **260** | -77 |
| `60532-00100` | 310 | **238** | -72 |
| `60563-00201` | 295 | **209** | -86 |
| `60632-05500` | 311 | **191** | -120 |
| `60994-00600` | 326 | **169** | -157 |
| `62625-16300` | 300 | **201** | -99 |
| `62625-35901` | 323 | **259** | -64 |
| `62663-00500` | 300 | **168** | -132 |
| `69241-03403` | 321 | **243** | -78 |
| **Ortalama** | **315** | **215** | **-99** |

Toplam **998 karakter** dolgu kaldırıldı. En kısa yeni metin **168**, en uzun
**260** karakter. Hiçbiri yayın kapısına takılmaz — tek içerik şartı
açıklamanın boş olmaması.

---

## Şablon denetimi

Metinler kısaldıkça yapı benzerliği kaçınılmaz olarak artar. Bu yüzden
10 metnin **45 ikili kombinasyonu** ölçüldü (`difflib` oran benzerliği):

| Çift | Benzerlik |
|---|---|
| `60532-00100` ↔ `62663-00500` | 61% |
| `60563-00201` ↔ `62663-00500` | 60% |
| `62625-16300` ↔ `62663-00500` | 59% |
| `60532-00100` ↔ `60994-00600` | 57% |

İlk sürümde iki çift eşikteydi: `60632-05500` ↔ `60994-00600` **%76** ve
`60563-00201` ↔ `62663-00500` **%74**. İkisi de "slotu değişmiş aynı cümle"
kalıbıydı; cümle kuruluşları ayrıştırıldı. Şimdi **%65 üzerinde çift yok**,
tavan **%61**.

Bu ayrıştırma yalnızca **cümle kuruluşuyla** yapıldı — hiçbir metne
doğrulanmamış işlev, ölçü veya kullanım bilgisi eklenmedi.

## Kalan dolgu kontrolü

Kaldırılan beş kalıbın hiçbiri yeni metinlerde geçmiyor (0/10):
*"numarasıyla açılır"*, *"katalog sayfanızla karşılaştırın"*,
*"ardışık kalemler"*, *"paketin kayıtlarıdır"*, *"son hanesine kadar"*.

## Doğrulama durumu

| Kontrol | Sonuç |
|---|---|
| 10 çizim/kalem referansı | kaynak kayıttan **yeniden teyit edildi** |
| 15 komşu parça numarası + adı | veritabanından **teyit edildi** (25/25 kayıt mevcut) |
| İki ad çakışması | veritabanında **birebir doğrulandı** |
| `olcu` / `malzeme` alanları | **10/10 boş** → teknik özellik yazılamaz |
| Doğrulanamayan iddia | **1 adet çıkarıldı** (`62625-16300`) |
| Grup 1 metinleri | **değiştirilmedi** |
| Veritabanı yazma / commit / deploy | **yapılmadı** |
