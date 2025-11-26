-- Clear all nutrition batch data
-- Run with: docker exec -i <postgres_container> psql -U vendure -d vendure_dev < scripts/clear-nutrition-data.sql

BEGIN;

DELETE FROM nutrition_batch_row_translation;
DELETE FROM nutrition_batch_row;
DELETE FROM nutrition_batch_translation;
DELETE FROM nutrition_batch;

COMMIT;

-- Verify deletion
SELECT 'nutrition_batch_row_translation' as table_name, COUNT(*) as remaining FROM nutrition_batch_row_translation
UNION ALL
SELECT 'nutrition_batch_row', COUNT(*) FROM nutrition_batch_row
UNION ALL
SELECT 'nutrition_batch_translation', COUNT(*) FROM nutrition_batch_translation
UNION ALL
SELECT 'nutrition_batch', COUNT(*) FROM nutrition_batch;
