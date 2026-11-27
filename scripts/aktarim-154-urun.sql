-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  154 GERÇEK ÜRÜN ADAYININ DEVELOPMENT → PRODUCTION AKTARIMI              ║
-- ║                                                                          ║
-- ║  DURUM: HENÜZ UYGULANMADI. Production uygulaması AYRI ONAYA tabidir.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ONAYLANAN KARARLAR
--   K19  Kontrollü SQL yöntemi
--   K20  Uyumlulukların `verified` bilgisi KORUNUR (dev'de gerçekten yapıldı)
--   K21  154 çeviri TASLAK olarak taşınır (`published = false`)
--   K22  Ürünlerin tamamı **PASİF** gelir (`is_active = false`)
--   K23  Açıklaması 300 karakterin altındaki 42 ürün de aktarılır; yayın
--        kapısı onları zaten engeller
--
-- ── NEDEN PASİF ────────────────────────────────────────────────────────────
-- `/api/products` PUBLIC bir uçtur ve katalog toggle'ından ETKİLENMEZ;
-- `is_active = true` olan her ürünü herkese listeler. Aktif aktarım, 154
-- ürünü anında public yapardı. Bu yüzden `is_active` açıkça `false` yazılır
-- ve aktifleştirme AYRI, bilinçli bir adımdır.
--
-- ── SENTETİK KAYIT KORUMASI (üç katman) ────────────────────────────────────
--   1. Kaynak dışa aktarım `WHERE NOT is_synthetic` ile yapıldı
--   2. Aşağıdaki PREFLIGHT 12 kimliği ve test desenini staging'de arar
--   3. POST-CHECK `is_synthetic = 0` ve desen sayısını doğrular
--
-- ── EŞLEŞTİRME (kör kopya DEĞİL) ───────────────────────────────────────────
-- Production'da VOLVO üreticisi ve VOLVO G930 makinesi ZATEN VAR; dev'deki
-- karşılıkları farklı kimlikler taşıyor. `manufacturers.slug` benzersizdir,
-- `machines` tablosunda ise benzersizlik kısıtı YOKTUR — kör kopya mükerrer
-- makine üretirdi. Bu yüzden:
--   · üreticiler `slug` ile eşleştirilir, yalnızca eksikler eklenir
--   · makineler (üretici, MODEL) ile eşleştirilir, yalnızca eksikler eklenir
--
-- ── PROVADA YAKALANAN DEFEKT (2026-11-18) ──────────────────────────────────
-- İlk sürüm makineleri (üretici, model, TİP) üçlüsüyle eşleştiriyordu.
-- Production'daki VOLVO G930 kaydının tipi `GREYDER`, development'taki aynı
-- makinenin tipi ise BOŞ. Üçlü anahtar bunları farklı kabul etti ve prova
-- **mükerrer bir VOLVO G930** üretti (`machines` tablosunda benzersizlik
-- kısıtı olmadığı için veritabanı da engellemedi).
--
-- Düzeltme: eşleştirme anahtarı (üretici, model). Tip bir KATEGORİ
-- etiketidir, kimlik değildir. Aynı üreticide aynı modelden birden fazla
-- kayıt varsa eşleştirme BELİRSİZDİR; script tahmin etmez, DURUR.
-- Mevcut production kayıtlarının tipi DEĞİŞTİRİLMEZ.
--   · uyumluluklar eşleştirilmiş production kimliklerini kullanır
--
-- ── KULLANIM ───────────────────────────────────────────────────────────────
--   psql "$URL" -v ON_ERROR_STOP=1 -f scripts/aktarim-154-urun.sql
--   (TSV dosyaları `aktarim/` klasöründe, bu dosyayla aynı dizinde beklenir)
--
-- ── GERİ ALMA ──────────────────────────────────────────────────────────────
--   Dosyanın sonundaki bölüme bakın.

BEGIN;

SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '5s';

-- ── STAGING ────────────────────────────────────────────────────────────────
CREATE TEMP TABLE stg_uretici (
  id uuid, name varchar(255), slug varchar(255), logo_url text, created_at timestamptz
) ON COMMIT DROP;

CREATE TEMP TABLE stg_makine (
  id uuid, manufacturer_id uuid, model varchar(255), type varchar(100),
  year_from integer, year_to integer, created_at timestamptz
) ON COMMIT DROP;

CREATE TEMP TABLE stg_urun (
  id uuid, part_number varchar(100), part_number_normalized varchar(100),
  name varchar(500), description text, condition text, weight real, notes text,
  in_stock boolean, part_manufacturer varchar(255), sourcing_type text,
  stock_status text, short_description varchar(500), long_description text,
  meta_title varchar(255), meta_description text,
  internal_stock_code varchar(100), internal_stock_code_normalized varchar(100),
  created_at timestamptz, updated_at timestamptz
) ON COMMIT DROP;

CREATE TEMP TABLE stg_uyum (
  id uuid, product_id uuid, machine_id uuid, machine_variant_id uuid,
  notes text, created_at timestamptz, verified boolean, verified_at timestamptz,
  source varchar(255)
) ON COMMIT DROP;

CREATE TEMP TABLE stg_ceviri (
  id uuid, product_id uuid, locale varchar(5), name varchar(500),
  short_description varchar(500), long_description text,
  meta_title varchar(255), meta_description text,
  created_at timestamptz, updated_at timestamptz
) ON COMMIT DROP;

\copy stg_uretici FROM 'aktarim/uretici.tsv'
\copy stg_makine  FROM 'aktarim/makine.tsv'
\copy stg_urun    FROM 'aktarim/urun.tsv'
\copy stg_uyum    FROM 'aktarim/uyum.tsv'
\copy stg_ceviri  FROM 'aktarim/ceviri.tsv'

-- ── PREFLIGHT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_sentetik   bigint;
  v_desen      bigint;
  v_varyant    bigint;
  v_cakisma    bigint;
  v_urun_once  bigint;
  v_aktif_once bigint;
  v_izi_once   text;
BEGIN
  -- 1) 12 sentetik kimlik staging'de OLMAMALI
  SELECT count(*) INTO v_sentetik FROM stg_urun WHERE id IN (
    'a058c901-a815-4b19-9796-0b9b4350db46','fc4bd6b9-2815-4075-8c70-767c9d4cbb42',
    '09dd9056-d3f2-490e-8b54-056a36fb4fc7','95be1425-31a3-4baf-8a56-77b2d096a01b',
    '07a4c261-a005-4176-bcf8-f2c93a23ce65','28f44f4c-0954-4b15-bd6f-56c509380af2',
    'fdad7243-c763-4aec-b348-e6c5a9c6fc41','adc28875-cbd4-4992-82b4-08ac5b0e3460',
    'd30c6e00-798e-4201-80f9-8e6964fcb394','d8187c1c-a0d9-4ba3-b531-43497f8e9c2a',
    'ff4063d4-bdea-4546-be48-195c93022d29','08b52f32-7d63-4c81-90b8-16fa9a128fbf');
  IF v_sentetik > 0 THEN
    RAISE EXCEPTION 'AKTARIM DURDURULDU: % sentetik kimlik aktarim dosyasinda.', v_sentetik;
  END IF;

  -- 2) Test deseni taşıyan kayıt OLMAMALI
  SELECT count(*) INTO v_desen FROM stg_urun
   WHERE part_number ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)'
      OR name        ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)';
  IF v_desen > 0 THEN
    RAISE EXCEPTION 'AKTARIM DURDURULDU: % kayit test deseni tasiyor, elle incelenmeli.', v_desen;
  END IF;

  -- 3) Varyantlı uyumluluk desteklenmiyor (dev'de yok)
  SELECT count(*) INTO v_varyant FROM stg_uyum WHERE machine_variant_id IS NOT NULL;
  IF v_varyant > 0 THEN
    RAISE EXCEPTION 'AKTARIM DURDURULDU: % uyumluluk varyanta bagli; varyant esleme bu surumde yok.', v_varyant;
  END IF;

  -- 4) Parça numarası çakışması OLMAMALI
  SELECT count(*) INTO v_cakisma FROM stg_urun s
   WHERE EXISTS (SELECT 1 FROM products p WHERE p.part_number_normalized = s.part_number_normalized);
  IF v_cakisma > 0 THEN
    RAISE EXCEPTION 'AKTARIM DURDURULDU: % parca numarasi production ile cakisiyor.', v_cakisma;
  END IF;

  -- 5) Mevcut durumu kaydet (POST-CHECK karşılaştırması için)
  SELECT count(*) INTO v_urun_once FROM products;
  SELECT count(*) INTO v_aktif_once FROM products WHERE is_active;
  SELECT coalesce(md5(string_agg(t::text, '~' ORDER BY t.id)), 'BOS') INTO v_izi_once
    FROM (SELECT id, part_number, name, is_active, seo_ready, stock_status FROM products) t;

  PERFORM set_config('nidah.akt_urun',  v_urun_once::text,  true);
  PERFORM set_config('nidah.akt_aktif', v_aktif_once::text, true);
  PERFORM set_config('nidah.akt_izi',   v_izi_once,         true);

  RAISE NOTICE 'PREFLIGHT: hedefte % urun (% aktif) · aktarilacak: % urun, % uyum, % ceviri',
    v_urun_once, v_aktif_once,
    (SELECT count(*) FROM stg_urun), (SELECT count(*) FROM stg_uyum), (SELECT count(*) FROM stg_ceviri);
