import {MigrationInterface, QueryRunner} from "typeorm";

export class Testingadminuiproductbundkle1763210247917 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Check if the column exists before trying to rename it
        const hasOldColumn = await queryRunner.hasColumn('product', 'customFields_BundleNotice');
        const hasNewColumn = await queryRunner.hasColumn('product', 'customFields_bundlenotice');
        
        if (hasOldColumn && !hasNewColumn) {
            await queryRunner.query(`ALTER TABLE "product" RENAME COLUMN "customFields_BundleNotice" TO "customFields_bundlenotice"`, undefined);
        }
        
        if (!hasNewColumn && !hasOldColumn) {
            await queryRunner.query(`ALTER TABLE "product" ADD "customFields_bundlenotice" character varying(255)`, undefined);
        }
        
        if (hasNewColumn) {
            // Column already exists in the correct format, possibly update type
            await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "customFields_bundlenotice" TYPE character varying(255)`, undefined);
        }
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        const hasNewColumn = await queryRunner.hasColumn('product', 'customFields_bundlenotice');
        
        if (hasNewColumn) {
            await queryRunner.query(`ALTER TABLE "product" RENAME COLUMN "customFields_bundlenotice" TO "customFields_BundleNotice"`, undefined);
        }
   }

}
