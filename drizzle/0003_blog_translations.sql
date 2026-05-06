-- ── Blog Multilingual Support ──────────────────────────────────────────────
-- Adds keywords column to blog_posts (TR) and creates translations table (EN+)

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keywords TEXT;

CREATE TABLE IF NOT EXISTS blog_post_translations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  locale           VARCHAR(10) NOT NULL,
  title            VARCHAR(500) NOT NULL,
  slug             VARCHAR(500) NOT NULL,
  content          TEXT NOT NULL DEFAULT '',
  excerpt          TEXT,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  keywords         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_translation_post_locale
  ON blog_post_translations (post_id, locale);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_translation_locale_slug
  ON blog_post_translations (locale, slug);

CREATE INDEX IF NOT EXISTS idx_blog_translations_post
  ON blog_post_translations (post_id);

CREATE INDEX IF NOT EXISTS idx_blog_translations_locale
  ON blog_post_translations (locale);

CREATE INDEX IF NOT EXISTS idx_blog_translations_slug
  ON blog_post_translations (slug);
