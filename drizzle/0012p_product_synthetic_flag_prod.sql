-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0012p — products.is_synthetic kolonu · PRODUCTION VARYANTI               ║
-- ║                                                                          ║
-- ║  DURUM: HENÜZ UYGULANMADI. Production uygulaması AYRI ONAYA tabidir.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- NEDEN AYRI BİR DOSYA (karar K13)
--   `0012_product_synthetic_flag.sql` development'ta uygulandı. İçinde
--   12 KİMLİĞİ işaretleyen bir `UPDATE` ve dev'e özgü sabit sayılara bağlı
--   POST-CHECK'ler var:
--     · "ürün sayısı 166 olmalı"      → production'da 3
--     · "işaretli kayıt 12 olmalı"    → production'da 0
--     · "desenli ama işaretlenmemiş kayıt kalmamalı" → production'da 1 var
--   Bu yüzden `0012` production'da ÇALIŞMAZ; durur.
--
-- ── BU DOSYANIN FARKI ──────────────────────────────────────────────────────
--   1. **`UPDATE` YOK.** Hiçbir satır işaretlenmez, hiçbir satır değişmez.
--      Sentetik işaretleme development'a ait bir kavramdır; production'da
--      işaretlenecek sentetik kayıt YOKTUR.
--   2. **Sabit sayı YOK.** Kontroller ortam bağımsızdır: satır sayısı ve
--      içerik PARMAK İZİ migration başında ölçülür, sonunda karşılaştırılır.
--   3. Kolon ve index tanımı `0012` ile BİREBİR AYNIDIR.
--
-- ── PRODUCTION'DAKİ DESEN UYARISI (karar K16) ──────────────────────────────
--   Production'da `DENEMEE32424` (ad: `DESWFSEDF`, pasif, yayında değil)
--   kaydı `TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME` desenine uyuyor. Bir kaydın
--   gerçek mi test mi olduğu YALNIZCA ADINDAN belirlenemez; bu yüzden bu
--   migration desene göre hiçbir şey işaretlemez ve o kayda DOKUNMAZ.
--   Kayıt `is_synthetic = false` (varsayılan) olarak kalır.
--
-- ── NE OLUR ────────────────────────────────────────────────────────────────
--   `products` tablosuna `is_synthetic boolean NOT NULL DEFAULT false`
--   kolonu ve `WHERE is_synthetic` kısmi index'i eklenir. PostgreSQL 11+
--   sabit varsayılanlı kolonu tabloyu yeniden yazmadan ekler.
--   Mevcut 3 ürünün tamamı `is_synthetic = false` olur.
--
-- ── GERİ ALMA ──────────────────────────────────────────────────────────────
--   DROP INDEX IF EXISTS idx_products_synthetic;
--   ALTER TABLE products DROP COLUMN IF EXISTS is_synthetic;
--   (Veri kaybı yok: production'da hiçbir satır işaretlenmiyor.)

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_satir bigint;
  v_izi   text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='products'
  ) THEN
    RAISE EXCEPTION '0012p durduruldu: public.products tablosu yok.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='products'
       AND column_name='is_synthetic' AND data_type <> 'boolean'
  ) THEN
    RAISE EXCEPTION '0012p durduruldu: products.is_synthetic farkli bir tipte zaten var.';
  END IF;

  -- PARMAK IZI: bu migration'dan ONCE var olan is kolonlari uzerinden.
  -- (0010 daha once uygulandigi icin internal_stock_code kolonlari da vardir;
  --  onlar bilinerek disarida birakildi — bu migration onlara dokunmuyor.)
  SELECT count(*) INTO v_satir FROM products;
  SELECT coalesce(md5(string_agg(t::text, '|' ORDER BY t.id)), 'BOS') INTO v_izi
    FROM (SELECT id, part_number, part_number_normalized, name, description,
                 condition, category_id, weight, notes, is_active, in_stock,
                 part_manufacturer, sourcing_type, stock_status,
                 stock_status_updated_at, short_description, long_description,
                 meta_title, meta_description, seo_ready, seo_ready_at,
                 created_at
            FROM products) t;

  PERFORM set_config('nidah.p0012_satir', v_satir::text, true);
  PERFORM set_config('nidah.p0012_izi',   v_izi,          true);

  RAISE NOTICE '0012p PREFLIGHT: products % satir, parmak izi %',
    v_satir, left(v_izi, 12);
