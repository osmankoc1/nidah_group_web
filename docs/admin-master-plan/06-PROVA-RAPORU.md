# Production Migration Provası — SONUÇ RAPORU

**Tarih:** 2026-11-18 · **Ortam:** yerel Docker `postgres:17` · **Git HEAD:** `5497e9b`

> **Production veritabanına yazılmadı.** Canlıya yalnızca salt okunur
> sorgular ve bir `pg_dump` (okuma) yapıldı. Migration'ların hiçbiri
> production'da çalıştırılmadı. Commit, push, deploy yok.

---

## 1. Özet

Dört migration, **production'ın birebir kopyası** üzerinde sırayla uygulandı,
geri alındı, yeniden uygulandı ve ikinci kez çalıştırıldı.

| Test | Sonuç |
|---|---|
| `0010` → `0011p` → `0012p` → `0013p` ileri yön | ✅ dördü de hatasız |
| Mevcut verinin korunması (parmak izi) | ✅ **birebir aynı** |
| Şema uyumluluğu (kodun beklediği 50 kolon) | ✅ **eksik 0** |
| Orijinal `0011` ve `0012`'nin production'da durduğu | ✅ **kanıtlandı**, iz bırakmadan |
| Geri alma (ters sırada) | ✅ şema tamamen döndü, **veri birebir aynı** |
| Geri almadan sonra yeniden uygulama | ✅ hatasız |
| İkinci kez çalıştırma (idempotentlik) | ✅ hatasız |
| `0013`'ün işlem sarmalı eksiği (K14) | ✅ **ölçüldü ve düzeltildi** |
| Yetki testi (K15) | ✅ `nidah_web` kayıt yazabiliyor; gizli anahtar reddediliyor |

**Hiçbir kontrol başarısız olmadı; düzeltme gerektiren bir sonuç çıkmadı.**

---

## 2. Prova ortamı ve hassas veri kapsamı (K17)

### 2.1 Kopyalanan ve KOPYALANMAYAN veri

Production'da **18 tablo** var. KVKK kapsamında kişisel veri taşıyan **tek**
tablo `rfq_submissions`'tır: `full_name`, `email`, `phone`, `company`,
`message`, `admin_note` — içinde **1 satır** var.

| | Karar |
|---|---|
| `rfq_submissions` **şeması** | kopyalandı (yapı kişisel veri değildir) |
| `rfq_submissions` **verisi** | **KOPYALANMADI** (`--exclude-table-data`) |
| Diğer 17 tablo (ürün, fotoğraf, uyumluluk, blog, ayarlar) | şema + veri kopyalandı |

Migration'ların hiçbiri `rfq_submissions`'a dokunmuyor; dolayısıyla verisinin
provaya alınması **gereksizdi**.

**Doğrulama:** döküm dosyasında e-posta deseni **0 eşleşme**, telefon deseni
**0 eşleşme**. Dökümdeki `COPY` blokları: **17** (rfq yok).

`blog_posts` tablosundaki `author_name` alanı şirketin kendi yazar adıdır,
müşteri verisi değildir; kopyalandı.

### 2.2 Yerel saklama koşulları

| | |
|---|---|
| Konteyner | `postgres:17`, adı `nidah-prova` |
| **Ağ** | **Hiçbir port dışarı açılmadı** — konteynere yalnızca `docker exec` ile erişildi |
| Kimlik doğrulama | Yerel `trust` (ağ erişimi olmadığı için dışarıdan ulaşılamaz) |
| Döküm dosyası | Oturumun geçici klasöründe (89 KB) |
| Saklama süresi | **Prova biter bitmez konteyner ve döküm silindi** (§9) |
| Roller | `nidah_rw` (grup) + `nidah_web` (üye) yerel olarak, parolasız, yalnızca yetki testi için |

---

## 3. Başlangıç durumu (production kopyası)

```
SAYIM|urun=3|gorsel=2|uyum=2|kategori=0|ayar=1|blog=2|ceviri=0|oem=0
URUN_IZI   | 3d0054d55f69956bbb013215f6a1406b
GORSEL_IZI | 59b45d0795a86c0164180bcc957d338a
UYUM_IZI   | 5347eb00cedb9aa7f5b89aec4890f067
DURUM      | aktif=2 | yayin=0 | stok=0
URUNLER    | 76281:aktif:yayin-degil  90898:aktif:yayin-degil  DENEMEE32424:pasif:yayin-degil
AYAR       | page_parca_katalog=false
```

