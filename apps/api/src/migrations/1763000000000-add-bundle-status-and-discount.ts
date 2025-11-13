import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures core Bundle v2 columns exist in the database.
 * Idempotent: uses IF EXISTS/IF NOT EXISTS and safe drops.
 */
export class AddBundleStatusAndDiscount1763000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add required bundle columns (if missing)
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'DRAFT'`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "discountType" character varying`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "fixedPrice" integer`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "percentOff" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "allowExternalPromos" boolean NOT NULL DEFAULT false`);

        // Ensure index on status for filtering
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bundle_status" ON "bundle" ("status")`);

        // Safety/consistency constraints (soft, optional)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'CHK_bundle_discount_type_valid'
                ) THEN
                    ALTER TABLE "bundle"
                    ADD CONSTRAINT "CHK_bundle_discount_type_valid"
                    CHECK ("discountType" IN ('fixed', 'percent') OR "discountType" IS NULL);
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Down migration: drop only what we created if safe to do so
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_status"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_discount_type_valid"`);

        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "allowExternalPromos"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "version"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "percentOff"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "fixedPrice"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "discountType"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "status"`);
    }
}