END $$;

-- ── 1) ÜRETİCİLER — slug ile eşleştir, eksikleri ekle ─────────────────────
INSERT INTO manufacturers (id, name, slug, logo_url, created_at)
SELECT s.id, s.name, s.slug, s.logo_url, s.created_at
  FROM stg_uretici s
 WHERE NOT EXISTS (SELECT 1 FROM manufacturers m WHERE m.slug = s.slug);

CREATE TEMP TABLE map_uretici ON COMMIT DROP AS
SELECT s.id AS dev_id, m.id AS prod_id
  FROM stg_uretici s
  JOIN manufacturers m ON m.slug = s.slug;

-- ── 2) MAKİNELER — (üretici, model, tip) ile eşleştir ─────────────────────
INSERT INTO machines (id, manufacturer_id, model, type, year_from, year_to, created_at)
SELECT s.id, mu.prod_id, s.model, s.type, s.year_from, s.year_to, s.created_at
  FROM stg_makine s
  JOIN map_uretici mu ON mu.dev_id = s.manufacturer_id
 WHERE NOT EXISTS (
   SELECT 1 FROM machines m
    WHERE m.manufacturer_id = mu.prod_id
      AND upper(btrim(m.model)) = upper(btrim(s.model)));

CREATE TEMP TABLE map_makine ON COMMIT DROP AS
SELECT s.id AS dev_id, m.id AS prod_id
  FROM stg_makine s
  JOIN map_uretici mu ON mu.dev_id = s.manufacturer_id
  JOIN machines m ON m.manufacturer_id = mu.prod_id
   AND upper(btrim(m.model)) = upper(btrim(s.model));

