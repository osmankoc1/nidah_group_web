# Grup 5 — Açıklama Taslakları (İNCELEME İÇİN)

**Tarih:** 2026-11-26 · **Durum:** taslak · **veritabanına yazılmadı**

> Grup 1–3'ün onaylı 28 metnine ve Grup 4'ün 7 taslağına **dokunulmadı**.
> Veritabanı yazma, ürün aktifleştirme ve SEO yayını **yok**; tüm sorgular
> development veritabanında ve salt okunur yapıldı.

## Bu grubun listesi nasıl kurtarıldı

Grup 5'in hangi 7 ürün olduğu **hiçbir belgede yazılı değildi** — yalnızca
"Komatsu WA320-3MC + Volvo greyderler" notu vardı (`22-GRUP3-TASLAKLAR.md`).
Liste development veritabanından yeniden türetildi: 42'lik küme, açıklaması
**100–199 karakter** olan ürünlerdir (ölçüldü: tam 42 satır). Bilinen 35
(28 onaylı + 7 Grup 4) çıkarıldığında kalan 7 ürün bu gruptur. Bilinen 35
parça numarasının **tamamı** veritabanında bulundu, yani küme tanımı tutarlı.

| Ürün | Makine | Doğrulanmış uyumluluk |
|---|---|---|
| `714-12-19320` · `714-12-19710` · `714-16-19730` | KOMATSU WA320-3MC | 1 (seri A31001 ve üzeri) |
| `CH 12119-10` · `CH 12119-16` · `CH 12119-20` | VOLVO G930/G940/G946/G960/G970/G976 | **6** |
| `VOE 12727387` | VOLVO G930 | 1 |

Yedi üründe de `part_manufacturer` **boş** ve `sourcing_type` **`unknown`** —
bu yüzden hiçbir metinde **marka iddiası** yoktur (denetim C9 kuralı). Makine
adı uyumluluk kaydından gelir ve o kayıt `verified = true`'dur.

## İki gerçek çakışma çıktı

**1. Dört ayrı "Daire ayar pulu".** `CH 12119-10`, `-16`, `-20` üçü de
G0008437 çiziminin **aynı 7. kalemidir**. Kayıtta `olcu` ve `malzeme` alanları
boş; yani **kalınlık farkı veritabanından doğrulanamıyor**. Parça numarasının
sonundaki `-10/-16/-20` bir kalınlık gibi görünüyor ama bu **kayıtta yazılı
değil**, o yüzden metinlerde kalınlık **iddia edilmedi**. Dördüncü kayıt
`VOE 12749768` aynı çizimin **6. kalemidir** ve ayrı bir parçadır.

**2. `714-16-19730` ↔ `714-12-19730`.** İkisi de "ayırıcı plaka" ama
birincisi şanzıman (F-020/5), ikincisi **park freni** (F4350-57A0, F-028,
kalem 5) grubundadır. Numara benzerliği sipariş hatası riski taşıdığı için
`714-16-19730` metninde açıkça ayrıldı.

## Uygulanan kurallar (Grup 3–4 ile aynı çizgi)

1. 300 karakter zorunluluğu yok; uzunluk ihtiyaca göre.
2. Dolgu ve genel SEO cümlesi yok.
3. Ölçü, malzeme, sertlik, tork, adet ve kalınlık **yazılmadı** — kaynak
   kayıtta bu alanlar boş.
4. Sayısal katalog iddiası yok; çakışan parçalar **numarayla adlandırıldı**
   (sayı vermek yerine).
5. Montaj grubu adı yalnızca uyumluluk kaydındaki `Montaj`/`Sistem`
   alanından alındı; tahmin yazılmadı.
6. Fonksiyon açıklaması (parçanın ne işe yaradığı) **yazılmadı** — kayıtta yok.

---

## Nihai taslaklar — 7 ürünün tamamı

