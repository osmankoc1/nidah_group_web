-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0011p — Görsel doğrulama alanları · PRODUCTION VARYANTI                  ║
-- ║                                                                          ║
-- ║  DURUM: HENÜZ UYGULANMADI. Production uygulaması AYRI ONAYA tabidir.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- NEDEN AYRI BİR DOSYA (karar K12)
--   `0011_product_image_verification.sql` development'ta uygulandı ve orada
--   `product_images` BOŞTU. Dosyanın PREFLIGHT bloğu bilinçli bir kapı taşır:
--
--     "product_images N satır içeriyor. CHECK kısıtı eklenmeden önce bu
--      satırlar elle incelenmeli."  → RAISE EXCEPTION
--
--   Production'da 2 satır olduğu için `0011` orada ÇALIŞMAZ; durur. Kapı
--   doğru davranıyor — eksik olan, istediği İNCELEMENİN yapılıp
--   belgelenmesiydi. Bu dosya o incelemeyi kayda geçirir ve kapıyı
--   "sayıya bakan" bir engelden "veriye bakan" bir doğrulamaya çevirir.
--
-- ── YAPILAN İNCELEME (2026-11-18, salt okunur) ─────────────────────────────
--   Production `product_images` tablosunda 2 satır var:
--     · `76281` ürününün birincil görseli (sort_order 0)
--     · `90898` ürününün birincil görseli (sort_order 0)
--   Her ikisi de `is_primary = true`. Üçüncü ürün (`DENEMEE32424`, pasif)
--   görselsiz.
--
--   SONUÇ: Bu 2 satır yeni kolonlarla `verified = false` (varsayılan),
--   `verified_at = NULL`, `verified_by = NULL` olur. CHECK kısıtının ilk
--   kolu tam olarak bu hâli kabul eder; dolayısıyla kısıt MEVCUT SATIRLARI
--   REDDETMEZ ve hiçbir satır değişmez.
--
--   DAVRANIŞ DEĞİŞİKLİĞİ (bilinerek kabul edildi, karar K2): yeni kod ile
--   birlikte bu 2 fotoğraf public yüzeyde GÖSTERİLMEZ, çünkü doğrulanmamış
--   fotoğraf "yok" sayılır. Bugün görünür etkisi yoktur (katalog toggle'ı
--   kapalı, ürün sayfaları 404). Katalog açılmadan önce bu 2 fotoğrafa
--   admin panelinden ALT metni + kaynak notu girilip doğrulanmalıdır.
--
-- ── 0011'DEN FARKLAR ───────────────────────────────────────────────────────
--   1. "Satır varsa dur" kapısı yerine, kısıt eklenmeden ÖNCE mevcut
--      satırların kısıtı İHLAL EDİP ETMEDİĞİ ölçülür. İhlal varsa durulur.
--      Bu kontrol satır sayısına değil VERİYE bakar; her ortamda geçerlidir.
--   2. Satır sayısı ve içerik PARMAK İZİ migration başında alınır, sonunda
--      karşılaştırılır. Tek bir baytı değişse migration hata verip geri alır.
--   3. Beklenen satır sayısı dosyaya GÖMÜLMEZ (dev/prod ayrımı yapmaz).
--   Kolonlar, index, CHECK kısıtı ve yorumlar `0011` ile BİREBİR AYNIDIR.
--
-- ── GERİ ALMA ──────────────────────────────────────────────────────────────
--   ALTER TABLE product_images DROP CONSTRAINT IF EXISTS ck_product_images_verified_evidence;
--   DROP INDEX IF EXISTS idx_product_images_verified;
--   ALTER TABLE product_images
--     DROP COLUMN IF EXISTS verified,
--     DROP COLUMN IF EXISTS verified_at,
--     DROP COLUMN IF EXISTS verified_by,
--     DROP COLUMN IF EXISTS alt_text,
--     DROP COLUMN IF EXISTS source_note;
--   DİKKAT: geri alma, o ana kadar girilmiş ALT metinlerini ve kaynak
--   notlarını SİLER. Önce şu döküm alınmalı:
--     SELECT id, alt_text, source_note, verified, verified_at, verified_by
--       FROM product_images WHERE verified OR alt_text IS NOT NULL;

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_satir   bigint;
  v_izi     text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'product_images'
  ) THEN
    RAISE EXCEPTION '0011p durduruldu: public.product_images tablosu yok.';
  END IF;

  -- Ayni adda ama FARKLI tipte kolon varsa sessizce devam etmeyelim.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='product_images'
       AND column_name='verified' AND data_type <> 'boolean'
  ) THEN
    RAISE EXCEPTION '0011p durduruldu: product_images.verified farkli bir tipte zaten var.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='product_images'
       AND column_name='alt_text'
       AND (data_type <> 'character varying' OR character_maximum_length <> 300)
  ) THEN
    RAISE EXCEPTION '0011p durduruldu: product_images.alt_text farkli bir tipte zaten var.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='product_images'
       AND column_name='source_note'
       AND (data_type <> 'character varying' OR character_maximum_length <> 255)
  ) THEN
    RAISE EXCEPTION '0011p durduruldu: product_images.source_note farkli bir tipte zaten var.';
  END IF;

  -- MEVCUT VERININ PARMAK IZI: yalnizca bu migration'dan ONCE var olan
  -- kolonlar uzerinden. Migration sonunda ayni deger beklenir.
  SELECT count(*) INTO v_satir FROM product_images;
  SELECT coalesce(md5(string_agg(t::text, '|' ORDER BY t.id)), 'BOS') INTO v_izi
    FROM (SELECT id, product_id, cloudinary_id, cloudinary_url,
                 sort_order, is_primary, created_at
            FROM product_images) t;

  PERFORM set_config('nidah.p0011_satir', v_satir::text, true);
  PERFORM set_config('nidah.p0011_izi',   v_izi,          true);

  RAISE NOTICE '0011p PREFLIGHT: product_images % satir, parmak izi %',
    v_satir, left(v_izi, 12);
