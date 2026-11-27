-- Oncelikli iki urun duzenlemesini GERI AL (27.11.2026).
BEGIN;
UPDATE products SET part_number = '76281', part_number_normalized = '76281', name = 'KIT', long_description = NULL, notes = NULL WHERE id = 'd811693a-8418-4aa5-b34d-387e6833d8f7';
UPDATE products SET part_number = '90898', part_number_normalized = '90898', name = 'GAUDE', long_description = NULL, notes = NULL WHERE id = '129f30d2-659e-4823-9ba8-020729b4978a';
-- Beklenen: 2 satir. Farkliysa COMMIT ETMEYIN.
ROLLBACK; -- dogruladiktan sonra COMMIT
