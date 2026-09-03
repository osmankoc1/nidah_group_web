-- ── Part Number Types (oem_numbers genişletmesi) ────────────────────────────
-- Tablo ADI ve mevcut kolonları DEĞİŞMEZ (Option B: keep & extend).
-- Yeni: type · number_normalized · note
--
-- type değerleri:
--   oem            → orijinal üretici numarası
--   cross_ref      → muadil / çapraz referans
--   alternate      → alternatif gösterim (Prosis alt_number)
--   supersedes     → bu parça, X numaranın YERİNE geçti   (Prosis replaces)
--   superseded_by  → bu parçanın YERİNE X kullanılır      (Prosis replaced_by)
--   prefixless     → prefix'siz biçim ("CH 76281" → "76281"); yalnızca arama
--                    içindir, sayfada muadil gibi gösterilmez
-- supersedes/superseded_by ayrı iki tip olduğu için Prosis'in yön bilgisi
-- ayrı bir ilişki tablosu gerekmeden korunur.
--
-- NOT NULL kararı — 0006'dan bilinçli olarak FARKLI:
--   products.part_number_normalized NULLABLE bırakıldı, çünkü migration ile kod
--   deploy'u arasındaki pencerede ESKİ kod products'a INSERT edebilir.
--   oem_numbers'a ise repoda YAZAN HİÇBİR kod yolu yok (tüm kullanımlar okuma)
--   ve tablo boş; bu yüzden number_normalized NOT NULL yapılabilir. Böylece
--   5.1b'de normalize yazmayı unutan bir INSERT sessizce bozuk satır üretmek
--   yerine yüksek sesle hata verir.
--
-- TEK DOĞRULUK KAYNAĞI: oem_number. number_normalized ondan DETERMİNİSTİK
-- olarak türetilir; saklanan değer hesaplanandan farklıysa migration sessizce
-- düzeltmez, yüksek sesle durur (bkz. PREFLIGHT 1).
-- Normalizasyon kuralı 0006 ile aynı: [^A-Za-z0-9] sil → UPPER.
--
-- 0006 ile aynı gerekçeyle açık transaction kullanılır (backfill + index).

BEGIN;

