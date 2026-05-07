-- Add 'hidden' value to blog_status enum
-- Hidden posts: visible in admin, invisible on public site (404 on direct URL)
ALTER TYPE blog_status ADD VALUE IF NOT EXISTS 'hidden';
