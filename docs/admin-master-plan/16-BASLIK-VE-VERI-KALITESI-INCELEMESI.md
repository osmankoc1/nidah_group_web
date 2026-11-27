# Başlık Ayrıştırma ve Veri Kalitesi İncelemesi

**Tarih:** 2026-11-20 · **Kaynak:** production, **salt okunur**
**Durum:** öneri · **hiçbir değişiklik yapılmadı**

> Birleştirme, başlık güncelleme, açıklama yazma, aktifleştirme, SEO yayını
> ve katalog açılışı **yapılmadı**. Hepsi onayınızı bekliyor.

---

## 1. `HMK 600MG` ve `HMK600MG` aynı makine mi?

**Kanıtlar — aynı makine olduğunu güçlü biçimde gösteriyor:**

| Kanıt | Bulgu |
|---|---|
| Katalog öneki | **İkisi de `HMK6`** — 74 kaydın da, 8 kaydın da kaynağı aynı katalog |
| Çizim numarası ailesi | 8 kayıt `E160.00.02` ve `E160.00.03`; 74 kayıt `D…`, `E010…E160` serisini kullanıyor — **aynı numaralandırma düzeni** |
| **Ortak çizim kodu** | **2 çizim kodu her iki makine kaydında da geçiyor** |
| Ortak ürün | **0** — hiçbir ürün iki kayda birden bağlı değil (mükerrer kayıt beklentisiyle uyumlu) |
| Tip / yıl alanları | İkisi de **boş** |
| Oluşturma tarihi | İkisi de **2026-11-13**, aynı içe aktarmadan |

**Değerlendirme:** aynı makinenin iki yazımı olma ihtimali yüksek. Fark
yalnızca boşluk; veri de aynı katalogdan geliyor.

**Yine de birleştirme ÖNERMİYORUM — önce şu teyit gerekiyor:**
HİDROMEK kataloğunda `HMK 600MG` tek bir model adı mı, yoksa `600MG`
serisinde ayrı varyantlar mı var? Bu, yalnızca üretici belgesiyle
yanıtlanabilir; veritabanı bunu söyleyemez.

**Teyit gelirse uygulanacak:** 8 uyumluluk kaydı `HMK 600MG` kaydına
taşınır, boş kalan `HMK600MG` kaydı silinir. Tek işlem, geri alınabilir,
ürün verisine dokunmaz.

---

## 2. Başlık ayrıştırma (13 grup + 12 kısa ad)

### 2.1 Önce bir sınır

Sistemde **ölçü, malzeme, basınç, tork gibi teknik özellik YOK**. Kısa
açıklamalı 42 ürünün kayıtları zaten "çizim ve grup bilgisi bulunamadı"
durumundan geliyor. Bu yüzden başlıkları **ölçüyle ayrıştırmak mümkün
değil** — uydurmak ise söz konusu değil.

Elimizdeki ayırt edici gerçekler: **parça numarası**, **üretici**,
**makine**, bazılarında **çizim referansı**.

İyi haber: müşteri zaten **parça numarasıyla** arıyor. Başlığın ayırt edici
unsuru da bu olmalı.

### 2.2 Önerilen başlık biçimi

```
TR:  {Ad} {Parça No} — {Marka} {Makine} yedek parça
EN:  {Ad EN} {Part No} — {Brand} {Machine} spare part
```

Örnek: `Daire ayar pulu CH 12119-10 — Volvo G930-G976 greyder yedek parça`

Google başlıkları ~60 karakterde kestiği için **makine adı uzunsa
kısaltılır** (örn. `Volvo G930-G976`). Panelde meta başlık sayacı bunu zaten
gösteriyor.

### 2.3 Aynı adı taşıyan 13 grup (34 ürün)