DO $$
DECLARE
  v_eksik    bigint;
  v_belirsiz bigint;
  v_mukerrer bigint;
BEGIN
  -- Eslesmeyen makine kalmamali
  SELECT count(*) INTO v_eksik FROM stg_makine s
   WHERE NOT EXISTS (SELECT 1 FROM map_makine mm WHERE mm.dev_id = s.id);
  IF v_eksik > 0 THEN
    RAISE EXCEPTION 'AKTARIM DURDURULDU: % makine eslestirilemedi.', v_eksik;
  END IF;

  -- Bir dev makinesi BIRDEN FAZLA production makinesine esleserse TAHMIN ETME, DUR
  SELECT count(*) INTO v_belirsiz FROM (
    SELECT dev_id FROM map_makine GROUP BY dev_id HAVING count(*) > 1) x;
  IF v_belirsiz > 0 THEN
    RAISE EXCEPTION
      'AKTARIM DURDURULDU: % makine icin esleme BELIRSIZ (ayni ureticide ayni modelden birden fazla kayit). Elle karar gerekir.',
      v_belirsiz;
  END IF;

  -- Mukerrer makine OLUSMAMALI (provada yakalanan defekt)
  SELECT count(*) INTO v_mukerrer FROM (
    SELECT manufacturer_id, upper(btrim(model)) FROM machines
     GROUP BY manufacturer_id, upper(btrim(model)) HAVING count(*) > 1) x;
  IF v_mukerrer > 0 THEN
    RAISE EXCEPTION
      'AKTARIM DURDURULDU: % uretici+model ciftinde MUKERRER makine olustu.', v_mukerrer;
  END IF;

  RAISE NOTICE 'Makine eslestirme tamam: % kayit, mukerrer 0.', (SELECT count(*) FROM map_makine);