END $$;

-- ── KOLONLAR (0011 ile birebir ayni) ───────────────────────────────────────
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified_by varchar(200);
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS alt_text varchar(300);
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS source_note varchar(255);

COMMENT ON COLUMN product_images.verified IS
  'Bu dosyanin GERCEKTEN bu parcayi gosterdigi teyit edildi mi. Varsayilan false. Yalnizca verified=true gorseller public yuzeye, JSON-LD''ye ve image sitemap''e girer.';
COMMENT ON COLUMN product_images.verified_at IS
  'Dogrulama ani. verified=false iken NULL olmak zorunda (ck_product_images_verified_evidence).';
COMMENT ON COLUMN product_images.verified_by IS
  'Dogrulamayi yapan admin kullanici adi. Parola, token veya e-posta DEGIL.';
COMMENT ON COLUMN product_images.alt_text IS
  'Gorseli tarif eden ALT metni. verified=true icin ZORUNLU. Parca numarasinin tekrari degildir.';
COMMENT ON COLUMN product_images.source_note IS
  'Fotografin dayanagi (depo cekimi, uretici katalogu, tedarikci teyidi). verified=true icin ZORUNLU.';

-- ── KISIT EKLENMEDEN ÖNCE VERİ DOĞRULAMASI (0011'den FARK) ─────────────────
-- Kisit eklenirse HANGI satirlar ihlal ederdi? Sayiya degil VERIYE bakar.
DO $$
DECLARE
  v_ihlal bigint;
BEGIN
  SELECT count(*) INTO v_ihlal
    FROM product_images
   WHERE NOT (
     (verified = false AND verified_at IS NULL AND verified_by IS NULL)
     OR
     (verified = true
       AND verified_at IS NOT NULL
       AND alt_text    IS NOT NULL AND btrim(alt_text)    <> ''
       AND source_note IS NOT NULL AND btrim(source_note) <> '')
   );

  IF v_ihlal > 0 THEN
    RAISE EXCEPTION
      '0011p durduruldu: % mevcut satir CHECK kisitini ihlal ederdi. Kisit EKLENMEDI, hicbir satir degismedi. Once su sorgu ile incele: SELECT id, verified, verified_at, verified_by, alt_text, source_note FROM product_images;',
      v_ihlal;
  END IF;

  RAISE NOTICE '0011p: mevcut % satirin tamami kisiti karsiliyor; hicbiri degistirilmedi.',
    (SELECT count(*) FROM product_images);
END $$;

CREATE INDEX IF NOT EXISTS idx_product_images_verified
  ON product_images (product_id)
  WHERE verified;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_product_images_verified_evidence'
       AND conrelid = 'public.product_images'::regclass
  ) THEN
    ALTER TABLE product_images
      ADD CONSTRAINT ck_product_images_verified_evidence CHECK (
        (verified = false
          AND verified_at IS NULL
          AND verified_by IS NULL)
        OR
        (verified = true
          AND verified_at  IS NOT NULL
          AND alt_text     IS NOT NULL AND btrim(alt_text)    <> ''
          AND source_note  IS NOT NULL AND btrim(source_note) <> '')
      );
  END IF;
