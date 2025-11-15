import {MigrationInterface, QueryRunner} from "typeorm";

export class Testingadminuiproductbundkle1763210247917 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" RENAME COLUMN "customFields_BundleNotice" TO "customFields_bundlenotice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFields_bundlenotice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFields_bundlenotice" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFields_bundlenotice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFields_bundlenotice" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "product" RENAME COLUMN "customFields_bundlenotice" TO "customFields_BundleNotice"`, undefined);
   }

}
