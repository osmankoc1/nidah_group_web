# Yayın Raporu — Seviye B uygulandı, pilot hazır

**Tarih:** 2026-11-26 · **Canlı sürüm:** `9e3dcd5`

---

## Yönetici özeti

Fotoğraf şartı kaldırıldı ve kodda uygulandı. 28 onaylı açıklama production
veritabanına yazıldı, 12 zayıf ürün adı düzeltildi, 3 artık kayıt
pasifleştirildi ve **10 ürünlük pilot grup veritabanında yayına alındı**
(`is_active` + `seo_ready`).

**Yayın için kalan tek adım sizde:** Admin → Sayfalar → "Parça Kataloğu"
toggle'ını açmak. Toggle kapalı olduğu sürece katalog sayfaları gerçek 404
döner ve sitemap katalog URL'si içermez — yani pilot şu an veritabanında
hazır, sitede görünmüyor. Toggle'ı kod ya da SQL ile açmadım: proje
kuralı panelden değiştirilmesini şart koşuyor **ve** tek doğru teknik yol da
bu (panel değişikliği önbelleği kendisi tazeliyor; SQL tazelemiyor).

Ayrıca **araştırma kaynağı bulundu**: `NIDAH_GROUP_Yedek_Parca_Arastirmasi_v18.xlsx`
Downloads klasöründe duruyor ve 5.688 satırın tamamını, 1.340 uyumluluk
kaydını, 1.302 OEM/muadil kaydını, mükerrer adaylarını ve servis/işçilik
ayrımını taşıyor. **Eksik dosya yok.** Ölçüm: **322 ürün bugün aktarılabilir
durumda**, 281'i sizin birinci önceliğiniz olan Volvo/Champion greyder.

---

## Sayılar — birbirinden ayrı

| Gösterge | Sayı | Kaynak |
|---|---|---|
| **Toplam stok satırı** | **5.688** | v18 · "Tüm Ürünler" |
| **Araştırılmış ürün** | **1.467** (dış kaynak incelemesi yapılan) | v18 özeti: 5.688 − 4.221 incelenmemiş |
| → tam araştırılmış A grubu | **580** | Seviye 1: 172 · Seviye 2: 408 |
| **Doğrulanmış ürün** (kaynaklı makine uyumluluğu olan) | **476** | 154 production + 322 aktarılabilir |
| → "Kesin doğrulandı" | 291 (aktarılabilir içinde) | v18 |
| → "Güçlü eşleşme" | 31 (aktarılabilir içinde) | v18 |
| **Onaylanmış ürün** (metin onayı sizden) | **28** | docs/17 |
| → onay bekleyen metin | **14** (Grup 4: 7 · Grup 5: 7) | docs/34 |
| **Production'a aktarılmış** | **157** | ölçüldü (154 gerçek + 3 artık kayıt) |
| **Gerçekten yayında olan** | **0** | katalog toggle'ı KAPALI |
| → toggle açılınca yayına girecek | **10** (pilot) | `is_active` + `seo_ready` yazıldı |
| **Sitemap'e dahil edilen ürün** | **0** | toggle kapalı; açılınca **10** |
| **Fotoğraf bekleyen ürün** | **154 / 154** | `product_images` doğrulanmış kayıt: 0 |
| **Uyumluluk doğrulaması bekleyen** | **104** (A grubu) **+ 1.407** (B katalog sırası) | v18 |
| **Mükerrer kayıt** | **453 aday küme / 1.255 satır** | v18 · "Mükerrer Adayları" |
| → normalize PN çakışması | 115 küme / 240 satır | ölçüldü |
| **Yayın dışı (servis ve işçilik)** | **163** | v18 · "Servis ve İşçilik Kontrolü" |
| **Kalan Neon kotası** | **ÖLÇÜLEMEDİ** | Vercel/Neon paneline erişim yok |

> Önceki raporda yazdığım **371** sayısı eski bir türetilmiş CSV'den
> geliyordu. v18'in güncel sayısı **104**'tür (A grubunda uyumluluk kaydı
> olmayan ürün). Düzeltildi.

> Önceki raporda "25 ürün doğrudan aktarılabilir" demiştim. **Yanlıştı:**
> tam kayıtlı havuz tam 154 ürün ve hepsi zaten production'da. Doğru sayı,
> v18'den ölçüldüğünde **322**'dir.

---

## Bu oturumda production'da ne değişti

Hepsi geri dönüş yedeğiyle, tek toplu `UPDATE` ile ve yazma sonrası birebir
doğrulanarak yapıldı. Yedekler `scripts/veri/geri-donus/` altında.

| İşlem | Kayıt | Doğrulama |
|---|---|---|
| 28 onaylı açıklama yazıldı | 28 | 28/28 birebir doğru, yan etki 0 |
| 12 zayıf ürün adı düzeltildi | 12 | 12/12 doğru, yan etki 0 |
| 3 artık kayıt pasifleştirildi | 3 | 3/3 doğru (76281 "KIT", 90898 "GAUDE", DENEMEE32424) |
| Pilot yayına alındı | 10 | 10/10 doğru; her biri **gerçek yayın kapısından** geçirildi |

Ad düzeltmeleri yalnızca **kayıtlı** veriden türetildi (doğrulanmış uyumluluk
kaynağındaki çizim/kalem ve `Sistem` alanı). Örnek: `O-ring` →
`O-ring — HMK 600MG, E160.00.04 kalem 30`. Hiçbir ada uydurma bilgi girmedi.

