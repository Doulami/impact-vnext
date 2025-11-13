import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add EXPIRED status to bundle_status enum
 * 
 * Phase 4.4 - Auto-Expire Bundles
 * 
 * Adds the EXPIRED status to the bundle_status enum type.
 * This allows the auto-expire background job to mark bundles as EXPIRED
 * when their validTo date passes.
 * 
 * Status Lifecycle:
 * DRAFT -> ACTIVE -> EXPIRED (automatic when validTo passes)
 *                 -> BROKEN  (manual when consistency fails)
 *                 -> ARCHIVED (manual retirement)
 * 
 * EXPIRED can transition to:
 * - ACTIVE (if validTo is extended to future date)
 * - ARCHIVED (permanent retirement)
 */
export class AddExpiredBundleStatus1763100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add EXPIRED value to the enum
        await queryRunner.query(`
            ALTER TYPE "bundle_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'
        `);
        
        // Note: No data migration needed - bundles will be set to EXPIRED
        // automatically by the auto-expire background job on next run
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // WARNING: Cannot remove enum values in PostgreSQL easily
        // Would require:
        // 1. Create new enum without EXPIRED
        // 2. Update all bundles with status=EXPIRED to another status
        // 3. Alter column to use new enum
        // 4. Drop old enum
        // 5. Rename new enum
        
        // For safety, we'll just update any EXPIRED bundles to ARCHIVED
        await queryRunner.query(`
            UPDATE "bundle"
            SET "status" = 'ARCHIVED'
            WHERE "status" = 'EXPIRED'
        `);
        
        // Note: The enum value will still exist in the database
        // Manual cleanup required if truly needed
    }
}
