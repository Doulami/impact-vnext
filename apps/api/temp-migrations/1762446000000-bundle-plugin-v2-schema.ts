import { MigrationInterface, QueryRunner } from "typeorm";

export class BundlePluginV2Schema1762446000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Bundle v2 fields
        await queryRunner.query(`ALTER TABLE "bundle" ADD "status" character varying NOT NULL DEFAULT 'DRAFT'`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "discountType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "fixedPrice" integer`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "percentOff" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "version" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "allowExternalPromos" boolean NOT NULL DEFAULT false`);
        
        // Update existing fields
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "assets" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD CONSTRAINT "UQ_bundle_slug" UNIQUE ("slug")`);
        
        // Add BundleItem v2 fields
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD "weight" numeric(12,4)`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" SET DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD "unitPriceSnapshot" integer`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "quantity" TYPE integer`);
        
        // Add Product customFields for shell product support
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsIsbundle" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundleid" character varying(255)`);
        
        // Create CHECK constraints for bundle discount validation
        await queryRunner.query(`
            ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_discount_fixed" 
            CHECK (
                (discount_type = 'fixed' AND fixed_price IS NOT NULL AND percent_off IS NULL) OR
                (discount_type = 'percent' AND percent_off IS NOT NULL AND fixed_price IS NULL)
            )
        `);
        
        await queryRunner.query(`
            ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_percent_range" 
            CHECK (discount_type != 'percent' OR (percent_off >= 0 AND percent_off <= 100))
        `);
        
        await queryRunner.query(`
            ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_fixed_positive" 
            CHECK (discount_type != 'fixed' OR fixed_price >= 0)
        `);
        
        // Add RESTRICT constraint on BundleItem -> ProductVariant (if not already exists)
        // Note: This is typically handled by TypeORM decorators, but we ensure it exists
        await queryRunner.query(`
            ALTER TABLE "bundle_item" 
            DROP CONSTRAINT IF EXISTS "FK_bundle_item_productVariantId"
        `);
        await queryRunner.query(`
            ALTER TABLE "bundle_item" 
            ADD CONSTRAINT "FK_bundle_item_productVariantId" 
            FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") 
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        
        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_bundle_status" ON "bundle" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_discountType" ON "bundle" ("discountType")`);
        await queryRunner.query(`CREATE INDEX "IDX_product_isBundle" ON "product" ("customFieldsIsbundle")`);
        await queryRunner.query(`CREATE INDEX "IDX_product_bundleId" ON "product" ("customFieldsBundleid")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_bundleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_isBundle"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_discountType"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_status"`);
        
        // Drop RESTRICT constraint
        await queryRunner.query(`
            ALTER TABLE "bundle_item" 
            DROP CONSTRAINT IF EXISTS "FK_bundle_item_productVariantId"
        `);
        
        // Restore original foreign key (assuming CASCADE was original)
        await queryRunner.query(`
            ALTER TABLE "bundle_item" 
            ADD CONSTRAINT "FK_bundle_item_productVariantId" 
            FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        
        // Drop CHECK constraints
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_fixed_positive"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_percent_range"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_discount_fixed"`);
        
        // Remove Product customFields
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsBundleid"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsIsbundle"`);
        
        // Remove BundleItem v2 fields
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN IF EXISTS "unitPriceSnapshot"`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN IF EXISTS "weight"`);
        
        // Remove Bundle v2 fields
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "UQ_bundle_slug"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "allowExternalPromos"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "version"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "percentOff"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "fixedPrice"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "discountType"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "status"`);
    }
}