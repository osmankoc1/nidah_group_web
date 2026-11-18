# Production Migration Onay Paketi — DENETİM RAPORU

**Tarih:** 2026-11-18 · **Durum:** yalnızca inceleme · **Git HEAD:** `5497e9b`

> **Bu belgenin hazırlanması sırasında hiçbir değişiklik yapılmadı.**
> Production ve development veritabanlarına **yazılmadı**, migration
> çalıştırılmadı, commit/push/deploy yapılmadı. Production sorguları
> `BEGIN READ ONLY;` işlemi içinde, yalnızca sınırlı `nidah_web` rolüyle
> çalıştırıldı: o işlemde bir yazma denense PostgreSQL hata verip durdururdu.

---

## 1. Özet

Dört migration'ın production'a etkisi tek tek incelendi. **İki tanesi şu
hâliyle production'da ÇALIŞMAZ** — ikisi de bilinçli korumalar yüzünden
durur, sessizce yanlış iş yapmaz. Bu, paketin en önemli bulgusudur.

| Migration | Production'da çalışır mı | Neden |
|---|---|---|
| `0010` internal_stock_code | ✅ **Evet** | Yalnızca 2 kolon + 2 index ekler, satır varsayımı yok |
| `0011` görsel doğrulama | ❌ **HAYIR — durur** | Preflight: "product_images boş değilse önce elle incele" (production'da **2 görsel var**) |
| `0012` sentetik işaret | ❌ **HAYIR — durur** | POST-CHECK dev'e özgü: "ürün sayısı 166 olmalı" (production'da **3**) |
| `0013` işlem kaydı | ✅ **Evet** | Yeni ve boş tablo; mevcut hiçbir nesneye dokunmaz |

Ayrıca: **hiçbir migration `DROP`, `DELETE` veya `TRUNCATE` içermiyor.**
Tüm dosyalarda yalnızca iki veri yazma ifadesi var ve ikisi de production'da
**sıfır satırı** etkiler (§6).

---

## 2. Production'ın bugünkü durumu (ölçüldü)

**Hedef:** `neondb` · rol `nidah_web` · **PostgreSQL 17.12**

| Tablo | Satır | Boyut |
|---|---|---|
| `products` | **3** (2 aktif, 1 pasif) | 136 kB |
| `product_images` | **2** (ikisi de birincil) | 48 kB |
| `fitments` | **2** | 96 kB |
| `categories` | **0** | 32 kB |
| `site_settings` | **1** (`page_parca_katalog = false`) | 32 kB |
| `product_translations` | **0** | — |

| Ölçüt | Değer |
|---|---|
| `seo_ready = true` ürün | **0** |
| Stok iddiası (`stock_status <> 'unknown'`) | **0** |
| Sitemap'teki ürün URL'si | **0** (ürün yayını yok) |

**Canlı site referansı (aynı anda ölçüldü):** `sitemap.xml` → **200**,
`application/xml`, **63 URL**, katalog URL **0**, mükerrer **0** ·
`/parca-katalog` → **404** · ana sayfa → **200**.

**Ürünler:** `76281` (aktif), `90898` (aktif), `DENEMEE32424` (pasif).
İki görsel `76281` ve `90898` ürünlerine ait.

---

## 3. Development ↔ Production şema farkı

| Nesne | Dev | Prod | Hangi migration getirir |
|---|---|---|---|
| `products.internal_stock_code` | ✅ | ❌ | `0010` |
| `products.internal_stock_code_normalized` | ✅ | ❌ | `0010` |
| `idx_products_internal_stock_code(_norm)` | ✅ | ❌ | `0010` |
| `product_images.verified` | ✅ | ❌ | `0011` |
| `product_images.verified_at` / `verified_by` | ✅ | ❌ | `0011` |
| `product_images.alt_text` / `source_note` | ✅ | ❌ | `0011` |
| `idx_product_images_verified` | ✅ | ❌ | `0011` |
| `ck_product_images_verified_evidence` | ✅ | ❌ | `0011` |
| `products.is_synthetic` | ✅ | ❌ | `0012` |
| `idx_products_synthetic` | ✅ | ❌ | `0012` |
| `admin_audit_log` (tablo + 2 index + 2 kısıt) | ✅ | ❌ | `0013` |

