-- ── Faz 2: Ürün kataloğu veri modeli genişletmesi ───────────────────────────
--
-- AMAÇ (denetim C9, C10, C11 ve talimat #6/#7):
--   1. Parçanın KENDİ üreticisini, uyumlu makinenin üreticisinden AYIRMAK.
--   2. Stok durumunu "bilinmiyor" / "stokta" / "sipariş üzerine" olarak
--      TEMSİL EDİLEBİLİR hâle getirmek (bugün `in_stock BOOLEAN DEFAULT TRUE`
--      bunu yapamıyor; `true` değeri "teyit edildi" anlamına gelmiyor).
--   3. Her ürün sayfası için insan onaylı bir YAYIN KAPISI (`seo_ready`).
--   4. OEM numarası ve makine uyumluluğu için DOĞRULAMA bayrağı + kaynak.
--   5. Çok dilli ürün içeriği için dil başına yayın kapısı olan ayrı tablo.
--
-- TAMAMEN ADDITIVE VE GERİYE UYUMLU:
--   · Hiçbir kolon DÜŞÜRÜLMEZ, ADI DEĞİŞTİRİLMEZ, TİPİ DEĞİŞTİRİLMEZ.
--   · Hiçbir constraint veya FK kaldırılmaz/gevşetilmez.
--   · Hiçbir mevcut satır GÜNCELLENMEZ (aşağıdaki "BACKFILL YOK" bölümü).
--   · `products.in_stock` OLDUĞU GİBİ BIRAKILIR. Eski kod yolları çalışmaya
--     devam eder; `stock_status` yeni otoritedir, `in_stock` legacy'dir.
--   · Yeni kolonların tamamı NULL kabul eder ya da güvenli bir DEFAULT taşır,
--     bu yüzden kolonu bilmeyen ESKİ INSERT'ler kırılmaz.
--
-- BACKFILL YOK — BİLİNÇLİ VE KRİTİK:
--   · `stock_status`, `in_stock` değerinden TÜRETİLMEZ. `in_stock` şemada
--     DEFAULT TRUE olduğu için "true" bir insan teyidi DEĞİLDİR; türetmek
--     teyit edilmemiş stok iddiasını veritabanına kalıcı olarak yazmak olurdu.
--     Tüm satırlar 'unknown' ile başlar.
--   · `seo_ready` hiçbir satırda true YAPILMAZ. Yayın kararı insana aittir.
--   · `part_manufacturer` fitment zincirinden DOLDURULMAZ. O zincir MAKİNE
--     üreticisini verir; parçanın üreticisi olarak yazmak tam olarak
--     düzeltmeye çalıştığımız hatadır (denetim C9).
--   · `oem_numbers.verified` ve `fitments.verified` false ile başlar: mevcut
--     kayıtların doğrulandığına dair bir kanıt yoktur.
--
-- PRODUCTION ŞEMASI OKUNAMADI (karar D9 açık). Bu yüzden her adım:
--   · `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` ile idempotenttir,
--   · ve PREFLIGHT bölümünde AYNI ADLI ama FARKLI TİPTE bir nesne bulunursa
--     hiçbir şey yazmadan YÜKSEK SESLE durur. Sessiz uyarlama YAPILMAZ.
--
-- KİLİT DAVRANIŞI: `ADD COLUMN ... NOT NULL DEFAULT <sabit>` PostgreSQL 11+
-- sürümlerinde tablo yeniden yazımı YAPMAZ (hızlı varsayılan). Yine de kısa
-- süreli ACCESS EXCLUSIVE kilidi alınır. `products` production'da küçük
-- olduğu için (denetim: 2 aktif ürün) kilit süresi milisaniye mertebesindedir.
-- Tablo büyüdükten sonra benzer bir migration için index'ler CONCURRENTLY ve
-- transaction DIŞINDA oluşturulmalıdır — bu dosya o durumu KAPSAMAZ.
--
-- DEPLOY SIRASI: migration ÖNCE, kod SONRA (proje CLAUDE.md §5).
-- Ek olarak `src/lib/db/columns.ts` ile eski sorgular açık kolon listesine
-- geçirildiği için, kod yanlışlıkla önce deploy edilse bile
-- `column … does not exist` hatası OLUŞMAZ.
--
-- JOURNAL: `drizzle/meta/_journal.json` yalnızca 0002'ye kadar gider ve bu
-- dosya onu GÜNCELLEMEZ. `drizzle-kit generate` ÇALIŞTIRILMAZ (journal'ı bozar
-- ve şema drift'i üretir). `drizzle-kit push` canlı veritabanına UYGULANMAZ.
--
-- YENİDEN ÇALIŞTIRMA: tüm adımlar idempotenttir. İkinci çalıştırma hiçbir
-- satırı değiştirmez; bu yüzden dosya aynı zamanda DEPLOY SONRASI DOĞRULAMA
-- aracı olarak kullanılabilir.

BEGIN;

-- 1 ── Enum tipleri ─────────────────────────────────────────────────────────
-- `CREATE TYPE ... IF NOT EXISTS` desteklenmediği için 0005/0007'deki
-- DO/EXCEPTION kalıbı kullanılır.

DO $$ BEGIN
  CREATE TYPE product_stock_status AS ENUM ('unknown', 'in_stock', 'on_order');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_sourcing_type AS ENUM ('unknown', 'oem', 'oem_equivalent', 'aftermarket');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2 ── PREFLIGHT ────────────────────────────────────────────────────────────
-- Hiçbir şey yazılmadan ÖNCE çalışır. Çakışma varsa net bir hata ile durur.
-- HİÇBİR otomatik veri veya şema düzeltmesi yapılmaz — karar operatöre aittir.

DO $$
DECLARE
  v_labels     text[];
  v_rec        record;
  v_table      text;
  v_column     text;
  v_data_type  text;
  v_udt_name   text;
BEGIN
  -- 2a. Beklenen tablolar var mı?
  FOREACH v_table IN ARRAY ARRAY['products', 'oem_numbers', 'fitments'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      RAISE EXCEPTION
        '0008 PREFLIGHT: "%" tablosu yok. Once 0001_catalog_schema.sql uygulanmali.', v_table;
    END IF;
  END LOOP;

  -- 2b. Enum etiketleri beklenenle birebir mi?
  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO v_labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
   WHERE t.typname = 'product_stock_status';
  IF v_labels IS DISTINCT FROM ARRAY['unknown', 'in_stock', 'on_order'] THEN
    RAISE EXCEPTION
      '0008 PREFLIGHT: product_stock_status enum etiketleri beklenenden farkli: %', v_labels;
  END IF;

  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO v_labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
   WHERE t.typname = 'product_sourcing_type';
  IF v_labels IS DISTINCT FROM ARRAY['unknown', 'oem', 'oem_equivalent', 'aftermarket'] THEN
    RAISE EXCEPTION
      '0008 PREFLIGHT: product_sourcing_type enum etiketleri beklenenden farkli: %', v_labels;
  END IF;

  -- 2c. AYNI ADLI ama FARKLI TİPTE kolon var mı?
  --     Production semasi okunamadigi icin bu kontrol ZORUNLUDUR: ayni adli
  --     farkli bir kolon varsa `ADD COLUMN IF NOT EXISTS` onu SESSIZCE atlar
  --     ve uygulama yanlis tipte bir kolona yazmaya calisir.
  --     Enum kolonlari information_schema'da data_type = 'USER-DEFINED'
  --     olarak gorunur; gercek tip adi udt_name'dedir.
  FOR v_rec IN
    SELECT t.tbl, t.col, t.want_data_type, t.want_udt
      FROM (VALUES
        ('products',    'part_manufacturer',       'character varying',        'varchar'),
        ('products',    'sourcing_type',           'USER-DEFINED',             'product_sourcing_type'),
        ('products',    'stock_status',            'USER-DEFINED',             'product_stock_status'),
        ('products',    'stock_status_updated_at', 'timestamp with time zone', 'timestamptz'),
        ('products',    'short_description',       'character varying',        'varchar'),
        ('products',    'long_description',        'text',                     'text'),
        ('products',    'meta_title',              'character varying',        'varchar'),
        ('products',    'meta_description',        'text',                     'text'),
        ('products',    'seo_ready',               'boolean',                  'bool'),
        ('products',    'seo_ready_at',            'timestamp with time zone', 'timestamptz'),
        ('oem_numbers', 'verified',                'boolean',                  'bool'),
        ('oem_numbers', 'verified_at',             'timestamp with time zone', 'timestamptz'),
        ('oem_numbers', 'source',                  'character varying',        'varchar'),
        ('fitments',    'verified',                'boolean',                  'bool'),
        ('fitments',    'verified_at',             'timestamp with time zone', 'timestamptz'),
        ('fitments',    'source',                  'character varying',        'varchar')
      ) AS t(tbl, col, want_data_type, want_udt)
  LOOP
    v_data_type := NULL;
    v_udt_name  := NULL;

    SELECT c.data_type, c.udt_name
      INTO v_data_type, v_udt_name
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name  = v_rec.tbl
       AND c.column_name = v_rec.col;

    IF v_data_type IS NOT NULL
       AND (v_data_type <> v_rec.want_data_type OR v_udt_name <> v_rec.want_udt) THEN
      RAISE EXCEPTION
        '0008 PREFLIGHT: %.% zaten var ama tipi beklenenden farkli (beklenen %/%, gerceklesen %/%). Manuel inceleme gerekir.',
        v_rec.tbl, v_rec.col, v_rec.want_data_type, v_rec.want_udt, v_data_type, v_udt_name;
    END IF;
  END LOOP;

  -- 2d. `product_translations` zaten varsa, beklenen kolonları taşıyor mu?
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'product_translations'
  ) THEN
    FOREACH v_column IN ARRAY ARRAY['product_id', 'locale', 'name', 'published'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'product_translations'
           AND column_name = v_column
      ) THEN
        RAISE EXCEPTION
          '0008 PREFLIGHT: product_translations tablosu var ama "%" kolonu yok. Manuel inceleme gerekir.', v_column;
      END IF;
    END LOOP;
  END IF;
END $$;

-- 3 ── products: parçanın kendi kimliği ─────────────────────────────────────
-- Parçanın ÜRETİCİSİ. NULL = bilinmiyor. Uyumlu makine üreticisinden tamamen
-- bagimsizdir; `fitments` zincirinden ASLA turetilmez (denetim C9).
ALTER TABLE products ADD COLUMN IF NOT EXISTS part_manufacturer varchar(255);

-- Parçanın temin niteliği. 'unknown' varsayilani, OEM iddiasini engeller.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sourcing_type product_sourcing_type NOT NULL DEFAULT 'unknown';

-- 4 ── products: stok ───────────────────────────────────────────────────────
-- 'unknown' VARSAYILANI zorunludur: hicbir satir, bir insan aksini
-- isaretlemedikce "stokta" olarak sunulamaz (talimat #7).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_status product_stock_status NOT NULL DEFAULT 'unknown';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status_updated_at timestamptz;

-- 5 ── products: SEO içeriği ve yayın kapısı ────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description varchar(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS long_description  text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title        varchar(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description  text;

-- YAYIN KAPISI. false varsayilani ile hicbir urun otomatik olarak
-- indekslenebilir hale gelmez (denetim C11 — ince icerik riski).
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_ready    boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_ready_at timestamptz;

-- 6 ── oem_numbers: doğrulama ───────────────────────────────────────────────
-- Teyit edilmemis numara, sayfada muadil/OEM olarak KESIN bilgi gibi
-- sunulmaz (talimat: "OEM ... dogrulanmadan kesin bilgi olarak yayinlanmasin").
ALTER TABLE oem_numbers ADD COLUMN IF NOT EXISTS verified    boolean NOT NULL DEFAULT false;
ALTER TABLE oem_numbers ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE oem_numbers ADD COLUMN IF NOT EXISTS source      varchar(255);

-- 7 ── fitments: doğrulama ──────────────────────────────────────────────────
-- Ayni ilke makine uyumlulugu icin de gecerlidir.
ALTER TABLE fitments ADD COLUMN IF NOT EXISTS verified    boolean NOT NULL DEFAULT false;
ALTER TABLE fitments ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE fitments ADD COLUMN IF NOT EXISTS source      varchar(255);

-- 8 ── product_translations ─────────────────────────────────────────────────
-- Tasarim notu: SLUG KOLONU YOK. Urun URL'i parca numarasindan uretilir
-- (toPartNumberUrlSegment) ve parca numaralari CEVRILMEZ; dolayisiyla URL
-- dilden bagimsizdir. `blog_post_translations` slug tasir cunku baslik
-- cevrilir — urunde boyle bir ihtiyac yoktur.
--
-- `published` dil BASINA kapidir: bir ceviri satiri var olmak icin yayinda
-- olmak zorunda degildir. Dogrulanmamis ceviri OTOMATIK YAYINLANMAZ.
CREATE TABLE IF NOT EXISTS product_translations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale            varchar(10) NOT NULL,
  name              varchar(500) NOT NULL,
  short_description varchar(500),
  long_description  text,
  meta_title        varchar(255),
  meta_description  text,
  published         boolean NOT NULL DEFAULT false,
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_product_translations_locale_format
    CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_translation_product_locale
  ON product_translations (product_id, locale);
CREATE INDEX IF NOT EXISTS idx_product_translations_product
  ON product_translations (product_id);
CREATE INDEX IF NOT EXISTS idx_product_translations_locale
  ON product_translations (locale);
-- Yayinda olan cevirileri dile gore cekmek icin kismi index.
CREATE INDEX IF NOT EXISTS idx_product_translations_published
  ON product_translations (locale) WHERE published;

-- 9 ── Index'ler ────────────────────────────────────────────────────────────
-- `generateStaticParams()` ve katalog sitemap'i yalnizca yayina HAZIR
-- urunleri okur; kismi index tam taramayi onler.
CREATE INDEX IF NOT EXISTS idx_products_seo_ready
  ON products (part_number) WHERE seo_ready;
-- Admin panelinde "stok durumu bilinmiyor" filtresi icin.
CREATE INDEX IF NOT EXISTS idx_products_stock_status
  ON products (stock_status);

-- 10 ── POST-CHECK ─────────────────────────────────────────────────────────
-- Tum kolonlar yerinde mi? Degilse transaction geri alinir.
DO $$
DECLARE
  v_rec     record;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  FOR v_rec IN
    SELECT * FROM (VALUES
      ('products',             'part_manufacturer'),
      ('products',             'sourcing_type'),
      ('products',             'stock_status'),
      ('products',             'stock_status_updated_at'),
      ('products',             'short_description'),
      ('products',             'long_description'),
      ('products',             'meta_title'),
      ('products',             'meta_description'),
      ('products',             'seo_ready'),
      ('products',             'seo_ready_at'),
      ('oem_numbers',          'verified'),
      ('oem_numbers',          'verified_at'),
      ('oem_numbers',          'source'),
      ('fitments',             'verified'),
      ('fitments',             'verified_at'),
      ('fitments',             'source'),
      ('product_translations', 'published')
    ) AS t(tbl, col)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = v_rec.tbl AND column_name = v_rec.col
    ) THEN
      v_missing := v_missing || (v_rec.tbl || '.' || v_rec.col);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION '0008 POST-CHECK: eksik kolon(lar): %', v_missing;
  END IF;

  -- Bilgilendirme: ilk calistirmada her iki sayi da 0 olmalidir.
  RAISE NOTICE '0008: stock_status <> unknown olan satir sayisi: %',
    (SELECT count(*) FROM products WHERE stock_status <> 'unknown');
  RAISE NOTICE '0008: seo_ready = true olan satir sayisi: %',
    (SELECT count(*) FROM products WHERE seo_ready);
  RAISE NOTICE '0008: in_stock = true olan satir sayisi (DEGISTIRILMEDI): %',
    (SELECT count(*) FROM products WHERE in_stock);
END $$;

COMMIT;

-- ── Geri alma (rollback) ───────────────────────────────────────────────────
-- Bu migration tamamen additive oldugu icin KOD GERI ALINARAK sorunsuz
-- donulebilir: yeni kolonlar okunmazsa hicbir etkisi yoktur. Semayi geri
-- almak GEREKMEZ ve ONERILMEZ (kolon dusurmek veri kaybidir).
--
-- Yine de semanin geri alinmasi istenirse, asagidaki ifadeler AYRI ve ACIK
-- onayla, YEDEK ALINDIKTAN SONRA calistirilir. Bunlar YIKICIDIR:
--
--   DROP TABLE IF EXISTS product_translations;
--   ALTER TABLE fitments    DROP COLUMN IF EXISTS verified, DROP COLUMN IF EXISTS verified_at, DROP COLUMN IF EXISTS source;
--   ALTER TABLE oem_numbers DROP COLUMN IF EXISTS verified, DROP COLUMN IF EXISTS verified_at, DROP COLUMN IF EXISTS source;
--   ALTER TABLE products    DROP COLUMN IF EXISTS seo_ready, DROP COLUMN IF EXISTS seo_ready_at,
--                           DROP COLUMN IF EXISTS meta_description, DROP COLUMN IF EXISTS meta_title,
--                           DROP COLUMN IF EXISTS long_description, DROP COLUMN IF EXISTS short_description,
--                           DROP COLUMN IF EXISTS stock_status_updated_at, DROP COLUMN IF EXISTS stock_status,
--                           DROP COLUMN IF EXISTS sourcing_type, DROP COLUMN IF EXISTS part_manufacturer;
--   DROP TYPE IF EXISTS product_sourcing_type;
--   DROP TYPE IF EXISTS product_stock_status;
