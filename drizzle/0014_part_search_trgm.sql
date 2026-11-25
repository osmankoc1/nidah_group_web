-- ── Parça numarası ve ad aramasında indeks (bulgu B7) ───────────────────────
--
-- SORUN: public arama (`/api/products?search=…`) `LIKE '%…%'` / `ILIKE '%…%'`
-- kullanır. Bu desen B-tree indeksini KULLANAMAZ; mevcut
-- `idx_products_part_number` ve `uq_products_pn_norm` devreye girmez.
-- 157 satırda önemsiz, 5.000–50.000 satırda her arama TAM TABLO TARAMASIDIR.
-- CPU yükselince Neon compute'u 2 CU'ya kadar ölçekler ve CU-saat tüketimi
-- 2–4 katına çıkar (bkz. docs/admin-master-plan/24-NEON-TUKETIM-DENETIMI.md).
--
-- ÇÖZÜM: trigram (pg_trgm) GIN indeksleri. `LIKE '%x%'` ve `ILIKE '%x%'`
-- desenleri bu indeksle karşılanabilir.
--
-- ── ÇALIŞTIRMA NOTLARI ──────────────────────────────────────────────────────
-- • Bu dosya İDEMPOTENTTİR (`IF NOT EXISTS`) ve elle çalıştırılır; projede
--   `drizzle-kit push`/`migrate` KULLANILMAZ (proje CLAUDE.md §5).
-- • Yalnızca indeks ekler: kolon, tablo, kısıt veya veri DEĞİŞMEZ. Geri alma
--   `DROP INDEX` ile tek adımdır (en altta).
-- • Kod bu indeks OLMADAN da doğru çalışır (yalnızca yavaş olur), bu yüzden
--   "migration önce, kod sonra" zorunluluğu bu dosya için GEÇERLİ DEĞİLDİR.
-- • Büyük tabloda `CREATE INDEX CONCURRENTLY` tercih edilir (tablo kilidi
--   tutmaz) ama transaction içinde çalışmaz. Mevcut satır sayısında
--   (production: 157) düz `CREATE INDEX` saniyenin altındadır.
-- • `pg_trgm` Neon'da desteklenir ve `CREATE EXTENSION` için owner bağlantısı
--   gerekir — sınırlı `nidah_web` rolüyle çalışmaz.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normalize edilmiş parça numarası üzerinde infix arama.
-- ("76281" aramasının "CH76281" ile eşleşmesini sağlar.)
CREATE INDEX IF NOT EXISTS idx_products_pn_norm_trgm
  ON products USING gin (part_number_normalized gin_trgm_ops);

-- Ürün adında infix arama ("pul", "plaka" gibi aile aramaları).
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

-- 0006 ÖNCESİNDEN kalan, normalize değeri NULL olan satırlar için KISMİ
-- indeks. Arama sorgusu bu satırlar için ham `part_number`'a düşer; kısmi
-- indeks olmadan o OR dalı planlayıcıyı tam tabloya zorlar ve yukarıdaki iki
-- indeks devre dışı kalır. (Dev veride böyle satır YOK: 166/166 normalize
-- dolu. İndeks yine de boş bir kısmi indeks olarak neredeyse bedava durur.)
CREATE INDEX IF NOT EXISTS idx_products_pn_raw_trgm
  ON products USING gin (part_number gin_trgm_ops)
  WHERE part_number_normalized IS NULL;

-- OEM / muadil numara aramaları aynı deseni kullanır.
CREATE INDEX IF NOT EXISTS idx_oem_number_norm_trgm
  ON oem_numbers USING gin (number_normalized gin_trgm_ops);

-- ── DOĞRULAMA ───────────────────────────────────────────────────────────────
-- EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM products
--   WHERE part_number_normalized LIKE '%76281%';
-- → "Bitmap Index Scan on idx_products_pn_norm_trgm" görülmeli.
--   (Satır sayısı azken planlayıcı yine Seq Scan seçebilir; bu normaldir.)
--
-- ── GERİ ALMA ───────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_products_pn_norm_trgm;
-- DROP INDEX IF EXISTS idx_products_name_trgm;
-- DROP INDEX IF EXISTS idx_oem_number_norm_trgm;
-- (Eklenti başka bir şey tarafından kullanılmıyorsa:
--  DROP EXTENSION IF EXISTS pg_trgm;)
