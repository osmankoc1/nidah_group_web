-- ── Part Number Identity ────────────────────────────────────────────────────
-- Adds products.part_number_normalized — the matching/uniqueness key.
--
-- part_number            : insan tarafından okunan kanonik değer  ("CH 76281")
-- part_number_normalized : eşleştirme anahtarı, alfanümerik + UPPER ("CH76281")
--
-- TEK DOĞRULUK KAYNAĞI: part_number.
-- part_number_normalized ondan DETERMİNİSTİK olarak türetilir. Saklanan değer
-- hesaplanandan farklıysa bu bir VERİ HATASIDIR; migration sessizce düzeltmez,
-- yüksek sesle durur (bkz. PREFLIGHT 1).
--
-- Tamamen additive: mevcut kolonlar, constraint'ler ve FK'lar DEĞİŞMEZ.
-- Yeni kolon NULLABLE bırakılır — migration kod deploy'undan ÖNCE çalışacağı
-- için, o penceredeki eski kod (kolonu bilmeyen INSERT'ler) kırılmasın.
-- NOT NULL, write-path yayına girdikten sonra ayrı bir migration ile eklenir.
--
-- NORMALİZASYON KURALI (TS tarafıyla birebir aynı olmalı):
--   1) [^A-Za-z0-9] karakterleri SİL     2) sonra UPPER
--   src/lib/part-number.ts → normalizePartNumber() aynı sırayı uygular.
--
-- Uzunluk taşması İMKÂNSIZ: normalizasyon yalnızca karakter siler, eklemez;
-- part_number zaten VARCHAR(100) olduğu için sonuç her zaman <= 100'dür.
-- part_number NULL olamaz (0001_catalog_schema.sql: NOT NULL).
--
-- YENİDEN ÇALIŞTIRMA: tüm adımlar idempotenttir. Temiz bir veritabanında
-- yeniden çalıştırmak hiçbir satırı değiştirmez ve hiçbir şey yazmaz; bu yüzden
-- migration aynı zamanda DEPLOY SONRASI DOĞRULAMA aracı olarak kullanılabilir.
--
-- Not: 0002-0005 tek adımlı/additive oldukları için açık transaction
-- kullanmıyordu. Burada backfill + index birlikte çalıştığı için tümü-veya-hiç
-- davranışı istiyoruz; bu yüzden BEGIN/COMMIT eklendi. Kullanılan işlemlerin
-- tamamı (ALTER TABLE / UPDATE / CREATE UNIQUE INDEX non-CONCURRENTLY / DO)
-- PostgreSQL'de transaction güvenlidir.

BEGIN;

-- 1 ── Kolon ─────────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS part_number_normalized VARCHAR(100);

-- 2 ── PREFLIGHT ─────────────────────────────────────────────────────────────
-- Backfill'den ÖNCE çalışır. Sorun varsa hiçbir satır yazılmadan, hangi
-- kayıtların sorunlu olduğunu söyleyen net bir hata ile durur.
-- HİÇBİR otomatik veri düzeltmesi yapılmaz — birleştirme/silme/güncelleme yok.
-- Karar operatöre aittir.
--
-- Denetimler HER ZAMAN part_number'dan YENİDEN HESAPLAR. Saklanan değere
-- güvenilmez; saklanan değerin doğruluğu ayrıca PREFLIGHT 1'de sınanır.
DO $$
DECLARE
  stale_detail TEXT;
  empty_detail TEXT;
  dup_detail   TEXT;
