import {MigrationInterface, QueryRunner} from "typeorm";

export class Sdfdsf1763210676131 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFields_bundlenotice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBundlecomponents"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundlecomponents" text`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBundlecomponents"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundlecomponents" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFields_bundlenotice" character varying(255)`, undefined);
   }

}
