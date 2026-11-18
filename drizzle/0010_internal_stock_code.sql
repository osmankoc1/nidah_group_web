-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0010 — Orijinal Logo İşbaşı stok kodunun kalıcı saklanması              ║
-- ║                                                                          ║
-- ║  DURUM: ÖNERİ. HİÇBİR VERİTABANINDA ÇALIŞTIRILMADI.                     ║
-- ║  Uygulanması KULLANICI ONAYINA tabidir (proje CLAUDE.md §2).            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- GEREKÇE
--   K1 kararıyla `products.part_number` doğrulanmış KATALOG parça numarası
--   oluyor (örn. "VOE 12727728"). Logo İşbaşı'ndaki orijinal stok kodu
--   (örn. "12727728" veya "NDG15189") bu durumda şemada HİÇBİR YERDE
--   saklanmıyor.
--
--   Mevcut alanların hiçbiri uygun değil:
--     · `products.notes`  → serbest metin; arama `part_number` + `name` ile
--                           sınırlı olduğu için depo personeli stok koduyla
--                           ürünü BULAMAZ. Ayrıca `notes` toplu içe aktarmada
--                           yazılabilir bir kolon olduğu için sonraki bir
--                           import dosyası değeri EZEBİLİR.
--     · `products.description` → aynı ezilme riski; ayrıca public yüzeyde.
--     · `oem_numbers`     → kullanıcı kararı: orijinal stok kodları bağımsız
--                           kaynak doğrulaması olmadan OEM / muadil / çapraz
--                           referans olarak ETİKETLENMEYECEK. `prefixless`
--                           dahil her `type` değeri bir numara iddiasıdır.
--
--   Bu yüzden ayrı, kendi adıyla anılan bir kolon gerekiyor.
--
-- TASARIM KARARLARI
--   · ADDITIVE ve geriye uyumlu: iki NULLABLE kolon + iki index. Hiçbir
--     mevcut kolon, kısıt, veri veya davranış değişmiyor.
--   · Varsayılan YOK → mevcut 2 production kaydı NULL kalır, hiçbir iddia
--     üretilmez.
--   · `internal_stock_code_normalized` BENZERSİZ DEĞİL. Gerekçe: V8 verisinde
--     5.688 stok kodunun 126'sı normalize edildiğinde çakışıyor
--     ("002 236 11 10" ↔ "0022361110"). Bunlar gerçek mükerrer Logo
--     kayıtlarıdır. Benzersiz kısıt, bir veri kalitesi sorununu içe aktarma
--     hatasına çevirir ve "otomatik birleştirme yapma" kuralıyla çelişir.
--     Önce veri korunur, mükerrerler SORGUYLA raporlanır, elle çözülür.
--     Çözüldükten sonra benzersiz index AYRICA ve additive olarak eklenebilir.
--   · Public yüzeye çıkmaz: iç stok kodu sayfada gösterilmez, JSON-LD'ye
--     yazılmaz, sitemap'i etkilemez. Yalnızca yönetim paneli ve depo eşleşmesi.
--
-- UYGULAMA SONRASI GEREKEN KOD İŞİ (ayrı onay — `src/app/api/admin/**`)
--   1. `src/lib/db/columns.ts` → PRODUCT_COLUMNS_V3
--   2. Admin ürün aramasına `internal_stock_code` eklenmesi
--      (`src/app/api/admin/products/route.ts` — şu an yalnızca
--       part_number + name üzerinde `ilike`)
--   3. Admin ürün formunda salt gösterim + düzenleme alanı
--   4. Toplu içe aktarmaya `internalStockCode` opsiyonel kolonu
--   PUBLIC arama bu alanı KAPSAMAZ — iç kod müşteriye gösterilmez.
--
-- GERİ ALMA (rollback)
--   ALTER TABLE products DROP COLUMN IF EXISTS internal_stock_code_normalized;
--   ALTER TABLE products DROP COLUMN IF EXISTS internal_stock_code;
--   (Index'ler kolonla birlikte düşer. Veri kaybı olur — geri almadan önce
--    kolonların dışa aktarılması gerekir.)

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION '0010 durduruldu: public.products tablosu yok.';
  END IF;

  -- Aynı adda ama farklı tipte bir kolon varsa sessizce devam ETMEYELİM.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products'
       AND column_name = 'internal_stock_code'
       AND (data_type <> 'character varying' OR character_maximum_length <> 100)
  ) THEN
    RAISE EXCEPTION
      '0010 durduruldu: products.internal_stock_code farklı bir tipte zaten var.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products'
       AND column_name = 'internal_stock_code_normalized'
       AND (data_type <> 'character varying' OR character_maximum_length <> 100)
  ) THEN
    RAISE EXCEPTION
      '0010 durduruldu: products.internal_stock_code_normalized farklı bir tipte zaten var.';
  END IF;
