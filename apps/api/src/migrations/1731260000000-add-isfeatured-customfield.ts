import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeaturedCustomfield1731260000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "product" 
            ADD "customFieldsIsfeatured" boolean DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "product" 
            DROP COLUMN IF EXISTS "customFieldsIsfeatured"
        `);
    }
}