**Pilot 10:** `324-0386` · `58822-32300` · `60325-01300` · `60425-01800` ·
`60332-00700` · `60332-00801` · `60525-02900` · `60525-03800` ·
`69331-03400` · `60441-10300`. Ad çakışması olan `92525-03800` bilinçli
olarak pilota alınmadı.

---

## Seviye B kapısı — kodda

| | Durum |
|---|---|
| `GORSEL_YAYIN_SARTI = false` | fotoğraf artık yayın şartı değil; ölçüt silinmedi, `gorselBekliyor` olarak raporlanıyor |
| Yeni ölçüt `name_too_weak` | en az 2 kelime veya 10 karakter · ad ≠ parça numarası · tamamı büyük harf olmasın |
| Fotoğraf **kaybı** | artık yayını geri almıyor (görselsiz sayfa meşru durum); mekanizma ve atomiklik korundu |
| Ürün sayfası | fotoğraf yoksa **"Ürün görseli henüz eklenmemiştir"** + parça numarası/uyumluluğun doğrulandığı notu |
| `Product.image` | fotoğraf yoksa **hiç yazılmıyor** (önceden de doğruydu) |
| Görsel sitemap'i | doğrulanmamış görsel girmiyor; fotoğrafsız ürün sayfa olarak girer, `<image:image>` girmez |
| Fotoğraf eklenince | yükleme ucu `revalidateProducts()` çağırıyor → sayfa kendiliğinden tazeleniyor |
| Marka iddiası | **değişmedi** — `brandClaimAllowed()` doğrulanmamış markayı göstermiyor |

**Marka şartı hakkında ölçüm:** production'daki 157 ürünün **hiçbirinde**
`part_manufacturer` dolu değil ve `sourcing_type` hepsinde `unknown`. Bu bir
eksiklik değil, v18'in kendi değerlendirmesinin sonucu: "Fiili Üretici:
**Teyitsiz**". Yani parçanın gerçek üreticisi kaynaklardan doğrulanamadı ve
bu yüzden sayfada marka iddia **edilmiyor**. Doğrulanan ve gösterilen şey
**makine markasıdır** (uyumluluk kaydı, `verified = true`). Şartınız bu
haliyle karşılanıyor; `part_manufacturer` alanını doldurmak OEM / muadil /
yan sanayi ayrımını gerektirir ve bu **ticari bir teyittir**, veriden
çıkarılamaz.

588 test geçiyor · `tsc` 0 hata · lint 35 (baseline 38), dokunulan
dosyalarda 0 bulgu.

### Önbellek anahtarları v2'ye yükseltildi

Production yazmaları doğrudan bağlantıyla yapıldı (admin API kimliği bu
makinede yok), bu yüzden `revalidateProducts()` çağrılmadı. Etiket tabanlı
kayıtlar `revalidate: false` taşıdığı için süreyle de düşmezler ve "2 aktif
ürün" halini taşımaya devam ederdi. `public-product-list`, `product-detail`,
`brand-catalog-page` ve `arama-sozlugu` anahtarları **v2** yapıldı — yeni
anahtar yeni kayıt demektir, eski kayıt okunmaz.

---

## ⚠ Aktarım öncesi kritik bulgu

`products.is_active` şema varsayılanı **`true`** ve içe aktarma ucu bu alanı
yazmıyor. Yani **toplu içe aktarma ile gelen her ürün AKTİF olarak girer.**
Toggle açıkken 322 ürünlük bir aktarım, içerik denetimi yapılmadan 322
sayfayı public yüzeye çıkarır.

**Zorunlu sıra:** aktarım → ürünleri pasifleştir → içerik denetimi →
grup grup `seo_ready` + `is_active`. Ya da aktarımı toggle **kapalıyken**
yapmak. Bu, aktarımdan önce verilmesi gereken bir karardır.

---

## Sırada ne var

| # | İş | Kim |
|---|---|---|
| 1 | **Katalog toggle'ını panelden aç** → pilot yayına girer | **siz** |
| 2 | Pilot doğrulaması (sayfa, sitemap, canonical, JSON-LD, teklif formu, parça no araması) | Claude — toggle açıldıktan sonra |
| 3 | Grup 4 + Grup 5'in 14 metninin onayı (`docs/34`) | siz |
| 4 | 322 ürünün aktarımı — `is_active` varsayılanı kararı sonrası | siz + Claude |
| 5 | Kalan 144 ürünün kontrollü gruplar hâlinde yayını | Claude |
| 6 | 104 A grubu + 1.407 B grubu uyumluluk araştırması (Volvo/Champion öncelikli) | Claude + katalog kaynakları |
| 7 | Neon kotası teyidi (Billing → Usage) | siz |

---

## Ölçülmeyenler

- **Kalan Neon kotası** — panel erişimi yok. Bu oturumda production'a 6
  sorgu turu atıldı (okuma + 4 toplu yazma); ölçülen aktif sorgu süresi
  toplamı saniyeler mertebesinde, ama CU-saat karşılığı **ölçülemedi**.
- **Pilot ürünlerin canlı görünümü** — toggle kapalı olduğu için
  doğrulanamadı.
- Production `UPSTASH_REDIS_REST_URL` varlığı (bekleyen iş olarak kaydedildi;
  katalog çalışması bunun için durdurulmadı).
- Google'ın fotoğrafsız parça sayfalarını fiilen nasıl sıraladığı.