| Ad | Ürünler | Ayırt edici |
|---|---|---|
| **O-ring** (7) | `60463-00400`, `C5563-70144`, `C5563-70280`, `N3150-02800`, `N3153-05500`, `N3153-06500`, `N3153-13000` | yalnızca parça no — hepsi HMK 600MG |
| **Daire ayar pulu** (4) | `CH 12119-10`, `CH 12119-16`, `CH 12119-20`, `VOE 12749768` | parça no; ilk üçünün soneki (`-10/-16/-20`) büyük olasılıkla kalınlık ama **katalogla teyit edilmeli** |
| **Kavrama ayar pulu** (3) | `61963-00900`, `61963-01100`, `61963-01200` | parça no; aynı çizim (160459-02, kalem 9) |
| **Şanzıman baskı plakası** (3) | `60325-01300` (HMK), `69241-00901` (MG430), `69404-02600` (HMK) | **makine ile ayrışıyor** |
| **Aşınma plakası** (2) | `60382-00900`, `62682-21500` | parça no |
| **Daire döndürme burcu** (2) | `62663-01400` (MG530), `C5660-07080` (HMK) | **makine** |
| **Dingil O-ring contası** (2) | `62631-04700`, `62631-04900` | parça no |
| **Dış piston keçesi** (2) | `69331-03400`, `92525-03800` | parça no |
| **Yaylı pul** (2) | `F2515-14000`, `N2515-22000` | parça no |
| **Şanzıman D-ring contası** (2) | `60525-06300`, `60525-06400` | parça no |
| **Şanzıman karşı plakası** (2) | `69241-01101` (MG430), `69241-03403` (HMK) | **makine** |
| **Şanzıman sürtünme plakası** (2) | `58822-32300`, `60525-06900` | parça no (ikisi de HMK) |
| **Şanzıman uç plakası** (2) | `60425-01800` + 1 kayıt | parça no |

**Beş grup makine ile ayrışıyor** — orada başlık doğal olarak benzersiz
oluyor. Kalan sekiz grupta ayırt edici tek şey parça numarası.

**Örnek başlıklar:**

| Parça No | TR başlık | EN başlık |
|---|---|---|
| `CH 12119-10` | Daire ayar pulu CH 12119-10 — Volvo greyder | Circle shim CH 12119-10 — Volvo grader |
| `60325-01300` | Şanzıman baskı plakası 60325-01300 — HMK 600MG | Transmission pressure plate 60325-01300 — HMK 600MG |
| `69241-00901` | Şanzıman baskı plakası 69241-00901 — Mitsubishi MG430 | Transmission pressure plate 69241-00901 — Mitsubishi MG430 |
| `N3153-05500` | O-ring N3153-05500 — HMK 600MG hidrolik | O-ring N3153-05500 — HMK 600MG hydraulic |

> **İngilizce adlar zaten hazır:** 154 ürünün EN çevirisi taslak olarak
> aktarıldı ve adları doğru (`Circle shim`, `Transmission pressure plate`,
> `Wear plate`…). Başlık için yeniden çeviri gerekmiyor.

### 2.4 Kısa adlı 12 ürün

| Parça No | Mevcut ad | EN | Makine | Önerilen TR başlık |
|---|---|---|---|---|
| `F1035-14065` | Cıvata | Bolt | HMK 600MG | Cıvata F1035-14065 — HMK 600MG |
| `H348004001` | Far | Headlamp | HMK 200 W / 220 LC-2 | Far H348004001 — HMK 200W / 220LC-2 |
| `R6020-11521-0` | Hat | Line | HMK 600MG | Hidrolik hat R6020-11521-0 — HMK 600MG |
| `60463-00400` | O-ring | O-ring | HMK 600MG | O-ring 60463-00400 — HMK 600MG |
| `C5563-70144` | O-ring | O-ring | HMK 600MG | O-ring C5563-70144 — HMK 600MG |
| `C5563-70280` | O-ring | O-ring | HMK 600MG | O-ring C5563-70280 — HMK 600MG |
| `N3150-02800` | O-ring | O-ring | HMK 600MG | O-ring N3150-02800 — HMK 600MG |
| `N3153-05500` | O-ring | O-ring | HMK 600MG | O-ring N3153-05500 — HMK 600MG |
| `N3153-06500` | O-ring | O-ring | HMK 600MG | O-ring N3153-06500 — HMK 600MG |
| `N3153-13000` | O-ring | O-ring | HMK 600MG | O-ring N3153-13000 — HMK 600MG |
| `ND117228` | Rotor | Rotor | AMMANN AP240 / AP240CT2 | Rotor ND117228 — Ammann AP240 |
| `N2305-22000` | Somun | Nut | HMK 600MG | Somun N2305-22000 — HMK 600MG |

