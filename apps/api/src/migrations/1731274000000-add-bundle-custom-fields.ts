import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBundleCustomFields1731274000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new bundle custom fields to order_line (IF NOT EXISTS for idempotency)
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundlekey" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundlename" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundleversion" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsDiscounttype" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsIsbundleheader" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundlecomponentqty" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBaseunitprice" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsEffectiveunitprice" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundlepctapplied" double precision`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundleadjamount" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundleshare" double precision`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundletotalprediscount" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundletotalprice" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsBundletotaldiscount" integer`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsComponentweight" double precision`);
        await queryRunner.query(`ALTER TABLE "order_line" ADD IF NOT EXISTS "customFieldsSubtotalprediscount" integer`);
        
        // Remove old product customField
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsIsfeatured"`);
        
        // Modify product bundleComponents field type if needed
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsBundlecomponents"`);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundlecomponents" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove bundle custom fields
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsSubtotalprediscount"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsComponentweight"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundletotaldiscount"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundletotalprice"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundletotalprediscount"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleshare"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleadjamount"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlepctapplied"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsEffectiveunitprice"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBaseunitprice"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlecomponentqty"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsIsbundleheader"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsDiscounttype"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleversion"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlename"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlekey"`);
    }
}