Parmak izleri, **migration'lardan önce var olan kolonlar** üzerinden alınan
`md5` özetleridir. Yeni kolonlar bu hesaba girmez; böylece "mevcut veri
değişti mi" sorusu yeni alanlardan bağımsız yanıtlanır.

---

## 4. Blokerlerin kanıtlanması

Orijinal `0011` ve `0012`, production kopyasının **ayrı bir örneği** üzerinde
çalıştırıldı:

```
0011 → ERROR: 0011 durduruldu: product_images 2 satir iceriyor.
              CHECK kisiti eklenmeden once bu satirlar elle incelenmeli.

0012 → UPDATE 0        ← 12 kimliğin HİÇBİRİ production'da yok
       ERROR: 0012 POST-CHECK: urun sayisi degisti (beklenen 166, bulunan 3).
```

**İz kontrolü (hata sonrası):**
`yeni kolon = 0` · `is_synthetic = 0` · `yeni index = 0` · `ürün = 3`

Yani her iki dosya da `BEGIN … COMMIT` içinde olduğu için **hiçbir şey
uygulanmadan** geri alındı. Rapor §1'deki öngörü birebir doğrulandı.

Ayrıca `UPDATE 0` satırı, 0012'nin kimlik listesinin production'da **sıfır
satır** etkilediğinin doğrudan kanıtıdır — sentetik kayıtların canlıya
taşınması teknik olarak mümkün değil.

---

## 5. İleri yön: dört migration

| Sıra | Dosya | Sonuç | Kanıt (NOTICE) |
|---|---|---|---|
| 1 | `0010_internal_stock_code.sql` | ✅ | "hicbir mevcut kayit degismedi; yeni kolonlar NULL" |
| 2 | `0011p_product_image_verification_prod.sql` | ✅ | "mevcut 2 satirin tamami kisiti karsiliyor; hicbiri degistirilmedi" · "2 satir korundu, parmak izi AYNI (59b45d0795a8)" · "dogrulanmis gorsel sayisi 0" |
| 3 | `0012p_product_synthetic_flag_prod.sql` | ✅ | "3 urun korundu, parmak izi AYNI (3d0054d55f69), **isaretli kayit 0**" |
| 4 | `0013p_admin_bulk_audit_prod.sql` | ✅ | 10 kolon · 2 kısıt · 2 index · **0 yabancı anahtar** · "parola anahtari iceren kayit REDDEDILDI" |

### 5.1 Veri koruma kanıtı

Migration sonrası anlık görüntü, başlangıçla **satır satır karşılaştırıldı**:

```
FARK YOK — mevcut verinin tamami birebir korundu
```

Üç parmak izi de (`3d0054…`, `59b45d…`, `5347eb…`) **değişmedi**.
`DENEMEE32424` kaydı dokunulmadan, pasif ve yayın dışı kaldı (K16).

### 5.2 Şema uyumluluğu

Kodun seçtiği **50 kolonun tamamı** kopyada mevcut (`PRODUCT_COLUMNS_V4`,
`PRODUCT_IMAGE_COLUMNS_V2`, `FITMENT_COLUMNS_V2`, `admin_audit_log`):

```
EKSIK KOLON: 0        TOPLAM BEKLENEN KOLON: 50
```

### 5.3 Doğrulama kısıtının iki yönlü testi

| Deneme | Sonuç |
|---|---|
| `verified = true`, ALT/kaynak **yok** | ❌ **reddedildi** — `ck_product_images_verified_evidence` |
| `verified = true` + ALT + kaynak + zaman damgası | ✅ kabul edildi |

Yani yayın kapısının dayanağı veritabanı seviyesinde de duruyor: kanıtsız
doğrulama **yazılamıyor**.

---

## 6. K14 — işlem sarmalı ve hata davranışı (ölçüldü)

Çalıştırıcı `psql -v ON_ERROR_STOP=1 -f dosya` biçimindedir; `--single-transaction`
**kullanılmaz**. Bu yüzden sarmalı olmayan bir dosyada her ifade ayrı işlemdir.

Aynı hata (POST-CHECK zorla başarısız) iki sürümde denendi:

