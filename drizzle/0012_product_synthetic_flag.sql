-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0012 — Sentetik (test) ürün kayıtlarının KALICI işaretlenmesi           ║
-- ║                                                                          ║
-- ║  DURUM: DEVELOPMENT'A UYGULANIR. PRODUCTION'A UYGULANMADI.              ║
-- ║  Production uygulaması AYRI KULLANICI ONAYINA tabidir.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- GEREKÇE (karar K8)
--   Development veritabanında 166 ürün var: 154 gerçek aday + 12 sentetik
--   test kaydı. Yönetim panelinde ikisi AYNI listede duruyor ve ayırt
--   edilemiyor; "fotoğrafı eksik 154 ürün" gibi bir liste çıkarılamıyor.
--
--   Bugüne kadarki tek ayrım, parça numarası veya ürün adının
--   `TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME` desenine uymasıydı. Bu desen
--   KALICI BİR İŞARET DEĞİL:
--     · gerçek bir üretici parça numarası bir gün "SAMPLE" içerebilir,
--     · "DENEME" Türkçe bir ürün adında geçebilir,
--     · desen her sorguda yeniden yazıldığı için ayrışma riski taşır.
--
--   Bu yüzden ayrım veriye yazılır.
--
-- TASARIM KARARLARI
--   · ADDITIVE: bir NULLABLE OLMAYAN kolon (varsayılan false) + bir kısmi
--     index. Hiçbir mevcut kolon, kısıt veya davranış değişmiyor.
--   · `DEFAULT false` → mevcut 166 satırın tamamı önce `false` olur;
--     hiçbir kayıt kendiliğinden sentetik SAYILMAZ.
--   · İşaretleme DESENLE DEĞİL, KİMLİK LİSTESİYLE yapılır (kullanıcı şartı:
--     "gerçek ürünler yanlış sınıflandırılmasın"). Aşağıdaki 12 kimlik
--     2026-11-17'de tek tek listelenip gözle doğrulandı: hepsinin adı test
--     kaydı olduğunu açıkça söylüyor, hepsi `is_active = false`,
--     `seo_ready = false`, `stock_status = 'unknown'`.
--   · Kolon PUBLIC YÜZEYE ÇIKMAZ: `PRODUCT_COLUMNS_V1` ve
--     `queries/product.ts` bu kolonu seçmez; `tests/schema-phase4.spec.ts`
--     bunu kilitler.
--   · Bu kolon mevcut korumanın YERİNE GEÇMEZ. Sentetik kayıtlar
--     `is_active = false` olmaya devam eder; bu ek bir katmandır.
--
-- PRODUCTION'DA NE OLUR
--   Production'da bu 12 kimlik YOKTUR. `UPDATE` hiçbir satırı etkilemez ve
--   production'daki 2 gerçek ürün `is_synthetic = false` kalır. Davranış
--   güvenlidir; yine de uygulama ayrı onaya tabidir.
--
-- GERİ ALMA (rollback)
--   DROP INDEX IF EXISTS idx_products_synthetic;
--   ALTER TABLE products DROP COLUMN IF EXISTS is_synthetic;
--   (Kolonla birlikte işaretleme de kaybolur; kayıtların kendisi SİLİNMEZ.)

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ── PREFLIGHT ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  ayar_sayisi bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION '0012 durduruldu: public.products tablosu yok.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products'
       AND column_name = 'is_synthetic' AND data_type <> 'boolean'
  ) THEN
    RAISE EXCEPTION
      '0012 durduruldu: products.is_synthetic farkli bir tipte zaten var.';
  END IF;

  -- Bilgi amacli: hangi ortamda calistigimizi loga yaz.
  SELECT count(*) INTO ayar_sayisi FROM site_settings;
  RAISE NOTICE '0012 PREFLIGHT: urun=%, site_settings=% (dev imzasi: site_settings=0)',
    (SELECT count(*) FROM products), ayar_sayisi;
END $$;

