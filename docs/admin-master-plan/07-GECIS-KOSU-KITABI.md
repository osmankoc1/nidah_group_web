# Production'a Geçiş — Koşu Kitabı (son güvenlik ve dağıtım planı)

**Tarih:** 2026-11-18 · **Git HEAD:** `5497e9b` · **Durum:** onay bekliyor

> Bu belge **uygulama talimatıdır**; hiçbir adımı henüz çalıştırılmadı.
> Migration, commit, push ve deploy için **ayrı ayrı** onayınız beklenir.

---

## 1. Korunacak dört söz

| Söz | Nasıl garanti altına alındı | Doğrulama |
|---|---|---|
| **Production'daki 3 ürün ve 2 fotoğraf korunur** | Hiçbir migration `DELETE`/`DROP`/`TRUNCATE` içermiyor; `0012`'nin `UPDATE`'i production varyantında **yok**. Üç migration başta ve sonda `md5` parmak izi karşılaştırıyor | Provada: **FARK YOK** |
| **Dev'deki 154 ürün adayı production'a GİTMEZ** | Veri aktarımı yalnızca admin **İçe Aktarma** ekranından, elle yapılır. Migration'larda ürün `INSERT`'i yok; `build` yalnızca `next build`; `postinstall` yok; deploy sırasında hiçbir script veritabanına yazmıyor | §6 kontrol sorgusu: ürün sayısı **3 kalmalı** |
| **Katalog halka açılmaz** | `site-settings.ts` **hiç yazma yapmaz** (saf okuma + varsayılan). Toggle yalnızca Admin → Sayfalar ekranından değişir. Production'da `page_parca_katalog = false` satırı var | Deploy sonrası `/parca-katalog` → **404** |
| **Doğrulanmamış fotoğraf gerçek fotoğraf sayılmaz** | Public sorgular `verified = true` şartı taşır; `ck_product_images_verified_evidence` kısıtı kanıtsız doğrulamayı veritabanı seviyesinde reddeder | Provada iki yönlü test: kanıtsız **reddedildi** |
| **Stok doğrulanmadan "Stokta" yazılmaz** | `stock_status` varsayılanı `unknown`; migration'ların hiçbiri stok yazmıyor | §6: stok iddiası **0 kalmalı** |

---

## 2. Uygulama ↔ veritabanı uyumluluk matrisi

| | Eski şema | Yeni şema (0010–0013p) |
|---|---|---|
| **Eski kod** (şu an canlı) | ✅ bugünkü durum | ✅ **güvenli** — eski kod yeni kolonları hiç seçmez; `verified` varsayılanı kısıtı karşılar |
| **Yeni kod** | ❌ **KIRILIR** — `/api/products` ve `/api/products/[partNumber]` `product_images.verified` okuyor → **500** | ✅ hedef durum |

**Sonuç: migration ÖNCE, kod SONRA.** Ters sıra public uçları kırar.
Aradaki pencere (yeni şema + eski kod) güvenlidir ve istediğiniz kadar
uzayabilir.

> `sitemap.xml` bu kuralın istisnası değildir ama **dayanıklıdır**: görsel
> sorgusu yalnızca katalog AÇIKKEN çalışır (kapalı) ve `.catch` ile sarılıdır.
> 63 URL'lik sitemap her hâlükârda ayakta kalır.

---

## 3. Kesinti ve kilit riski

| İşlem | Kilit | Süre | Risk |
|---|---|---|---|
| `ADD COLUMN` (varsayılansız) | ACCESS EXCLUSIVE, anlık | metadata | yok |
| `ADD COLUMN … NOT NULL DEFAULT false` | ACCESS EXCLUSIVE, anlık | PostgreSQL 11+ tabloyu **yeniden yazmaz** | yok |
| `CREATE INDEX` (kısmi) | SHARE (yazmayı bloklar) | 32–136 kB tablo | ihmal edilebilir |
| `ADD CONSTRAINT CHECK` | ACCESS EXCLUSIVE + mevcut satır doğrulaması | **2 satır** | ihmal edilebilir |
| `CREATE TABLE` (0013p) | yok (yeni nesne) | — | yok |

**Bakım penceresi gerekmez.** Dört dosyanın tamamında
`statement_timeout = 30s` ve `lock_timeout = 5s` var: bir kilit beklemesi
olursa migration **kendiliğinden durur**, siteyi bekletmez. Provada hiçbir
dosya 30 saniye sınırına yaklaşmadı.

**Neon notu:** compute uykudaysa ilk bağlantı birkaç saniye gecikir; bu
kesinti değildir. DDL **doğrudan uç** (`OWNER_PROD_DIRECT_URL`) ile
çalıştırılır, pooler ile değil.