| Sürüm | Hata sonrası kalan |
|---|---|
| `0013` (sarmal **YOK**) | **tablo: admin_audit_log · index: 2 · kısıt: 2** |
| `0013p` (`BEGIN/COMMIT` **VAR**) | **tablo: YOK · index: 0 · kısıt: 0** |

Karar K14 bu ölçümle kapandı: production'da **`0013p`** kullanılacak.
`0013` dev kaydı olarak değiştirilmeden duruyor.

---

## 7. K15 — yetki kapsamı (değişiklik uygulanmadı)

Production'da ölçülen durum: tablo yetkileri **`nidah_rw` grup rolüne**
verilmiş, `nidah_web` bu grubun üyesi. `neondb_owner`'ın varsayılan yetki
kaydı (`pg_default_acl`) yeni tablolarda `nidah_rw`'ye
`INSERT/SELECT/UPDATE/DELETE` veriyor.

Provada `0013p` sonrası **etkin** yetkiler:

| Rol | Yetki | Kaynak |
|---|---|---|
| `nidah_rw` | DELETE, INSERT, SELECT, UPDATE | **varsayılan yetki kaydı** (migration değil) |
| `nidah_web` | INSERT, SELECT | `0013p`'nin açık GRANT'i |

**Uygulamanın gerçekte ihtiyacı:** yalnızca `INSERT` (`recordAdminAudit`).
İleride kayıt okuma ekranı için `SELECT`. `UPDATE`/`DELETE` **gerekmiyor** —
bir işlem kaydı değiştirilemez olmalı.

**Fonksiyonel test:** `nidah_web` rolüyle geçerli bir kayıt yazıldı ✅;
`{"password": "x"}` içeren kayıt **aynı rolle de reddedildi** ✅.

> **Açık kalan karar:** `nidah_rw`'nin `UPDATE`/`DELETE` yetkisini
> `admin_audit_log` üzerinde geri almak (`REVOKE`) ayrı bir karardır ve bu
> migration'ın kapsamında **değildir**. Talimatınız gereği hiçbir yetki
> değişikliği uygulanmadı.

---

## 8. Geri alma provası

Ters sırada çalıştırıldı: `0013p` → `0012p` → `0011p` → `0010`.

```
kalan_yeni_kolon = 0     kalan_yeni_index = 0     audit_tablo = YOK
FARK YOK — geri alma sonrasi veri BASLANGIC ile birebir ayni
```

**Beklenen ve ölçülen tek kayıp:** `0011p` geri alınırken, provada girilen
ALT metni ve kaynak notu (`Komatsu greyder fren surtunme plakasi…`,
`Depo cekimi 2026-11-18`) **silindi**. Ürün, fotoğraf dosyası ve diğer tüm
alanlar korundu. Bu yüzden gerçek geri almada **önce şu döküm alınmalıdır**:

```sql
SELECT id, product_id, verified, verified_at, verified_by, alt_text, source_note
  FROM product_images
 WHERE verified OR alt_text IS NOT NULL OR source_note IS NOT NULL;
```

**Geri almadan sonra yeniden uygulama** denendi: dördü de hatasız.
**İkinci kez çalıştırma** (idempotentlik) denendi: dördü de hatasız.
İki tam turdan sonra veri hâlâ başlangıçla birebir aynı.

---

## 9. Prova ortamının temizlenmesi

