import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Database migration for Bundle Plugin
 * 
 * Creates Bundle and BundleItem tables with proper relationships
 * Following Vendure v3 entity patterns and Bundle Plugin specification
 */
export class CreateBundleTables1703000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Bundle table
        await queryRunner.query(`
            CREATE TABLE bundle (
                id SERIAL PRIMARY KEY,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255),
                description TEXT,
                assets TEXT NOT NULL DEFAULT '[]',
                price INTEGER NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                tags TEXT NOT NULL DEFAULT '[]',
                category VARCHAR(255),
                "customFieldsRelation" TEXT,
                CONSTRAINT "UQ_bundle_slug" UNIQUE (slug)
            );
        `);

        // Create BundleItem table
        await queryRunner.query(`
            CREATE TABLE bundle_item (
                id SERIAL PRIMARY KEY,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                quantity INTEGER NOT NULL,
                "unitPrice" INTEGER NOT NULL,
                "displayOrder" INTEGER DEFAULT 0,
                "bundleId" INTEGER NOT NULL,
                "productVariantId" INTEGER NOT NULL,
                CONSTRAINT "FK_bundle_item_bundle" FOREIGN KEY ("bundleId") REFERENCES bundle(id) ON DELETE CASCADE,
                CONSTRAINT "FK_bundle_item_productVariant" FOREIGN KEY ("productVariantId") REFERENCES product_variant(id) ON DELETE CASCADE
            );
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_name" ON bundle (name);
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_slug" ON bundle (slug);
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_enabled" ON bundle (enabled);
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_category" ON bundle (category);
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_item_bundle" ON bundle_item ("bundleId");
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_item_productVariant" ON bundle_item ("productVariantId");
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_item_displayOrder" ON bundle_item ("displayOrder");
        `);

        // Composite index for unique bundle-variant combinations
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_bundle_item_unique" ON bundle_item ("bundleId", "productVariantId");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_unique"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_displayOrder"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_productVariant"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_item_bundle"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_category"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_enabled"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_slug"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_name"`);

        // Drop tables (foreign key constraints will be handled automatically)
        await queryRunner.query(`DROP TABLE IF EXISTS bundle_item`);
        await queryRunner.query(`DROP TABLE IF EXISTS bundle`);
    }
}