---

## 4. Aşama A — Yedek (migration'dan önce)

| | |
|---|---|
| **İşlem** | `pg_dump` ile **tam** production yedeği (bu kez `rfq_submissions` verisi **dahil**) |
| **Doğrulama** | Dosya boyutu · `COPY` blok sayısı **18** · `products` bloğunda **3 satır** · stderr boş |
| **Ek doğrulama** | Yedek yerel Docker'a **geri yüklenir** — geri yüklenemeyen yedek, yedek değildir |
| **Parmak izi** | §6'daki üç `md5` sorgusu çalıştırılır ve **kaydedilir** |
| **Risk** | Yedek alınırken production'a yük biner (tablolar küçük, ihmal edilebilir) |
| **Geri alma** | — (yalnızca okuma) |
| **Onay** | Yedek alma ayrı onay gerektirmez (salt okunur), ama size haber verilir |

> Yedek dosyası **kişisel veri içerir** (`rfq_submissions`). Şifreli veya
> erişimi kısıtlı bir konumda tutulmalı, iş bitince silinmelidir.

---

## 5. Aşama B — Migration (dört adım, sırayla)

**Ayrı açık onay gerekir.** Her dosya tek tek, çıktısı okunarak çalıştırılır.
Bir `ERROR` görülürse **sonraki dosyaya geçilmez**.

| # | Dosya | Ne yapar | Geri alma |
|---|---|---|---|
| B1 | `0010_internal_stock_code.sql` | `products`: 2 NULL kolon + 2 kısmi index | `DROP INDEX idx_products_internal_stock_code; DROP INDEX idx_products_internal_stock_code_norm; ALTER TABLE products DROP COLUMN internal_stock_code, DROP COLUMN internal_stock_code_normalized;` |
| B2 | `0011p_product_image_verification_prod.sql` | `product_images`: 5 kolon + 1 index + 1 CHECK | Önce §7'deki **döküm**, sonra: kısıt → index → 5 kolon düşürülür |
| B3 | `0012p_product_synthetic_flag_prod.sql` | `products`: `is_synthetic` + kısmi index. **İşaretleme YOK** | `DROP INDEX idx_products_synthetic; ALTER TABLE products DROP COLUMN is_synthetic;` |
| B4 | `0013p_admin_bulk_audit_prod.sql` | `admin_audit_log` tablosu + 2 kısıt + 2 index + yetki | `DROP TABLE IF EXISTS admin_audit_log;` |

**Çalıştırma biçimi** (her dosya için, dosya adı değişir):

```powershell
docker run --rm -i -e OWNER_PROD_DIRECT_URL -e PGCLIENTENCODING=UTF8 postgres:17 sh -c 'psql "$OWNER_PROD_DIRECT_URL" -v ON_ERROR_STOP=1 -f -' < drizzle/0010_internal_stock_code.sql
```

**Riskler ve karşılıkları**

