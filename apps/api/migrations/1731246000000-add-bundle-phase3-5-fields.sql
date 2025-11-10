-- Phase 3 & 5: Add new Bundle and Product customFields
-- Date: November 10, 2025

-- Add Phase 3 fields to Bundle table
ALTER TABLE bundle ADD COLUMN IF NOT EXISTS image VARCHAR;
ALTER TABLE bundle ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP;
ALTER TABLE bundle ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP;
ALTER TABLE bundle ADD COLUMN IF NOT EXISTS "bundleCap" INTEGER;

-- Add Phase 5 fields to Product customFields
ALTER TABLE product_customfields ADD COLUMN IF NOT EXISTS "bundlePrice" INTEGER;
ALTER TABLE product_customfields ADD COLUMN IF NOT EXISTS "bundleAvailability" INTEGER;
ALTER TABLE product_customfields ADD COLUMN IF NOT EXISTS "bundleComponents" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bundle_validfrom ON bundle("validFrom");
CREATE INDEX IF NOT EXISTS idx_bundle_validto ON bundle("validTo");
CREATE INDEX IF NOT EXISTS idx_product_customfields_bundleid ON product_customfields("bundleId");