**Zaten ORTAK olanlar** (fark yok, migration gerekmez):
`part_number_normalized` + `uq_products_pn_norm` · `part_manufacturer` ·
`sourcing_type` · `stock_status` + `stock_status_updated_at` ·
`short_description` / `long_description` / `meta_title` / `meta_description` ·
`seo_ready` + `seo_ready_at` · `fitments.verified` / `verified_at` / `source` ·
`product_translations` (`published` dahil) · `categories` tablosu.

Yani **`0008` ve `0006`/`0007` production'da uygulanmış durumda**; eksik olan
yalnızca `0010`–`0013`.

**Rol farkı:** production'da `nidah_dev` rolü **yoktur**; `nidah_web` vardır ve
**`nidah_rw` grup rolünün üyesidir**. Tablo yetkileri doğrudan `nidah_web`'e
değil, `nidah_rw`'ye verilmiştir ve `neondb_owner`'ın varsayılan yetki kaydı
(`pg_default_acl`) yeni tablolarda `nidah_rw`'ye otomatik `INSERT/SELECT/
UPDATE/DELETE` verir.

---

## 4. Migration'lar tek tek

### 4.1 `0010_internal_stock_code.sql` — ✅ production'a hazır

| | |
|---|---|
| **Ne yapar** | `products`'a 2 NULL kolon + 2 kısmi index ekler |
| **Mevcut veri** | Değişmez; yeni kolonlar tüm satırlarda `NULL` |
| **İşlem** | `BEGIN … COMMIT` + `statement_timeout 30s` + `lock_timeout 5s` |
| **Kilit** | `ALTER TABLE ADD COLUMN` (varsayılansız) → metadata değişikliği, tablo yeniden yazılmaz |
| **Süre** | 136 kB tabloda milisaniyeler |
| **Preflight** | Tablo var mı; aynı adda FARKLI tipte kolon var mı |
| **POST-CHECK** | 2 kolon + 2 index; satır sayısı varsayımı **yok** |
| **Prod etkisi** | Yok. Kolonlar boş; public yüzey bu kolonları okumaz |
| **Geri alma** | `DROP INDEX idx_products_internal_stock_code; DROP INDEX idx_products_internal_stock_code_norm; ALTER TABLE products DROP COLUMN internal_stock_code, DROP COLUMN internal_stock_code_normalized;` |
| **Geri almada veri kaybı** | Yalnızca o kolonlara yazılmış Logo stok kodları (şu an: hiç) |

### 4.2 `0011_product_image_verification.sql` — ❌ ŞU HÂLİYLE DURUR

| | |
|---|---|
| **Ne yapar** | `product_images`'a 5 kolon + 1 kısmi index + 1 CHECK kısıtı ekler |
| **Mevcut veri** | Değişmez; 2 görsel `verified = false` olur (varsayılan) |
| **İşlem** | `BEGIN … COMMIT` + timeout'lar |
| **BLOKER** | Preflight şöyle der: *"product_images 2 satır içeriyor. CHECK kısıtı eklenmeden önce bu satırlar elle incelenmeli."* → **EXCEPTION**, migration hiç uygulanmaz |
| **Elle inceleme SONUCU (bu denetimde yapıldı)** | 2 satır: `76281` ve `90898` ürünlerinin birincil görselleri. İkisi de `verified = false` olacak; CHECK kısıtı bu hâli **kabul eder** (`verified=false` → `verified_at`/`verified_by` NULL). Yani kısıt mevcut satırları reddetmez |
| **Kilit** | `ADD CONSTRAINT … CHECK` → ACCESS EXCLUSIVE + mevcut 2 satırın doğrulanması; anlık |
| **Prod etkisi (ÖNEMLİ)** | Yeni kod ile birlikte: bu 2 fotoğraf **public yüzeyde gösterilmez** (karar K2 — doğrulanmamış fotoğraf yoktur sayılır). Bugün görünür etkisi **yok**, çünkü katalog toggle'ı kapalı ve ürün sayfaları 404. Katalog açılmadan önce bu 2 fotoğrafa **ALT metni + kaynak notu girilip doğrulanmalı**, yoksa ürün kartlarında temsilî görsel çıkar |
| **POST-CHECK** | 5 kolon, 1 index, 1 kısıt ve **`verified = true` sayısı 0** (hiçbir görsel otomatik doğrulanmaz) |
| **Geri alma** | `ALTER TABLE product_images DROP CONSTRAINT ck_product_images_verified_evidence; DROP INDEX idx_product_images_verified; ALTER TABLE product_images DROP COLUMN verified, DROP COLUMN verified_at, DROP COLUMN verified_by, DROP COLUMN alt_text, DROP COLUMN source_note;` |
| **Geri almada veri kaybı** | O ana kadar girilmiş ALT metinleri ve kaynak notları **kaybolur** |

> **Karar gerekiyor (K12).** Üç seçenek §8'de.

### 4.3 `0012_product_synthetic_flag.sql` — ❌ ŞU HÂLİYLE DURUR

| | |
|---|---|
| **Ne yapar** | `products`'a `is_synthetic boolean NOT NULL DEFAULT false` + kısmi index; sonra **12 KİMLİĞİ** işaretler |
| **BLOKER (üç ayrı yerde)** | POST-CHECK dev'e göre yazılmış: `toplam <> 166` → production'da **3** · `isaretli <> 12` → production'da **0** · "desenli ama işaretlenmemiş kayıt kaldı mı" → production'da **1** |
| **UPDATE'in production etkisi** | **0 satır.** 12 kimliğin hiçbiri production'da yok (salt okunur sorguyla doğrulandı: eşleşen = 0) |
| **Desen uyarısı** | Production'da `DENEMEE32424` (ad: `DESWFSEDF`, **pasif**, yayında değil, 2026-03-10) kaydı `TEST\|ATOM\|DUMMY\|SAMPLE\|ORNEK\|DENEME` desenine **uyuyor**. 0012 desenle işaretleseydi bu GERÇEK production kaydı yanlışlıkla sentetik sayılacaktı — kimlik listesi yaklaşımı bunu önlüyor |
| **Kilit / süre** | `ADD COLUMN … NOT NULL DEFAULT false` → PostgreSQL 11+ tabloyu yeniden yazmaz; anlık |
| **Geri alma** | `DROP INDEX idx_products_synthetic; ALTER TABLE products DROP COLUMN is_synthetic;` |
| **Geri almada veri kaybı** | Yok (production'da hiçbir satır işaretlenmeyecek) |

> **Karar gerekiyor (K13).** Önerim: production için **ayrı ve yalnızca
> ekleyen** bir dosya (`0012p`) — kolon + index, **UPDATE YOK**, POST-CHECK
> "işaretli sayısı = 0". `0012` dev kaydı olarak olduğu gibi kalsın;
> assertion'ları onun değeridir.

### 4.4 `0013_admin_bulk_audit.sql` — ✅ çalışır, iki küçük düzeltme önerisi

| | |
|---|---|
| **Ne yapar** | `admin_audit_log` tablosu + 2 CHECK kısıtı + 2 index + rol varlığına bağlı `GRANT` |
| **Mevcut veri** | Hiçbir mevcut tabloya dokunmaz |
| **Yabancı anahtar** | **Yok (bilinçli)** — ürün silinse de iz kalsın |
| **Preflight** | Yalnızca NOTICE basar; assertion yok → production'da durmaz |
| **POST-CHECK** | 10 kolon, 2 kısıt, 2 index; satır sayısı varsayımı yok |
| **Kısıt kanıtı** | Dosya, `{"password": "x"}` içeren bir INSERT deneyip **reddedildiğini** kanıtlar. Reddedilmezse migration hata verir. (INSERT bir `DO` bloğu içindedir; blok tek ifadedir, hata hâlinde etkisi geri alınır) |
| **GRANT** | `nidah_dev` ve `nidah_web` rolleri için; **rol yoksa atlanır**. Production'da `nidah_dev` yok → atlanacak, `nidah_web` var → yetki verilecek |
| **Eksik 1** | **`BEGIN;`/`COMMIT;` ve timeout YOK** (0010–0012'de var). POST-CHECK hata verirse tablo/index/grant yerinde kalır; tekrar çalıştırmak düzeltir ama atomik değildir |
| **Eksik 2** | Yetki `nidah_web`'e veriliyor; production konvansiyonu **`nidah_rw` grup rolü**. Zararsız ama konvansiyon dışı. (Zaten `pg_default_acl` sayesinde `nidah_rw` otomatik yetki alır) |
| **Geri alma** | `DROP TABLE IF EXISTS admin_audit_log;` (yetkiler ve index'ler birlikte gider) |
| **Geri almada veri kaybı** | O ana kadarki işlem kayıtları (production'da: sıfırdan başlar) |

> **Karar gerekiyor (K14, K15).**

---

## 5. Kod ↔ şema bağımlılığı: deploy sırası NEDEN zorunlu

Drizzle sorguları `schema.ts`'teki kolonları **tek tek SQL'e yazar** (`*`
üretmez). Yeni kod eski şemaya çarparsa `column … does not exist` → **HTTP
500**. Ölçülen bağımlılıklar:

| Migration | Onsuz KIRILAN kod yolları | Public mi |
|---|---|---|
| `0010` | `/api/admin/products` (liste + oluşturma), `/api/admin/products/[id]` (`PRODUCT_COLUMNS_V3`), içe aktarma uçları | Hayır (admin) |
| **`0011`** | **`/api/products`** (açık uç), **`/api/products/[partNumber]`**, `src/lib/queries/product.ts` (ürün detayı), marka sayfaları, `ImagesManager` | **EVET** |
| `0012` | `/api/admin/products` (sentetik filtresi, `PRODUCT_COLUMNS_V4`) | Hayır (admin) |
| `0013` | Hiçbiri kırılmaz — `recordAdminAudit` hatayı yutar; yalnızca işlem kaydı **sessizce yazılmaz** | Hayır |

**Sitemap ayrıcalığı:** `src/app/sitemap.ts` içindeki görsel sorgusu
`verified` kolonunu okur **ama** iki koruma taşır: yalnızca katalog AÇIKKEN
çalışır (production'da kapalı) ve `.catch(() => [])` ile sarılıdır. Yani
sitemap, 0011 olmadan da **63 URL ile ayakta kalır**. Buna rağmen doğru sıra
değişmez.

**Ters yön güvenlidir:** migration önce uygulanırsa, o sırada çalışan ESKİ
kod yeni kolonları hiç seçmez; eklemeler toplamadır (additive). Eski kodun
görsel yüklemesi de çalışmaya devam eder, çünkü CHECK kısıtı
`verified=false` + NULL kanıt satırlarını kabul eder.

**Kritik operasyonel not:** bu projede **`git push` = deploy**
(GitHub → Vercel otomatik). "Önce commit, sonra karar veririm" yoktur:
**migration'lar push'tan ÖNCE uygulanmalıdır.**

---

## 6. Veri kaybı, üzerine yazma ve sentetik sızıntısı: tasarlanan kontroller

### 6.1 Statik kanıt (dosyalar üzerinde ölçüldü)

| Kontrol | Sonuç |
|---|---|
| `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE` | **4 dosyanın hiçbirinde yok** |
| `UPDATE` | Yalnızca `0012`, tek ifade, **`WHERE id IN (12 kimlik)`** — başka hiçbir yüklem yok, yalnızca `is_synthetic` kolonunu yazar |
| `INSERT` | Yalnızca `0013`'ün kısıt kanıtı; **reddedilmesi beklenir**, blok hata hâlinde geri alınır |
| `ALTER COLUMN` (tip/NULL değişikliği) | **Yok** |
| Mevcut kolonların yeniden yazılması | **Yok** — hepsi `ADD COLUMN IF NOT EXISTS` |

### 6.2 Çalıştırma sırasında uygulanacak kontroller (öneri)

**A. Migration ÖNCESİ ve SONRASI aynı parmak izi sorgusu** — mevcut verinin
bitine dokunulmadığını kanıtlar:

```sql
-- Mevcut (migration ÖNCESİ var olan) kolonlar üzerinden parmak izi.
SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) AS urun_parmak_izi,
       count(*) AS urun
  FROM (SELECT id, part_number, part_number_normalized, name, description,
               condition, category_id, weight, notes, is_active, in_stock,
               part_manufacturer, sourcing_type, stock_status,
               stock_status_updated_at, short_description, long_description,
               meta_title, meta_description, seo_ready, seo_ready_at,
               created_at
          FROM products) t;

SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) AS gorsel_parmak_izi,
       count(*) AS gorsel
  FROM (SELECT id, product_id, cloudinary_id, cloudinary_url,
               sort_order, is_primary, created_at
          FROM product_images) t;
```

**İki parmak izi migration'lardan sonra DEĞİŞMEMELİDİR.** Değişirse geri
alma başlatılır.

**B. Sentetik sızıntısı kontrolü** — üç ayrı kanıt:

```sql
-- 1) 12 dev kimliğinin hiçbiri production'da olmamalı  → beklenen 0
SELECT count(*) FROM products WHERE id IN ( … 12 kimlik … );

-- 2) Migration sonrası işaretli kayıt olmamalı          → beklenen 0
SELECT count(*) FROM products WHERE is_synthetic;

-- 3) Desene uyan kayıtlar (bilgi amaçlı, işaretlenmez)  → beklenen 1
SELECT id, part_number, is_active, seo_ready FROM products
 WHERE part_number ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)'
    OR name        ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)';
```

**C. Yayın ve stok değişmezleri** — migration'ların SEO davranışını
değiştirmediğini kanıtlar:

```sql
SELECT count(*) FILTER (WHERE seo_ready)                       AS yayin,      -- 0
       count(*) FILTER (WHERE is_active)                        AS aktif,      -- 2
       count(*) FILTER (WHERE stock_status::text <> 'unknown')  AS stok,       -- 0
       (SELECT count(*) FROM product_images WHERE verified)     AS dogrulanmis -- 0
  FROM products;