-- 1 ── Enum tipi ─────────────────────────────────────────────────────────────
-- CREATE TYPE ... IF NOT EXISTS desteklenmediği için 0005'teki DO/EXCEPTION
-- kalıbı kullanılır.
DO $$ BEGIN
  CREATE TYPE part_number_type AS ENUM (
    'oem',
    'cross_ref',
    'alternate',
    'supersedes',
    'superseded_by',
    'prefixless'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2 ── Kolonlar ──────────────────────────────────────────────────────────────
ALTER TABLE oem_numbers
  ADD COLUMN IF NOT EXISTS type part_number_type NOT NULL DEFAULT 'oem';

ALTER TABLE oem_numbers
  ADD COLUMN IF NOT EXISTS number_normalized VARCHAR(200);

ALTER TABLE oem_numbers
  ADD COLUMN IF NOT EXISTS note TEXT;

-- 3 ── PREFLIGHT ─────────────────────────────────────────────────────────────
-- 0006 ile aynı ilke ve aynı sıra: ayrışma → boş → çakışma. Backfill ve
-- index'ten ÖNCE, net hata, otomatik veri düzeltmesi YOK.
-- Denetimler HER ZAMAN oem_number'dan YENİDEN HESAPLAR; saklanan değere
-- güvenilmez. (Tablo bugün boş; denetim yeniden çalıştırma ve elle eklenmiş
-- satırlar içindir.)
DO $$
DECLARE
  stale_detail TEXT;
  empty_detail TEXT;
  dup_detail   TEXT;
BEGIN
  -- ── PREFLIGHT 1: saklanan ile hesaplanan ayrışmış mı? ────────────────────
  SELECT string_agg(
           oem_number || ' (id=' || id::text ||
           ') saklanan=' || number_normalized ||
           ' hesaplanan=' || UPPER(REGEXP_REPLACE(oem_number, '[^A-Za-z0-9]', '', 'g')),
           E'\n')
    INTO stale_detail
  FROM oem_numbers
  WHERE number_normalized IS NOT NULL
    AND number_normalized
        <> UPPER(REGEXP_REPLACE(oem_number, '[^A-Za-z0-9]', '', 'g'));

  IF stale_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0007 DURDURULDU: saklanan normalized deger, oem_number ile uyusmuyor.'
      USING DETAIL = E'Ayrisan kayitlar:\n' || stale_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Dogru degeri belirleyip elle '
                  || 'duzeltin, sonra migration 0007 dosyasini yeniden calistirin.';
  END IF;

  -- ── PREFLIGHT 2: normalize sonucu BOŞ olan kayıt var mı? ─────────────────
  SELECT string_agg(oem_number || ' (id=' || id::text || ')', E'\n')
    INTO empty_detail
  FROM oem_numbers
  WHERE UPPER(REGEXP_REPLACE(oem_number, '[^A-Za-z0-9]', '', 'g')) = '';

  IF empty_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0007 DURDURULDU: normalize sonucu BOS olan numara var.'
      USING DETAIL = E'Yalnizca noktalama/bosluk iceren numaralar:\n' || empty_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Bu satirlari duzeltin veya silin, '
                  || 'sonra migration 0007 dosyasini yeniden calistirin.';
  END IF;

  -- ── PREFLIGHT 3: aynı ürün içinde numara+tip tekrarı var mı? ─────────────
  SELECT string_agg(
           'product_id=' || product_id::text || ' · ' || norm || ' · ' || typ ||
           ' (' || n::text || ' kayıt)', E'\n')
    INTO dup_detail
  FROM (
    SELECT product_id,
           UPPER(REGEXP_REPLACE(oem_number, '[^A-Za-z0-9]', '', 'g')) AS norm,
           type::text AS typ,
           COUNT(*)::int AS n
      FROM oem_numbers
     GROUP BY 1, 2, 3
    HAVING COUNT(*) > 1
  ) d;

  IF dup_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0007 DURDURULDU: ayni urun icinde tekrar eden numara+tip var.'
      USING DETAIL = E'Cakisan kayitlar:\n' || dup_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Fazla satirlari elle temizleyin, '
                  || 'sonra migration 0007 dosyasini yeniden calistirin.';
  END IF;
END $$;

-- 4 ── Backfill ──────────────────────────────────────────────────────────────
-- Yalnızca NULL satırlar doldurulur. NULL olmayanların doğruluğu PREFLIGHT 1
-- tarafından garanti edildiği için burada yeniden yazma YAPILMAZ.
UPDATE oem_numbers
   SET number_normalized =
         UPPER(REGEXP_REPLACE(oem_number, '[^A-Za-z0-9]', '', 'g'))
 WHERE number_normalized IS NULL;

-- 5 ── NOT NULL (backfill sonrası — bkz. yukarıdaki gerekçe) ────────────────
ALTER TABLE oem_numbers
  ALTER COLUMN number_normalized SET NOT NULL;

-- 6 ── Index'ler ─────────────────────────────────────────────────────────────
-- Aynı ürüne aynı numarayı aynı tiple iki kez eklemeyi engeller.
-- (Farklı tipler kasıtlı olarak serbesttir: bir numara hem 'oem' hem
--  'superseded_by' anlamı taşıyabilir.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_oem_product_number_type
  ON oem_numbers (product_id, number_normalized, type);

-- Numara ile arama — "11184523" sorgusunun ürünü bulabilmesi için.
CREATE INDEX IF NOT EXISTS idx_oem_number_normalized
  ON oem_numbers (number_normalized);

COMMIT;

-- ── ROLLBACK (gerekirse) ────────────────────────────────────────────────────
-- BEGIN;
--   DROP INDEX IF EXISTS idx_oem_number_normalized;
--   DROP INDEX IF EXISTS uq_oem_product_number_type;
--   ALTER TABLE oem_numbers DROP COLUMN IF EXISTS note;
--   ALTER TABLE oem_numbers DROP COLUMN IF EXISTS number_normalized;
--   ALTER TABLE oem_numbers DROP COLUMN IF EXISTS type;
--   DROP TYPE IF EXISTS part_number_type;
-- COMMIT;
--
-- Mevcut idx_oem_numbers_product / idx_oem_numbers_number ve
-- product_id → products(id) ON DELETE CASCADE FK'sı DEĞİŞMEZ.