Prova tamamlandıktan sonra `nidah-prova` konteyneri silindi ve production
dökümü geçici klasörden kaldırıldı (§11'de doğrulaması var). Production
verisinin yerel kopyası **saklanmıyor**.

---

## 10. Production'a geçiş planı (onay bekliyor)

### 10.1 Sıra — değiştirilemez

```
1. drizzle/0010_internal_stock_code.sql                (değişmedi)
2. drizzle/0011p_product_image_verification_prod.sql   (YENİ — production varyantı)
3. drizzle/0012p_product_synthetic_flag_prod.sql       (YENİ — production varyantı)
4. drizzle/0013p_admin_bulk_audit_prod.sql             (YENİ — production varyantı)
5. (ayrı onay) commit → push = otomatik deploy
```

`0011`, `0012` ve `0013` **production'da ÇALIŞTIRILMAZ**; dev kaydı olarak
depoda kalır.

**Neden migration önce:** `/api/products` ve `/api/products/[partNumber]`
açık uçları `product_images.verified` kolonunu okuyor. Kod önce giderse bu
uçlar **500** döner. Ters yön güvenlidir: eski kod yeni kolonları hiç seçmez.

### 10.2 Çalıştırma komutu (her dosya için ayrı)

```powershell
docker run --rm -i -e OWNER_PROD_DIRECT_URL -e PGCLIENTENCODING=UTF8 postgres:17 sh -c 'psql "$OWNER_PROD_DIRECT_URL" -v ON_ERROR_STOP=1 -f -' < drizzle/0010_internal_stock_code.sql
```

Her çalıştırmadan sonra **NOTICE satırları okunur**; `ERROR` görülürse
sonraki dosyaya geçilmez.

### 10.3 Her adımdan sonra doğrulama

```sql
-- Parmak izi: migration'lardan ÖNCE alınan değerle aynı olmalı
SELECT md5(string_agg(t::text, '|' ORDER BY t.id))
  FROM (SELECT id, part_number, part_number_normalized, name, description,
               condition, category_id, weight, notes, is_active, in_stock,
               part_manufacturer, sourcing_type, stock_status,
               stock_status_updated_at, short_description, long_description,
               meta_title, meta_description, seo_ready, seo_ready_at, created_at
          FROM products) t;

-- Değişmezler
SELECT count(*) FILTER (WHERE is_active) aktif,        -- 2
       count(*) FILTER (WHERE seo_ready) yayin,        -- 0
       count(*) FILTER (WHERE is_synthetic) sentetik,  -- 0  (0012p sonrası)
       count(*) urun                                   -- 3
  FROM products;
SELECT count(*) FROM product_images WHERE verified;    -- 0  (0011p sonrası)
```

### 10.4 Deploy sonrası

- `sitemap.xml` → 200 · **63 URL** · katalog 0 · mükerrer 0
- `/parca-katalog` → **404** · ana sayfa → 200
- **`/api/products?limit=1` → 200** (0011'in asıl testi)
- Admin paneli: liste, filtreler, kategori ekranı, ürün düzenleme
- Tek bir toplu işlem → `admin_audit_log`'da kayıt

---

## 11. Kalan riskler

| # | Risk | Durum |
|---|---|---|
| R1 | Kod migration'dan önce deploy edilir | Sıra zorunlu; `push = deploy` olduğu için push **en son** |
| R2 | 2 production fotoğrafı doğrulanmadığı için public yüzeyde görünmez | **Tasarım gereği** (K2). Bugün etkisi yok (katalog kapalı). Katalog açılmadan önce ALT + kaynak girilmeli |
| R3 | Geri almada ALT/kaynak kaybı | Provada **ölçüldü**; §8'deki döküm sorgusu zorunlu adım |
| R4 | `nidah_rw`'nin `UPDATE`/`DELETE` yetkisi | Varsayılan yetki kaydından geliyor; daraltma **ayrı karar** |
| R5 | Production yedeğinin geri yüklenebilirliği | Prova, production dökümünün temiz geri yüklendiğini **gösterdi** (rfq verisi hariç). Gerçek geçişte **tam** yedek alınmalı |
| R6 | `DENEMEE32424` kaydı | Dokunulmadı (K16). Pasif ve yayın dışı; public etkisi yok |

---

## 12. Onayınızı bekleyenler

1. **Production migration'larını çalıştırma** (`0010`, `0011p`, `0012p`, `0013p`)
   — kimin çalıştıracağı dahil (K18)
2. **Commit** (Faz 1–6 kod değişiklikleri + 3 yeni migration dosyası)
3. **Push = deploy**
4. (İsteğe bağlı) `admin_audit_log` üzerinde `nidah_rw`'nin `UPDATE`/`DELETE`
   yetkisinin geri alınması

---

## 13. Bu provada YAPILMAYANLAR

- Production veritabanına **yazılmadı** (yalnızca salt okunur sorgular + `pg_dump`)
- Production'da **hiçbir migration çalıştırılmadı**
- **Hiçbir yetki değişikliği uygulanmadı** (ne production'da ne development'ta)
- Development veritabanına dokunulmadı
- `DENEMEE32424` kaydı **silinmedi, değiştirilmedi**
- `rfq_submissions` verisi (kişisel veri) **kopyalanmadı**
- Commit, push, deploy **yok** · `HEAD` hâlâ `5497e9b`
