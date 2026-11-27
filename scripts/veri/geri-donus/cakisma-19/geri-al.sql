-- 19 cakisma kumesinden aktarilan urunleri GERI AL.
BEGIN;
DELETE FROM products
 WHERE is_active = false AND seo_ready = false AND part_number IN (
   '61725-13200',
   '419-15-12133',
   'VOE 16001024',
   'CH 13A-0312',
   'CH 3865',
   'VOE 15163008',
   'CH 89160',
   'CH 41077',
   'VOE 11419323',
   'CH 37848',
   'CH 49987',
   'VOE 983285',
   'VOE 15048183',
   'VOE 15096785',
   'VOE 11037595',
   'VOE 11419486',
   '0501.316.592',
   '0501.316.591',
   '0501.214.895'
 );
-- Beklenen: 19 satir.
ROLLBACK; -- dogruladiktan sonra COMMIT
