# Production Migration — UYGULAMA RAPORU

**Tarih:** 2026-11-18 · **Durum:** ✅ dört migration da uygulandı ve doğrulandı
**Git HEAD:** `5497e9b` — **commit, push, deploy YAPILMADI**

---

## 1. Özet

| Adım | Sonuç |
|---|---|
| Hedef doğrulaması | ✅ `neondb` · 3 ürün · 2 fotoğraf |
| Güncel tam yedek | ✅ 96.348 bayt · 18 tablo · geri yükleme **0 hata** |
| `0010` | ✅ uygulandı |
| `0011p` | ✅ uygulandı |
| `0012p` | ✅ uygulandı |
| `0013p` | ✅ uygulandı |
| Mevcut verinin korunması | ✅ **dördünden sonra da birebir aynı** |
| Canlı site | ✅ etkilenmedi (sitemap 63 URL, katalog 404) |
| Kod deploy | ⏸ **yapılmadı — onayınız bekleniyor** |

Kesinti olmadı. Beklenmeyen tek bir sonuç çıkmadı; hiçbir adımda durmak
gerekmedi.

---

## 2. Hedef doğrulaması (şart 1)

Migration öncesi, salt okunur:

```
veritabanı : neondb          rol: nidah_web / neondb_owner
sürüm      : PostgreSQL 17.12
ürün 3 · fotoğraf 2 · teklif 1 · ayar 1 · seo_ready 0 · stok iddiası 0
```

DDL için sahiplik gerektiğinden migration'lar `neondb_owner` bağlantısıyla
çalıştırıldı; bu bağlantının da aynı veritabanını (`neondb`, 3 ürün) ve
`products` tablosunun sahibini (`neondb_owner`) gösterdiği ayrıca doğrulandı.

---

## 3. Güncel yedek (şart 1 ve 2)

| | |
|---|---|
| Dosya | `prod_migration_oncesi_20261118-154511.sql` |
| Konum | `~/.osko/backups/` (erişimi kısıtlı) |
| Boyut | 96.348 bayt · `pg_dump` çıkışı 0 · stderr boş |
| İçerik | **18 tablo**: products **3**, product_images **2**, fitments 2, rfq_submissions 1, site_settings 1, blog 2 … |
| Geri yükleme testi | İzole Docker (ağ portu yok) → **0 hata**, çıkış kodu 0 |
| Doğrulama | Her tablonun `md5` özeti **canlı production ile birebir aynı** |

Doğrulama geçtiği için migration'lara geçildi. (Geçmeseydi hiçbir migration
çalıştırılmayacaktı.)

Bir önceki yedek (`prod_tam_20261118-153302.sql`) de duruyor; iki dosya
birbirinin aynısı (aradaki 12 dakikada veri değişmemiş).

---

## 4. Migration'lar (şart 3 ve 4)

Sıra: `0010` → `0011p` → `0012p` → `0013p`. Her biri ayrı çalıştırıldı,
çıktısı okundu, ardından veri bütünlüğü kontrol edildi.

### 4.1 `0010_internal_stock_code.sql`

```
NOTICE: 0010 tamam: internal_stock_code + normalized kolonlari ve 2 index hazir.
NOTICE: 0010: hicbir mevcut kayit degismedi; yeni kolonlar NULL.
COMMIT · çıkış kodu 0
```

**Kontrol:** mevcut verinin tamamı birebir aynı.

> **Ara bulgu (kusur değil):** ilk kontrol sorgum `SELECT *` kullanıyordu;
> iki yeni NULL kolon eklenince satırların metin gösterimi (`(a,b,c)` →
> `(a,b,c,,)`) değiştiği için özet farklı çıktı. Bunu **veri değişikliği
> sanmadım**, doğruladım: migration'ların içindeki gibi **açık kolon
> listesiyle** hesaplanan parmak izi, yedekten geri yüklenen
> migration-öncesi kopyayla karşılaştırıldı ve **birebir aynı** çıktı.
> Sonraki tüm kontroller bu yöntemle yapıldı.

### 4.2 `0011p_product_image_verification_prod.sql`

```
NOTICE: 0011p PREFLIGHT: product_images 2 satir, parmak izi 59b45d0795a8
NOTICE: 0011p: mevcut 2 satirin tamami kisiti karsiliyor; hicbiri degistirilmedi.
NOTICE: 0011p KANIT: 2 satir korundu, parmak izi AYNI (59b45d0795a8).
NOTICE: 0011p: dogrulanmis gorsel sayisi 0 — hicbir urun bu migration ile yayina acilmadi.
COMMIT · çıkış kodu 0
```

**Kontrol:** veri birebir aynı · `product_images` **12 kolon** (7 + 5) ·
`ck_product_images_verified_evidence` kısıtı **yerinde** ·
doğrulanmış görsel **0** · 2 fotoğraf **korundu**.

### 4.3 `0012p_product_synthetic_flag_prod.sql`

```
NOTICE: 0012p PREFLIGHT: products 3 satir, parmak izi 3d0054d55f69
NOTICE: 0012p KANIT: 3 urun korundu, parmak izi AYNI (3d0054d55f69), isaretli kayit 0.
COMMIT · çıkış kodu 0
```

**Kontrol:** ürün **3** · sentetik işaretli **0** · gerçek **3**.
`DENEMEE32424` kaydı dokunulmadan, `is_synthetic = false` olarak kaldı.

### 4.4 `0013p_admin_bulk_audit_prod.sql`

