-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0011 — Ürün görseli doğrulama, ALT metni ve kaynak izi                  ║
-- ║                                                                          ║
-- ║  DURUM: DEVELOPMENT'A UYGULANIR. PRODUCTION'A UYGULANMADI.              ║
-- ║  Production'a uygulanması AYRI KULLANICI ONAYINA tabidir                ║
-- ║  (global CLAUDE.md §2, proje CLAUDE.md §2).                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- GEREKÇE (K1 / K2 kararları)
--   `product_images` tablosu bugün yalnızca "bu ürüne bir dosya yüklendi"
--   bilgisini taşıyor: cloudinary_id, cloudinary_url, sort_order, is_primary.
--   Tabloda ALT METNİ, DOĞRULAMA BAYRAĞI ve KAYNAK İZİ yok. Bunun üç sonucu
--   var ve üçü de yayın güvenliğini doğrudan etkiliyor:
--
--     1. "Doğrulanmış gerçek fotoğraf" ile "birinin yüklediği, kimsenin bu
--        parçayı gösterdiğini teyit etmediği dosya" ayırt EDİLEMİYOR.
--        `seo-gate.ts` yalnızca SAYI sayabiliyor (MIN_REAL_IMAGES), içeriğe
--        dair hiçbir güvence veremiyor.
--     2. Google Images belgesi ALT metnini "en önemli özellik" olarak
--        tanımlıyor; şemada yazılacak YER OLMADIĞI için ürün sayfalarında
--        ALT metni parça numarasından TÜRETİLİYOR ("CH 76281 - görsel 1").
--        Bu, görseli tarif etmiyor.
--     3. Merchant listing kuralı "Images must represent the marked up
--        content." diyor. Hangi dosyanın gerçekten bu parçayı gösterdiği
--        kayıt altında olmadan bu kurala uyulduğu İDDİA EDİLEMEZ.
--
--   Dört görsel durumu (missing · placeholder · pending_verification ·
--   verified) mevcut kolonlarla İFADE EDİLEMEZ. `verified` kolonu olmadan
--   "yüklendi ama teyit bekliyor" ile "teyit edildi" aynı satırdır.
--
-- TASARIM KARARLARI
--   · ADDITIVE ve geriye uyumlu: beş kolon + bir index + bir CHECK.
--     Hiçbir mevcut kolon, kısıt veya davranış değişmiyor.
--   · `verified boolean NOT NULL DEFAULT false` → mevcut hiçbir görsel
--     doğrulanmış SAYILMAZ. `fitments.verified` ve `oem_numbers.verified`
--     (drizzle/0008) ile birebir aynı ilke.
--   · Tablo şu an DEV'de de PRODUCTION'da da 0 SATIR içeriyor; bu yüzden
--     NOT NULL DEFAULT ve CHECK kısıtı backfill GEREKTİRMİYOR ve hiçbir
--     satırı reddetmiyor. (Uygulama öncesi PREFLIGHT bunu doğrular.)
--   · CHECK `ck_product_images_verified_evidence`: bir görsel ancak
--     ZAMAN DAMGASI + ALT METNİ + KAYNAK birlikte varsa doğrulanmış
--     işaretlenebilir. Bu, "gerçek fotoğraf şartının sessizce kaldırılmaması"
--     talimatının VERİTABANI KATMANINDAKİ karşılığıdır: uygulama kodundaki
--     bir hata bile dayanaksız bir "doğrulandı" kaydı üretemez.
--   · `verified_by` operatör kimliğidir (işlem kaydı). Parola, token veya
--     e-posta DEĞİL — yalnızca admin oturumundaki kullanıcı adı.
--   · Placeholder görseli BU TABLOYA YAZILMAZ. Temsili görsel bir React
--     bileşenidir (satır içi SVG); veritabanında satırı, Cloudinary'de
--     dosyası, dolayısıyla indekslenebilir bir URL'si YOKTUR. Böylece
--     `Product.image`, image sitemap, `og:image` ve yayın kapısının görsel
--     sayımına SIZAMAZ. (Kullanıcı şartı: "Placeholder veritabanına ürün
--     fotoğrafı olarak eklenmeyecek.")
--
-- UYGULAMA SONRASI GEREKEN KOD İŞİ (aynı onay kapsamında)
--   1. `src/lib/db/schema.ts` → productImages kolonları
--   2. `src/lib/db/columns.ts` → PRODUCT_IMAGE_COLUMNS_V1 / _V2
--   3. `src/lib/seo-gate.ts` → `verifiedImageCount` (K2)
--   4. `src/app/api/admin/products/[id]/route.ts` → sunucu tarafı yayın
--      kapısı (K3), `src/app/api/admin/products/[id]/images/[imageId]`
--      → doğrulama ucu (K6/K7)
--   5. Public okuma yolları YALNIZCA `verified = true` görselleri okur:
--      queries/product.ts · api/products · api/products/[partNumber] ·
--      BrandCatalogPage · sitemap.ts
--
--   DİKKAT (proje CLAUDE.md §5): bu kolonları okuyan kod production'a
--   DEPLOY EDİLMEDEN ÖNCE 0010 VE 0011 production'a uygulanmak zorundadır.
--   Ters sıra `column … does not exist` → 500 üretir.
--
-- GERİ ALMA (rollback)
--   ALTER TABLE product_images DROP CONSTRAINT IF EXISTS ck_product_images_verified_evidence;
--   DROP INDEX IF EXISTS idx_product_images_verified;
--   ALTER TABLE product_images DROP COLUMN IF EXISTS source_note;
--   ALTER TABLE product_images DROP COLUMN IF EXISTS alt_text;
--   ALTER TABLE product_images DROP COLUMN IF EXISTS verified_by;
--   ALTER TABLE product_images DROP COLUMN IF EXISTS verified_at;
--   ALTER TABLE product_images DROP COLUMN IF EXISTS verified;
--   (Veri kaybı olur — geri almadan önce kolonlar dışa aktarılmalıdır.)

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  satir_sayisi bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'product_images'
  ) THEN
    RAISE EXCEPTION '0011 durduruldu: public.product_images tablosu yok.';
  END IF;

  -- Aynı adda ama farklı tipte bir kolon varsa sessizce devam ETMEYELİM.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_images'
       AND column_name = 'verified' AND data_type <> 'boolean'
  ) THEN
    RAISE EXCEPTION
      '0011 durduruldu: product_images.verified farkli bir tipte zaten var.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_images'
       AND column_name = 'alt_text'
       AND (data_type <> 'character varying' OR character_maximum_length <> 300)
  ) THEN
    RAISE EXCEPTION
      '0011 durduruldu: product_images.alt_text farkli bir tipte zaten var.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_images'
       AND column_name = 'source_note'
       AND (data_type <> 'character varying' OR character_maximum_length <> 255)
  ) THEN
    RAISE EXCEPTION
      '0011 durduruldu: product_images.source_note farkli bir tipte zaten var.';
  END IF;

  -- CHECK kisiti backfill gerektirmesin: tablo bos olmali VEYA yeni kolonlar
  -- zaten eklenmis olmali (idempotent yeniden calistirma).
  SELECT count(*) INTO satir_sayisi FROM product_images;
  IF satir_sayisi > 0 AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_images'
       AND column_name = 'verified'
  ) THEN
    RAISE EXCEPTION
      '0011 durduruldu: product_images % satir iceriyor. CHECK kisiti eklenmeden once bu satirlar elle incelenmeli.',
      satir_sayisi;
  END IF;

  RAISE NOTICE '0011 PREFLIGHT tamam: product_images mevcut, % satir.', satir_sayisi;
