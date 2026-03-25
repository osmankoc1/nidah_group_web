-- Migration: 0000_rfq_submissions
-- Creates the RFQ submissions table with status/priority enums,
-- admin notes, and timestamps.
--
-- Run via Drizzle Kit:
--   npx drizzle-kit migrate
--
-- Or apply directly on Neon:
--   psql "$DATABASE_URL" -f drizzle/0000_rfq_submissions.sql

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "rfq_status" AS ENUM ('pending', 'contacted', 'quoted', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "rfq_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "rfq_submissions" (
  "id"            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  "full_name"     VARCHAR(255)  NOT NULL,
  "company"       VARCHAR(255),
  "phone"         VARCHAR(50)   NOT NULL,
  "email"         VARCHAR(255)  NOT NULL,
  "brand"         VARCHAR(100),
  "machine_model" VARCHAR(255),
  "part_number"   VARCHAR(100),
  "quantity"      INTEGER       DEFAULT 1,
  "country"       VARCHAR(100)  DEFAULT 'Türkiye',
  "message"       TEXT,

  -- Admin fields
  "status"        "rfq_status"   NOT NULL DEFAULT 'pending',
  "priority"      "rfq_priority" NOT NULL DEFAULT 'normal',
  "admin_note"    TEXT,

  -- Timestamps
  "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_rfq_status"     ON "rfq_submissions" ("status");
CREATE INDEX IF NOT EXISTS "idx_rfq_created_at" ON "rfq_submissions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_rfq_email"      ON "rfq_submissions" ("email");
CREATE INDEX IF NOT EXISTS "idx_rfq_brand"      ON "rfq_submissions" ("brand");

-- ── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rfq_updated_at ON "rfq_submissions";
CREATE TRIGGER rfq_updated_at
  BEFORE UPDATE ON "rfq_submissions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