```
NOTICE: 0013p YETKI verildi: nidah_rw  -> admin_audit_log (SELECT, INSERT)
NOTICE: 0013p YETKI verildi: nidah_web -> admin_audit_log (SELECT, INSERT)
NOTICE: 0013p YETKI atlandi: nidah_dev rolu bu veritabaninda yok
NOTICE: POST-CHECK kolon 10 · kisit 2 · index 2 · yabanci anahtar 0 · kayit 0
NOTICE: 0013p KANIT: parola anahtari iceren kayit REDDEDILDI (beklenen davranis).
COMMIT · çıkış kodu 0
```

Gizli anahtar kısıtı **canlı veritabanında da** kanıtlandı.

---

## 5. Son durum — veri bütünlüğü (şart 5, 6, 7)

Migration öncesi yedekten geri yüklenen kopya ile canlı production
karşılaştırması:

```
URUN   | 3 | 3acacb6be7eaf82ecbe42e71a5750259   ← aynı
GORSEL | 2 | d41da976722967b5f0942f0413d2d8b9   ← aynı
UYUM   | 2 | 6e1355b8fd5e8ac11de4223f1aafb01e   ← aynı
RFQ    | 1 | 9d16fe75064da0310a60e662ed04001b   ← aynı
AYAR   | 1 | f5ba3a24190c252cfbf566315b808870   ← aynı
DURUM  | aktif=2 | yayin=0 | stok=0
URUNLER| 76281:aktif · 90898:aktif · DENEMEE32424:pasif
KATALOG| false

SON KANIT: mevcut verinin tamami BIREBIR AYNI (dort migration sonrasi)
```

| Şart | Durum |
|---|---|
| 3 ürün korundu | ✅ |
| 2 fotoğraf korundu | ✅ |
| Müşteri kayıtları (teklif) korundu | ✅ özet aynı |
| Site ayarları korundu | ✅ `page_parca_katalog = false` |
| Katalog kapalı | ✅ `/parca-katalog` → **404** |
| Otomatik yayın yok | ✅ `seo_ready` = **0** |
| Stok iddiası yok | ✅ **0** |
| 154 dev ürünü aktarılmadı | ✅ production'da ürün sayısı **3** |

---

## 6. Şema değişikliği

| | Önce | Sonra |
|---|---|---|
| Tablo | 18 | **19** (`admin_audit_log`) |
| Index | 72 | **79** |
| Yabancı anahtar | 15 | **15** (değişmedi) |
| Yeni kolon | — | **8** (`products` 3, `product_images` 5) |

---

## 7. Canlı site kontrolü (migration'dan sonra)

Şu an canlıda **eski kod + yeni şema** çalışıyor — plandaki güvenli pencere:

| Kontrol | Sonuç |
|---|---|
| `sitemap.xml` | **200** · 63 URL · katalog 0 · mükerrer 0 |
| Ana sayfa | **200** |
| `/parca-katalog` | **404** |
| `/api/products?limit=1` | **200** |
| `/teklif-al` | **200** |
| `/blog` | **200** |

Kesinti yaşanmadı.

---

## 8. Riskler ve açık noktalar

| # | Konu | Durum |
|---|---|---|
| R1 | **Kod henüz deploy edilmedi** | Yeni şema + eski kod güvenli; bu pencere istediğiniz kadar sürebilir. Yeni kod deploy edilene kadar panelin yeni özellikleri canlıda görünmez |
| R2 | 2 fotoğraf artık "doğrulanmamış" | Katalog kapalı olduğu için görünür etki yok. Katalog açılmadan önce ALT metni + kaynak notu girilip doğrulanmalı |
| R3 | `nidah_rw` varsayılan yetki kaydı | `admin_audit_log` üzerinde `UPDATE`/`DELETE` de veriyor; daraltma ayrı karar (uygulanmadı) |
| R4 | Geri alma penceresi | Şema geri alınabilir; `0011p` geri alınırsa ALT/kaynak alanları gider (şu an boş, kayıp yok) |
| R5 | Yedek dosyaları kişisel veri içeriyor | İki dosya `~/.osko/backups/` altında duruyor; geçiş bitince silinmeli veya şifrelenmeli |

---

## 9. Geri alma (gerekirse)

Kod henüz deploy edilmediği için **şema tek başına** geri alınabilir:

```sql
DROP TABLE IF EXISTS admin_audit_log;                                    -- 0013p
DROP INDEX IF EXISTS idx_products_synthetic;
ALTER TABLE products DROP COLUMN IF EXISTS is_synthetic;                 -- 0012p
ALTER TABLE product_images DROP CONSTRAINT IF EXISTS ck_product_images_verified_evidence;
DROP INDEX IF EXISTS idx_product_images_verified;
ALTER TABLE product_images DROP COLUMN IF EXISTS verified, DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS verified_by, DROP COLUMN IF EXISTS alt_text, DROP COLUMN IF EXISTS source_note;  -- 0011p
DROP INDEX IF EXISTS idx_products_internal_stock_code;
DROP INDEX IF EXISTS idx_products_internal_stock_code_norm;
ALTER TABLE products DROP COLUMN IF EXISTS internal_stock_code,
  DROP COLUMN IF EXISTS internal_stock_code_normalized;                  -- 0010
```

Kod deploy edildikten SONRA geri alma sırası değişir: **önce kod, sonra şema**.

---

## 10. Sıradaki adım

Migration aşaması bitti ve **durdum**. Kod commit ve deploy için ayrı
onayınız bekleniyor:

| # | Onay | Durum |
|---|---|---|
| 1 | **Commit** (Faz 1–6 kodu + 7 migration dosyası + belgeler) | bekliyor |
| 2 | **Push = deploy** | bekliyor |
| 3 | (isteğe bağlı) `nidah_rw` yetki daraltması | bekliyor |