| Parça No | Ürün Adı | Çizim · Kalem | Kar. | Nihai açıklama |
|---|---|---|---|---|
| `714-12-19320` | Şanzıman ara dişli yatağı | `KWA · F4350-58A0, F-030` · 2 | 264 | Komatsu WA320-3MC yükleyicinin güç aktarımı grubundaki şanzıman ara dişli yatağıdır; üretici kataloğunda F4350-58A0 bölümünde F-030 çiziminin 2. kalemi olarak kayıtlıdır. Katalog kapsamı A31001 ve üzeri seri numaralarıdır. Sipariş 714-12-19320 numarasıyla verilir. |
| `714-12-19710` | Şanzıman debriyaj diski | `KWA · F-020/4 · F-022/3 · F-024/3` | 374 | Komatsu WA320-3MC yükleyicinin şanzıman grubundaki debriyaj diskidir. Üretici kataloğunda üç ayrı çizimde kayıtlıdır: F4350-53A0 bölümünde F-020 çiziminin 4. kalemi, F4350-54A0 bölümünde F-022 ve F4350-55A0 bölümünde F-024 çizimlerinin 3. kalemi. Aynı çizimlerde bir sonraki kalem 714-16-19730 şanzıman ayırıcı plakasıdır. Katalog kapsamı A31001 ve üzeri seri numaralarıdır. |
| `714-16-19730` | Şanzıman ayırıcı plakası | `KWA · F-020/5 · F-022/4 · F-024/4` | 423 | Komatsu WA320-3MC yükleyicinin şanzıman grubundaki ayırıcı plakadır; üretici kataloğunda F4350-53A0 bölümünde F-020 çiziminin 5. kalemi, F4350-54A0 bölümünde F-022 ve F4350-55A0 bölümünde F-024 çizimlerinin 4. kalemi olarak kayıtlıdır. Aynı çizimlerde bir önceki kalem 714-12-19710 debriyaj diskidir. Katalogda numarasının yalnızca orta grubu farklı olan 714-12-19730 ise park freni ayırıcı plakasıdır ve ayrı bir parçadır. |
| `CH 12119-10` | Daire ayar pulu | `V900 · G0008437, s. 1119` · 7 | 432 | Volvo G900 serisi greyderlerin daire döndürme arka grubundaki ayar puludur; üretici kataloğunda G0008437 çiziminin 1119. sayfasında 7. kalem olarak kayıtlıdır. Aynı kalemde CH 12119-16 ve CH 12119-20 numaralı iki ayar pulu daha kayıtlıdır; ayrım parça numarasıyla yapılır, kalınlık değeri kayıtta geçmez. Aynı çizimin 6. kalemi VOE 12749768 ise ayrı bir daire ayar puludur. Doğrulanmış makineler: G930, G940, G946, G960, G970, G976. |
| `CH 12119-16` | Daire ayar pulu | `V900 · G0008437, s. 1119` · 7 | 432 | Volvo G900 serisi greyderlerin daire döndürme arka grubundaki ayar puludur; üretici kataloğunda G0008437 çiziminin 1119. sayfasında 7. kalem olarak kayıtlıdır. Aynı kalemde CH 12119-10 ve CH 12119-20 numaralı iki ayar pulu daha kayıtlıdır; ayrım parça numarasıyla yapılır, kalınlık değeri kayıtta geçmez. Aynı çizimin 6. kalemi VOE 12749768 ise ayrı bir daire ayar puludur. Doğrulanmış makineler: G930, G940, G946, G960, G970, G976. |
| `CH 12119-20` | Daire ayar pulu | `V900 · G0008437, s. 1119` · 7 | 432 | Volvo G900 serisi greyderlerin daire döndürme arka grubundaki ayar puludur; üretici kataloğunda G0008437 çiziminin 1119. sayfasında 7. kalem olarak kayıtlıdır. Aynı kalemde CH 12119-10 ve CH 12119-16 numaralı iki ayar pulu daha kayıtlıdır; ayrım parça numarasıyla yapılır, kalınlık değeri kayıtta geçmez. Aynı çizimin 6. kalemi VOE 12749768 ise ayrı bir daire ayar puludur. Doğrulanmış makineler: G930, G940, G946, G960, G970, G976. |
| `VOE 12727387` | Bıçak kaydırma elemanı | `V930 · Çizim 20061` · 2 | 284 | Volvo G930 greyderin bıçak montajındaki kaydırma elemanıdır; üretici kataloğunda 20061 numaralı çizimin 2. kalemi olarak kayıtlıdır. Aynı çizimde 3. kalem VOE 12727728 bıçak kaydırma yatağı, 4. kalem VOE 15403165 bıçak kaydırma uç plakasıdır. Sipariş VOE 12727387 numarasıyla verilir. |

## Ölçülen uzunluklar

| | Karakter |
|---|---|
| En kısa | 264 |
| Ortalama | 377 |
| En uzun | 432 |
| 300 ve üzeri | 5 / 7 |

## Durum — 42 ürünün tamamı

| Grup | Ürün | Durum |
|---|---|---|
| Grup 1 | 10 | ✅ onaylandı |
| Grup 2 | 10 | ✅ onaylandı (sadeleştirilmiş) |
| Grup 3 | 8 | ✅ onaylandı (iki düzeltme uygulandı) |
| Grup 4 | 7 | taslak hazır — **onay bekliyor** |
| Grup 5 | 7 | taslak hazır — **onay bekliyor** |

**42/42 metin yazıldı. 28'i onaylı, 14'ü onay bekliyor.**
Hiçbir metin production veritabanına yazılmadı.

## Onayınızı bekleyen

1. Grup 5'in bu 7 metni.
2. `CH 12119-10/-16/-20` kalınlık farkının **depoda ölçülmesi** — ölçüm
   gelirse üç metne kalınlık eklenebilir; gelmezse metinler bu hâliyle
   doğrudur, yalnızca daha az ayırt edicidir.
