# 13 Bulgu — Durum Tablosu

> Güncelleme kuralı: her fazın sonunda. Durumlar:
> `bekliyor` · `sürüyor` · `tamam` · `bloke` · `geri çekildi`

**Son güncelleme:** 2026-11-18 · **Faz 0–6 TAMAM** (13/13 bulgu kapandı, tarayıcı doğrulaması dahil)

| # | Önem | Bulgu | Faz | Durum | Tarih | Not |
|---|---|---|---|---|---|---|
| P1 | 🔴 Kritik | Mobilde sekme şeridi taşıyor (Çeviriler + Yayın erişilemiyor) | 1 | ✅ **tamam** | 2026-11-17 | `tabs.tsx` taşma yönetimi + 2 sabit ızgara duyarlı yapıldı. 375/768/masaüstünde belge taşması **0** |
| **P2** | — | ~~Mobilde üst menü erişilemiyor~~ | — | **geri çekildi** | 2026-11-17 | **Ölçüm hatası.** `nav` şeridinde `overflow-x-auto` zaten var; "Sayfalar" erişilebilir |
| P3 | 🟠 Yüksek | Yayın düğmesi ölçüt karşılanmadan tıklanabilir | 1 | ✅ **tamam** | 2026-11-17 | Düğme `readiness.eligible`'a bağlandı + eksik sayısı ipucu. **Sunucu kapısı değişmedi** |
| P4 | 🟠 Yüksek | Liste filtresi yok; sentetik kayıtlar ayrılmıyor | 2 | ✅ **tamam** | 2026-11-17 | `drizzle/0012` uygulandı (12 kayıt KİMLİKLE işaretlendi); 6 filtre + sentetik görünürlüğü. Varsayılan liste **154 gerçek ürün** |
| P5 | 🟠 Yüksek | Toplu işlem yok | 4 | ✅ **tamam** | 2026-11-18 | 5 eylem + `confirm: true` zorunlu + kayıt başına kapı + `admin_audit_log` (`drizzle/0013`) + fotoğraf föyü CSV. Toplu silme/doğrulama YOK |
| P6 | 🟠 Yüksek | Kategori alanı düzenleme ekranında yok | 4 | ✅ **tamam** | 2026-11-18 | Seçici + `/admin/categories` ekranı + 2 yeni uç. Döngü ve silme koruması. Ağaç BOŞ kalır (Y1 ertelendi) |
| P7 | 🟡 Orta | Aktif/Pasif anahtarı düzenleme ekranında yok | 4 | ✅ **tamam** | 2026-11-18 | `ActiveStatusControl` + AYRI rozet. Pasifleştirme yayın onayını GERİ ALMAZ |
| P8 | 🟡 Orta | açıklama eşiği metni ile kapı çelişiyordu | 1 | ✅ **tamam** | 2026-11-20 | **Politika tersine döndü:** 300 karakter artık yayın şartı değil, önerilen hedef. Yayını engelleyen tek içerik şartı açıklamanın BOŞ olmaması (`long_description_missing`). Her iki ekran da tavsiye dili kullanıyor. Ayrıntı: `19-ESIK-KALDIRMA-UYGULAMA-RAPORU.md` |
| P9 | 🟡 Orta | Meta sayaç + SERP önizleme yok | 3 | ✅ **tamam** | 2026-11-17 | `SerpPreview.tsx`; DB sınırı (255) ile Google eşiği (~60/~155) ayrı gösteriliyor; boş metada sayfanın yedeği |
| P10 | 🟠 Yüksek | Fotoğraf şartları yüklemeden önce görünmüyor | 3 | ✅ **tamam** | 2026-11-17 | Boş duruma kalıcı bilgi kutusu; eşik `IMAGE_ALT_TEXT_MIN`'den. **Depo turu öncesi hazır** |
| P11 | 🟡 Orta | Çeviri yayınında ölçüt kontrolü yok | 3 | ✅ **tamam** | 2026-11-17 | `translation-gate.ts` — ad + gövde (≥120). Taslak her zaman serbest; `seo_ready`'ye dokunmaz |
| P12 | 🟢 Düşük | Uyumluluk kaydı düzenlenemiyor | 4 | ✅ **tamam** | 2026-11-18 | Satır içi NOT düzenleme; makine eşleşmesi bilinçli olarak değişmez; doğrulamaya dokunmaz |
| P13 | 🟡 Orta | Liste API'si yayın hazırlığı alanlarını döndürmüyor | 2 | ✅ **tamam** | 2026-11-17 | 7 türetilmiş alan, toplu sorgu (N+1 yok), kapı AYNI kaynaktan. Canlı doğrulama: 154 gerçek ürün, **42 kısa açıklama** — DB ile birebir |
| **Y3** | 🟡 Orta | Liste sıralanamıyor (`orderBy` sabit) | 2 | ✅ **tamam** | 2026-11-17 | 5 sıralama alanı (beyaz liste) + yön; `publishReadiness` 0–3 hazırlık puanı |

## Kapsam dışı (K11 ile ertelendi)

