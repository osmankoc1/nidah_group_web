-- ── Migration geçmişi boşluğunun kapatılması ───────────────────────────────
--
-- TESPİT: `src/lib/db/schema.ts` içinde tanımlı olan şu nesneleri HİÇBİR
-- migration dosyası oluşturmuyor:
--
--   · blog_status   (enum)   → 0004 bu enum'a değer EKLER, ama onu kuran yok
--   · blog_categories        → 0005 buna REFERENCES verir, ama onu kuran yok
--   · blog_tags              → 0005 buna REFERENCES verir, ama onu kuran yok
--   · blog_posts             → 0003 buna ALTER + REFERENCES uygular, kuran yok
--   · blog_post_tags         → hiç geçmiyor
--   · site_settings          → sayfa toggle'larının TEK otoritesi; hiç geçmiyor
--
-- SONUÇ: temiz bir veritabanında 0003, 0004 ve 0005 ÇALIŞMAZ. Proje
-- CLAUDE.md §5 bunu blog tabloları için not ediyor; `site_settings` de aynı
-- durumda ve ondan daha kritik, çünkü `isPageEnabled()` onu okuyor —
-- tablo yoksa katalog toggle'ı hiç değerlendirilemez.
--
-- Bu dosya YALNIZCA o boşluğu doldurur. Başka bir migration tarafından
-- oluşturulan hiçbir nesneye dokunmaz:
--   blog_post_translations        → 0003 oluşturur
--   blog_category_translations    → 0005 oluşturur
--   blog_tag_translations         → 0005 oluşturur
--
-- PRODUCTION'DA BEKLENEN ETKİ: SIFIR. Canlı site çalıştığına ve blog ile
-- katalog toggle'ı işlediğine göre bu tablolar production'da ZATEN VARDIR;
-- `IF NOT EXISTS` hepsini atlar. Hiçbir ALTER, DROP veya UPDATE yoktur.
--
-- ⚠ Tanımlar `schema.ts`'ten birebir türetilmiştir, production şemasından
--   DEĞİL (karar D9 hâlâ açık). Production'daki gerçek tanımlar farklıysa bu
--   dosya onları DEĞİŞTİRMEZ — yalnızca atlar. Dolayısıyla çakışma riski yok,
--   ancak "production ile birebir aynı" İDDİA EDİLMEZ. Temiz veritabanı
--   kurulumu için güvenilir; production şema denetimi ayrı bir iştir.
--
-- ÇALIŞTIRMA SIRASI — DİKKAT:
--   Temiz bir veritabanında doğru sıra ŞUDUR:
--     0000 → 0001 → 0002 → **0009** → 0003 → 0004 → 0005 → 0006 → 0007 → 0008
--   Dosya adı 0009 olmasına rağmen 0003'ten ÖNCE çalışmalıdır, çünkü 0003–0005
--   buradaki tabloları varsayar. Mevcut (dolu) bir veritabanında sıra önemsizdir;
--   dosya her durumda no-op olur.
--
-- Tüm adımlar idempotenttir. `drizzle-kit generate` ÇALIŞTIRILMAZ.

BEGIN;

-- 1 ── blog_status enum ─────────────────────────────────────────────────────
-- 0004 bu enum'a 'hidden' ekler. Burada dört değerle birlikte kurulur, bu
-- yüzden 0004 sonradan çalışırsa no-op olur (ADD VALUE IF NOT EXISTS).
DO $$ BEGIN
  CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2 ── site_settings ────────────────────────────────────────────────────────
