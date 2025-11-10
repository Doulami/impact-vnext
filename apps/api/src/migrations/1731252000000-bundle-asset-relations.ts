import { MigrationInterface, QueryRunner } from 'typeorm';

export class BundleAssetRelations1731252000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create junction table for bundle assets (many-to-many)
        await queryRunner.query(`
            CREATE TABLE "bundle_assets" (
                "bundle_id" integer NOT NULL,
                "asset_id" integer NOT NULL,
                CONSTRAINT "PK_bundle_assets" PRIMARY KEY ("bundle_id", "asset_id")
            )
        `);

        // Add featured asset foreign key to bundle
        await queryRunner.query(`
            ALTER TABLE "bundle" ADD "featuredAssetId" integer
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "bundle_assets" 
            ADD CONSTRAINT "FK_bundle_assets_bundle" 
            FOREIGN KEY ("bundle_id") REFERENCES "bundle"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "bundle_assets" 
            ADD CONSTRAINT "FK_bundle_assets_asset" 
            FOREIGN KEY ("asset_id") REFERENCES "asset"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "bundle" 
            ADD CONSTRAINT "FK_bundle_featuredAsset" 
            FOREIGN KEY ("featuredAssetId") REFERENCES "asset"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_assets_bundle_id" ON "bundle_assets" ("bundle_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_assets_asset_id" ON "bundle_assets" ("asset_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_featuredAssetId" ON "bundle" ("featuredAssetId")
        `);

        // Migrate existing assets and image data if needed
        // Note: Old assets column was JSON array of URLs, new is many-to-many relation
        // Since we can't easily map URLs back to asset IDs, we'll leave migration to manual process
        
        // Drop old columns after ensuring data is migrated
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "assets"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "image"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_featuredAssetId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_assets_asset_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_assets_bundle_id"`);

        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "FK_bundle_featuredAsset"`);
        await queryRunner.query(`ALTER TABLE "bundle_assets" DROP CONSTRAINT IF EXISTS "FK_bundle_assets_asset"`);
        await queryRunner.query(`ALTER TABLE "bundle_assets" DROP CONSTRAINT IF EXISTS "FK_bundle_assets_bundle"`);

        // Drop featured asset column
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "featuredAssetId"`);

        // Drop junction table
        await queryRunner.query(`DROP TABLE IF EXISTS "bundle_assets"`);

        // Restore old columns
        await queryRunner.query(`ALTER TABLE "bundle" ADD "assets" text DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "image" character varying`);
    }
}