-- ── KOLON ───────────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN products.is_synthetic IS
  'Sentetik (test) kaydi mi. Varsayilan false. YALNIZCA yonetim panelinde kullanilir; public yuzeye cikmaz. is_active=false korumasinin YERINE GECMEZ, ek katmandir.';

-- ── KISMİ INDEX ─────────────────────────────────────────────────────────────
-- Varsayılan liste "sentetik OLMAYANLAR"ı gösterecek; işaretli satırlar az
-- olduğu için kısmi index yeterli ve küçüktür.
CREATE INDEX IF NOT EXISTS idx_products_synthetic
  ON products (id)
  WHERE is_synthetic;

-- ── İŞARETLEME — DESENLE DEĞİL, KİMLİKLE ────────────────────────────────────
--
-- Aşağıdaki 12 kimlik 2026-11-17'de listelenip tek tek doğrulandı.
-- Bu liste dışındaki HİÇBİR satır bu migration ile değişemez.
UPDATE products
   SET is_synthetic = true
 WHERE id IN (
    ('a058c901-a815-4b19-9796-0b9b4350db46'),  -- 0012345          · TEST Bastaki Sifir
    ('fc4bd6b9-2815-4075-8c70-767c9d4cbb42'),  -- ATOM-P-0001      · ATOM Test Parca 1
    ('09dd9056-d3f2-490e-8b54-056a36fb4fc7'),  -- ATOM-P-0002      · ATOM Test Parca 2
    ('95be1425-31a3-4baf-8a56-77b2d096a01b'),  -- TEST-FAZ2B-0001  · TEST Faz2b Hidrolik Pompa
    ('07a4c261-a005-4176-bcf8-f2c93a23ce65'),  -- TEST-K3-CSV-0001 · TEST K3 Bosluklu Stok Kodu
    ('fdad7243-c763-4aec-b348-e6c5a9c6fc41'),  -- TEST-K3-CSV-0002 · TEST K3 Bitisik Stok Kodu
    ('adc28875-cbd4-4992-82b4-08ac5b0e3460'),  -- TEST-K3-CSV-0003 · TEST K3 Bastaki Sifir
    ('28f44f4c-0954-4b15-bd6f-56c509380af2'),  -- TEST-K3-CSV-0004 · TEST K3 Stok Kodu Yok
    ('d30c6e00-798e-4201-80f9-8e6964fcb394'),  -- TEST-K3-GUARD-01 · TEST K3 Hata Koruma Denemesi
    ('d8187c1c-a0d9-4ba3-b531-43497f8e9c2a'),  -- TEST-K3-GUARD-02 · TEST K3 Koruma A
    ('ff4063d4-bdea-4546-be48-195c93022d29'),  -- TEST-K3-GUARD-03 · TEST K3 Koruma B
    ('08b52f32-7d63-4c81-90b8-16fa9a128fbf')   -- TEST-K3-UI-0001  · TEST K3 Logo Stok Kodu Denemesi
 );

-- ── POST-CHECK ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  isaretli        bigint;
  isaretli_aktif  bigint;
  isaretli_yayin  bigint;
  isaretli_stok   bigint;
  desen_disi      bigint;
  isaretsiz_desen bigint;
  toplam          bigint;
  kolon_sayisi    int;
  index_sayisi    int;