END $$;

-- ── 3) ÜRÜNLER — PASİF, YAYINDA DEĞİL, SENTETİK DEĞİL ─────────────────────
INSERT INTO products (
  id, part_number, part_number_normalized, name, description, condition,
  weight, notes, is_active, in_stock, part_manufacturer, sourcing_type,
  stock_status, short_description, long_description, meta_title, meta_description,
  internal_stock_code, internal_stock_code_normalized,
  is_synthetic, seo_ready, seo_ready_at, created_at, updated_at)
SELECT
  s.id, s.part_number, s.part_number_normalized, s.name, s.description,
  s.condition::product_condition, s.weight, s.notes,
  FALSE,                                   -- is_active  → PASİF (K22)
  s.in_stock,
  s.part_manufacturer, s.sourcing_type::product_sourcing_type,
  s.stock_status::product_stock_status,
  s.short_description, s.long_description, s.meta_title, s.meta_description,
  s.internal_stock_code, s.internal_stock_code_normalized,
  FALSE,                                   -- is_synthetic → gerçek ürün
  FALSE, NULL,                             -- seo_ready    → YAYINDA DEĞİL
  s.created_at, s.updated_at
FROM stg_urun s;

-- ── 4) UYUMLULUKLAR — doğrulama bilgisi korunur (K20) ─────────────────────
INSERT INTO fitments (id, product_id, machine_id, machine_variant_id,
                      notes, created_at, verified, verified_at, source)
SELECT s.id, s.product_id, mm.prod_id, NULL,
       s.notes, s.created_at, s.verified, s.verified_at, s.source
  FROM stg_uyum s
  JOIN map_makine mm ON mm.dev_id = s.machine_id;

-- ── 5) ÇEVİRİLER — TASLAK (K21) ───────────────────────────────────────────
INSERT INTO product_translations (
  id, product_id, locale, name, short_description, long_description,
  meta_title, meta_description, published, published_at, created_at, updated_at)
SELECT s.id, s.product_id, s.locale, s.name, s.short_description, s.long_description,
       s.meta_title, s.meta_description,
       FALSE, NULL,                        -- published → TASLAK
       s.created_at, s.updated_at
FROM stg_ceviri s;

-- ── POST-CHECK ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_urun_once  bigint := current_setting('nidah.akt_urun')::bigint;
  v_aktif_once bigint := current_setting('nidah.akt_aktif')::bigint;
  v_izi_once   text   := current_setting('nidah.akt_izi');
  v_urun_son   bigint;
  v_aktif_son  bigint;
  v_yeni       bigint;
  v_yeni_aktif bigint;
  v_yayin      bigint;
  v_sentetik   bigint;
  v_stok       bigint;
  v_gorsel     bigint;
  v_ceviri_y   bigint;
  v_izi_son    text;