END $$;

-- ── KOLONLAR ────────────────────────────────────────────────────────────────

-- Bu dosya GERÇEKTEN bu parçayı gösteriyor mu? Varsayılan HAYIR.
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Doğrulamanın yapıldığı an. `verified = false` iken NULL olmak zorundadır.
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Doğrulamayı yapan operatörün admin kullanıcı adı (işlem kaydı).
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS verified_by varchar(200);

-- Görseli TARİF EDEN metin. Google Images belgesi ALT'ı en önemli özellik
-- olarak tanımlar. Parça numarasının tekrarı değil, görselin içeriği yazılır.
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS alt_text varchar(300);

-- Fotoğrafın dayanağı: "depo çekimi 2026-11-17", "üretici katalogu s.198",
-- "tedarikçi teyitli görsel". Uzunluk `VERIFICATION_SOURCE_MAX` ile aynı.
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

-- ── INDEX ───────────────────────────────────────────────────────────────────
-- Yayın kapısı ve public okuma yolları "bu ürünün DOĞRULANMIŞ görseli var mı?"
-- sorusunu sorar. Kısmi index yalnızca doğrulanmış satırları tutar.
CREATE INDEX IF NOT EXISTS idx_product_images_verified
  ON product_images (product_id)
  WHERE verified;