| # | Bulgu | Durum |
|---|---|---|
| Y1 | `categories` tablosu 0 satır — kategori ağacı kararı | **ertelendi** |
| Y2 | Admin panelinde splash ekranı operatörü bekletiyor | **ertelendi** |

## Özet

- Geçerli bulgu: **13** (12 orijinal + Y3)
- Geri çekilen: **1** (P2)
- Tamamlanan: **13** (P1, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, Y3)
- Bekleyen: **0**

## Faz 1'de ortaya çıkan ek düzeltme

P1'in kabul kriteri "belge yatay taşması yok" idi. Sekme şeridi düzeltildikten
sonra belge **hâlâ 406/375 taşıyordu**. Kaynak bulundu: ürün düzenleme
ekranındaki **iki sabit `grid-cols-2` ızgarası** 375px'te daralmıyor ve
"Stok Durumu" seçicisi (211px) belgeyi taşırıyordu. Dosyadaki yerleşik kurala
(`grid-cols-1 sm:grid-cols-2`, satır 385 ve 479) uyduruldu. Yeni bulgu olarak
numaralandırılmadı; P1'in kapsamında kapatıldı.


## Faz 3'te ortaya çıkan ek düzeltmeler

1. **Sekme şeridinde dikey kaydırma oku.** `overflow-x: auto` CSS'te
   `overflow-y`yi de `auto`ya çeviriyor ve şeridin sağında gereksiz bir ok
   beliriyordu. `overflow-y-hidden` eklendi (P1'in kapsamında).
2. **`partManufacturer` alanında sabit `maxLength={255}`.** P9 ile aynı ilke
   gereği `FIELD_LIMITS.partManufacturer`'a bağlandı. Yeni bulgu olarak
   numaralandırılmadı.


## Faz 4'te ortaya çıkan ek düzeltmeler ve kararlar

1. **`products.category_id` ham geçiyordu.** `PATCH /api/admin/products/[id]`
   `categoryId`'yi doğrulamadan sürücüye veriyordu: geçersiz bir uuid 400
   yerine **500** üretirdi. Alan beyaz listeden çıkarıldı, ayrıca
   doğrulanıyor ve kategorinin VARLIĞI kontrol ediliyor. Aynısı ürün
   oluşturma (`POST`) yolunda da yapıldı.
2. **`categories.parent_id` yabancı anahtar taşımıyor** (şemadaki mevcut
   durum). Üst kategorinin varlığı ve DÖNGÜSÜZLÜK bu yüzden uygulama
   tarafında zorunlu kılındı (`src/lib/category-tree.ts`).
3. **`products.category_id` FK'si `ON DELETE SET NULL`.** Dolu bir kategoriyi
   silmek ürünlerin kategorisini SESSİZCE boşaltırdı; dolu veya alt
   kategorisi olan kategori artık 409 ile reddediliyor.
4. **`fitments.notes` için sınır yoktu** (`text` kolonu). Satır içi düzenleme
   açılırken arayüz ve sunucu AYNI sabitten besleniyor
   (`FIELD_LIMITS.fitmentNotes = 500`); değer kırpılmaz, kayıt reddedilir.
5. **`admin_audit_log` yetkisi.** Tabloyu `neondb_owner` oluşturur ama
   uygulama başka rolle bağlanır. Yetki verilmezse işlem kaydı sessizce
   yazılamazdı; migration rolün varlığını kontrol edip `GRANT SELECT,
   INSERT` veriyor (dev'de gereksiz, production'da gerekli).


## Faz 5 (tarayıcı doğrulaması) sırasında bulunan kusur

**Toplu işlem sonucunda gerekçeler ham kod olarak gösteriliyordu.**
Ekranda `Yayın ölçütleri karşılanmıyor. (inactive, no_verified_image,
long_description_too_short)` yazıyordu; bu, paneli kullanan kişiye ne
yapması gerektiğini SÖYLEMİYOR. Sunucu zaten Türkçe gerekçeleri
(`seo-gate.ts` → `REASON`) hesaplıyordu ama yalnızca işlem kaydına
yazıyordu. Uç artık `reasons` alanını da döndürüyor, arayüz onu gösteriyor;
ham kod listesi (`unmet`) yanıtta log/geliştirici tarafı için duruyor.
Düzeltme development'ta yapıldı, test eklendi ve canlı doğrulandı.


## İleride değerlendirilecek küçük iyileştirme (2026-11-19)

**Y4 — fotoğraf doğrulama düğmesinde istemci tarafı ayna kontrol yok.**
`ImagesManager` içindeki "Bu fotoğrafı doğrula" düğmesi yalnızca istek
sürerken pasifleşiyor; ALT metni 15 karakterin altındayken veya kaynak notu
boşken **pasifleşmiyor**. Kural iki katmanda zaten uygulanıyor —
`parseImageAltText` 400 döndürüyor ve veritabanındaki
`ck_product_images_verified_evidence` kısıtı yazmayı reddediyor — yani
**güvenlik açığı değil**. Ancak P3'te yayın düğmesi için yaptığımız "aynı
kararı önden göster" yaklaşımıyla tutarsız: operatör başarısız olacağı belli
bir eylemi deneyebiliyor. Öncelik düşük; ayrı bir iş olarak değerlendirilir.