> **`R6020-11521-0` — "Hat"** adı yanlış görünüyor: İngilizcesi `Line`,
> yani muhtemelen **hidrolik hat / hortum**. Türkçeye "Hat" diye çevrilmiş.
> Katalogdan teyit edilip düzeltilmesini öneririm.

### 2.5 Nereye yazılacak

Bu başlıklar **ürün adını değiştirmeden** `meta_title` alanına yazılabilir.
Böylece panelde ve iç kayıtlarda kısa ad korunur, arama sonucunda benzersiz
başlık görünür. Alternatif olarak ürün adının kendisi güncellenebilir —
**sizin kararınız**.

---

## 3. 42 ürünün açıklama taslakları

**Ayrı belgede:** `17-ACIKLAMA-TASLAKLARI-42.md` — 42 taslağın tamamı,
üreticiye göre gruplanmış.

**Yöntem:** her metin yalnızca kayıtlı gerçeklerden kuruldu — parça
numarası, üretici, ürün adı, doğrulanmış uyumluluklar ve **o uyumlulukların
kaynak referansları**, Logo stok kodu. Teknik özellik **uydurulmadı**.

**Sonuç:** 42 taslağın tamamı 300 karakter eşiğinin üzerinde; en kısası
**498 karakter**.

**Örnek (`58822-32300`, mevcut 164 → taslak 517 karakter):**

> 58822-32300, HIDROMEK parça kaydında şanzıman sürtünme plakası olarak
> tanımlanır. Katalog uyumluluk kaydına göre HIDROMEK HMK 600MG makinesinde
> kullanılır; bu uyumluluk HMK6 · E160.00.01, kalem 19 referansına dayanır.
> Parça, NİDAH GROUP stok kaydında 58822-32300 koduyla izlenir. Sipariş
> öncesinde makinenizdeki mevcut parçanın numarasını ve montaj konumunu
> karşılaştırmanızı öneririz; parça numarası eşleşmiyorsa uyumluluğu teyit
> etmeden sevk yapılmaz. Fiyat ve termin için parça numarasıyla teklif
> isteyebilirsiniz.

**Gözden geçirme notları:** çoklu makine listelerinde "makinesinde" →
"makinelerinde" düzeltmesi; marka yazımı `HIDROMEK` / `HİDROMEK` kararı;
son cümlenin ticari tonu isteğe bağlı.

---

## 4. Tek üründe 42 uyumluluk — değerlendirme

**Ürün:** `244-3106` · **Sıcaklık müşürü** · Caterpillar

| | |
|---|---|
| Uyumluluk | **42**, hepsi CATERPILLAR |
| Kaynak | **tek**: `CAT2443106 · Compatible Models` |
| Makineler | 414E, 416/D/E/F/F2, 420/D/E/F/F2, 422E/F/F2, 424D, 428/D/E/F/F2, 430/D/E/F/F2, 432/D/E/F/F2, 434/E/F/F2, 438D, 442D/E, 444/E/F … |
| Açıklama | 603 karakter — model listesini zaten içeriyor |

**Değerlendirme: meşru.** Bu, Caterpillar'ın kendi "compatible models"
listesinden gelen bir kayıt; bir sıcaklık müşürünün backhoe loader ailesinin
tamamında ortak olması beklenen bir durum. Uydurma bir genişletme değil.

**Yine de iki not:**

1. Kaynak metni **tek ve geneldir** (`Compatible Models`). Hangi katalog
   sürümü olduğu yazmıyor. Yayın öncesi kaynağın sürüm/tarih bilgisiyle
   zenginleştirilmesi güveni artırır.
2. 42 makineli bir uyumluluk listesi, ürün sayfasında **uzun bir liste**
   demek. Sayfa tasarımında ilk N makineyi gösterip gerisini katlamak
   okunabilirliği korur.

---

## 5. Ticari öncelik grupları

### 5.1 Volvo + Champion (19 ürün) — yüksek ticari öncelik

| Marka | Ürün | Açıklaması yeterli |
|---|---|---|
| VOLVO | **18** | 14 |
| CHAMPION | **1** | 1 |