```

**D. Canlı site değişmezleri** (deploy sonrası):
`sitemap.xml` → 200 · **63 URL** · katalog URL 0 · mükerrer 0 ·
`/parca-katalog` → **404** · ana sayfa → 200 · `/api/products?limit=1` → 200.

---

## 7. Önerilen geçiş planı

### Faz A — Prova (production'a dokunmadan)

Neon branch'i **önermiyorum**: kullanım bazlı ücret doğurabilir (0 TL
ilkesi). Bunun yerine **ücretsiz ve birebir** yol:

1. Production'dan `pg_dump` alınır (salt okunur).
2. Dökümden **yerel Docker `postgres:17`** konteynerine geri yüklenir.
3. Dört migration bu kopyada sırayla çalıştırılır.
4. §6'daki A/B/C sorguları kopyada çalıştırılıp sonuçlar kaydedilir.
5. Geri alma SQL'leri de aynı kopyada denenir (en kritik adım: geri almanın
   gerçekten çalıştığı kanıtlanır).

Bu prova, iki bloker için yazılacak production varyantlarını (0011/0012p)
gerçek production verisiyle doğrulamanın tek güvenli yoludur.

### Faz B — Production migration (bakım penceresi gerektirmez)

Sıra **zorunlu**: `0010` → `0011` → `0012p` → `0013`.
Her biri ayrı ayrı, çıktısı okunarak, POST-CHECK'i görülerek.

### Faz C — Kod deploy

Commit → push (= otomatik deploy) → release marker + `origin/main` + local
`HEAD` üçlü eşleşmesi → §6/D doğrulamaları.

### Faz D — Deploy sonrası

Admin panelinde ürün listesi, filtreler, kategori ekranı ve **tek bir toplu
işlem** denenir; `admin_audit_log`'a kayıt düştüğü sorguyla görülür.

---

## 8. Ayrıntılı kontrol listesi

### 8.1 Hazırlık

- [ ] Hedef doğrulaması: `SELECT current_database(), current_user;` → **dev ile karıştırma**
- [ ] Production yedeği: `pg_dump` + boyut + `COPY` blok sayısı + ürün satır sayısı doğrulanır
- [ ] Yedeğin **geri yüklenebildiği** yerel Docker'da kanıtlanır (yedek, geri yüklenmeden yedek sayılmaz)
- [ ] §6/A parmak izleri alınır ve saklanır
- [ ] §6/B ve §6/C referans sayıları alınır
- [ ] Canlı site referansı: sitemap 63 URL, `/parca-katalog` 404
- [ ] Prova (Faz A) tamamlanır ve sonuçları yazılır

### 8.2 Migration

- [ ] `0010` çalıştırılır → POST-CHECK NOTICE'leri okunur
- [ ] `0011` (düzeltilmiş varyant) çalıştırılır → "doğrulanmış görsel 0" NOTICE'i görülür
- [ ] `0012p` (production varyantı) çalıştırılır → "işaretli 0" doğrulanır
- [ ] `0013` (tercihen transaction'a alınmış hâli) çalıştırılır → kısıt kanıtı NOTICE'i görülür
- [ ] Her migration'dan sonra §6/A parmak izi **değişmedi** mi kontrol edilir
- [ ] `nidah_web` → `admin_audit_log` üzerinde `SELECT, INSERT` yetkisi var mı

### 8.3 Deploy

- [ ] Yerelde `npx tsc --noEmit` · `npm test` · `npm run lint` · `npm run build` temiz
- [ ] Commit (ayrı onay) → push (= deploy, ayrı onay)
- [ ] Vercel build başarılı
- [ ] Release marker + `origin/main` + local `HEAD` eşleşmesi

### 8.4 Deploy sonrası doğrulama

- [ ] `sitemap.xml` → 200, **63 URL**, katalog 0, mükerrer 0
- [ ] `/parca-katalog` → **404**, ana sayfa → 200
- [ ] `/api/products?limit=1` → **200** (0011'in asıl testi)
- [ ] `/blog/tr` → 308, `/en/blog` → 308
- [ ] Admin: ürün listesi, filtreler, kategori ekranı, ürün düzenleme açılıyor
- [ ] Tek bir toplu işlem denenir → `admin_audit_log`'da kayıt görülür
- [ ] §6/C: `seo_ready = 0`, `is_synthetic = 0`, `verified = 0` **değişmedi**

### 8.5 Geri alma (gerekirse)

> **Sıra TERSTİR: önce kod, sonra şema.** Yeni kod `verified` kolonunu
> okuduğu için, kolon kod hâlâ yayındayken düşürülürse **public uçlar 500
> döner**.

- [ ] 1. Kod geri alınır (Vercel'de önceki deployment'a rollback)
- [ ] 2. `0013` → `DROP TABLE IF EXISTS admin_audit_log;`
- [ ] 3. `0012p` → `DROP INDEX idx_products_synthetic; ALTER TABLE products DROP COLUMN is_synthetic;`
- [ ] 4. `0011` → kısıt + index + 5 kolon düşürülür (**girilmiş ALT/kaynak notları kaybolur**)
- [ ] 5. `0010` → 2 index + 2 kolon düşürülür
- [ ] 6. §6/A parmak izi ilk ölçümle karşılaştırılır
- [ ] Veri bozulması şüphesi varsa: koddan DEĞİL, **yedekten** dönülür

---

## 9. Riskler

| # | Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|---|
| R1 | Kod migration'dan **önce** deploy edilir | Orta (push = deploy) | **Public uçlarda 500** | Sıra zorunlu; push en son |
| R2 | `0011` production'da durur | **Kesin** (bugünkü hâliyle) | Migration yarım kalmaz (işlem geri alınır), ama süreç tıkanır | K12 kararı |
| R3 | `0012` production'da durur | **Kesin** | Aynı | K13 kararı |
| R4 | `0013` POST-CHECK'i yarıda kalır | Düşük | Tablo kalır, atomik değil | K14 kararı (transaction) |
| R5 | 2 production fotoğrafı doğrulanmadığı için görünmez olur | **Kesin** (tasarım gereği) | Katalog açılınca temsilî görsel çıkar | Katalog açılmadan önce ALT + kaynak girilip doğrulanmalı |
| R6 | `DENEMEE32424` kaydının canlıda durması | Mevcut durum | Pasif + yayın dışı → **public etkisi yok** | K16 kararı |
| R7 | Geri almada ALT/kaynak notlarının kaybı | Düşük | Girilen doğrulama kanıtı gider | Geri almadan önce o kolonların dökümü alınır |
| R8 | Yedeğin geri yüklenebilirliği denenmemiş olur | Orta | Kriz anında yedek işe yaramaz | 8.1'deki geri yükleme provası |
| R9 | Migration sırasında kilit beklemesi | **Çok düşük** | Tablolar 32–136 kB | `lock_timeout 5s` zaten var (0013 hariç) |

---

## 10. Karar gerektiren noktalar — ONAYINIZ BEKLENİYOR

| # | Karar | Seçenekler | Önerim |
|---|---|---|---|
| **K12** | `0011` production'da duruyor (2 mevcut görsel) | (a) Production için `0011p` varyantı: aynı DDL, preflight "2 satır incelendi" kaydıyla · (b) Mevcut dosyadaki guard'ı gevşet · (c) Önce 2 görseli admin panelinden doğrula, sonra uygula | **(a)** — dev dosyası tarihsel kayıt olarak değişmeden kalır, production varyantı incelemenin yapıldığını belgeler |
| **K13** | `0012` production'da duruyor (POST-CHECK dev'e özgü) | (a) `0012p`: yalnızca kolon + index, UPDATE **yok**, POST-CHECK "işaretli = 0" · (b) 0012'yi ortam algılayacak şekilde değiştir | **(a)** — production'da sentetik işaretleme KAVRAMI yok; UPDATE'in oraya hiç gitmemesi en güvenlisi |
| **K14** | `0013` transaction'a alınsın mı | (a) `BEGIN/COMMIT` + `statement_timeout`/`lock_timeout` eklensin · (b) olduğu gibi kalsın | **(a)** — diğer üç dosyayla aynı standart |
| **K15** | `0013` yetkisi kime verilsin | (a) `nidah_rw` grup rolü de eklensin · (b) yalnızca `nidah_web` kalsın | **(a)** — production konvansiyonu grup rolü |
| **K16** | Production'daki `DENEMEE32424` kaydı | (a) Dokunma (pasif, yayın dışı) · (b) Ayrı onayla sil · (c) Adını düzelt | **(a)** şimdilik — silme ayrı bir karar ve ayrı yedek ister |
| **K17** | Prova ortamı | (a) Yerel Docker'a production dökümü (**0 TL**) · (b) Neon branch (ücret riski) | **(a)** |
| **K18** | Uygulama yetkisi | Migration'ları ben mi çalıştırayım, siz mi | Sizin kararınız; **her adımın çıktısını raporlarım** |

---

## 11. Bu denetimde YAPILMAYANLAR

- Production veritabanına **yazılmadı** (tüm sorgular `BEGIN READ ONLY`)
- Development veritabanına **yazılmadı**
- Hiçbir migration **çalıştırılmadı** (production'da da, dev'de de)
- `0011`, `0012`, `0013` dosyaları **değiştirilmedi** — önerilen varyantlar
  yalnızca bu raporda tarif edildi, **yazılmadı**
- Commit, push, deploy **yapılmadı** · `HEAD` hâlâ `5497e9b`
- Canlı siteye yalnızca **GET** istekleri yapıldı (sitemap, ana sayfa,
  `/parca-katalog`)
