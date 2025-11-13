import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop duplicate IDX_bundle_status index
 * 
 * The bundle_status column already has an index created by TypeORM.
 * This migration removes the duplicate manual index to match the current schema.
 */
export class DropBundleStatusIndex1763105000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the duplicate index if it exists
        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_bundle_status"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate the index if rolling back
        await queryRunner.query(`
            CREATE INDEX "IDX_bundle_status" ON "bundle" ("status")
        `);
    }
}