END $$;

-- ── KOLONLAR ────────────────────────────────────────────────────────────────

-- Logo İşbaşı'ndaki HAM stok kodu. Baştaki sıfırlar ve ayırıcılar aynen
-- korunur ("002 236 11 10" aynen bu şekilde saklanır).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS internal_stock_code varchar(100);

-- Eşleştirme anahtarı. Kural `src/lib/part-number.ts` ile BİREBİR AYNI olmak
-- zorundadır: önce [^A-Za-z0-9] silinir, SONRA büyük harfe çevrilir.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS internal_stock_code_normalized varchar(100);

COMMENT ON COLUMN products.internal_stock_code IS
  'Logo İşbaşı orijinal stok kodu (ham). İç kullanım; public yüzeyde gösterilmez. Bir OEM/muadil numarası iddiası DEĞİLDİR.';
COMMENT ON COLUMN products.internal_stock_code_normalized IS
  'internal_stock_code''un normalize hali. Kural: [^A-Za-z0-9] sil, sonra upper(). src/lib/part-number.ts ile aynı olmak zorunda.';

-- ── INDEX'LER (benzersiz DEĞİL — yukarıdaki gerekçe) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_internal_stock_code
  ON products (internal_stock_code)
  WHERE internal_stock_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_internal_stock_code_norm
  ON products (internal_stock_code_normalized)
  WHERE internal_stock_code_normalized IS NOT NULL;

-- ── POST-CHECK ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  kolon_sayisi int;
  index_sayisi int;
BEGIN
  SELECT count(*) INTO kolon_sayisi
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'
     AND column_name IN ('internal_stock_code', 'internal_stock_code_normalized');

  SELECT count(*) INTO index_sayisi
    FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'products'
     AND indexname IN ('idx_products_internal_stock_code',
                       'idx_products_internal_stock_code_norm');

  IF kolon_sayisi <> 2 THEN
    RAISE EXCEPTION '0010 POST-CHECK basarisiz: beklenen 2 kolon, bulunan %', kolon_sayisi;
  END IF;
  IF index_sayisi <> 2 THEN
    RAISE EXCEPTION '0010 POST-CHECK basarisiz: beklenen 2 index, bulunan %', index_sayisi;
  END IF;

  RAISE NOTICE '0010 tamam: internal_stock_code + normalized kolonlari ve 2 index hazir.';
  RAISE NOTICE '0010: hicbir mevcut kayit degismedi; yeni kolonlar NULL.';
END $$;

COMMIT;

-- ── UYGULAMA SONRASI DOĞRULAMA SORGULARI (elle çalıştırılır) ────────────────
--
-- 1) Hiçbir mevcut kayıt etkilenmedi mi?
--    SELECT count(*) FROM products WHERE internal_stock_code IS NOT NULL;
--    -- beklenen: 0
--
-- 2) Normalize tutarlılığı (içe aktarmadan SONRA çalıştırılır):
--    SELECT count(*) FROM products
--     WHERE internal_stock_code IS NOT NULL
--       AND internal_stock_code_normalized IS DISTINCT FROM
--           upper(regexp_replace(internal_stock_code, '[^A-Za-z0-9]', '', 'g'));
--    -- beklenen: 0
--
-- 3) Mükerrer stok kodu raporu (benzersiz kısıt yerine bu sorgu kullanılır):
--    SELECT internal_stock_code_normalized,
--           count(*) AS kayit,
--           string_agg(internal_stock_code || ' -> ' || part_number, ' | ') AS detay
--      FROM products
--     WHERE internal_stock_code_normalized IS NOT NULL
--     GROUP BY 1 HAVING count(*) > 1
--     ORDER BY 2 DESC;
--    -- her satır ELLE incelenir; otomatik birleştirme YAPILMAZ