| Risk | Karşılık |
|---|---|
| Yanlış hedef (dev/prod karışması) | İlk iş: `SELECT current_database(), current_user, (SELECT count(*) FROM products);` → **3** görülmeli (dev'de 166) |
| Migration yarıda kalır | Dördü de `BEGIN … COMMIT` içinde; provada hata hâlinde **hiç iz kalmadığı** ölçüldü |
| Beklenmeyen veri değişimi | Her dosya kendi parmak izini karşılaştırır; uyuşmazsa `EXCEPTION` + geri alma |
| Kilit beklemesi | `lock_timeout 5s` → migration durur, site etkilenmez |

**Her adımdan sonra** §6 doğrulama sorgusu çalıştırılır.

---

## 6. Doğrulama sorgusu (her migration'dan sonra, salt okunur)

```sql
SELECT (SELECT count(*) FROM products)                                   AS urun,          -- 3
       (SELECT count(*) FROM products WHERE is_active)                   AS aktif,         -- 2
       (SELECT count(*) FROM products WHERE seo_ready)                   AS yayin,         -- 0
       (SELECT count(*) FROM products WHERE stock_status::text <> 'unknown') AS stok,      -- 0
       (SELECT count(*) FROM product_images)                             AS gorsel,        -- 2
       (SELECT count(*) FROM site_settings WHERE key = 'page_parca_katalog'
                                             AND value = 'false')        AS katalog_kapali;-- 1

-- B3'ten sonra ayrıca:  SELECT count(*) FROM products WHERE is_synthetic;   -- 0
-- B2'den sonra ayrıca:  SELECT count(*) FROM product_images WHERE verified; -- 0

-- Parmak izi (Aşama A'da alınanla AYNI olmalı)
SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) FROM (
  SELECT id, part_number, part_number_normalized, name, description, condition,
         category_id, weight, notes, is_active, in_stock, part_manufacturer,
         sourcing_type, stock_status, stock_status_updated_at, short_description,
         long_description, meta_title, meta_description, seo_ready, seo_ready_at,
         created_at FROM products) t;
```

---

## 7. Aşama C — Kod deploy

**İki ayrı onay gerekir: (1) commit, (2) push.** Bu projede
**`git push` = deploy** (GitHub → Vercel otomatik); `vercel --prod` elle
çalıştırılmaz.

| | |
|---|---|
| **Ön koşul** | B1–B4 tamamlanmış ve §6 doğrulamaları geçmiş olmalı |
| **Yerel kontrol** | `npx tsc --noEmit` · `npm test` (511) · `npm run lint` (34, artmamalı) · `npm run build` |
| **Commit kapsamı** | Faz 1–6 kod değişiklikleri + 7 migration dosyası (`0010`–`0013`, `0011p`, `0012p`, `0013p`) + `docs/admin-master-plan/` |
| **Risk** | Push geri alınamaz bir yayındır; Vercel'de önceki deployment'a dönülebilir ama yayın anı yaşanır |
| **Geri alma** | Vercel → önceki deployment'a rollback (**şema geri alınmadan ÖNCE**) |

---

## 8. Aşama D — Deploy sonrası doğrulama

| Kontrol | Beklenen |
|---|---|
| `sitemap.xml` | 200 · `application/xml` · **63 URL** · katalog 0 · mükerrer 0 |
| `/parca-katalog` | **404** (katalog kapalı) |
| Ana sayfa | 200 |
| **`/api/products?limit=1`** | **200** ← `0011`'in asıl testi |
| `/blog/tr` · `/en/blog` | 308 |
| Admin: ürün listesi · filtreler · kategoriler · ürün düzenleme | açılıyor |
| Tek bir toplu işlem | `admin_audit_log`'a kayıt düşüyor |
| §6 sorgusu | ürün 3 · aktif 2 · yayın 0 · stok 0 · görsel 2 · katalog kapalı 1 |

Herhangi biri başarısızsa: **kod geri alınır** (Aşama E/1), şema yerinde
bırakılır ve durum raporlanır.

---

## 9. Aşama E — Geri alma (sıra TERSTİR)

| # | Adım | Not |
|---|---|---|
| 1 | **Kod** geri alınır (Vercel rollback) | Önce bu yapılır: yeni kod `verified` kolonunu okuyor; kolon önce düşerse public uçlar **500** verir |
| 2 | `0013p` → `DROP TABLE IF EXISTS admin_audit_log;` | İşlem kayıtları gider |
| 3 | `0012p` → index + `is_synthetic` kolonu | Veri kaybı yok |
| 4 | `0011p` → **önce döküm**, sonra kısıt + index + 5 kolon | ALT metni ve kaynak notu **kaybolur** |
| 5 | `0010` → 2 index + 2 kolon | Logo stok kodları gider |
| 6 | §6 parmak izi ilk ölçümle karşılaştırılır | Uyuşmazsa **yedekten** dönülür |

**Adım 4 öncesi zorunlu döküm:**

```sql
SELECT id, product_id, verified, verified_at, verified_by, alt_text, source_note
  FROM product_images
 WHERE verified OR alt_text IS NOT NULL OR source_note IS NOT NULL;
```

---

## 10. Deploy sonrası bilinçli olarak YAPILMAYACAKLAR

- **154 ürün adayı aktarılmayacak** — içe aktarma ayrı bir iş ve ayrı onay
- **Katalog toggle'ı açılmayacak**
- **Hiçbir ürün yayına alınmayacak** (`seo_ready` 0 kalır)
- **Hiçbir ürüne stok iddiası yazılmayacak**
- Production'daki 2 fotoğraf **silinmeyecek**; doğrulanmadıkları için public
  yüzeyde görünmezler. Katalog açılmadan önce ALT metni + kaynak notu
  girilip doğrulanmaları gerekir
- `DENEMEE32424` kaydına **dokunulmayacak**

---

## 11. Onay sırası

| # | Onay | Durum |
|---|---|---|
| 1 | Tam production yedeği (salt okunur) | bekliyor |
| 2 | **Migration B1–B4** | bekliyor |
| 3 | **Commit** | bekliyor |
| 4 | **Push = deploy** | bekliyor |
| 5 | (isteğe bağlı) `nidah_rw`'nin `admin_audit_log` üzerindeki `UPDATE`/`DELETE` yetkisinin geri alınması | bekliyor |
