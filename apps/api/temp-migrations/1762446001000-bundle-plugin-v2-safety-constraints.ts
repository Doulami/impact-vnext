import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bundle Plugin v2 - Phase 4.1 Safety Constraints Migration
 * 
 * This migration adds critical database constraints to ensure bundle data integrity:
 * - ON DELETE RESTRICT for BundleItem → ProductVariant relationship
 * - Additional indexes for performance optimization of safety queries
 * - Bundle status validation constraints
 */
export class BundlePluginV2SafetyConstraints1762446001000 implements MigrationInterface {
    name = 'BundlePluginV2SafetyConstraints1762446001000';
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Add ON DELETE RESTRICT constraint to BundleItem → ProductVariant
        // This prevents deletion of variants that are used in bundles
        
        // First, check if the foreign key constraint already exists and drop it if needed
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_bundle_item_product_variant'
                    AND table_name = 'bundle_item'
                ) THEN
                    ALTER TABLE "bundle_item" DROP CONSTRAINT "FK_bundle_item_product_variant";
                END IF;
            END $$;
        `);
        
        // Add the new RESTRICT constraint
        await queryRunner.query(`
            ALTER TABLE "bundle_item" 
            ADD CONSTRAINT "FK_bundle_item_product_variant_restrict"
            FOREIGN KEY ("productVariantId") 
            REFERENCES "product_variant"("id") 
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
        `);
        
        // Step 2: Add bundle status validation constraint
        await queryRunner.query(`
            ALTER TABLE "bundle" 
            ADD CONSTRAINT "CHK_bundle_status_valid" 
            CHECK ("status" IN ('DRAFT', 'ACTIVE', 'BROKEN', 'ARCHIVED'));
        `);
        
        // Step 3: Add discount type validation constraint  
        await queryRunner.query(`
            ALTER TABLE "bundle"
            ADD CONSTRAINT "CHK_bundle_discount_type_valid"
            CHECK ("discountType" IN ('fixed', 'percent'));
        `);
        
        // Step 4: Add business logic constraints
        // Ensure fixed price bundles have a fixedPrice value
        await queryRunner.query(`
            ALTER TABLE "bundle"
            ADD CONSTRAINT "CHK_bundle_fixed_price_required"
            CHECK (
                ("discountType" != 'fixed') OR 
                ("discountType" = 'fixed' AND "fixedPrice" IS NOT NULL AND "fixedPrice" > 0)
            );
        `);
        
        // Ensure percent bundles have a percentOff value
        await queryRunner.query(`
            ALTER TABLE "bundle"
            ADD CONSTRAINT "CHK_bundle_percent_off_required"
            CHECK (
                ("discountType" != 'percent') OR 
                ("discountType" = 'percent' AND "percentOff" IS NOT NULL AND "percentOff" > 0 AND "percentOff" <= 100)
            );
        `);
        
        // Step 5: Performance indexes for safety queries
        
        // Index for finding bundles by variant ID (used by safety service)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_bundle_item_product_variant_safety"
            ON "bundle_item" ("productVariantId")
            WHERE "deletedAt" IS NULL;
        `);
        
        // Index for finding active bundles (used by consistency checks)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_bundle_status_active"
            ON "bundle" ("status")
            WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;
        `);
        
        // Index for bundle items with bundle ID (used for recomputation)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_bundle_item_bundle_id"
            ON "bundle_item" ("bundleId")
            WHERE "deletedAt" IS NULL;
        `);
        
        // Step 6: Add audit fields if not present (for better tracking)
        
        // Check if brokenReason field exists, add if not
        const bundleTable = await queryRunner.getTable('bundle');
        const hasBrokenReasonColumn = bundleTable?.columns.find(col => col.name === 'brokenReason');
        
        if (!hasBrokenReasonColumn) {
            await queryRunner.query(`
                ALTER TABLE "bundle" 
                ADD COLUMN "brokenReason" text NULL;
            `);
        }
        
        // Check if lastRecomputedAt field exists, add if not  
        const hasLastRecomputedColumn = bundleTable?.columns.find(col => col.name === 'lastRecomputedAt');
        
        if (!hasLastRecomputedColumn) {
            await queryRunner.query(`
                ALTER TABLE "bundle"
                ADD COLUMN "lastRecomputedAt" timestamp NULL;
            `);
        }
        
        // Step 7: Create function to prevent variant deletion if used in bundles
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION prevent_variant_deletion_if_used_in_bundles()
            RETURNS TRIGGER AS $$
            DECLARE
                bundle_count INTEGER;
                bundle_names TEXT;
            BEGIN
                -- Check if variant is used in any active or draft bundles
                SELECT COUNT(*), STRING_AGG(b.name, ', ')
                INTO bundle_count, bundle_names
                FROM bundle_item bi
                JOIN bundle b ON bi."bundleId" = b.id
                WHERE bi."productVariantId" = OLD.id
                AND b.status IN ('DRAFT', 'ACTIVE')
                AND bi."deletedAt" IS NULL
                AND b."deletedAt" IS NULL;
                
                -- If variant is used in bundles, prevent deletion
                IF bundle_count > 0 THEN
                    RAISE EXCEPTION 
                        'Cannot delete variant: it is used in % bundle(s): %. Please archive the variant instead or remove it from bundles first.',
                        bundle_count, bundle_names
                        USING ERRCODE = 'foreign_key_violation';
                END IF;
                
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);
        
        // Create trigger to call the function before variant deletion
        await queryRunner.query(`
            DROP TRIGGER IF EXISTS prevent_variant_deletion_trigger ON product_variant;
            
            CREATE TRIGGER prevent_variant_deletion_trigger
                BEFORE DELETE ON product_variant
                FOR EACH ROW
                EXECUTE FUNCTION prevent_variant_deletion_if_used_in_bundles();
        `);
        
        console.log('✅ Bundle Plugin v2 Safety Constraints migration completed');
        console.log('   - Added ON DELETE RESTRICT for BundleItem → ProductVariant');
        console.log('   - Added bundle status and discount type validation');
        console.log('   - Added business logic constraints');
        console.log('   - Added performance indexes for safety queries');
        console.log('   - Added audit fields for better tracking');
        console.log('   - Added PostgreSQL trigger to prevent variant deletion');
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the trigger and function
        await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_variant_deletion_trigger ON product_variant;`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_variant_deletion_if_used_in_bundles();`);
        
        // Remove audit fields
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "brokenReason";`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "lastRecomputedAt";`);
        
        // Remove indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_product_variant_safety";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_status_active";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_bundle_id";`);
        
        // Remove constraints
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_percent_off_required";`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_fixed_price_required";`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_discount_type_valid";`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_status_valid";`);
        
        // Remove the RESTRICT foreign key and restore the original (if it existed)
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT IF EXISTS "FK_bundle_item_product_variant_restrict";`);
        
        // Note: We don't restore the original FK constraint as we don't know its exact name/definition
        // The application should still work without it, but won't have the CASCADE/RESTRICT behavior
        
        console.log('⚠️  Bundle Plugin v2 Safety Constraints migration rolled back');
        console.log('   Note: Original foreign key constraints may need to be manually restored');
    }
}