-- Sayfa toggle'larının tek otoritesi (src/lib/site-settings.ts).
-- Satır YOKSA `MANAGED_PAGES[].defaultEnabled` devreye girer; bu dosya
-- hiçbir ayar satırı EKLEMEZ — toggle durumu veri kararıdır, şema kararı değil.
CREATE TABLE IF NOT EXISTS site_settings (
  key        varchar(100) PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3 ── blog_categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(255) NOT NULL,
  slug        varchar(255) NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories (slug);

-- 4 ── blog_tags ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(100) NOT NULL,
  slug       varchar(100) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags (slug);

-- 5 ── blog_posts ──────────────────────────────────────────────────────────
-- `keywords` kolonu burada da yer alır; 0003 onu ADD COLUMN IF NOT EXISTS ile
-- eklediği için sıra ne olursa olsun çakışma olmaz.
CREATE TABLE IF NOT EXISTS blog_posts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                varchar(500) NOT NULL,
  slug                 varchar(500) NOT NULL UNIQUE,
  content              text NOT NULL DEFAULT '',
  excerpt              text,
  cover_image_url      text,
  cover_cloudinary_id  varchar(500),
  meta_title           varchar(255),
  meta_description     text,
  keywords             text,
  status               blog_status NOT NULL DEFAULT 'draft',
  published_at         timestamptz,
  author_name          varchar(255) NOT NULL DEFAULT 'NİDAH GROUP',
  category_id          uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  reading_time_minutes integer NOT NULL DEFAULT 3,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug   ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);

-- `published_at` index'i.
--
-- D9 PRODUCTION DENETIMI (2026-11-12): production'da `published_at` uzerinde
-- ZATEN bir index var ama adi FARKLI — `idx_blog_posts_published`.
-- `IF NOT EXISTS` yalnizca ADA baktigi icin ayni kolon uzerinde IKINCI ve
-- GEREKSIZ bir index olusacakti. Kolon bazli kontrol bunu engeller.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index x
      JOIN pg_class c ON c.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = x.indkey[0]
     WHERE n.nspname = 'public'
       AND c.relname = 'blog_posts'
       AND x.indnatts = 1
       AND a.attname = 'published_at'
  ) THEN
    CREATE INDEX idx_blog_posts_published_at ON blog_posts (published_at);
  ELSE
    RAISE NOTICE '0009: blog_posts(published_at) index''i zaten var (farkli adla), atlandi.';
  END IF;
END $$;

-- Bu index production'da YOK ama `schema.ts`'te tanimli (D9 denetimi).
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts (category_id);

-- 6 ── blog_post_tags ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES blog_tags(id)  ON DELETE CASCADE
);

-- (post_id, tag_id) tekilligi.
--
-- D9 PRODUCTION DENETIMI (2026-11-12): production'da bu tekillik ZATEN var ama
-- ADI FARKLI — `blog_post_tags_post_id_tag_id_key`. Bu, tablonun elle yazilmis
-- SQL ile degil `drizzle-kit push` ile olusturuldugunu gosterir (Postgres'in
-- otomatik urettigi constraint adi).
--
-- `CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_post_tag` yalnizca ADA bakar,
-- dolayisiyla production'da AYNI kolonlar uzerinde IKINCI ve GEREKSIZ bir
-- unique index olusturacakti. Asagidaki kontrol, ayni kolon cifti uzerinde
-- herhangi bir unique index varsa olusturmayi atlar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index x
      JOIN pg_class c ON c.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'blog_post_tags'
       AND x.indisunique
       AND x.indnatts = 2
  ) THEN
    CREATE UNIQUE INDEX uq_blog_post_tag ON blog_post_tags (post_id, tag_id);
  ELSE
    RAISE NOTICE '0009: blog_post_tags uzerinde (post_id, tag_id) tekilligi zaten var, atlandi.';
  END IF;
END $$;

-- Bu iki index production'da YOK ama `schema.ts`'te tanimli; olusturulmalari
-- semayi kodla hizalar (D9 denetimi). Kucuk tablolarda maliyet ihmal edilebilir.
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag  ON blog_post_tags (tag_id);

-- 7 ── POST-CHECK ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_table   text;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'site_settings', 'blog_categories', 'blog_tags', 'blog_posts', 'blog_post_tags'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_missing := v_missing || v_table;
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION '0009 POST-CHECK: eksik tablo(lar): %', v_missing;
  END IF;

  RAISE NOTICE '0009: site_settings satir sayisi: %', (SELECT count(*) FROM site_settings);
END $$;

COMMIT;
