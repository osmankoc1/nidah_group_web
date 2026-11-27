-- 284 kumesindeki ad ayristirmasini GERI AL.
BEGIN;
UPDATE products SET name = 'Mafsal pulu' WHERE id = 'df3b803f-21d7-4fe2-9768-438d97fe6ce6';
UPDATE products SET name = 'Daire döndürme valfi' WHERE id = 'a0e590fd-424d-4caa-ac60-5c5074b00eda';
UPDATE products SET name = 'Daire döndürme valfi' WHERE id = 'c4bafce9-2a8a-4fc2-81f3-a7fbcc63a349';
UPDATE products SET name = 'Bıçak kaldırma burcu' WHERE id = '24b23298-f126-401e-9235-2378216d9706';
UPDATE products SET name = 'Bıçak kaldırma burcu' WHERE id = '496f3b09-c83d-4e6f-97f2-d05bf203521b';
UPDATE products SET name = 'Debriyaj sürtünme diski' WHERE id = '5eaf991e-b187-4b2d-83c0-2aaa4411ebd2';
UPDATE products SET name = 'Debriyaj sürtünme diski' WHERE id = 'a06f8941-197f-4725-9443-f0dd329dfec8';
UPDATE products SET name = 'Mafsal pulu' WHERE id = '982cdc21-c96f-4fb4-8417-ea1d9a3dcdd2';
-- Beklenen: 8 satir.
ROLLBACK; -- dogruladiktan sonra COMMIT
