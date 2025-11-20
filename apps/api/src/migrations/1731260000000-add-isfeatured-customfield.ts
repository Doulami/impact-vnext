import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeaturedCustomfield1731260000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("product");
        if (tableExists) {
            await queryRunner.query(`
                ALTER TABLE "product" 
                ADD COLUMN IF NOT EXISTS "customFieldsIsfeatured" boolean DEFAULT false
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("product");
        if (tableExists) {
            await queryRunner.query(`
                ALTER TABLE "product" 
                DROP COLUMN IF EXISTS "customFieldsIsfeatured"
            `);
        }
    }
}