**Parça numaraları:** `CH 12119-10`, `CH 12119-16`, `CH 12119-20`,
`CH 19629`, `CH 24323`, `CH 48405`, `CH 50A-1864ZI`, `CH 54934`, `CH 62680`,
`VOE 11172907`, `VOE 12727387`, `VOE 12727728`, `VOE 12730758`,
`VOE 12742851`, `VOE 12743408`, `VOE 12747129`, `VOE 12749768`,
`VOE 15403165`

**Neden öncelikli:** `VOE` ve `CH` önekleri Volvo CE ve Champion greyderlerin
tanınmış parça numarası biçimleri; arama hacmi yüksek ve rekabetçi.
Sitede bu markalar için zaten marka sayfaları var. **19 üründen 15'inin**
açıklaması hazır — yalnızca fotoğraf bekliyorlar.

### 5.2 HİDROMEK (89 ürün) — hacim önceliği

Katalogun gövdesi. **55'inin** açıklaması hazır, **34'ü** taslak bekliyor.
Tamamı tek makine ailesinde (HMK 600MG) toplandığı için **tek depo turunda**
büyük bölümü fotoğraflanabilir. İhmal edilmemeli: 154 ürünün **%58'i**.

### 5.3 Diğerleri

MITSUBISHI 24 (24'ü hazır) · KOMATSU 9 (6) · ÇUKUROVA 6 (6) ·
CATERPILLAR 4 (3) · AMMANN 3 (3) · HITACHI 1 (1)

---

## 6. Fotoğraf turu önceliklendirmesi

**İlke:** depoda parçalar makineye göre duruyor; tur **makine bazında**
yapılmalı. Her turda o makinenin tüm parçaları tek seferde çekilir.

| Sıra | Grup | Ürün | Gerekçe |
|---|---|---|---|
| **1** | **HİDROMEK HMK 600MG** | **74** | Tek turda en yüksek kazanım; 43'ünün başka eksiği yok |
| **2** | **Volvo G930–G976 + Champion** | **19** | Ticari öncelik; 15'i yayına hazır |
| **3** | MITSUBISHI MG430 / MG530 / MG460 / MG560 | 24 | Tamamının açıklaması hazır — **fotoğraf = yayın** |
| **4** | KOMATSU + ÇUKUROVA | 15 | Orta hacim |
| **5** | CATERPILLAR + AMMANN + HITACHI | 8 | Düşük hacim, dağınık |
| **6** | HMK diğer modeller (200W, 220LC-2, 230LC3, 300LC-3, 310LC-5, 490LC) | ~10 | Tek tük parçalar |

**Her tur için parça numarası sırası:** panelden **"Fotoğraf föyü (CSV)"**
indirilir; föy parça numarası ve Logo stok koduyla gelir, depoda raf sırası
bu kodlarla eşleştirilir.

**Her fotoğraf için zorunlu iki bilgi:** ALT metni (**≥15 karakter**, parça
numarasının tekrarı değil) ve kaynak (çekim tarihi / katalog sayfası /
tedarikçi teyidi).

**Önerilen ALT biçimi:** `{Ad}, {parça no}, {makine} — depo çekimi`
Örnek: `Şanzıman sürtünme plakası, 58822-32300, HMK 600MG — depo çekimi`

---

## 7. Onayınızı bekleyenler

| # | Konu | Önerim |
|---|---|---|
| 1 | `HMK600MG` → `HMK 600MG` birleştirme | **Önce katalog teyidi**, sonra karar |
| 2 | Başlıkların `meta_title`'a yazılması | Ürün adı korunsun, meta başlık ayrışsın |
| 3 | `R6020-11521-0` "Hat" adının düzeltilmesi | Katalogdan teyit edip düzeltelim |
| 4 | 42 açıklama taslağının uygulanması | Önce sizin okumanız, sonra toplu güncelleme |
| 5 | Marka yazımı `HIDROMEK` / `HİDROMEK` | Tek biçime getirilmesi |
| 6 | Fotoğraf turunun 1. grubu (HMK 600MG, 74 ürün) | CSV föyüyle başlanması |
