-- Sprint 5: Multilingual taxonomy translations
-- Adds blog_category_translations and blog_tag_translations tables.
-- TR name/slug stays in the main tables; EN/RU/AR go here.
-- Completely additive — no existing columns or constraints are modified.

-- ── blog_category_translations ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "blog_category_translations" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL REFERENCES "blog_categories"("id") ON DELETE CASCADE,
  "locale"      VARCHAR(10) NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "slug"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_cat_trans_category_locale"
  ON "blog_category_translations"("category_id", "locale");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_cat_trans_locale_slug"
  ON "blog_category_translations"("locale", "slug");

CREATE INDEX IF NOT EXISTS "idx_blog_cat_trans_category"
  ON "blog_category_translations"("category_id");

CREATE INDEX IF NOT EXISTS "idx_blog_cat_trans_slug"
  ON "blog_category_translations"("slug");

-- ── blog_tag_translations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "blog_tag_translations" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tag_id"     UUID NOT NULL REFERENCES "blog_tags"("id") ON DELETE CASCADE,
  "locale"     VARCHAR(10) NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "slug"       VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_tag_trans_tag_locale"
  ON "blog_tag_translations"("tag_id", "locale");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_tag_trans_locale_slug"
  ON "blog_tag_translations"("locale", "slug");

CREATE INDEX IF NOT EXISTS "idx_blog_tag_trans_tag"
  ON "blog_tag_translations"("tag_id");

CREATE INDEX IF NOT EXISTS "idx_blog_tag_trans_slug"
  ON "blog_tag_translations"("slug");

-- ── updated_at triggers ─────────────────────────────────────────────────────
-- update_updated_at_column() function is already defined from migration 0003.

DO $$ BEGIN
  CREATE TRIGGER update_blog_cat_trans_updated_at
    BEFORE UPDATE ON "blog_category_translations"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_blog_tag_trans_updated_at
    BEFORE UPDATE ON "blog_tag_translations"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