-- ── CHECK: dayanaksız "doğrulandı" kaydı ÜRETİLEMEZ ─────────────────────────
-- Bu kısıt, gerçek fotoğraf şartının uygulama kodundan BAĞIMSIZ güvencesidir.
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

-- ── POST-CHECK ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  kolon_sayisi   int;
  index_sayisi   int;
  kisit_sayisi   int;
  dogrulanmis    bigint;
BEGIN
  SELECT count(*) INTO kolon_sayisi
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'product_images'
     AND column_name IN ('verified', 'verified_at', 'verified_by',
                         'alt_text', 'source_note');

  SELECT count(*) INTO index_sayisi
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'product_images'
     AND indexname = 'idx_product_images_verified';

  SELECT count(*) INTO kisit_sayisi
    FROM pg_constraint
   WHERE conname = 'ck_product_images_verified_evidence'
     AND conrelid = 'public.product_images'::regclass;

  SELECT count(*) INTO dogrulanmis FROM product_images WHERE verified;

  IF kolon_sayisi <> 5 THEN
    RAISE EXCEPTION '0011 POST-CHECK basarisiz: beklenen 5 kolon, bulunan %', kolon_sayisi;
  END IF;
  IF index_sayisi <> 1 THEN
    RAISE EXCEPTION '0011 POST-CHECK basarisiz: idx_product_images_verified yok.';
  END IF;
  IF kisit_sayisi <> 1 THEN
    RAISE EXCEPTION '0011 POST-CHECK basarisiz: ck_product_images_verified_evidence yok.';
  END IF;
  IF dogrulanmis <> 0 THEN
    RAISE EXCEPTION
      '0011 POST-CHECK basarisiz: % gorsel dogrulanmis isaretli. Beklenen 0 (hicbir gorsel otomatik dogrulanmaz).',
      dogrulanmis;
  END IF;

  RAISE NOTICE '0011 tamam: 5 kolon, 1 kismi index, 1 CHECK kisiti hazir.';
  RAISE NOTICE '0011: dogrulanmis gorsel sayisi 0 — hicbir urun bu migration ile yayina acilmadi.';
END $$;

COMMIT;

-- ── UYGULAMA SONRASI DOĞRULAMA SORGULARI (elle çalıştırılır) ────────────────
--
-- 1) Hiçbir görsel otomatik doğrulanmadı mı?
--    SELECT count(*) FROM product_images WHERE verified;
--    -- beklenen: 0
--
-- 2) CHECK kısıtı gerçekten dayanak istiyor mu? (başarısız OLMASI beklenir)
--    BEGIN;
--      UPDATE product_images SET verified = true WHERE true;
--    ROLLBACK;
--    -- beklenen: ERROR  new row ... violates check constraint
--       "ck_product_images_verified_evidence"
--
-- 3) Yayına girebilecek ürün sayısı değişmedi mi?
--    SELECT count(*) FROM products WHERE is_active AND seo_ready;
--    -- beklenen: 0 (migration yayın durumunu DEĞİŞTİRMEZ)
--
-- 4) Ürün, uyumluluk ve çeviri sayıları korundu mu?
--    SELECT (SELECT count(*) FROM products)             AS urun,
--           (SELECT count(*) FROM fitments)             AS uyum,
--           (SELECT count(*) FROM product_translations) AS ceviri,
--           (SELECT count(*) FROM product_images)       AS gorsel;
--    -- beklenen: 166 · 305 · 156 · 0
