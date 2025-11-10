-- Cleanup script for old Bundle Product data
-- Run this before testing Bundle Plugin v2

-- 1. First check what old bundle data exists
SELECT 'Old Product entities with bundle fields' as check_type, 
       COUNT(*) as count
FROM product p 
WHERE p.custom_fields ? 'isBundle' 
   OR p.custom_fields ? 'bundleId';

SELECT 'Old bundle-related order lines' as check_type,
       COUNT(*) as count  
FROM order_line ol
WHERE ol.custom_fields ? 'bundleKey'
   OR ol.custom_fields ? 'bundleId';

-- 2. Remove old bundle custom fields from products (if they exist)
-- This won't affect Bundle Plugin v2 which uses dedicated entities
UPDATE product 
SET custom_fields = custom_fields - 'isBundle' - 'bundleId'
WHERE custom_fields ? 'isBundle' OR custom_fields ? 'bundleId';

-- 3. Clean up any old bundle-related order line data
-- (Be careful in production - this removes order history!)
-- For testing environment only:
DELETE FROM order_line_adjustment 
WHERE order_line_id IN (
  SELECT id FROM order_line 
  WHERE custom_fields ? 'bundleKey' 
    AND created_at > NOW() - INTERVAL '7 days' -- Only recent test data
);

UPDATE order_line 
SET custom_fields = custom_fields - 'bundleKey' - 'bundleId' - 'bundleName' - 'bundleVersion'
WHERE custom_fields ? 'bundleKey' 
  AND created_at > NOW() - INTERVAL '7 days'; -- Only recent test data

-- 4. Verify cleanup
SELECT 'Products after cleanup' as check_type, 
       COUNT(*) as count
FROM product p 
WHERE p.custom_fields ? 'isBundle' 
   OR p.custom_fields ? 'bundleId';

SELECT 'Order lines after cleanup' as check_type,
       COUNT(*) as count  
FROM order_line ol
WHERE ol.custom_fields ? 'bundleKey'
   OR ol.custom_fields ? 'bundleId';

-- 5. Show Bundle Plugin v2 entities (should exist after migrations)
SELECT 'Bundle entities' as entity_type, COUNT(*) as count FROM bundle;
SELECT 'BundleItem entities' as entity_type, COUNT(*) as count FROM bundle_item;