END $$;

-- ── KOLON + INDEX (0012 ile birebir ayni) ──────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_synthetic IS
  'Bu kayit gelistirme/test amaciyla uretilmis SENTETIK bir kayit mi. Varsayilan false. Public yuzeyde, SEO verisinde ve sitemap''te KULLANILMAZ; yalnizca yonetim panelinde ayrim icindir.';

CREATE INDEX IF NOT EXISTS idx_products_synthetic
  ON products (id)
  WHERE is_synthetic;

-- ── İŞARETLEME YOK ─────────────────────────────────────────────────────────
-- `0012`'deki UPDATE bilinçli olarak BU DOSYADA YOKTUR. Production'da
-- işaretlenecek sentetik kayıt yoktur ve bir kaydın niteliği adından
-- çıkarılamaz (karar K16).

-- ── POST-CHECK (ortam bağımsız) ────────────────────────────────────────────
DO $$
DECLARE
  v_kolon     int;
  v_index     int;
  v_isaretli  bigint;
  v_satir_son bigint;
  v_izi_son   text;
  v_satir_ilk bigint := current_setting('nidah.p0012_satir')::bigint;
  v_izi_ilk   text    := current_setting('nidah.p0012_izi');
BEGIN
  SELECT count(*) INTO v_kolon FROM information_schema.columns
   WHERE table_schema='public' AND table_name='products' AND column_name='is_synthetic';
  SELECT count(*) INTO v_index FROM pg_indexes
   WHERE schemaname='public' AND tablename='products' AND indexname='idx_products_synthetic';
  SELECT count(*) INTO v_isaretli FROM products WHERE is_synthetic;

  SELECT count(*) INTO v_satir_son FROM products;
  SELECT coalesce(md5(string_agg(t::text, '|' ORDER BY t.id)), 'BOS') INTO v_izi_son
    FROM (SELECT id, part_number, part_number_normalized, name, description,
                 condition, category_id, weight, notes, is_active, in_stock,
                 part_manufacturer, sourcing_type, stock_status,
                 stock_status_updated_at, short_description, long_description,
                 meta_title, meta_description, seo_ready, seo_ready_at,
                 created_at
            FROM products) t;

  IF v_kolon <> 1 THEN
    RAISE EXCEPTION '0012p POST-CHECK: is_synthetic kolonu yok.';
  END IF;
  IF v_index <> 1 THEN
    RAISE EXCEPTION '0012p POST-CHECK: idx_products_synthetic yok.';
  END IF;

  -- EN ONEMLI KONTROL: hicbir kayit sentetik isaretlenmemis olmali.
  IF v_isaretli <> 0 THEN
    RAISE EXCEPTION
      '0012p POST-CHECK BASARISIZ: % kayit sentetik isaretli (beklenen 0). Bu dosya hicbir kaydi isaretlemez.',
      v_isaretli;
  END IF;

  -- VERI KORUMA KANITI
  IF v_satir_son <> v_satir_ilk THEN
    RAISE EXCEPTION '0012p POST-CHECK: urun sayisi % -> % degisti.', v_satir_ilk, v_satir_son;
  END IF;
  IF v_izi_son <> v_izi_ilk THEN
    RAISE EXCEPTION '0012p POST-CHECK: mevcut urun verisi DEGISTI (parmak izi uyusmuyor).';
  END IF;

  RAISE NOTICE '0012p tamam: kolon + kismi index hazir.';
  RAISE NOTICE '0012p KANIT: % urun korundu, parmak izi AYNI (%), isaretli kayit 0.',
    v_satir_son, left(v_izi_son, 12);
END $$;

COMMIT;
