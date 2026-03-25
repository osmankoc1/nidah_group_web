-- ── Catalog Schema Migration ──────────────────────────────────────────────────
-- Idempotent: safe to run multiple times.

-- Enums
DO $$ BEGIN
  CREATE TYPE product_condition AS ENUM ('new', 'used', 'remanufactured');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255)  NOT NULL,
  slug       VARCHAR(255)  NOT NULL,
  parent_id  UUID,
  sort_order INTEGER       NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_categories_slug UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- Manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_manufacturers_slug UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_manufacturers_slug ON manufacturers (slug);

-- Machines
CREATE TABLE IF NOT EXISTS machines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID         NOT NULL REFERENCES manufacturers (id) ON DELETE RESTRICT,
  model           VARCHAR(255) NOT NULL,
  type            VARCHAR(100),
  year_from       INTEGER,
  year_to         INTEGER,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_machines_manufacturer ON machines (manufacturer_id);

-- Machine Variants
CREATE TABLE IF NOT EXISTS machine_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id   UUID         NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  engine_model VARCHAR(100),
  serial_from  VARCHAR(50),
  serial_to    VARCHAR(50),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_machine_variants_machine ON machine_variants (machine_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR(100)      NOT NULL,
  name        VARCHAR(500)      NOT NULL,
  description TEXT,
  condition   product_condition NOT NULL DEFAULT 'new',
  category_id UUID              REFERENCES categories (id) ON DELETE SET NULL,
  weight      REAL,
  notes       TEXT,
  is_active   BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_products_part_number UNIQUE (part_number)
);
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products (part_number);
CREATE INDEX IF NOT EXISTS idx_products_is_active    ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_category     ON products (category_id);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  cloudinary_id  VARCHAR(500) NOT NULL,
  cloudinary_url TEXT        NOT NULL,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  is_primary     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);

-- Fitments
CREATE TABLE IF NOT EXISTS fitments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  machine_id         UUID        NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
  machine_variant_id UUID                 REFERENCES machine_variants (id) ON DELETE CASCADE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fitments_product ON fitments (product_id);
CREATE INDEX IF NOT EXISTS idx_fitments_machine ON fitments (machine_id);

-- Partial unique indexes for fitments
CREATE UNIQUE INDEX IF NOT EXISTS uq_fitment_no_variant
  ON fitments (product_id, machine_id)
  WHERE machine_variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fitment_with_variant
  ON fitments (product_id, machine_id, machine_variant_id)
  WHERE machine_variant_id IS NOT NULL;

-- OEM Numbers
CREATE TABLE IF NOT EXISTS oem_numbers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  oem_number   VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oem_numbers_product ON oem_numbers (product_id);
CREATE INDEX IF NOT EXISTS idx_oem_numbers_number  ON oem_numbers (oem_number);