BEGIN
  -- ── PREFLIGHT 1: saklanan değer ile hesaplanan değer AYRIŞMIŞ mı? ────────
  -- Bu ayrışma iki yoldan doğabilir:
  --   a) migration ile kod deploy'u arasındaki pencerede eski PATCH kodu
  --      part_number'ı değiştirir ama normalized'ı güncelleyemez,
  --   b) kolona elle/harici bir değer yazılmıştır.
  -- Her iki durumda da benzersizlik index'i tatmin olur ama DEĞER YANLIŞTIR;
  -- arama ve kimlik eşleşmesi sessizce bozulur. Bu yüzden burada durulur.
  SELECT string_agg(
           part_number || ' (id=' || id::text ||
           ') saklanan=' || part_number_normalized ||
           ' hesaplanan=' || UPPER(REGEXP_REPLACE(part_number, '[^A-Za-z0-9]', '', 'g')),
           E'\n')
    INTO stale_detail
  FROM products
  WHERE part_number_normalized IS NOT NULL
    AND part_number_normalized
        <> UPPER(REGEXP_REPLACE(part_number, '[^A-Za-z0-9]', '', 'g'));

  IF stale_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0006 DURDURULDU: saklanan normalized deger, part_number ile uyusmuyor.'
      USING DETAIL = E'Ayrisan kayitlar:\n' || stale_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Bu kayitlarin part_number degeri '
                  || 'normalized kolonu guncellenmeden degistirilmis olabilir. Dogru '
                  || 'kanonik degeri belirleyip elle duzeltin, sonra migration 0006 '
                  || 'dosyasini yeniden calistirin.';
  END IF;

  -- ── PREFLIGHT 2: normalize sonucu BOŞ olan kayıt var mı? ─────────────────
  SELECT string_agg(part_number || ' (id=' || id::text || ')', E'\n')
    INTO empty_detail
  FROM products
  WHERE UPPER(REGEXP_REPLACE(part_number, '[^A-Za-z0-9]', '', 'g')) = '';

  IF empty_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0006 DURDURULDU: normalize sonucu BOS olan parca numarasi var.'
      USING DETAIL = E'Yalnizca noktalama/bosluk iceren parca numaralari:\n' || empty_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Bu urunlere gecerli bir parca '
                  || 'numarasi verin, sonra migration 0006 dosyasini yeniden '
                  || 'calistirin.';
  END IF;

  -- ── PREFLIGHT 3: normalize çakışması var mı? ─────────────────────────────
  SELECT string_agg(norm || ' <= ' || list, E'\n')
    INTO dup_detail
  FROM (
    SELECT UPPER(REGEXP_REPLACE(part_number, '[^A-Za-z0-9]', '', 'g')) AS norm,
           string_agg(part_number, ' | ' ORDER BY part_number) AS list
      FROM products
     GROUP BY 1
    HAVING COUNT(*) > 1
  ) d;

  IF dup_detail IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION 0006 DURDURULDU: normalize edilmis parca numarasi cakismasi.'
      USING DETAIL = E'Ayni normalize degere dusen parca numaralari:\n' || dup_detail,
            HINT   = 'Hicbir kayit degistirilmedi. Cakisan urunlerin part_number '
                  || 'degerlerini admin panelinden ayristirin, sonra migration 0006 '
                  || 'dosyasini yeniden calistirin.';
  END IF;
END $$;

-- 3 ── Backfill ──────────────────────────────────────────────────────────────
-- Yalnızca NULL satırlar doldurulur. NULL olmayanların doğruluğu PREFLIGHT 1
-- tarafından garanti edildiği için burada yeniden yazma YAPILMAZ.
UPDATE products
   SET part_number_normalized =
         UPPER(REGEXP_REPLACE(part_number, '[^A-Za-z0-9]', '', 'g'))
 WHERE part_number_normalized IS NULL;

-- 4 ── Benzersizlik — yarış koşullarına karşı SON savunma ────────────────────
-- Uygulama katmanı ayrıca ön kontrol yapar; bu index nihai garantidir.
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_pn_norm
  ON products (part_number_normalized);

COMMIT;

-- ── ROLLBACK (gerekirse) ────────────────────────────────────────────────────
-- BEGIN;
--   DROP INDEX IF EXISTS uq_products_pn_norm;
--   ALTER TABLE products DROP COLUMN IF EXISTS part_number_normalized;
-- COMMIT;
--
-- Not: Bu migration additive olduğu için ESKİ KOD ile tamamen uyumludur;
-- kod deploy'u geri alınsa bile migration'ı geri almak GEREKMEZ.