END $$;

-- ── POST-CHECK ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_kolon     int;
  v_index     int;
  v_kisit     int;
  v_dogru     bigint;
  v_satir_son bigint;
  v_izi_son   text;
  v_satir_ilk bigint := current_setting('nidah.p0011_satir')::bigint;
  v_izi_ilk   text    := current_setting('nidah.p0011_izi');
BEGIN
  SELECT count(*) INTO v_kolon FROM information_schema.columns
   WHERE table_schema='public' AND table_name='product_images'
     AND column_name IN ('verified','verified_at','verified_by','alt_text','source_note');
  SELECT count(*) INTO v_index FROM pg_indexes
   WHERE schemaname='public' AND tablename='product_images'
     AND indexname='idx_product_images_verified';
  SELECT count(*) INTO v_kisit FROM pg_constraint
   WHERE conname='ck_product_images_verified_evidence'
     AND conrelid='public.product_images'::regclass;
  SELECT count(*) INTO v_dogru FROM product_images WHERE verified;

  SELECT count(*) INTO v_satir_son FROM product_images;
  SELECT coalesce(md5(string_agg(t::text, '|' ORDER BY t.id)), 'BOS') INTO v_izi_son
    FROM (SELECT id, product_id, cloudinary_id, cloudinary_url,
                 sort_order, is_primary, created_at
            FROM product_images) t;

  IF v_kolon <> 5 THEN
    RAISE EXCEPTION '0011p POST-CHECK: beklenen 5 kolon, bulunan %.', v_kolon;
  END IF;
  IF v_index <> 1 THEN
    RAISE EXCEPTION '0011p POST-CHECK: idx_product_images_verified yok.';
  END IF;
  IF v_kisit <> 1 THEN
    RAISE EXCEPTION '0011p POST-CHECK: ck_product_images_verified_evidence yok.';
  END IF;
  IF v_dogru <> 0 THEN
    RAISE EXCEPTION
      '0011p POST-CHECK: % gorsel dogrulanmis isaretli (beklenen 0). Hicbir gorsel migration ile dogrulanmaz.',
      v_dogru;
  END IF;

  -- VERI KORUMA KANITI
  IF v_satir_son <> v_satir_ilk THEN
    RAISE EXCEPTION '0011p POST-CHECK: satir sayisi % -> % degisti.', v_satir_ilk, v_satir_son;
  END IF;
  IF v_izi_son <> v_izi_ilk THEN
    RAISE EXCEPTION '0011p POST-CHECK: mevcut gorsel verisi DEGISTI (parmak izi uyusmuyor).';
  END IF;

  RAISE NOTICE '0011p tamam: 5 kolon, 1 kismi index, 1 CHECK kisiti hazir.';
  RAISE NOTICE '0011p KANIT: % satir korundu, parmak izi AYNI (%).',
    v_satir_son, left(v_izi_son, 12);
  RAISE NOTICE '0011p: dogrulanmis gorsel sayisi 0 — hicbir urun bu migration ile yayina acilmadi.';
END $$;

COMMIT;