BEGIN
  SELECT count(*) INTO v_urun_son  FROM products;
  SELECT count(*) INTO v_aktif_son FROM products WHERE is_active;
  SELECT count(*) INTO v_yeni      FROM products p WHERE EXISTS (SELECT 1 FROM stg_urun s WHERE s.id = p.id);
  SELECT count(*) INTO v_yeni_aktif FROM products p
    WHERE p.is_active AND EXISTS (SELECT 1 FROM stg_urun s WHERE s.id = p.id);
  SELECT count(*) INTO v_yayin     FROM products WHERE seo_ready;
  SELECT count(*) INTO v_sentetik  FROM products WHERE is_synthetic;
  SELECT count(*) INTO v_stok      FROM products WHERE stock_status::text <> 'unknown';
  SELECT count(*) INTO v_gorsel    FROM product_images;
  SELECT count(*) INTO v_ceviri_y  FROM product_translations WHERE published;

  -- Mevcut (aktarım ÖNCESİ var olan) ürünlerin parmak izi
  SELECT coalesce(md5(string_agg(t::text, '~' ORDER BY t.id)), 'BOS') INTO v_izi_son
    FROM (SELECT id, part_number, name, is_active, seo_ready, stock_status
            FROM products p WHERE NOT EXISTS (SELECT 1 FROM stg_urun s WHERE s.id = p.id)) t;

  IF v_urun_son <> v_urun_once + (SELECT count(*) FROM stg_urun) THEN
    RAISE EXCEPTION 'POST-CHECK: urun sayisi % (beklenen %).',
      v_urun_son, v_urun_once + (SELECT count(*) FROM stg_urun);
  END IF;
  IF v_yeni <> (SELECT count(*) FROM stg_urun) THEN
    RAISE EXCEPTION 'POST-CHECK: aktarilan urun % (beklenen %).', v_yeni, (SELECT count(*) FROM stg_urun);
  END IF;
  IF v_yeni_aktif <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: aktarilan % urun AKTIF (beklenen 0).', v_yeni_aktif;
  END IF;
  IF v_aktif_son <> v_aktif_once THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: aktif urun sayisi % -> % degisti (public gorunurluk artti).',
      v_aktif_once, v_aktif_son;
  END IF;
  IF v_yayin <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: % urun yayinda (beklenen 0).', v_yayin;
  END IF;
  IF v_sentetik <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: % sentetik kayit (beklenen 0).', v_sentetik;
  END IF;
  IF v_stok <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: % urunde stok iddiasi (beklenen 0).', v_stok;
  END IF;
  IF v_ceviri_y <> 0 THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: % ceviri yayinlanmis (beklenen 0).', v_ceviri_y;
  END IF;
  IF v_izi_son <> v_izi_once THEN
    RAISE EXCEPTION 'POST-CHECK BASARISIZ: MEVCUT urunlerin verisi degisti.';
  END IF;

  RAISE NOTICE 'AKTARIM TAMAM: % urun eklendi, hepsi PASIF.', v_yeni;
  RAISE NOTICE 'KANIT: aktif urun sayisi DEGISMEDI (%) — public API''de yeni urun GORUNMEZ.', v_aktif_son;
  RAISE NOTICE 'KANIT: yayinda 0 · sentetik 0 · stok iddiasi 0 · fotograf % (degismedi).', v_gorsel;
  RAISE NOTICE 'KANIT: mevcut urunlerin parmak izi AYNI (%).', left(v_izi_son, 12);
  RAISE NOTICE 'Uyumluluk: % · Ceviri: % (hepsi taslak).',
    (SELECT count(*) FROM fitments), (SELECT count(*) FROM product_translations);
END $$;

COMMIT;

-- ── GERİ ALMA ──────────────────────────────────────────────────────────────
-- Aktarılan kayıtların kimlikleri TSV dosyalarında durur. Geri alma:
--
--   BEGIN;
--   DELETE FROM product_translations WHERE product_id IN (SELECT id FROM <stg_urun>);
--   DELETE FROM fitments            WHERE product_id IN (SELECT id FROM <stg_urun>);
--   DELETE FROM products            WHERE id         IN (SELECT id FROM <stg_urun>);
--   -- Eklenen makine/üretici kayıtları ayrıca değerlendirilir:
--   --   DELETE FROM machines WHERE id IN (SELECT id FROM <stg_makine>)
--   --     AND NOT EXISTS (SELECT 1 FROM fitments f WHERE f.machine_id = machines.id);
--   COMMIT;
--
-- Mevcut 3 ürün, 2 fotoğraf ve müşteri kayıtları bu ifadelerin KAPSAMI
-- DIŞINDADIR.