BEGIN
  SELECT count(*) INTO kolon_sayisi FROM information_schema.columns
   WHERE table_schema='public' AND table_name='products' AND column_name='is_synthetic';
  SELECT count(*) INTO index_sayisi FROM pg_indexes
   WHERE schemaname='public' AND tablename='products' AND indexname='idx_products_synthetic';

  SELECT count(*) INTO toplam FROM products;
  SELECT count(*) INTO isaretli FROM products WHERE is_synthetic;
  SELECT count(*) INTO isaretli_aktif FROM products WHERE is_synthetic AND is_active;
  SELECT count(*) INTO isaretli_yayin FROM products WHERE is_synthetic AND seo_ready;
  SELECT count(*) INTO isaretli_stok  FROM products WHERE is_synthetic AND stock_status <> 'unknown';

  -- KANIT 1: isaretlenen her kayit desenle de eslesiyor mu?
  --          (Bir GERCEK urun yanlislikla isaretlendiyse burada yakalanir.)
  SELECT count(*) INTO desen_disi
    FROM products
   WHERE is_synthetic
     AND NOT (part_number ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)'
           OR name        ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)');

  -- KANIT 2: desenle eslesen ama isaretlenmeyen kayit kaldi mi?
  SELECT count(*) INTO isaretsiz_desen
    FROM products
   WHERE NOT is_synthetic
     AND (part_number ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)'
       OR name        ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)');

  IF kolon_sayisi <> 1 THEN
    RAISE EXCEPTION '0012 POST-CHECK: is_synthetic kolonu yok.';
  END IF;
  IF index_sayisi <> 1 THEN
    RAISE EXCEPTION '0012 POST-CHECK: idx_products_synthetic yok.';
  END IF;
  IF toplam <> 166 THEN
    RAISE EXCEPTION '0012 POST-CHECK: urun sayisi degisti (beklenen 166, bulunan %).', toplam;
  END IF;
  IF isaretli <> 12 THEN
    RAISE EXCEPTION '0012 POST-CHECK: isaretli kayit % (beklenen 12).', isaretli;
  END IF;
  IF desen_disi <> 0 THEN
    RAISE EXCEPTION
      '0012 POST-CHECK BASARISIZ: % kayit isaretlendi ama test deseni tasimiyor — GERCEK URUN olabilir.',
      desen_disi;
  END IF;
  IF isaretsiz_desen <> 0 THEN
    RAISE EXCEPTION
      '0012 POST-CHECK: % kayit test deseni tasiyor ama isaretlenmedi — kimlik listesi eksik.',
      isaretsiz_desen;
  END IF;
  IF isaretli_aktif <> 0 THEN
    RAISE EXCEPTION '0012 POST-CHECK: % sentetik kayit AKTIF (beklenen 0).', isaretli_aktif;
  END IF;
  IF isaretli_yayin <> 0 THEN
    RAISE EXCEPTION '0012 POST-CHECK: % sentetik kayit YAYINDA (beklenen 0).', isaretli_yayin;
  END IF;
  IF isaretli_stok <> 0 THEN
    RAISE EXCEPTION '0012 POST-CHECK: % sentetik kayitta stok iddiasi var (beklenen 0).', isaretli_stok;
  END IF;

  RAISE NOTICE '0012 tamam: kolon + kismi index hazir.';
  RAISE NOTICE '0012: % urunun %si sentetik isaretlendi; gercek urun = %.',
    toplam, isaretli, toplam - isaretli;
  RAISE NOTICE '0012 KANIT: desen disi isaretlenen = 0, isaretlenmeyen desenli = 0.';
  RAISE NOTICE '0012: sentetik kayitlarin hicbiri aktif/yayinda degil, stok iddiasi yok.';
END $$;

COMMIT;

-- ── UYGULAMA SONRASI DOĞRULAMA SORGULARI (elle çalıştırılır) ────────────────
--
-- 1) Gerçek ürün sayısı:
--    SELECT count(*) FROM products WHERE NOT is_synthetic;   -- beklenen: 154
--
-- 2) Yanlış sınıflandırma kontrolü (her satır elle incelenmeli):
--    SELECT part_number, name FROM products
--     WHERE is_synthetic
--       AND NOT (part_number ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)'
--             OR name        ~* '(TEST|ATOM|DUMMY|SAMPLE|ORNEK|DENEME)');
--    -- beklenen: 0 satır
--
-- 3) Yayın güvenliği değişmedi mi?
--    SELECT count(*) FROM products WHERE is_active AND seo_ready;  -- beklenen: 0
--
-- 4) Gerçek ürünlerin hiçbiri işaretlenmedi mi? (bilinen gerçek örnekler)
--    SELECT part_number, is_synthetic FROM products
--     WHERE part_number IN ('232-06-52410', '714-12-12610', '60335-00200');
--    -- beklenen: üçü de is_synthetic = false
